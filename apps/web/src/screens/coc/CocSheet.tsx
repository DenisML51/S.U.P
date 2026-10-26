import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  COC_CONDITIONS,
  CONDITION_IDS,
  absorbArmor,
  applyHitDamage,
  applyWeeklyRecovery,
  archetypeDef,
  changeMagic,
  cocCharacteristics,
  heal,
  occupationDef,
  setLuck,
  stabilise,
  weeklyRecovery,
} from '@itd/game-logic/coc';
import { maxSanityOf } from '@itd/game-logic';
import { useNavStore } from '../../store/useNavStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { Rail, RailButton, RailDivider } from '../../ui/Rail';
import { HeroExits } from '../sheet/HeroExits';
import { Button, IconButton, cx } from '../../ui/primitives';
import { useAtLeast } from '../../ui/useBreakpoint';
import { NumberField } from '../../ui/forms';
import {
  IconAttacks,
  IconAttributes,
  IconCharacter,
  IconClose,
  IconCombat,
  IconDice,
  IconHistory,
  IconInventory,
  IconPrev,
  IconSanity,
  IconSettings,
} from '../../ui/icons';
import { useCoc } from './context';
import { ConditionsDialog, FollowUpBanners } from './controls';
import { setArmor } from './sheetRules';
import { InsanityVeil, madnessStage } from './InsanityVeil';
import { Track } from './parts';
import { CocDetailsLayout, CocSelectionProvider, useCocSelection } from './details';
import { GearSection, InvestigatorSection, SanitySection, StorySection, WeaponsSection } from './sections';
import './coc.css';

export type CocSection = 'investigator' | 'weapons' | 'sanity' | 'gear' | 'story' | 'journal';

