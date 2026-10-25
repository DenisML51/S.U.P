import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DEFAULT_SETTING, type PartyDto, type PartyRules, type Setting } from '@itd/schema';
import { useNavStore } from '../../store/useNavStore';
import { useParty, usePartyStore } from '../../store/usePartyStore';
import { ConfirmDialog } from '../../ui/Dialog';
import { Flourish } from '../../ui/Flourish';
import { ImageSlot } from '../../ui/ImageSlot';
import { IconPrev, IconTrash } from '../../ui/icons';
import { Button, Field, Input, Panel, TextArea, cx } from '../../ui/primitives';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { RulesCarousel } from '../../ui/RulesetCards';
import { RULES_CHOICES, RULES_TITLE } from '../../systems';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import { MarkdownField } from '../../ui/forms';
import { WorldCarousel } from '../create/WorldCarousel';

const LORE_PLACEHOLDER = `## Пролог
Что случилось до первой сессии…

## Действующие лица
- **Зейдок Аллен** — городской пьяница, знает больше, чем говорит`;

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

interface Draft {
  setting: Setting;
  /** `null`: any rules (a table made before the choice existed). */
  rules: PartyRules | null;
  name: string;
  description: string;
  lore: string;
  coverAssetId: string | null;
}

/**
 * Founding a party, or the master reworking one: first the world, chosen on the same carousel as a
 * hero's, then the table itself — its cover, name and story — on a page that already wears that
 * world. Editing starts on the second step; the world can still be changed from there.
 */
export const PartyFormScreen: React.FC<{ partyId?: string }> = ({ partyId }) => {
  const party = useParty(partyId);
  if (partyId && !party) {
    return (
      <SettingScope setting="service" className="grid h-screen place-items-center bg-bg">
        <span className="animate-pulse text-sm text-ink-faint">Открываем партию…</span>
      </SettingScope>
    );
  }
  return <PartyForm key={party?.id ?? 'new'} party={party} />;
};

