import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Character, 
  Attack, 
  Ability, 
  Spell, 
  InventoryItem
} from '../../../types';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useLobbyStore } from '../../../store/useLobbyStore';
import { StatusBars } from './Hotbar/StatusBars';
import { PortraitGroup } from './Hotbar/PortraitGroup';
import { ActionTrackers } from './Hotbar/ActionTrackers';
import { ResourceGroup } from './Hotbar/ResourceGroup';
import { CombatStats } from './Hotbar/CombatStats';
import { HotbarPanels } from './Hotbar/HotbarPanels';
import { ExperienceBar } from './Hotbar/ExperienceBar';
import { ActionTooltip } from './Hotbar/ActionTooltip';
import { PlayersCombatSidebar } from '../../Combat/PlayersCombatSidebar';
import { CombatLobbyChat } from '../../Combat/CombatLobbyChat';
import { CombatInitiativeStrip } from '../../Combat/CombatInitiativeStrip';

interface HotbarViewProps {
  character: Character;
  openAttackView: (attack: Attack) => void;
  openAbilityView: (ability: Ability) => void;
  openSpellView: (spell: Spell) => void;
  openItemView: (item: InventoryItem) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  updateCharacter: (character: Character) => void;
  getMaxSanity: () => number;
  getTotalMaxHP: () => number;
  xpProgress: number;
  canLevelUp: boolean;
  handleRollInitiative: () => any;
  setShowHealthModal: (show: boolean) => void;
  setShowSanityModal: (show: boolean) => void;
  setShowACModal: (show: boolean) => void;
  setShowExperienceModal: (show: boolean) => void;
  getModifier: (attr: string) => string;
}

