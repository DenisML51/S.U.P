import React, { useState } from 'react';
import { CONDITIONS, damageBonusOfBuild } from '@itd/game-logic';
import {
  NPC_COPIES_MAX,
  npcMinHP,
  type NpcAttack,
  type NpcCocStats,
  type NpcDisposition,
  type NpcDndAttack,
  type PartyNpcDto,
  type Setting,
} from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { ImageSlot } from '../../ui/ImageSlot';
import { MarkdownField, NumberField, Segmented, Switch } from '../../ui/forms';
import { CONDITION_ICONS, CatalogIcon } from '../../ui/GameIcon';
import { FormSection } from '../sheet/dialogs/parts';
import { IconClose, IconCreate, IconTrash } from '../../ui/icons';
import { Button, Field, IconButton, Input } from '../../ui/primitives';

interface Draft {
  name: string;
  portraitAssetId: string | null;
  maxHP: number;
  currentHP: number;
  armorClass: number;
  initiativeBonus: number;
  disposition: NpcDisposition;
  coc: NpcCocStats;
  conditions: string[];
  attacks: NpcDndAttack[];
  notes: string;
  /** Copies to make of a new NPC. */
  count: number;
}

const NO_COC: NpcCocStats = { armor: 0, build: 0, damageBonus: '', attacks: [], sanityLoss: '', firearmReady: false };
/** Attacks an NPC may list (the schema's limit). */
const ATTACKS = 8;

const draftOf = (npc: PartyNpcDto | undefined, coc: boolean, disposition: NpcDisposition): Draft => ({
  name: npc?.name ?? '',
  portraitAssetId: npc?.portraitAssetId ?? null,
  maxHP: npc?.maxHP ?? 10,
  // An NPC hurt below the Call of Cthulhu floor before it came starts at the floor.
  currentHP: npc ? Math.max(npcMinHP(coc), npc.currentHP) : 10,
  // A Call of Cthulhu NPC has no armour class (its armour is `coc.armor`); initiative is its DEX.
  armorClass: npc?.armorClass ?? (coc ? 0 : 12),
  initiativeBonus: npc?.initiativeBonus ?? (coc ? 50 : 0),
  disposition: npc?.disposition ?? disposition,
  coc: { ...NO_COC, ...npc?.coc },
  conditions: npc?.conditions ?? [],
  attacks: npc?.attacks ?? [],
  notes: npc?.notes ?? '',
  count: 1,
});

/** A dice field: "+1D4", "0/1D6". The server keeps only dice, numbers, + − and /. */
const DiceInput: React.FC<{ id: string; value: string; placeholder: string; maxLength: number; onChange: (value: string) => void }> = ({
  id,
  value,
  placeholder,
  maxLength,
  onChange,
}) => (
  <Input
    id={id}
    value={value}
    maxLength={maxLength}
    placeholder={placeholder}
    className="ui-numeric"
    onChange={(e) => onChange(e.target.value.replace(/[^0-9DdКк+\-−/ ]/g, ''))}
  />
);

/**
 * A quick NPC: a face, hit points, armour and initiative. Only the master ever sees the numbers. In a
 * Call of Cthulhu fight: DEX instead of initiative, armour points, build, damage bonus, attacks and
 * the sanity it costs to see.
 */