const SECTIONS: { id: CocSection; label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'investigator', label: 'Сыщик', Icon: IconAttributes },
  { id: 'weapons', label: 'Оружие', Icon: IconAttacks },
  { id: 'sanity', label: 'Рассудок', Icon: IconSanity },
  { id: 'gear', label: 'Вещи', Icon: IconInventory },
  { id: 'story', label: 'История', Icon: IconCharacter },
  { id: 'journal', label: 'Журнал', Icon: IconHistory },
];

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/** Who the investigator is and what changes minute to minute: hit points, magic, sanity, luck. */
const InvestigatorColumn: React.FC<{
  footer?: React.ReactNode;
  onProfile?: () => void;
  /** Its width and edge: the fixed column beside the section by default, the drawer's own on a narrow screen. */
  className?: string;
  /** In a drawer: the button that puts it away. */
  onClose?: () => void;
}> = ({ footer, onProfile, className = 'w-[340px] border-r', onClose }) => {
  const { open } = useCocSelection();
  const { character, update, roll, present } = useCoc();
  const coc = character.coc!;
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const armor = coc.armor ?? 0;
  const has = (id: string) => character.conditions.includes(id);
  const majorWound = has(CONDITION_IDS.majorWound);
  const hurt = character.currentHP < character.maxHP;

  const takeHit = () => {
    const taken = absorbArmor(amount, armor);
    update(applyHitDamage(amount), {
      message: armor > 0 ? `Урон ${amount}, броня −${Math.min(amount, armor)}: ${taken}` : `Урон ${amount}`,
      type: 'health',
    });
  };
  /** A week of rest with a major wound: the CON roll is made here, the edit writes down what it gave. */
  const restWeek = () => {
    const result = weeklyRecovery(character);
    if (!result.needed || !result.check) return;
    const note = result.check.success
      ? `Восстановлено ${result.gain} хитов${result.clearsMajorWound ? '; серьёзная рана зажила' : ''}.`
      : 'Неделя прошла без улучшения.';
    present(
      { label: 'Неделя отдыха: ВЫН', value: cocCharacteristics(character).con, kind: 'rule' },
      result.check,
      { note },
    );
    update(applyWeeklyRecovery(result), { message: `Неделя отдыха: ${note}`, type: 'health' }, { quiet: true });
  };
  const build = character.build?.ruleset === 'coc7' ? character.build : undefined;
  const occupation = occupationDef(build?.occupation)?.name ?? character.class;
  const archetype = archetypeDef(build?.archetype)?.name;
  const [amount, setAmount] = useState(1);
  const maxMP = Math.floor(cocCharacteristics(character).pow / 5);
  const conditions = character.conditions
    .map((id) => COC_CONDITIONS.find((c) => c.id === id))
    .filter(Boolean);

  return (
    <aside className={cx('flex h-full shrink-0 flex-col border-line/70 bg-surface/40', className)}>
      <div className="relative h-[210px] shrink-0 overflow-hidden">
        <CharacterArt
          source={character}
          kind="portrait"
          position="50% 12%"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        {onProfile && (
          <button
            type="button"
            onClick={onProfile}
            className="absolute inset-0"
            aria-label="Профиль: имя, сеттинг, портрет и арт"
            title="Профиль: имя, сеттинг, портрет и арт"
          />
        )}
        {onClose && (
          <IconButton label="Свернуть" size={40} onClick={onClose} className="absolute right-3 top-3 bg-bg/60">
            <IconClose width={18} height={18} />
          </IconButton>
        )}
        <span className="pointer-events-none absolute inset-x-5 bottom-3">
          <span
            className="ui-display block text-[1.7rem] leading-tight text-ink"
            role="heading"
            aria-level={1}
          >
            {character.name}
          </span>
          <span className="block truncate text-sm text-ink-muted">
            {[occupation, archetype, build && `${build.age} лет`].filter(Boolean).join(' · ')}
          </span>
        </span>
      </div>

      <div className="ui-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-3">
        <FollowUpBanners />
        <Track label="Хиты" value={character.currentHP} max={character.maxHP} tone="hp" />
        <div className="flex flex-wrap items-center gap-2">
          <NumberField
            label="Сколько"
            value={amount}
            onChange={(v) => setAmount(Math.max(1, v ?? 1))}
            min={1}
            className="w-20"
          />
          <Button
            size="sm"
            variant="danger"
            onClick={takeHit}
            title={armor > 0 ? `Броня снимает ${armor} с каждого удара` : 'Урон от удара'}
          >
            Урон
          </Button>
          <Button
            size="sm"
            onClick={() => update(heal(amount), { message: `Лечение ${amount}`, type: 'health' })}
          >
            Лечение
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">Броня</span>
          <NumberField
            label="Броня"
            value={armor}
            min={0}
            max={20}
            onChange={(v) => update(setArmor(v), { message: `Броня: ${armor} → ${v}`, type: 'health' })}
            className="w-20"
          />
          {has(CONDITION_IDS.dying) && (
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                update(stabilise, { message: 'Первая помощь: состояние стабильно, +1 хит', type: 'health' })
              }
              title="Успешная первая помощь при смерти: +1 хит, жизнь вне опасности на час"
            >
              Первая помощь
            </Button>
          )}
          {majorWound ? (
            <Button
              size="sm"
              onClick={restWeek}
              title="С серьёзной раной: бросок ВЫН в конце недели — успех +1d3, экстремальный +2d3 и рана заживает"
            >
              Неделя отдыха
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!hurt}
              onClick={() => update(heal(1), { message: 'День отдыха: +1 хит', type: 'health' })}
              title="Без серьёзной раны хиты восстанавливаются по 1 в день"
            >
              День отдыха
            </Button>
          )}
        </div>
        <Track
          label="Магия"
          value={coc.magicPoints}
          max={maxMP}
          tone="accent"
          onChange={(d) => update(changeMagic(d))}
        />
        <Track label="Рассудок" value={character.sanity} max={maxSanityOf(character)} tone="sanity" />
        <Track
          label="Удача"
          value={coc.luck}
          max={99}
          tone="xp"
          onChange={(d) => update(setLuck(coc.luck + d))}
        >
          <Button
            size="row"
            variant="ghost"
            className="justify-self-start"
            onClick={() => roll({ label: 'Удача', value: coc.luck, kind: 'luck' })}
            title="Бросок удачи — без сложности и без бонусных и штрафных костей"
          >
            Бросок удачи
          </Button>
        </Track>

        <div className="flex flex-wrap items-center gap-1.5">
          {conditions.map((c) => (
              <button
                key={c!.id}
                type="button"
                onClick={() => open('condition', c!.id)}
                title={c!.description}
                className="border border-danger/50 bg-surface-2/70 px-2.5 py-1 text-xs text-danger hover:border-danger"
                style={{ borderRadius: 'var(--radius)' }}
              >
                {c!.name}
              </button>
            ))}
          <Button size="row" variant="ghost" onClick={() => setConditionsOpen(true)}>
            Состояния…
          </Button>
        </div>
        <ConditionsDialog open={conditionsOpen} onClose={() => setConditionsOpen(false)} />
      </div>
      {footer && <div className="shrink-0 border-t border-line/70 px-4 py-2">{footer}</div>}
    </aside>
  );
};

