import React, { useState } from 'react';
import { CONDITIONS, rollD20, rollFormula } from '@itd/game-logic';
import { npcMinHP, type NpcDndAttack, type PartyDto, type PartyNpcDto } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { Dialog } from '../../ui/Dialog';
import { CONDITION_ICONS, CatalogIcon } from '../../ui/GameIcon';
import { IconDice } from '../../ui/icons';
import { Button, Input, Meter } from '../../ui/primitives';
import { formatBonus, isCocFight } from './partyView';

/** "−5" takes, "+3" gives, "12" sets: the same as on the NPC's card. */
export function npcHPAfter(npc: PartyNpcDto, raw: string, coc: boolean): number | null {
  const text = raw.trim().replace('−', '-').replace(',', '.');
  const value = Number(text);
  if (!text || !Number.isFinite(value)) return null;
  const relative = /^[+-]/.test(text);
  return Math.max(npcMinHP(coc), Math.min(npc.maxHP, Math.round(relative ? npc.currentHP + value : value)));
}

/** One attack rolled by the master: the hit and, unless a natural 1, the damage (doubled dice on a 20). */
interface Struck {
  name: string;
  hit: number;
  die: number;
  damage: number | null;
}

function strike(attack: NpcDndAttack): Struck {
  const { kept: die } = rollD20();
  const critical = die === 20;
  const damage = die === 1 || !attack.damage ? null : rollFormula(attack.damage, Math.random, { critical }).total;
  return { name: attack.name, hit: die + attack.hitBonus, die, damage };
}

/**
 * An NPC in the fight, from its token: its hit points to change, its conditions, its attacks rolled
 * for the master's eyes only, and its initiative. The players see none of it.
 */
export const NpcFightDialog: React.FC<{
  open: boolean;
  party: PartyDto;
  npc: PartyNpcDto;
  onInitiative: () => void;
  onClose: () => void;
}> = ({ open, party, npc, onInitiative, onClose }) => {
  const updateNpc = usePartyStore((s) => s.updateNpc);
  const coc = isCocFight(party) || !!npc.coc;
  const [amount, setAmount] = useState('');
  const [struck, setStruck] = useState<Struck[]>([]);

  const applyHP = () => {
    const currentHP = npcHPAfter(npc, amount, coc);
    setAmount('');
    if (currentHP !== null && currentHP !== npc.currentHP) void updateNpc(party.id, npc.id, { currentHP });
  };
  const toggle = (id: string) =>
    void updateNpc(party.id, npc.id, {
      conditions: npc.conditions.includes(id) ? npc.conditions.filter((c) => c !== id) : [...npc.conditions, id],
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      setting={party.setting}
      width="md"
      eyebrow={`${npc.disposition === 'hostile' ? 'Враг' : 'Союзник'} · видит только мастер`}
      title={npc.name}
      footerStart={
        <Button variant="ghost" onClick={onInitiative}>
          Инициатива
        </Button>
      }
      footer={
        <Button variant="primary" onClick={onClose}>
          Готово
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <Meter value={Math.max(0, npc.currentHP)} max={npc.maxHP} tone="hp" height={6} label="Хиты" />
          </span>
          <span className="ui-numeric text-lg text-ink">
            {npc.currentHP}
            <span className="text-ink-faint">/{npc.maxHP}</span>
          </span>
          {!coc && <span className="ui-numeric text-sm text-ink-muted">КБ {npc.armorClass}</span>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyHP();
          }}
        >
          <Input
            aria-label={`Хиты ${npc.name}`}
            placeholder="−5, +3 или 12"
            className="ui-numeric flex-1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-autofocus
          />
          <Button type="submit" variant="secondary" disabled={npcHPAfter(npc, amount, coc) === null}>
            Применить
          </Button>
        </form>

        {npc.attacks.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-ink-muted">Атаки — бросок видите только вы</span>
            {npc.attacks.map((attack, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {attack.name}
                  <span className="ml-2 text-xs text-ink-muted">
                    {formatBonus(attack.hitBonus)} · {attack.damage}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<IconDice width={14} height={14} />}
                  onClick={() => setStruck((list) => [strike(attack), ...list].slice(0, 4))}
                >
                  Атака
                </Button>
              </div>
            ))}
            {struck.map((s, index) => (
              <p key={index} className={index === 0 ? 'text-sm text-ink' : 'text-xs text-ink-faint'}>
                {`${s.name}: попадание ${s.hit} (к20: ${s.die})`}
                {s.die === 20 ? ' · критическое попадание' : s.die === 1 ? ' · промах' : ''}
                {s.damage !== null && ` · урон ${s.damage}`}
              </p>
            ))}
          </div>
        )}

        {!coc && (
          <div className="space-y-2">
            <span className="text-sm text-ink-muted">Состояния</span>
            <div className="flex flex-wrap gap-1.5">
              {CONDITIONS.map((condition) => (
                <button
                  key={condition.id}
                  type="button"
                  aria-pressed={npc.conditions.includes(condition.id)}
                  onClick={() => toggle(condition.id)}
                  className="ui-chip flex items-center gap-1.5"
                >
                  <CatalogIcon id={CONDITION_ICONS[condition.id] ?? 'terror'} size={14} />
                  {condition.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {npc.notes && <p className="whitespace-pre-line text-sm text-ink-muted">{npc.notes}</p>}
      </div>
    </Dialog>
  );
};
