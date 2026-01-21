import React, { useMemo, useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Character, 
  Attack, 
  Ability, 
  Spell, 
  InventoryItem, 
  CLASSES
} from '../../../types';
import { useCharacterStore } from '../../../store/useCharacterStore';

// Sub-components
import { CombatPanel } from './Hotbar/CombatPanel';
import { StatusBars } from './Hotbar/StatusBars';
import { PortraitGroup } from './Hotbar/PortraitGroup';
import { ActionTrackers } from './Hotbar/ActionTrackers';
import { ResourceGroup } from './Hotbar/ResourceGroup';
import { CombatStats } from './Hotbar/CombatStats';
import { HotbarPanels } from './Hotbar/HotbarPanels';
import { ExperienceBar } from './Hotbar/ExperienceBar';
import { ActionTooltip } from './Hotbar/ActionTooltip';

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
  
  // Combat State
  const [isInCombat, setIsInCombat] = useState(false);
  const [initiative, setInitiative] = useState<number | null>(null);

  // Subclass Icon logic
  const charClass = useMemo(() => CLASSES.find(c => c.id === character.class), [character.class]);
  const subclass = useMemo(() => charClass?.subclasses.find(sc => sc.id === character.subclass), [charClass, character.subclass]);
  const subclassIcon = subclass?.icon ? `/icons/subclasses/${subclass.icon}` : null;

  // Action categories
  const actionGroups = useMemo(() => {
    const attacks = (character.attacks || []).map(a => ({ ...a, hotbarType: 'attack' }));
    const abilities = (character.abilities || []).map(a => ({ ...a, hotbarType: 'ability' }));
    const spells = (character.spells || []).filter(s => s.prepared).map(s => ({ ...s, hotbarType: 'spell' }));
    const items = (character.inventory || []).filter(i => i.type === 'item').map(i => ({ ...i, hotbarType: 'item' }));
    
    return { attacks, abilities, spells, items };
  }, [character]);

  const startCombat = () => {
    const res = handleRollInitiative();
    setInitiative(res.total);
    setIsInCombat(true);
  };

  const nextTurn = () => {
    updateCharacter({
      ...character,
      spentActions: { action: 0, bonus: 0, reaction: 0 }
    });
  };

  const endCombat = () => {
    setIsInCombat(false);
    setInitiative(null);
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

  return (
    <>
      <CombatPanel 
        isInCombat={isInCombat}
        onStartCombat={startCombat}
        onNextTurn={nextTurn}
        onEndCombat={endCombat}
      />

      <div className="fixed bottom-6 left-0 right-0 z-[40] flex flex-col items-center pointer-events-none px-4">
        
        <div className="flex items-end gap-4 max-w-[95vw] pointer-events-auto">
          
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

          <div className="flex flex-col gap-3 flex-1 min-w-[800px] max-w-[1400px]">
            <div className="flex flex-wrap items-center justify-center gap-4 mb-1 pointer-events-auto">
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
                initiative={initiative}
                getModifier={getModifier}
                onACClick={() => setShowACModal(true)}
                onInitiativeClick={startCombat}
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