/**
 * The investigator's sheet: rail, the investigator always in view, the chosen section. The same
 * view runs in the app and in the design showcase; what it changes goes through `useCoc`.
 */
export const CocSheetView: React.FC<{
  onBack?: () => void;
  onCombat?: () => void;
  onDice?: () => void;
  onSettings?: () => void;
  /** Opens the profile dialog (name, setting, portrait and art). */
  onProfile?: () => void;
  journal?: React.ReactNode;
  footer?: React.ReactNode;
  /** The showcase pins the result inside its frame instead of the window corner. */
  className?: string;
}> = (props) => (
  <CocSelectionProvider>
    <SheetLayout {...props} />
  </CocSelectionProvider>
);

const SheetLayout: React.FC<React.ComponentProps<typeof CocSheetView>> = (props) => {
  // Below the desktop width there is no room for the rail and the column beside the section.
  const desktop = useAtLeast('desktop');
  return desktop ? <WideLayout {...props} /> : <NarrowLayout {...props} />;
};

/** The chosen section's content. */
const SectionBody: React.FC<{ section: CocSection; journal?: React.ReactNode }> = ({ section, journal }) => (
  <>
    {section === 'investigator' && <InvestigatorSection />}
    {section === 'weapons' && <WeaponsSection />}
    {section === 'sanity' && <SanitySection />}
    {section === 'gear' && <GearSection />}
    {section === 'story' && <StorySection />}
    {section === 'journal' && journal}
  </>
);

/** The desktop sheet: the rail, the investigator's column, the section beside them. */
const WideLayout: React.FC<React.ComponentProps<typeof CocSheetView>> = ({
  onCombat,
  onDice,
  onSettings,
  onProfile,
  journal,
  footer,
  className,
}) => {
  const { character } = useCoc();
  const { close } = useCocSelection();
  const [section, setSection] = useState<CocSection>('investigator');
  const stage = madnessStage(character);

  return (
    <div className={cx('coc-sheet relative flex h-full', className)}>
      <motion.div
        className="flex h-full w-full"
        exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.25 } }}
      >
        <motion.div
          className="flex shrink-0"
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={ENTER}
        >
          <Rail label="Разделы листа">
            <HeroExits />
            <RailDivider />
            <div className="flex flex-1 flex-col">
              {SECTIONS.map(({ id, label, Icon }) => (
                <RailButton
                  key={id}
                  label={label}
                  Icon={Icon}
                  active={section === id}
                  onClick={() => {
                    setSection(id);
                    close();
                  }}
                />
              ))}
            </div>
            <RailButton
              label="Бой"
              Icon={IconCombat}
              onClick={onCombat ?? (() => undefined)}
              hint="Боевой режим"
            />
            <RailButton label="Кубики" Icon={IconDice} onClick={onDice ?? (() => undefined)} />
            <RailButton
              label="Опции"
              Icon={IconSettings}
              onClick={onSettings ?? (() => undefined)}
              hint="Настройки"
            />
          </Rail>
        </motion.div>
        <motion.div
          className="flex shrink-0"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...ENTER, delay: 0.06 }}
        >
          <InvestigatorColumn footer={footer} onProfile={onProfile} />
        </motion.div>
        <motion.main
          className="min-w-0 flex-1 px-10 py-8"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...ENTER, delay: 0.14 }}
        >
          <CocDetailsLayout>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={section}
                className="ui-scroll ui-scroll--bare -m-4 h-[calc(100%+2rem)] overflow-y-auto p-4 pb-7"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <SectionBody section={section} journal={journal} />
              </motion.div>
            </AnimatePresence>
          </CocDetailsLayout>
        </motion.main>
      </motion.div>
      <InsanityVeil stage={stage} />
    </div>
  );
};

