import React, { useMemo, useState } from 'react';
import type { PartyDto } from '@itd/schema';
import { assetUrl } from '../../data/api/client';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { IconCheck, IconCombat } from '../../ui/icons';
import { Button, cx } from '../../ui/primitives';
import { isCocFight } from './partyView';

interface Candidate {
  id: string;
  name: string;
  portrait: string | null;
  note: string;
}

/**
 * Who goes into the fight (or joins one under way). Everyone starts picked when a fight begins;
 * once it is under way, only those not yet in it are offered.
 */
export const StartCombatDialog: React.FC<{
  open: boolean;
  party: PartyDto;
  onClose: () => void;
}> = ({ open, party, onClose }) => {
  const startCombat = usePartyStore((s) => s.startCombat);
  const addCombatants = usePartyStore((s) => s.addCombatants);
  const joining = party.combat !== null;

  const { heroes, npcs } = useMemo(() => {
    const inFight = new Set(party.combat?.combatants.map((c) => c.refId) ?? []);
    const owners = new Map(party.members.map((m) => [m.userId, m.displayName]));
    return {
      heroes: party.heroes
        .filter((hero) => !inFight.has(hero.id))
        .map<Candidate>((hero) => ({
          id: hero.id,
          name: hero.name,
          portrait: hero.portrait ?? null,
          note: hero.ownerId === party.masterId ? 'мастер' : (owners.get(hero.ownerId) ?? ''),
        })),
      npcs: (party.npcs ?? [])
        .filter((npc) => !inFight.has(npc.id))
        .map<Candidate>((npc) => ({ id: npc.id, name: npc.name, portrait: npc.portraitAssetId, note: `${npc.disposition === 'hostile' ? 'враг' : 'союзник'} · ${npc.currentHP}/${npc.maxHP} хитов` })),
    };
  }, [party]);

  const [picked, setPicked] = useState<Set<string>>(() => (joining ? new Set() : new Set([...heroes, ...npcs].map((p) => p.id))));
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submit = async () => {
    const body = { heroIds: heroes.filter((h) => picked.has(h.id)).map((h) => h.id), npcIds: npcs.filter((n) => picked.has(n.id)).map((n) => n.id) };
    setBusy(true);
    const done = joining ? await addCombatants(party.id, body) : await startCombat(party.id, body);
    setBusy(false);
    if (done) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      setting={party.setting}
      width="lg"
      eyebrow="Бой"
      title={joining ? 'Кто вступает в бой' : 'В бой!'}
      subtitle={
        isCocFight(party)
          ? joining
            ? 'Новые участники заявят порядок по ЛВК и займут место в очереди'
            : 'Отмеченные встанут в очередь по ЛВК, затем начнётся первый раунд'
          : joining
            ? 'Новые участники бросят инициативу и займут место в очереди'
            : 'Отмеченные бросят инициативу, затем начнётся первый раунд'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" icon={<IconCombat width={18} height={18} />} disabled={busy || picked.size === 0} onClick={() => void submit()}>
            {joining ? 'Вступить в бой' : 'Начать бой'}
          </Button>
        </>
      }
    >
      <div className="space-y-5 pt-1">
        <Group title="Герои" items={heroes} picked={picked} onToggle={toggle} empty="Все герои уже в бою" />
        <Group title="НПС" items={npcs} picked={picked} onToggle={toggle} empty="Добавьте НПС на панели справа" />
      </div>
    </Dialog>
  );
};

const Group: React.FC<{ title: string; items: Candidate[]; picked: Set<string>; onToggle: (id: string) => void; empty: string }> = ({
  title,
  items,
  picked,
  onToggle,
  empty,
}) => (
  <section>
    <h3 className="ui-label">{title}</h3>
    {items.length === 0 ? (
      <p className="text-sm text-ink-faint">{empty}</p>
    ) : (
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const on = picked.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(item.id)}
              className={cx('ui-pick flex items-center gap-3 p-2 pr-3 text-left', on && 'ui-pick--on')}
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden bg-inset">
                {item.portrait ? (
                  <img src={assetUrl(item.portrait)} alt="" className="h-full w-full object-cover" style={{ objectPosition: '50% 25%' }} />
                ) : (
                  <span className="ui-display grid h-full w-full place-items-center text-lg text-frame/50">{item.name.charAt(0)}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{item.name}</span>
                <span className="block truncate text-xs text-ink-faint">{item.note}</span>
              </span>
              <span className="ui-pick__check grid h-5 w-5 shrink-0 place-items-center" aria-hidden>
                {on && <IconCheck width={12} height={12} />}
              </span>
            </button>
          );
        })}
      </div>
    )}
  </section>
);
