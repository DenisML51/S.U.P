import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PartyDto } from '@itd/schema';
import { usePartyStore } from '../../store/usePartyStore';
import { IconCombat, IconInitiative } from '../../ui/icons';
import { Button } from '../../ui/primitives';
import { InitiativeDialog } from './InitiativeDialog';
import { InitiativeStrip } from './InitiativeStrip';
import { actsByDex, initiativeBonusOf, isCocFight, npcFirearmReady } from './partyView';
import { StartCombatDialog } from './StartCombatDialog';
import { useTableCombat } from './useTableCombat';

/**
 * The party's fight over a hero's combat screen: the order of turns on top, with what the user can
 * do right now — roll, end their turn, or (the master) run the fight. `onMyTurn` runs when a turn
 * of this hero begins.
 */
export const PartyCombatBar: React.FC<{
  party: PartyDto;
  characterId: string;
  /** The hero has Pulp «Быстрое выхватывание»: the +50 of a ready firearm comes without one. */
  quickDraw?: boolean;
  onMyTurn: () => void;
}> = ({ party, characterId, quickDraw, onMyTurn }) => {
  const store = usePartyStore.getState();
  const heroId = party.heroes.find((hero) => hero.characterId === characterId)?.id;
  const seat = useTableCombat(party, { forHero: heroId, onMyTurn });
  const [starting, setStarting] = useState(false);
  const fight = party.combat;
  const rolling = fight?.phase === 'initiative';
  const npcsWaiting = fight?.combatants.some((c) => c.kind === 'npc' && c.initiative === null) ?? false;
  /** Call of Cthulhu: the order is DEX, nothing is rolled. */
  const coc = isCocFight(party);

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {fight ? (
          <motion.div
            key="fight"
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3">
              <span className="ui-display ui-title text-lg leading-none text-frame-bright">
                {rolling ? (coc ? 'Порядок хода' : 'Инициатива') : `Раунд ${fight.round}`}
              </span>
              {seat.toRoll[0] && (
                <Button variant="primary" size="sm" icon={<IconInitiative width={15} height={15} />} onClick={() => seat.roll(seat.toRoll[0]!)}>
                  {actsByDex(party, seat.toRoll[0]) ? 'Заявить порядок' : 'Бросить инициативу'}
                </Button>
              )}
              {seat.isMaster && rolling && npcsWaiting && (
                <Button variant="secondary" size="sm" onClick={() => void store.rollNpcInitiative(party.id)}>
                  {coc ? 'НПС по ЛВК' : 'За НПС'}
                </Button>
              )}
              {seat.isMaster && rolling && (
                <Button variant="primary" size="sm" onClick={() => void store.beginRounds(party.id)}>
                  Начать раунд
                </Button>
              )}
              {seat.canPassTurn && (
                <Button variant="primary" size="sm" onClick={() => void store.nextTurn(party.id, fight.currentCombatantId)}>
                  {seat.myTurn ? 'Завершить ход' : 'Следующий ход'}
                </Button>
              )}
              {!rolling && !seat.canPassTurn && seat.current && <span className="text-sm text-ink-muted">ходит {seat.current.name}</span>}
            </div>
            <InitiativeStrip combat={fight} size="sm" onPick={seat.roll} master={seat.isMaster} className="max-w-[60vw] [justify-content:safe_center]" />
          </motion.div>
        ) : (
          <motion.div
            key="calm"
            className="flex items-center gap-3"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {seat.isMaster ? (
              <Button variant="primary" icon={<IconCombat width={18} height={18} />} onClick={() => setStarting(true)}>
                Начать бой партии
              </Button>
            ) : (
              <span className="text-sm text-ink-muted">
                {party.name} · бой начнёт мастер
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <InitiativeDialog
        key={seat.rolling?.id ?? 'none'}
        partyId={party.id}
        setting={party.setting}
        combatant={seat.rolling}
        bonus={seat.rolling ? initiativeBonusOf(party, seat.rolling) : null}
        byDex={actsByDex(party, seat.rolling)}
        firearmReady={npcFirearmReady(party, seat.rolling)}
        quickDraw={!!quickDraw && seat.rolling?.kind === 'hero' && seat.rolling.refId === heroId}
        canRemove={seat.isMaster}
        onClose={() => seat.roll(null)}
      />
      {starting && <StartCombatDialog open party={party} onClose={() => setStarting(false)} />}
    </>
  );
};