/**
 * The sheet on a phone or a tablet: a header with the investigator's vital numbers (the whole column
 * slides out of it as a drawer), the section across the width scrolling down, the sections as tabs
 * along the bottom.
 */
const NarrowLayout: React.FC<React.ComponentProps<typeof CocSheetView>> = ({
  onBack,
  onCombat,
  onDice,
  onSettings,
  onProfile,
  journal,
  footer,
  className,
}) => {
  const { character } = useCoc();
  const { close } = useCocSelection();
  const [section, setSection] = useState<CocSection>('investigator');
  const [drawer, setDrawer] = useState(false);
  const stage = madnessStage(character);
  const atTable = useNavStore((s) => s.place.screen === 'party');
  const coc = character.coc!;
  const maxMP = Math.floor(cocCharacteristics(character).pow / 5);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className={cx('coc-sheet coc-touch relative flex h-full flex-col', className)}>
      <header className="flex shrink-0 items-center gap-1 border-b border-line/70 bg-surface/40 px-4 py-1.5">
        <IconButton
          label={atTable ? 'К столу партии' : 'К выбору героя'}
          size={40}
          onClick={onBack ?? (() => undefined)}
          className="-ml-2 shrink-0"
        >
          <IconPrev width={20} height={20} />
        </IconButton>
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-expanded={drawer}
          aria-label={`${character.name}: хиты, магия, рассудок, удача, состояния`}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-frame/70">
            <CharacterArt
              source={character}
              kind="portrait"
              position="50% 15%"
              className="absolute inset-0 h-full w-full"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="ui-display block truncate text-lg leading-tight text-ink" role="heading" aria-level={1}>
              {character.name}
            </span>
            <span className="flex gap-3 overflow-hidden whitespace-nowrap text-xs tabular-nums text-ink-muted">
              <span>
                хиты <b className="font-normal text-hp">{character.currentHP}</b>/{character.maxHP}
              </span>
              <span>
                рассудок <b className="font-normal text-sanity">{character.sanity}</b>
              </span>
              <span className="max-sm:hidden">
                магия <b className="font-normal text-accent">{coc.magicPoints}</b>/{maxMP}
              </span>
              <span className="max-sm:hidden">
                удача <b className="font-normal text-xp">{coc.luck}</b>
              </span>
              {character.conditions.length > 0 && (
                <span className="text-danger">◆ {character.conditions.length}</span>
              )}
            </span>
          </span>
        </button>
        <IconButton label="Боевой режим" size={40} onClick={onCombat ?? (() => undefined)} className="shrink-0">
          <IconCombat width={20} height={20} />
        </IconButton>
        <IconButton label="Кубики" size={40} onClick={onDice ?? (() => undefined)} className="shrink-0">
          <IconDice width={20} height={20} />
        </IconButton>
        <IconButton
          label="Настройки"
          size={40}
          onClick={onSettings ?? (() => undefined)}
          className="-mr-2 shrink-0"
        >
          <IconSettings width={20} height={20} />
        </IconButton>
      </header>

      <main className="ui-scroll ui-scroll--bare min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
        <CocDetailsLayout className="">
          <SectionBody section={section} journal={journal} />
        </CocDetailsLayout>
      </main>

      <nav className="ui-rail coc-tabbar grid shrink-0 grid-cols-6" aria-label="Разделы листа">
        {SECTIONS.map(({ id, label, Icon }) => (
          <RailButton
            key={id}
            label={label}
            Icon={Icon}
            active={section === id}
            onClick={() => {
              setSection(id);
              close();
            }}
          />
        ))}
      </nav>

      <AnimatePresence>
        {drawer && (
          <motion.div
            key="drawer"
            className="fixed inset-0 z-[150]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <div className="absolute inset-0 bg-bg-deep/75" onClick={() => setDrawer(false)} aria-hidden />
            <motion.div
              className="absolute inset-y-0 left-0 w-[min(340px,calc(100vw-3rem))] bg-bg shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Сыщик"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={ENTER}
            >
              <InvestigatorColumn
                footer={footer}
                onProfile={onProfile}
                onClose={() => setDrawer(false)}
                className="coc-touch w-full border-r"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <InsanityVeil stage={stage} />
    </div>
  );
};
