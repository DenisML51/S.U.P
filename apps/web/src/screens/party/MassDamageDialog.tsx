import React, { useMemo, useState } from 'react';
import { npcMinHP, type PartyDto } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { Switch } from '../../ui/forms';
import { Button, Input } from '../../ui/primitives';
import { isCocFight } from './partyView';

/**
 * One blow on several NPCs at once (a fireball over five goblins): tick who it reaches, mark those
 * who saved for half, then damage or heal them all. Heroes keep their own sheets.
 */
export const MassDamageDialog: React.FC<{ open: boolean; party: PartyDto; onClose: () => void }> = ({
  open,
  party,
  onClose,
}) => {
  const updateNpc = usePartyStore((s) => s.updateNpc);
  const coc = isCocFight(party);
  const inFight = useMemo(() => new Set(party.combat?.combatants.map((c) => c.refId) ?? []), [party]);
  const npcs = (party.npcs ?? []).filter((npc) => inFight.has(npc.id));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(npcs.filter((n) => n.disposition === 'hostile' && n.currentHP > 0).map((n) => n.id)));
  const [halved, setHalved] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const amount = Number(text.replace(/[^\d]/g, ''));
  const flip = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    return next;
  };

  const apply = async (sign: -1 | 1) => {
    if (!amount) return;
    setBusy(true);
    for (const npc of npcs.filter((n) => picked.has(n.id))) {
      const share = halved.has(npc.id) ? Math.floor(amount / 2) : amount;
      const currentHP = Math.max(npcMinHP(coc || !!npc.coc), Math.min(npc.maxHP, npc.currentHP + sign * share));
      if (currentHP !== npc.currentHP) await updateNpc(party.id, npc.id, { currentHP });
    }
    setBusy(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      setting={party.setting}
      width="md"
      eyebrow="Бой"
      title="Урон по нескольким"
      subtitle="Отметьте, кого задело; «половина» — для выдержавших спасбросок"
      footer={
        <>
          <Button variant="secondary" disabled={!amount || picked.size === 0 || busy} onClick={() => void apply(1)}>
            Лечение
          </Button>
          <Button variant="danger" disabled={!amount || picked.size === 0 || busy} onClick={() => void apply(-1)}>
            Урон
          </Button>
        </>
      }
    >
      <Input
        aria-label="Сколько"
        inputMode="numeric"
        placeholder="Урон, например 28"
        className="ui-numeric mb-4 w-full text-lg"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
        data-autofocus
      />
      {npcs.length === 0 ? (
        <p className="text-sm text-ink-faint">В бою нет НПС.</p>
      ) : (
        <ul className="divide-y divide-line/40">
          {npcs.map((npc) => (
            <li key={npc.id} className="flex items-center gap-3 py-2">
              <Switch checked={picked.has(npc.id)} onChange={() => setPicked((s) => flip(s, npc.id))} label={npc.name} />
              <span className="ui-numeric ml-auto text-xs text-ink-muted">
                {npc.currentHP}/{npc.maxHP}
                {picked.has(npc.id) && amount > 0 && (
                  <span className="text-ink"> → {Math.max(npcMinHP(coc || !!npc.coc), npc.currentHP - (halved.has(npc.id) ? Math.floor(amount / 2) : amount))}</span>
                )}
              </span>
              <button
                type="button"
                aria-pressed={halved.has(npc.id)}
                disabled={!picked.has(npc.id)}
                onClick={() => setHalved((s) => flip(s, npc.id))}
                className="ui-chip !px-2 text-xs disabled:opacity-40"
                title="Выдержал спасбросок: половина урона"
              >
                ½
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
};
