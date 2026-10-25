import React, { useState } from 'react';
import { npcMinHP, type NpcAttack, type NpcCocStats, type NpcDisposition, type PartyNpcDto, type Setting } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { ImageSlot } from '../../ui/ImageSlot';
import { NumberField, Segmented, Switch } from '../../ui/forms';
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
}

const NO_COC: NpcCocStats = { armor: 0, build: 0, damageBonus: '', attacks: [], sanityLoss: '', firearmReady: false };
/** Attacks an NPC may list (the schema's limit). */
const ATTACKS = 8;

const draftOf = (npc: PartyNpcDto | undefined, coc: boolean): Draft => ({
  name: npc?.name ?? '',
  portraitAssetId: npc?.portraitAssetId ?? null,
  maxHP: npc?.maxHP ?? 10,
  currentHP: npc?.currentHP ?? 10,
  // A Call of Cthulhu NPC has no armour class (its armour is `coc.armor`); initiative is its DEX.
  armorClass: npc?.armorClass ?? (coc ? 0 : 12),
  initiativeBonus: npc?.initiativeBonus ?? (coc ? 50 : 0),
  disposition: npc?.disposition ?? 'hostile',
  coc: { ...NO_COC, ...npc?.coc },
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
  /** A Call of Cthulhu NPC (see `isCocFight`). */
  coc?: boolean;
  onClose: () => void;
}> = ({ open, partyId, setting, npc, coc = false, onClose }) => {
  const createNpc = usePartyStore((s) => s.createNpc);
  const updateNpc = usePartyStore((s) => s.updateNpc);
  const removeNpc = usePartyStore((s) => s.removeNpc);
  const [draft, setDraft] = useState(() => draftOf(npc, coc));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));
  const patchCoc = (next: Partial<NpcCocStats>) => setDraft((current) => ({ ...current, coc: { ...current.coc, ...next } }));
  const patchAttack = (index: number, next: Partial<NpcAttack>) =>
    patchCoc({ attacks: draft.coc.attacks.map((attack, i) => (i === index ? { ...attack, ...next } : attack)) });

  const submit = async () => {
    setTouched(true);
    const name = draft.name.trim();
    if (!name) return;
    setBusy(true);
    const { coc: stats, ...fields } = draft;
    // Other NPCs keep whatever Call of Cthulhu numbers they had; an attack without a name is a row left empty.
    const input = coc
      ? {
          ...fields,
          name,
          coc: {
            ...stats,
            attacks: stats.attacks
              .map((attack) => ({ ...attack, name: attack.name.trim(), damage: attack.damage.trim() }))
              .filter((attack) => attack.name),
          },
        }
      : { ...fields, name };
    const saved = npc
      ? await updateNpc(partyId, npc.id, input)
      : await createNpc(partyId, { ...input, currentHP: draft.maxHP });
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
            {npc ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-5 pt-1">
        <ImageSlot
          label="Портрет"
          hint="Необязательно"
          kind="portrait"
          asset={draft.portraitAssetId ?? undefined}
          onUploaded={(id) => patch({ portraitAssetId: id ?? null })}
          className="h-[11rem]"
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
          <Segmented
            label="Отношение к героям"
            value={draft.disposition}
            onChange={(disposition) => patch({ disposition })}
            options={[
              { value: 'hostile', label: 'Враждебный', tone: 'danger' },
              { value: 'friendly', label: 'Дружелюбный', tone: 'success' },
            ]}
          />
          <div className="grid grid-cols-3 gap-3">
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
              <div className="grid grid-cols-3 gap-3">
                <Field label="Комплекция">
                  {({ id }) => <NumberField id={id} value={draft.coc.build} min={-2} max={20} signed onChange={(build) => patchCoc({ build })} />}
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
        </div>
      </div>
    </Dialog>
  );
};
