import React, { useState } from 'react';
import type { NpcDisposition, PartyNpcDto, Setting } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { ImageSlot } from '../../ui/ImageSlot';
import { NumberField, Segmented } from '../../ui/forms';
import { IconTrash } from '../../ui/icons';
import { Button, Field, Input } from '../../ui/primitives';

interface Draft {
  name: string;
  portraitAssetId: string | null;
  maxHP: number;
  currentHP: number;
  armorClass: number;
  initiativeBonus: number;
  disposition: NpcDisposition;
}

const draftOf = (npc?: PartyNpcDto): Draft => ({
  name: npc?.name ?? '',
  portraitAssetId: npc?.portraitAssetId ?? null,
  maxHP: npc?.maxHP ?? 10,
  currentHP: npc?.currentHP ?? 10,
  armorClass: npc?.armorClass ?? 12,
  initiativeBonus: npc?.initiativeBonus ?? 0,
  disposition: npc?.disposition ?? 'hostile',
});

/** A quick NPC: a face, hit points, armour and initiative. Only the master ever sees the numbers. */
export const NpcDialog: React.FC<{
  open: boolean;
  partyId: string;
  setting: Setting;
  npc?: PartyNpcDto;
  /** A Call of Cthulhu table: no armour class, initiative is the NPC's DEX. */
  coc?: boolean;
  onClose: () => void;
}> = ({ open, partyId, setting, npc, coc, onClose }) => {
  const createNpc = usePartyStore((s) => s.createNpc);
  const updateNpc = usePartyStore((s) => s.updateNpc);
  const removeNpc = usePartyStore((s) => s.removeNpc);
  const [draft, setDraft] = useState(() => (npc || !coc ? draftOf(npc) : { ...draftOf(npc), armorClass: 0, initiativeBonus: 50 }));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));

  const submit = async () => {
    setTouched(true);
    const name = draft.name.trim();
    if (!name) return;
    setBusy(true);
    const saved = npc
      ? await updateNpc(partyId, npc.id, { ...draft, name })
      : await createNpc(partyId, { ...draft, name, currentHP: draft.maxHP });
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
                placeholder="Гуль-падальщик"
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
            {!coc && (
              <Field label="КБ">
                {({ id }) => <NumberField id={id} value={draft.armorClass} min={0} max={99} onChange={(armorClass) => patch({ armorClass })} />}
              </Field>
            )}
            <Field label={coc ? 'ЛВК' : 'Инициатива'}>
              {({ id }) =>
                coc ? (
                  <NumberField id={id} value={draft.initiativeBonus} min={1} max={200} onChange={(initiativeBonus) => patch({ initiativeBonus })} />
                ) : (
                  <NumberField id={id} value={draft.initiativeBonus} min={-20} max={30} signed onChange={(initiativeBonus) => patch({ initiativeBonus })} />
                )
              }
            </Field>
          </div>
          {npc && (
            <Field label="Текущие хиты">
              {({ id }) => (
                <NumberField id={id} value={draft.currentHP} min={-9999} max={draft.maxHP} onChange={(currentHP) => patch({ currentHP })} className="w-40" />
              )}
            </Field>
          )}
        </div>
      </div>
    </Dialog>
  );
};