export const HotbarView: React.FC<HotbarViewProps> = ({
  character,
  openAttackView,
  openAbilityView,
  openSpellView,
  openItemView,
  updateResourceCount,
  updateCharacter,
  getMaxSanity,
  getTotalMaxHP,
  xpProgress,
  canLevelUp,
  handleRollInitiative,
  setShowHealthModal,
  setShowSanityModal,
  setShowACModal,
  setShowExperienceModal,
  getModifier
}) => {
  const [hoveredItem, setHoveredItem] = useState<any>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const handleItemHover = (item: any, rect: DOMRect) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredItem(item);
    setHoveredRect(rect);
  };

  const handleItemUnhover = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
      setHoveredRect(null);
    }, 150);
  };

  const [isInCombatLocal, setIsInCombatLocal] = useState(false);
  const [initiativeLocal, setInitiativeLocal] = useState<number | null>(null);
  const lastSentActionStateRef = useRef<string>('');
  const lastSentHpStateRef = useRef<string>('');
  const lastKnownRoundRef = useRef<number>(1);
  const startRequestedRef = useRef(false);
  const user = useAuthStore((state) => state.user);
  const { lobby, members, meRole, combatState, sendCombatEvent } = useLobbyStore();
  const sharedLobbyCombatActive = Boolean(lobby && combatState?.isInCombat);
  const isInCombat = lobby ? sharedLobbyCombatActive || isInCombatLocal : isInCombatLocal;
  const initiative = lobby ? initiativeLocal : initiativeLocal;

  const subclassIcon = null;

  const actionGroups = useMemo(() => {
    const attacks = (character.attacks || []).map(a => ({ ...a, hotbarType: 'attack' }));
    const abilities = (character.abilities || []).map(a => ({ ...a, hotbarType: 'ability' }));
    const spells = (character.spells || []).filter(s => s.prepared).map(s => ({ ...s, hotbarType: 'spell' }));
    const items = (character.inventory || []).filter(i => i.type === 'item').map(i => ({ ...i, hotbarType: 'item' }));
    
    return { attacks, abilities, spells, items };
  }, [character]);
  const meMember = useMemo(() => {
    if (!user || !members.length) return null;
    return members.find((member) => member.userId === user.id) ?? null;
  }, [members, user]);
  const resolvedMemberId = useMemo(() => {
    if (meMember?.id) {
      return meMember.id;
    }
    if (!user || !combatState?.membersCombat?.length) {
      return null;
    }
    return combatState.membersCombat.find((member) => member.userId === user.id)?.memberId ?? null;
  }, [combatState?.membersCombat, meMember?.id, user]);

  const onlineMemberIds = useMemo(
    () => members.filter((member) => member.status === 'ONLINE').map((member) => member.id),
    [members]
  );
  const readyMemberIds = useMemo(() => {
    const readySet = new Set<string>();
    (combatState?.membersCombat ?? []).forEach((member) => {
      if (member.currentAction === 'ReadyForCombat') {
        readySet.add(member.memberId);
      }
      if (typeof member.initiative === 'number' && Number.isFinite(member.initiative)) {
        readySet.add(member.memberId);
      }
    });
    if (isInCombatLocal && resolvedMemberId) {
      readySet.add(resolvedMemberId);
    }
    return readySet;
  }, [combatState?.membersCombat, isInCombatLocal, resolvedMemberId]);
  const readyOnlineCount = useMemo(
    () => onlineMemberIds.filter((memberId) => readyMemberIds.has(memberId)).length,
    [onlineMemberIds, readyMemberIds]
  );
  const allOnlineReady =
    onlineMemberIds.length > 0 && readyOnlineCount === onlineMemberIds.length;
  const canStartSharedCombat =
    Boolean(lobby) &&
    !sharedLobbyCombatActive &&
    meRole === 'MASTER' &&
    isInCombatLocal &&
    allOnlineReady &&
    onlineMemberIds.length >= 2;

  const enterCombat = () => {
    if (lobby) {
      setIsInCombatLocal(true);
      if (resolvedMemberId) {
        sendCombatEvent('combat.actionUsed', {
          memberId: resolvedMemberId,
          action: 'ReadyForCombat'
        });
      }
      return;
    }
    setIsInCombatLocal(true);
  };

  const startSharedCombat = () => {
    if (!lobby || meRole !== 'MASTER') return;
    sendCombatEvent('combat.start', {});
  };

  const rollInitiativeInCombat = () => {
    const res = handleRollInitiative();
    setInitiativeLocal(res.total);
    if (!lobby || !resolvedMemberId) {
      return;
    }
    const limits = character.actionLimits || { action: 1, bonus: 1, reaction: 1 };
    const spent = character.spentActions || { action: 0, bonus: 0, reaction: 0 };
    sendCombatEvent('combat.actionUsed', {
      memberId: resolvedMemberId,
      action: `A:${spent.action}/${limits.action} B:${spent.bonus}/${limits.bonus} R:${spent.reaction}/${limits.reaction}`,
      actionState: {
        actionLimits: limits,
        spentActions: spent,
        initiative: res.total
      }
    });
  };

  useEffect(() => {
    if (!canStartSharedCombat) {
      startRequestedRef.current = false;
      return;
    }
    if (startRequestedRef.current) return;
    startRequestedRef.current = true;
    startSharedCombat();
  }, [canStartSharedCombat]);

  const nextTurn = () => {
    if (lobby && sharedLobbyCombatActive) {
      sendCombatEvent('combat.nextTurn', {});
      return;
    }
    updateCharacter({
      ...character,
      spentActions: { action: 0, bonus: 0, reaction: 0 }
    });
  };

  const endCombat = () => {
    setIsInCombatLocal(false);
    setInitiativeLocal(null);
    if (lobby && sharedLobbyCombatActive) {
      sendCombatEvent('combat.end', {});
      return;
    }
    nextTurn();
  };

  const onItemClick = (action: any) => {
    if (action.damageComponents && action.damageComponents.length > 0) {
      window.dispatchEvent(new CustomEvent('open-dice-hub', { 
        detail: { components: action.damageComponents } 
      }));
    } else if (action.damage) {
      window.dispatchEvent(new CustomEvent('open-dice-hub', { detail: { formula: action.damage } }));
    } else {
      if (action.hotbarType === 'spell') openSpellView(action);
      else if (action.hotbarType === 'attack') openAttackView(action);
      else if (action.hotbarType === 'ability') openAbilityView(action);
      else if (action.hotbarType === 'item') openItemView(action);
    }
  };

  const onItemRightClick = (action: any) => {
    if (action.hotbarType === 'spell') openSpellView(action);
    else if (action.hotbarType === 'attack') openAttackView(action);
    else if (action.hotbarType === 'ability') openAbilityView(action);
    else if (action.hotbarType === 'item') openItemView(action);
  };

  const handleTooltipMouseEnter = () => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  useEffect(() => {
    if (!lobby || !sharedLobbyCombatActive || !resolvedMemberId) return;
    const limits = character.actionLimits || { action: 1, bonus: 1, reaction: 1 };
    const spent = character.spentActions || { action: 0, bonus: 0, reaction: 0 };
    const payloadKey = JSON.stringify({ limits, spent, memberId: resolvedMemberId, initiative: initiativeLocal });
    if (lastSentActionStateRef.current === payloadKey) return;
    lastSentActionStateRef.current = payloadKey;
    sendCombatEvent('combat.actionUsed', {
      memberId: resolvedMemberId,
      action: `A:${spent.action}/${limits.action} B:${spent.bonus}/${limits.bonus} R:${spent.reaction}/${limits.reaction}`,
      actionState: {
        actionLimits: limits,
        spentActions: spent,
        initiative: initiativeLocal
      }
    });
  }, [
    lobby,
    sharedLobbyCombatActive,
    resolvedMemberId,
    character.spentActions?.action,
    character.spentActions?.bonus,
    character.spentActions?.reaction,
    character.actionLimits?.action,
    character.actionLimits?.bonus,
    character.actionLimits?.reaction,
    initiativeLocal,
    sendCombatEvent
  ]);

  useEffect(() => {
    if (!lobby || !sharedLobbyCombatActive || !resolvedMemberId) return;
    const hpPayload = {
      memberId: resolvedMemberId,
      currentHP: character.currentHP,
      maxHP: getTotalMaxHP()
    };
    const payloadKey = JSON.stringify(hpPayload);
    if (lastSentHpStateRef.current === payloadKey) return;
    lastSentHpStateRef.current = payloadKey;
    sendCombatEvent('combat.hpChanged', hpPayload);
  }, [
    lobby,
    sharedLobbyCombatActive,
    resolvedMemberId,
    character.currentHP,
    character.maxHP,
    character.maxHPBonus,
    getTotalMaxHP,
    sendCombatEvent
  ]);

  useEffect(() => {
    if (!lobby || !sharedLobbyCombatActive) return;
    const nextRound = combatState.round ?? 1;
    const prevRound = lastKnownRoundRef.current;
    if (nextRound > prevRound) {
      updateCharacter({
        ...character,
        spentActions: { action: 0, bonus: 0, reaction: 0 }
      });
    }
    lastKnownRoundRef.current = nextRound;
  }, [lobby, sharedLobbyCombatActive, combatState?.round, character, updateCharacter]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('combat-mode-changed', { detail: { isInCombat } }));
  }, [isInCombat]);

  useEffect(() => {
    const handleNextTurn = () => {
      nextTurn();
    };
    const handleEndCombat = () => {
      endCombat();
    };
    window.addEventListener('combat-next-turn', handleNextTurn as EventListener);
    window.addEventListener('combat-end', handleEndCombat as EventListener);
    return () => {
      window.removeEventListener('combat-next-turn', handleNextTurn as EventListener);
      window.removeEventListener('combat-end', handleEndCombat as EventListener);
    };
  }, [nextTurn, endCombat]);

  return (
    <>
      {sharedLobbyCombatActive && <PlayersCombatSidebar />}
      {sharedLobbyCombatActive && <CombatLobbyChat />}
      {sharedLobbyCombatActive && <CombatInitiativeStrip />}

      <div className="fixed bottom-6 left-0 right-0 z-[40] flex flex-col items-center pointer-events-none px-2 sm:px-4">
        
        <div className="pointer-events-auto w-full max-w-[1600px]">
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end lg:gap-4">
          
            <StatusBars 
              sanity={character.sanity}
              maxSanity={getMaxSanity()}
              currentHP={character.currentHP}
              maxHP={getTotalMaxHP()}
              tempHP={character.tempHP || 0}
              onSanityClick={() => setShowSanityModal(true)}
              onHealthClick={() => setShowHealthModal(true)}
            />

            <PortraitGroup 
              character={character}
              subclassIcon={subclassIcon}
              updateCharacter={updateCharacter}
            />

            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[1400px]">
              <div className="mb-1 flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
                <ActionTrackers 
                  character={character}
                  updateCharacter={updateCharacter}
                />

                <ResourceGroup 
                  character={character}
                  updateResourceCount={updateResourceCount}
                />

                <CombatStats 
                  character={character}
                  isInCombat={sharedLobbyCombatActive || (!lobby && isInCombat)}
                  isCombatReady={Boolean(lobby) && isInCombatLocal && !sharedLobbyCombatActive}
                  canStartSharedCombat={canStartSharedCombat}
                  initiative={initiative}
                  getModifier={getModifier}
                  onACClick={() => setShowACModal(true)}
                  onEnterCombatClick={enterCombat}
                  onStartSharedCombatClick={startSharedCombat}
                  onInitiativeRollClick={rollInitiativeInCombat}
                />
              </div>
              
              <HotbarPanels 
                actionGroups={actionGroups}
                hoveredItemId={hoveredItem?.id}
                onItemClick={onItemClick}
                onItemRightClick={onItemRightClick}
                onItemHover={handleItemHover}
                onItemUnhover={handleItemUnhover}
              />

              <ExperienceBar 
                level={character.level}
                experience={character.experience}
                xpProgress={xpProgress}
                canLevelUp={canLevelUp}
                onXPClick={() => setShowExperienceModal(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {hoveredItem && (
          <ActionTooltip 
            hoveredData={hoveredItem}
            hoveredRect={hoveredRect}
            character={character}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleItemUnhover}
            updateCharacter={updateCharacter}
          />
        )}
      </AnimatePresence>
    </>
  );
};