const PartyForm: React.FC<{ party?: PartyDto }> = ({ party }) => {
  const go = useNavStore((s) => s.go);
  const create = usePartyStore((s) => s.create);
  const update = usePartyStore((s) => s.update);
  const remove = usePartyStore((s) => s.remove);

  const [draft, setDraft] = useState<Draft>(() => ({
    setting: party?.setting ?? DEFAULT_SETTING,
    rules: party?.rules ?? null,
    name: party?.name ?? '',
    description: party?.description ?? '',
    lore: party?.lore ?? '',
    coverAssetId: party?.coverAssetId ?? null,
  }));
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));
  const [step, setStep] = useState<'world' | 'rules' | 'table'>(party ? 'table' : 'world');
  const [rulesChosen, setRulesChosen] = useState(!!party?.rules);
  const [worldChosen, setWorldChosen] = useState(!!party);
  const [inFront, setInFront] = useState<Setting | null>(null);
  const [flourish, setFlourish] = useState<{ setting: Setting; x: number; y: number; key: number } | null>(null);
  const endFlourish = useCallback(() => setFlourish(null), []);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The server holds to the same: no new rules in the middle of a fight, and only rules every seated hero was made by.
  const rulesLocked = party?.combat ? 'Во время боя правила стола не меняются: сначала завершите бой' : null;
  const seatedRules = party ? [...new Set(party.heroes.map((hero) => hero.rules))] : [];
  const allowedRules = seatedRules.length > 0 ? RULES_CHOICES.filter((rules) => seatedRules.every((seated) => seated === rules)) : undefined;

  const shown = step === 'world' && inFront ? inFront : draft.setting;
  useDocumentSetting(shown);

  const leave = () => go(party ? { screen: 'party', partyId: party.id } : { screen: 'home' });
  // Back goes one step at a time: from the table to the world of a new party, from the world to an edited table.
  const back =
    step === 'table' && !party
      ? { label: 'Правила', go: () => setStep('rules') }
      : step === 'rules' && !party
        ? { label: 'Мир', go: () => setStep('world') }
        : step !== 'table' && party
          ? { label: 'Назад', go: () => setStep('table') }
          : { label: party ? 'Партия' : 'Главная', go: leave };

  const submit = async () => {
    setTouched(true);
    const name = draft.name.trim();
    if (!name) return;
    setBusy(true);
    const input = { ...draft, name, description: draft.description.trim(), lore: draft.lore.trim() };
    if (party) {
      if (await update(party.id, input)) go({ screen: 'party', partyId: party.id });
    } else {
      const id = await create(input);
      if (id) go({ screen: 'party', partyId: id });
    }
    setBusy(false);
  };

  return (
    <SettingScope
      setting={shown}
      className={cx('ui-morph relative flex h-screen flex-col overflow-clip bg-bg', step === 'world' && !worldChosen && 'ui-service')}
      data-flourish={flourish?.setting}
    >
      {flourish && <Flourish key={flourish.key} setting={flourish.setting} x={flourish.x} y={flourish.y} onEnd={endFlourish} />}
      <SettingBackdrop setting={shown} strength={step === 'world' ? 0.6 : 0.45} />

      <header className="relative z-10 flex items-center gap-4 px-24 pt-14">
        <Button
          variant="ghost"
          size="sm"
          icon={<IconPrev width={16} height={16} />}
          onClick={back.go}
        >
          {back.label}
        </Button>
        <span className="text-[11px] uppercase tracking-[0.22em] text-ink-faint">
          {party ? 'Настройки партии' : `Новая партия · шаг ${step === 'world' ? 1 : step === 'rules' ? 2 : 3} из 3`}
        </span>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {step === 'world' ? (
          <motion.main
            key="world"
            className="relative z-10 flex min-h-0 flex-1 flex-col px-10 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <h1 className="ui-display ui-title text-center text-[1.9rem] leading-tight text-ink">Где развернётся ваша история?</h1>
            <div className="flex min-h-0 flex-1 items-center">
              <WorldCarousel
                chosen={worldChosen ? draft.setting : null}
                onFocus={setInFront}
                onChoose={(id, origin) => {
                  if (!(worldChosen && draft.setting === id)) setFlourish({ setting: id, ...origin, key: Date.now() });
                  patch({ setting: id });
                  setWorldChosen(true);
                }}
              />
            </div>
            <footer className="flex justify-center py-5">
              <Button variant="primary" disabled={!worldChosen} onClick={() => setStep(party ? 'table' : 'rules')}>
                Дальше
              </Button>
            </footer>
          </motion.main>
        ) : step === 'rules' ? (
          <motion.main
            key="rules"
            className="relative z-10 flex min-h-0 flex-1 flex-col px-10 pt-4"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0, transition: ENTER }}
            exit={{ opacity: 0, x: -30, transition: { duration: 0.2 } }}
          >
            <h1 className="ui-display ui-title text-center text-[1.9rem] leading-tight text-ink">По каким правилам играет стол?</h1>
            <p className="mt-1 text-center text-sm text-ink-muted">
              {allowedRules
                ? `За столом уже сидят герои по правилам ${seatedRules.map((rules) => `«${RULES_TITLE[rules]}»`).join(', ')}: другие правила можно выбрать, когда они покинут стол`
                : 'За стол сядут только герои, созданные по этим правилам'}
            </p>
            <div className="flex min-h-0 flex-1 items-center">
              <RulesCarousel
                value={rulesChosen ? draft.rules : null}
                allowed={allowedRules}
                chooseLabel="Играть за столом по этим правилам"
                onChange={(rules) => {
                  patch({ rules });
                  setRulesChosen(true);
                  setStep('table');
                }}
              />
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="table"
            className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-24 pb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: ENTER }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
          >
            <Panel crest className="flex max-h-full w-full max-w-[72rem] flex-col">
              <div className="px-10 pb-2 pt-8 text-center">
                <div className="text-[11px] uppercase tracking-[0.22em] text-frame-bright/80">
                  {SETTING_INFO[draft.setting].label}
                  {' · '}
                  <button
                    type="button"
                    className="underline-offset-4 enabled:hover:underline disabled:cursor-not-allowed"
                    disabled={!!rulesLocked}
                    onClick={() => setStep('rules')}
                    title={rulesLocked ?? 'Сменить правила стола'}
                  >
                    {draft.rules ? RULES_TITLE[draft.rules] : 'Любые правила'}
                  </button>
                </div>
                <h1 className="ui-display ui-title mt-2 text-[2.2rem] leading-tight text-ink">{party ? 'Ваш стол' : 'Соберите свой стол'}</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {party ? 'Игроки увидят изменения сразу' : 'Вы станете мастером: игроки войдут по коду приглашения'}
                </p>
              </div>
              <div className="ui-scroll grid min-h-0 grid-cols-2 gap-8 overflow-y-auto px-10 py-6">
                <div className="flex flex-col gap-5">
                  <ImageSlot
                    label="Обложка"
                    hint="Горизонтальная картинка: место действия, карта, настроение"
                    kind="cover"
                    asset={draft.coverAssetId ?? undefined}
                    onUploaded={(id) => patch({ coverAssetId: id ?? null })}
                    className="aspect-video"
                  />
                  <Field label="Описание" hint="Пара строк на обложке: что знают игроки, садясь за стол">
                    {(props) => (
                      <TextArea
                        {...props}
                        rows={3}
                        value={draft.description}
                        maxLength={2000}
                        className="resize-none"
                        onChange={(e) => patch({ description: e.target.value })}
                      />
                    )}
                  </Field>
                </div>
                <div className="flex flex-col gap-5">
                  <Field label="Название" error={touched && !draft.name.trim() ? 'Назовите партию' : undefined}>
                    {(props) => (
                      <Input
                        {...props}
                        autoFocus
                        value={draft.name}
                        maxLength={80}
                        placeholder="Тени над Иннсмутом"
                        onChange={(e) => patch({ name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && void submit()}
                      />
                    )}
                  </Field>
                  <Field label="Летопись" hint="Markdown: история, места, лица, правила стола. Открывается кликом по обложке">
                    {({ id }) => (
                      <MarkdownField
                        id={id}
                        rows={11}
                        value={draft.lore}
                        placeholder={LORE_PLACEHOLDER}
                        onChange={(lore) => patch({ lore })}
                      />
                    )}
                  </Field>
                </div>
              </div>
              <footer className="flex items-center gap-3 border-t border-line/50 px-10 py-5">
                {party ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setStep('world')}>
                      Сменить мир
                    </Button>
                    <Button variant="ghost" size="sm" icon={<IconTrash width={15} height={15} />} onClick={() => setDeleting(true)}>
                      Распустить партию
                    </Button>
                  </>
                ) : null}
                <div className="ml-auto flex gap-3">
                  <Button variant="secondary" onClick={party ? leave : () => setStep('world')}>
                    {party ? 'Отмена' : 'Назад'}
                  </Button>
                  <Button variant="primary" disabled={busy} onClick={() => void submit()}>
                    {party ? 'Сохранить' : 'Создать партию'}
                  </Button>
                </div>
              </footer>
            </Panel>
          </motion.main>
        )}
      </AnimatePresence>

      {party && (
        <ConfirmDialog
          open={deleting}
          title="Распустить партию?"
          message="Стол, его НПС и бой исчезнут для всех игроков. Герои останутся у своих владельцев."
          confirmLabel="Распустить"
          danger
          onCancel={() => setDeleting(false)}
          onConfirm={() => void remove(party.id).then((removed) => removed && go({ screen: 'home' }))}
        />
      )}
    </SettingScope>
  );
};