export const NpcDialog: React.FC<{
  open: boolean;
  partyId: string;
  setting: Setting;
  npc?: PartyNpcDto;
  /** A new NPC starts on the side of the stack it was added from. */
  disposition?: NpcDisposition;
  /** A Call of Cthulhu NPC (see `isCocFight`). */
  coc?: boolean;
  onClose: () => void;
}> = ({ open, partyId, setting, npc, disposition = 'hostile', coc = false, onClose }) => {
  const createNpc = usePartyStore((s) => s.createNpc);
  const updateNpc = usePartyStore((s) => s.updateNpc);
  const removeNpc = usePartyStore((s) => s.removeNpc);
  const [draft, setDraft] = useState(() => draftOf(npc, coc, disposition));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));
  const patchCoc = (next: Partial<NpcCocStats>) => setDraft((current) => ({ ...current, coc: { ...current.coc, ...next } }));
  const patchAttack = (index: number, next: Partial<NpcAttack>) =>
    patchCoc({ attacks: draft.coc.attacks.map((attack, i) => (i === index ? { ...attack, ...next } : attack)) });
  const patchDndAttack = (index: number, next: Partial<NpcDndAttack>) =>
    patch({ attacks: draft.attacks.map((attack, i) => (i === index ? { ...attack, ...next } : attack)) });
  const toggleCondition = (id: string) =>
    patch({ conditions: draft.conditions.includes(id) ? draft.conditions.filter((c) => c !== id) : [...draft.conditions, id] });

  const submit = async () => {
    setTouched(true);
    const name = draft.name.trim();
    if (!name) return;
    setBusy(true);
    const { coc: stats, count, ...rest } = draft;
    // An attack without a name is a row left empty.
    const fields = {
      ...rest,
      name,
      notes: rest.notes.trim(),
      attacks: rest.attacks
        .map((attack) => ({ ...attack, name: attack.name.trim(), damage: attack.damage.trim() }))
        .filter((attack) => attack.name),
    };
    // Other NPCs keep whatever Call of Cthulhu numbers they had.
    const input = coc
      ? {
          ...fields,
          coc: {
            ...stats,
            attacks: stats.attacks
              .map((attack) => ({ ...attack, name: attack.name.trim(), damage: attack.damage.trim() }))
              .filter((attack) => attack.name),
          },
        }
      : fields;
    const saved = npc
      ? await updateNpc(partyId, npc.id, input)
      : await createNpc(partyId, { ...input, currentHP: draft.maxHP, count });
    setBusy(false);
    if (saved) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      setting={setting}
      width="lg"
      eyebrow="НПС · видит только мастер"
      title={npc ? npc.name : 'Быстрый НПС'}
      footerStart={
        npc && (
          <Button
            variant="ghost"
            icon={<IconTrash width={16} height={16} />}
            onClick={() => void removeNpc(partyId, npc.id).then((removed) => removed && onClose())}
          >
            Удалить
          </Button>
        )
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void submit()}>
            {npc ? 'Сохранить' : draft.count > 1 ? `Добавить ×${draft.count}` : 'Добавить'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-5 pt-1 max-sm:grid-cols-1">
        <ImageSlot
          label="Портрет"
          hint="Необязательно"
          kind="portrait"
          asset={draft.portraitAssetId ?? undefined}
          onUploaded={(id) => patch({ portraitAssetId: id ?? null })}
          className="h-[11rem] max-sm:mx-auto max-sm:w-[9.5rem]"
        />
        <div className="space-y-4">
          <Field label="Имя" error={touched && !draft.name.trim() ? 'Назовите НПС' : undefined}>
            {(props) => (
              <Input
                {...props}
                data-autofocus
                value={draft.name}
                maxLength={80}
                placeholder={coc ? 'Культист Дагона' : 'Гуль-падальщик'}
                onChange={(e) => patch({ name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && void submit()}
              />
            )}
          </Field>
          <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
            <FormSection label="Сторона">
              <Segmented
                label="Отношение к героям"
                value={draft.disposition}
                onChange={(disposition) => patch({ disposition })}
                options={[
                  { value: 'hostile', label: 'Враждебный', tone: 'danger' },
                  { value: 'friendly', label: 'Дружелюбный', tone: 'success' },
                ]}
              />
            </FormSection>
            {/* A band of the same foes in one go: each copy its own NPC with its own hit points and turn. */}
            {!npc && (
              <Field label="Сколько таких" hint="Каждый — свой НПС: «Гоблин 1», «Гоблин 2»">
                {({ id }) => (
                  <NumberField
                    id={id}
                    value={draft.count}
                    min={1}
                    max={NPC_COPIES_MAX}
                    onChange={(count) => patch({ count })}
                    className="w-36"
                  />
                )}
              </Field>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
            <Field label="Хиты">
              {({ id }) => (
                <NumberField
                  id={id}
                  value={draft.maxHP}
                  min={1}
                  max={9999}
                  onChange={(maxHP) => patch({ maxHP, currentHP: npc ? Math.min(draft.currentHP, maxHP) : maxHP })}
                />
              )}
            </Field>
            {coc ? (
              <Field label="Броня" hint="Очки брони">
                {({ id }) => <NumberField id={id} value={draft.coc.armor} min={0} max={20} onChange={(armor) => patchCoc({ armor })} />}
              </Field>
            ) : (
              <Field label="КБ">
                {({ id }) => <NumberField id={id} value={draft.armorClass} min={0} max={99} onChange={(armorClass) => patch({ armorClass })} />}
              </Field>
            )}
            <Field label={coc ? 'ЛВК' : 'Инициатива'}>
              {({ id }) =>
                coc ? (
                  <NumberField id={id} value={draft.initiativeBonus} min={1} max={150} onChange={(initiativeBonus) => patch({ initiativeBonus })} />
                ) : (
                  <NumberField id={id} value={draft.initiativeBonus} min={-20} max={30} signed onChange={(initiativeBonus) => patch({ initiativeBonus })} />
                )
              }
            </Field>
          </div>
          {coc && (
            <>
              <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-2">
                <Field label="Комплекция">
                  {({ id }) => (
                    <NumberField
                      id={id}
                      value={draft.coc.build}
                      min={-2}
                      max={20}
                      signed
                      onChange={(build) =>
                        // The damage bonus follows the Build by the table, unless the master wrote their own.
                        patchCoc({
                          build,
                          ...(draft.coc.damageBonus === '' ||
                          draft.coc.damageBonus === damageBonusOfBuild(draft.coc.build)
                            ? { damageBonus: damageBonusOfBuild(build) }
                            : {}),
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Бонус урона">
                  {({ id }) => (
                    <DiceInput id={id} value={draft.coc.damageBonus} maxLength={12} placeholder="+1D4" onChange={(damageBonus) => patchCoc({ damageBonus })} />
                  )}
                </Field>
                <Field label="Потеря рассудка">
                  {({ id }) => (
                    <DiceInput id={id} value={draft.coc.sanityLoss} maxLength={20} placeholder="0/1D6" onChange={(sanityLoss) => patchCoc({ sanityLoss })} />
                  )}
                </Field>
              </div>
              <Switch
                checked={draft.coc.firearmReady}
                onChange={(firearmReady) => patchCoc({ firearmReady })}
                label="Огнестрельное оружие наготове"
                hint="+50 к порядку хода по ЛВК"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted">Атаки</span>
                  {draft.coc.attacks.length < ATTACKS && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<IconCreate width={14} height={14} />}
                      onClick={() => patchCoc({ attacks: [...draft.coc.attacks, { name: '', skill: 50, damage: '' }] })}
                    >
                      Добавить
                    </Button>
                  )}
                </div>
                {draft.coc.attacks.length === 0 && (
                  <p className="text-xs text-ink-faint">Чем бьёт или стреляет. При равной ЛВК первым ходит тот, у кого выше боевой навык.</p>
                )}
                {draft.coc.attacks.map((attack, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_5.5rem_7rem_auto] items-center gap-2">
                    <Input
                      aria-label="Атака"
                      value={attack.name}
                      maxLength={60}
                      placeholder="Нож"
                      onChange={(e) => patchAttack(index, { name: e.target.value })}
                    />
                    <NumberField value={attack.skill} min={0} max={200} label="Навык, %" onChange={(skill) => patchAttack(index, { skill })} />
                    <Input
                      aria-label="Урон"
                      value={attack.damage}
                      maxLength={30}
                      placeholder="1D4+БУ"
                      className="ui-numeric"
                      onChange={(e) => patchAttack(index, { damage: e.target.value })}
                    />
                    <IconButton
                      label="Убрать атаку"
                      size={28}
                      onClick={() => patchCoc({ attacks: draft.coc.attacks.filter((_, i) => i !== index) })}
                    >
                      <IconClose width={12} height={12} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </>
          )}
          {!coc && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">Атаки</span>
                {draft.attacks.length < ATTACKS && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconCreate width={14} height={14} />}
                    onClick={() => patch({ attacks: [...draft.attacks, { name: '', hitBonus: 4, damage: '' }] })}
                  >
                    Добавить
                  </Button>
                )}
              </div>
              {draft.attacks.length === 0 && <p className="text-xs text-ink-faint">Чем бьёт: попадание и урон под рукой в бою.</p>}
              {draft.attacks.map((attack, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_6.5rem_9rem_auto] items-center gap-2 max-sm:grid-cols-[minmax(0,1fr)_6.5rem_auto]">
                  <Input
                    aria-label="Атака"
                    value={attack.name}
                    maxLength={60}
                    placeholder="Скимитар"
                    onChange={(e) => patchDndAttack(index, { name: e.target.value })}
                  />
                  <NumberField
                    value={attack.hitBonus}
                    min={-20}
                    max={40}
                    signed
                    label="Попадание"
                    onChange={(hitBonus) => patchDndAttack(index, { hitBonus })}
                  />
                  <Input
                    aria-label="Урон"
                    value={attack.damage}
                    maxLength={60}
                    placeholder="1d6 + 2"
                    className="ui-numeric max-sm:order-last max-sm:col-span-3"
                    onChange={(e) => patchDndAttack(index, { damage: e.target.value })}
                  />
                  <IconButton
                    label="Убрать атаку"
                    size={28}
                    onClick={() => patch({ attacks: draft.attacks.filter((_, i) => i !== index) })}
                  >
                    <IconClose width={12} height={12} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
          {npc && (
            <Field label="Текущие хиты">
              {({ id }) => (
                <NumberField
                  id={id}
                  value={draft.currentHP}
                  min={npcMinHP(coc)}
                  max={draft.maxHP}
                  onChange={(currentHP) => patch({ currentHP })}
                  className="w-40"
                />
              )}
            </Field>
          )}
          {/* Conditions come in the fight: a new NPC starts without them. */}
          {!coc && npc && (
            <div className="space-y-2">
              <span className="text-sm text-ink-muted">Состояния</span>
              <div className="flex flex-wrap gap-1.5">
                {CONDITIONS.map((condition) => {
                  const on = draft.conditions.includes(condition.id);
                  return (
                    <button
                      key={condition.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleCondition(condition.id)}
                      className="ui-chip flex items-center gap-1.5"
                    >
                      <CatalogIcon id={CONDITION_ICONS[condition.id] ?? 'terror'} size={14} />
                      {condition.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Field label="Заметки" hint="Тактика, что знает, что при нём">
            {({ id }) => <MarkdownField id={id} value={draft.notes} onChange={(notes) => patch({ notes })} rows={3} />}
          </Field>
        </div>
      </div>
    </Dialog>
  );
};
