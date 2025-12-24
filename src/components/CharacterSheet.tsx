import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCharacter } from '../context/CharacterContext';
import { RACES, CLASSES, ATTRIBUTES_LIST, EXPERIENCE_BY_LEVEL, getProficiencyBonus, SKILLS_LIST, calculateMaxSanity, Resource, Limb, getLimbInjuryLevel, Character, InventoryItem } from '../types';
import { exportToPDF } from '../utils/pdfExport';
import { AttributeModal } from './AttributeModal';
import { HealthModal } from './HealthModal';
import { SanityModal } from './SanityModal';
import { ExperienceModal } from './ExperienceModal';
import { ResourceModal } from './ResourceModal';
import { LimbModal } from './LimbModal';
import { ArmorClassModal } from './ArmorClassModal';
import { ItemModal } from './ItemModal';
import { AttackModal } from './AttackModal';
import { AbilityModal } from './AbilityModal';
import { AttackViewModal } from './AttackViewModal';
import { AbilityViewModal } from './AbilityViewModal';
import { ItemViewModal } from './ItemViewModal';
import { ResourceViewModal } from './ResourceViewModal';
import { CurrencyModal } from './CurrencyModal';
import { getLucideIcon } from '../utils/iconUtils';
import { Attack, Ability, Currency, Trait } from '../types';
import { Shield, Sword, Box, Zap, Coins, Settings, Target, CheckCircle2, XCircle, ArrowUp, Backpack, Sparkles, Plus, Heart, Eye, Move, Timer, Compass, Brain } from 'lucide-react';
import { TraitModal } from './TraitModal';
import { TraitViewModal } from './TraitViewModal';
import { BasicInfoModal } from './BasicInfoModal';

type InventorySubTab = 'all' | 'armor' | 'weapon' | 'item' | 'ammunition';

export const CharacterSheet: React.FC = () => {
  const { character, updateCharacter, activeTab, setActiveTab, exportToJSON, goToCharacterList, updateResourceCount } = useCharacter();
  
  const [inventorySubTab, setInventorySubTab] = useState<InventorySubTab>('all');
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);

  // Global event listener for modal opening from Navbar
  React.useEffect(() => {
    const handleOpenModal = (e: any) => {
      const { type, data } = e.detail;
      if (type === 'currency') setShowCurrencyModal(true);
      if (type === 'resource') {
        setViewingResource(data);
        setShowResourceViewModal(true);
      }
      if (type === 'ammunition') {
        setShowAmmunitionModal(true);
      }
      if (type === 'inventory' && data === 'ammunition') {
        // Use setActiveTab from context to switch to inventory tab
        setActiveTab('inventory');
        setInventorySubTab('ammunition');
      }
    };
    window.addEventListener('open-character-modal', handleOpenModal);
    return () => window.removeEventListener('open-character-modal', handleOpenModal);
  }, [setActiveTab]);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showSanityModal, setShowSanityModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>(undefined);
  const [showLimbModal, setShowLimbModal] = useState(false);
  const [selectedLimb, setSelectedLimb] = useState<Limb | null>(null);
  const [showACModal, setShowACModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);
  const [showAmmunitionModal, setShowAmmunitionModal] = useState(false);
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [editingAttack, setEditingAttack] = useState<Attack | undefined>(undefined);
  const [showAbilityModal, setShowAbilityModal] = useState(false);
  const [editingAbility, setEditingAbility] = useState<Ability | undefined>(undefined);
  const [showAttackViewModal, setShowAttackViewModal] = useState(false);
  const [viewingAttack, setViewingAttack] = useState<Attack | undefined>(undefined);
  const [showAbilityViewModal, setShowAbilityViewModal] = useState(false);
  const [viewingAbility, setViewingAbility] = useState<Ability | undefined>(undefined);
  const [showItemViewModal, setShowItemViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<InventoryItem | undefined>(undefined);
  const [showResourceViewModal, setShowResourceViewModal] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | undefined>(undefined);
  const [showTraitModal, setShowTraitModal] = useState(false);
  const [editingTrait, setEditingTrait] = useState<Trait | undefined>(undefined);
  const [showTraitViewModal, setShowTraitViewModal] = useState(false);
  const [viewingTrait, setViewingTrait] = useState<Trait | undefined>(undefined);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  
  if (!character) {
    return null;
  }
  
  const race = RACES.find(r => r.id === character.race);
  const selectedSubrace = race?.subraces?.find(sr => sr.id === character.subrace);
  const charClass = CLASSES.find(c => c.id === character.class);
  const selectedSubclass = charClass?.subclasses.find(sc => sc.id === character.subclass);
  
  const getModifier = (attrId: string) => {
    const value = character.attributes[attrId] || 10;
    const bonus = character.attributeBonuses?.[attrId] || 0;
    const total = Math.floor((value - 10) / 2) + bonus;
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getSkillModifier = (skillId: string) => {
    if (!character.skills || !Array.isArray(character.skills)) return '+0';
    const skill = character.skills.find(s => s.id === skillId);
    if (!skill) return '+0';
    
    const attrValue = character.attributes[skill.attribute] || 10;
    const attrBonus = character.attributeBonuses?.[skill.attribute] || 0;
    const baseModifier = Math.floor((attrValue - 10) / 2) + attrBonus;
    const profBonus = skill.proficient ? character.proficiencyBonus : 0;
    const expertiseBonus = skill.expertise ? character.proficiencyBonus : 0;
    const total = baseModifier + profBonus + expertiseBonus;
    
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getSavingThrowModifier = (attrId: string) => {
    const value = character.attributes[attrId] || 10;
    const bonus = character.attributeBonuses?.[attrId] || 0;
    const baseModifier = Math.floor((value - 10) / 2) + bonus;
    const isProficient = character.savingThrowProficiencies?.includes(attrId);
    const total = baseModifier + (isProficient ? character.proficiencyBonus : 0);
    return total >= 0 ? `+${total}` : `${total}`;
  };

  // XP System
  const currentLevelXP = EXPERIENCE_BY_LEVEL[character.level];
  const nextLevelXP = EXPERIENCE_BY_LEVEL[character.level + 1] || EXPERIENCE_BY_LEVEL[20];
  const xpInCurrentLevel = character.experience - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const xpProgress = (xpInCurrentLevel / xpNeededForLevel) * 100;
  const canLevelUp = character.experience >= nextLevelXP && character.level < 20;

  const saveExperience = (newExperience: number, newLevel: number) => {
    const newProfBonus = getProficiencyBonus(newLevel);
    updateCharacter({
      ...character,
      experience: newExperience,
      level: newLevel,
      proficiencyBonus: newProfBonus,
    });
  };

  const updateSpeed = (newSpeed: number) => {
    updateCharacter({ ...character, speed: newSpeed });
  };

  const updateSanity = (newSanity: number) => {
    const maxSanity = getMaxSanity();
    const clampedSanity = Math.min(maxSanity, Math.max(0, newSanity));
    updateCharacter({ ...character, sanity: clampedSanity });
  };

  const getMaxSanity = () => {
    return calculateMaxSanity(
      character.class,
      character.attributes.wisdom || 10,
      character.level
    );
  };

  const isInsane = character.sanity <= 0;

  const updateHealth = (current: number, max: number, temp: number, bonus: number) => {
    updateCharacter({
      ...character,
      currentHP: current,
      maxHP: max,
      tempHP: temp,
      maxHPBonus: bonus,
    });
  };

  const getTotalMaxHP = () => character.maxHP + character.maxHPBonus;
  const isDying = character.currentHP <= 0;

  const updateLanguagesAndProficiencies = (value: string) => {
    updateCharacter({ ...character, languagesAndProficiencies: value });
  };

  const saveResource = (resource: Resource) => {
    const existingIndex = character.resources.findIndex(r => r.id === resource.id);
    let newResources;
    
    if (existingIndex >= 0) {
      // Update existing
      newResources = [...character.resources];
      newResources[existingIndex] = resource;
    } else {
      // Add new
      newResources = [...character.resources, resource];
    }
    
    updateCharacter({ ...character, resources: newResources });
  };

  const deleteResource = (resourceId: string) => {
    const newResources = character.resources.filter(r => r.id !== resourceId);
    updateCharacter({ ...character, resources: newResources });
  };

  const openResourceModal = (resource?: Resource) => {
    setEditingResource(resource);
    setShowResourceModal(true);
  };

  const closeResourceModal = () => {
    setShowResourceModal(false);
    setEditingResource(undefined);
  };

  const openLimbModal = (limb: Limb) => {
    setSelectedLimb(limb);
    setShowLimbModal(true);
  };

  const updateLimb = (updatedLimb: Limb) => {
    const newLimbs = character.limbs.map(l => l.id === updatedLimb.id ? updatedLimb : l);
    updateCharacter({ ...character, limbs: newLimbs });
  };

  const getLimbType = (limbId: string): 'head' | 'arm' | 'leg' | 'torso' => {
    if (limbId === 'head') return 'head';
    if (limbId === 'torso') return 'torso';
    if (limbId.includes('Arm')) return 'arm';
    return 'leg';
  };

  const updateArmorClass = (newAC: number, newLimbs: Limb[]) => {
    updateCharacter({ ...character, armorClass: newAC, limbs: newLimbs });
  };

  const updatePersonalityField = (field: keyof Character, value: string) => {
    updateCharacter({ ...character, [field]: value });
  };

  const saveItem = (item: InventoryItem) => {
    const existingIndex = character.inventory.findIndex(a => a.id === item.id);
    let newInventory;
    
    if (existingIndex >= 0) {
      newInventory = [...character.inventory];
      newInventory[existingIndex] = item;
    } else {
      newInventory = [...character.inventory, item];
    }
    
    updateCharacter({ ...character, inventory: newInventory });
  };

  const deleteItem = (itemId: string) => {
    const newInventory = character.inventory.filter(a => a.id !== itemId);
    updateCharacter({ ...character, inventory: newInventory });
  };

  const equipItem = (itemId: string) => {
    const item = character.inventory.find(a => a.id === itemId);
    if (!item) return;

    let newAttacks = [...character.attacks];

    if (item.type === 'armor') {
      // Снимаем всю экипированную броню
      const newInventory = character.inventory.map(a => ({
        ...a,
        equipped: a.type === 'armor' && a.id === itemId,
      }));

      // Применяем КБ брони
      const dexMod = Math.floor(((character.attributes.dexterity || 10) - 10) / 2);
      let calculatedAC = item.baseAC || 10;
      
      if (item.dexModifier) {
        const appliedDexMod = (item.maxDexModifier !== null && item.maxDexModifier !== undefined)
          ? Math.min(dexMod, item.maxDexModifier)
          : dexMod;
        calculatedAC += appliedDexMod;
      }

      // Применяем КБ конечностей
      const newLimbs = character.limbs.map(limb => ({
        ...limb,
        ac: item.limbACs?.[limb.id as keyof typeof item.limbACs] || 0,
      }));

      updateCharacter({
        ...character,
        armorClass: calculatedAC,
        limbs: newLimbs,
        inventory: newInventory,
      });
    } else if (item.type === 'weapon') {
      // Экипируем оружие
      const newInventory = character.inventory.map(a => 
        a.id === itemId ? { ...a, equipped: true } : a
      );
      
      // Добавляем атаку от оружия
      const weaponAttack: Attack = {
        id: `attack_weapon_${itemId}`,
        name: item.name,
        damage: item.damage || '1d6',
        damageType: item.damageType || 'Физический',
        hitBonus: 0,
        actionType: 'action',
        weaponId: itemId,
        usesAmmunition: item.weaponClass === 'ranged',
        ammunitionCost: 1,
        attribute: item.weaponClass === 'melee' ? 'strength' : 'dexterity',
      };
      newAttacks.push(weaponAttack);
      
      updateCharacter({ ...character, inventory: newInventory, attacks: newAttacks });
    } else {
      // Для предметов просто меняем статус
      const newInventory = character.inventory.map(a => 
        a.id === itemId ? { ...a, equipped: true } : a
      );
      updateCharacter({ ...character, inventory: newInventory });
    }
  };

  const unequipItem = (itemId: string) => {
    const item = character.inventory.find(a => a.id === itemId);
    if (!item) return;

    const newInventory = character.inventory.map(a => ({
      ...a,
      equipped: a.id === itemId ? false : a.equipped,
    }));

    if (item.type === 'armor') {
      // Сбрасываем КБ на базовый (10 + ловкость)
      const dexMod = Math.floor(((character.attributes.dexterity || 10) - 10) / 2);
      const baseAC = 10 + dexMod;

      // Сбрасываем КБ конечностей на 0
      const newLimbs = character.limbs.map(limb => ({
        ...limb,
        ac: 0,
      }));

      updateCharacter({
        ...character,
        armorClass: baseAC,
        limbs: newLimbs,
        inventory: newInventory,
      });
    } else if (item.type === 'weapon') {
      // Удаляем атаку от оружия
      const newAttacks = character.attacks.filter(attack => attack.weaponId !== itemId);
      updateCharacter({ ...character, inventory: newInventory, attacks: newAttacks });
    } else {
      updateCharacter({ ...character, inventory: newInventory });
    }
  };

  const openItemModal = (item?: InventoryItem) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(undefined);
  };

  const updateInventoryNotes = (notes: string) => {
    updateCharacter({ ...character, inventoryNotes: notes });
  };

  const updateAttacksNotes = (notes: string) => {
    updateCharacter({ ...character, attacksNotes: notes });
  };

  const updateEquipmentNotes = (notes: string) => {
    updateCharacter({ ...character, equipmentNotes: notes });
  };

  const updateAbilitiesNotes = (notes: string) => {
    updateCharacter({ ...character, abilitiesNotes: notes });
  };

  const updateItemQuantity = (itemId: string, delta: number) => {
    const newInventory = character.inventory.map(item => {
      if (item.id === itemId && (item.type === 'item' || item.type === 'ammunition')) {
        return { ...item, quantity: Math.max(0, (item.quantity || 1) + delta) };
      }
      return item;
    });
    updateCharacter({ ...character, inventory: newInventory });
  };

  const updateAmmunitionQuantity = (itemId: string, delta: number) => {
    const newInventory = character.inventory.map(item => {
      if (item.id === itemId && item.type === 'ammunition') {
        return { ...item, quantity: Math.max(0, (item.quantity || 0) + delta) };
      }
      return item;
    });
    updateCharacter({ ...character, inventory: newInventory });
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'armor': return Shield;
      case 'weapon': return Sword;
      case 'ammunition': return Zap;
      default: return Box;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'armor': return 'Броня';
      case 'weapon': return 'Оружие';
      case 'ammunition': return 'Боеприпас';
      default: return 'Предмет';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'action': return 'Основное';
      case 'bonus': return 'Бонусное';
      case 'reaction': return 'Реакция';
      default: return 'Основное';
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case 'action': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'bonus': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'reaction': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const saveAttack = (attack: Attack) => {
    const existingIndex = character.attacks.findIndex(a => a.id === attack.id);
    let newAttacks;
    
    if (existingIndex >= 0) {
      newAttacks = [...character.attacks];
      newAttacks[existingIndex] = attack;
    } else {
      newAttacks = [...character.attacks, attack];
    }
    
    updateCharacter({ ...character, attacks: newAttacks });
  };

  const deleteAttack = (attackId: string) => {
    const newAttacks = character.attacks.filter(a => a.id !== attackId);
    updateCharacter({ ...character, attacks: newAttacks });
  };

  const openAttackModal = (attack?: Attack) => {
    setEditingAttack(attack);
    setShowAttackModal(true);
  };

  const closeAttackModal = () => {
    setShowAttackModal(false);
    setEditingAttack(undefined);
  };

  const saveAbility = (ability: Ability) => {
    const existingIndex = character.abilities.findIndex(a => a.id === ability.id);
    let newAbilities;
    
    if (existingIndex >= 0) {
      newAbilities = [...character.abilities];
      newAbilities[existingIndex] = ability;
    } else {
      newAbilities = [...character.abilities, ability];
    }
    
    updateCharacter({ ...character, abilities: newAbilities });
  };

  const deleteAbility = (abilityId: string) => {
    const newAbilities = character.abilities.filter(a => a.id !== abilityId);
    updateCharacter({ ...character, abilities: newAbilities });
  };

  const openAbilityModal = (ability?: Ability) => {
    setEditingAbility(ability);
    setShowAbilityModal(true);
  };

  const closeAbilityModal = () => {
    setShowAbilityModal(false);
    setEditingAbility(undefined);
  };

  const openAttackView = (attack: Attack) => {
    setViewingAttack(attack);
    setShowAttackViewModal(true);
  };

  const openAbilityView = (ability: Ability) => {
    setViewingAbility(ability);
    setShowAbilityViewModal(true);
  };

  const saveTrait = (trait: Trait) => {
    const currentTraits = character.traits || [];
    const existingIndex = currentTraits.findIndex(t => t.id === trait.id);
    const newTraits = existingIndex >= 0
      ? currentTraits.map((t, i) => i === existingIndex ? trait : t)
      : [...currentTraits, trait];
    updateCharacter({ ...character, traits: newTraits });
  };

  const deleteTrait = (traitId: string) => {
    const currentTraits = character.traits || [];
    const newTraits = currentTraits.filter(t => t.id !== traitId);
    updateCharacter({ ...character, traits: newTraits });
  };

  const openTraitView = (trait: Trait) => {
    setViewingTrait(trait);
    setShowTraitViewModal(true);
  };

  const openTraitModal = (trait?: Trait) => {
    setEditingTrait(trait);
    setShowTraitModal(true);
  };

  const closeTraitModal = () => {
    setShowTraitModal(false);
    setEditingTrait(undefined);
  };

  const openItemView = (item: InventoryItem) => {
    setViewingItem(item);
    setShowItemViewModal(true);
  };

  const openResourceView = (resource: Resource) => {
    setViewingResource(resource);
    setShowResourceViewModal(true);
  };

  const saveCurrency = (currency: Currency) => {
    updateCharacter({ ...character, currency });
  };

  const toggleSkillProficiency = (skillId: string) => {
    const updatedSkills = character.skills.map(skill =>
      skill.id === skillId
        ? { ...skill, proficient: !skill.proficient, expertise: false }
        : skill
    );
    updateCharacter({ ...character, skills: updatedSkills });
  };

  const toggleSkillExpertise = (skillId: string) => {
    const skill = character.skills.find(s => s.id === skillId);
    if (!skill?.proficient) return;
    
    const updatedSkills = character.skills.map(s =>
      s.id === skillId
        ? { ...s, expertise: !s.expertise }
        : s
    );
    updateCharacter({ ...character, skills: updatedSkills });
  };

  const updateAttributeValue = (attrId: string, newValue: number, newBonus: number) => {
    updateCharacter({
      ...character,
      attributes: {
        ...character.attributes,
        [attrId]: newValue,
      },
      attributeBonuses: {
        ...character.attributeBonuses,
        [attrId]: newBonus,
      },
    });
  };

  const toggleSavingThrowProficiency = (attrId: string) => {
    const currentProficiencies = character.savingThrowProficiencies || [];
    const newProficiencies = currentProficiencies.includes(attrId)
      ? currentProficiencies.filter(id => id !== attrId)
      : [...currentProficiencies, attrId];
    
    updateCharacter({
      ...character,
      savingThrowProficiencies: newProficiencies,
    });
  };
  
  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1600px] mx-auto"
      >
        {/* Stats Cards Header */}
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Health Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowHealthModal(true)}
            className={`bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-red-500/50 transition-all text-left group ${isDying ? 'border-red-500 from-red-900/20' : ''}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all ${isDying ? 'animate-pulse' : ''}`}>
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${isDying ? 'text-red-400 bg-red-900/50 border-red-500' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                {isDying ? 'DYING' : 'HP'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Здоровье</div>
              <div className="text-2xl font-bold flex items-baseline gap-1">
                <span className={isDying ? 'text-red-500' : ''}>{character.currentHP}</span>
                {character.tempHP > 0 && <span className="text-sm text-blue-400">+{character.tempHP}</span>}
                <span className="text-sm text-gray-500 font-normal">/ {getTotalMaxHP()}</span>
              </div>
            </div>
            {/* Health Bar Mini */}
            <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden border border-red-500/10">
              <div 
                className={`h-full bg-gradient-to-r from-red-500 to-red-600 transition-all ${isDying ? 'animate-pulse' : ''}`}
                style={{ width: `${Math.min((character.currentHP / getTotalMaxHP()) * 100, 100)}%` }}
              />
            </div>
          </motion.button>

          {/* Sanity Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSanityModal(true)}
            className={`bg-gradient-to-br from-purple-500/10 to-blue-600/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-purple-500/50 transition-all text-left group ${isInsane ? 'from-red-500/10 to-red-900/10 border-red-500/30' : ''}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg transition-all ${isInsane ? 'from-red-600 to-red-800 shadow-red-500/20' : 'from-purple-500 to-blue-600 shadow-purple-500/20 group-hover:shadow-purple-500/40'}`}>
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${isInsane ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20'}`}>
                {isInsane ? 'INSANE' : 'SAN'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Рассудок</div>
              <div className="text-2xl font-bold flex items-baseline gap-1">
                <span className={isInsane ? 'text-red-500' : ''}>{character.sanity}</span>
                <span className="text-sm text-gray-500 font-normal">/ {getMaxSanity()}</span>
              </div>
            </div>
            {/* Sanity Bar Mini */}
            <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden border border-purple-500/10">
              <div 
                className={`h-full transition-all ${isInsane ? 'bg-red-600' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}
                style={{ width: `${Math.min((character.sanity / getMaxSanity()) * 100, 100)}%` }}
              />
            </div>
          </motion.button>

          {/* AC Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowACModal(true)}
            className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-blue-500/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                AC
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Защита</div>
              <div className="text-3xl font-bold">
                {character.armorClass}
              </div>
            </div>
            <div className="text-[10px] text-gray-500 font-medium">Класс Брони</div>
          </motion.button>

          {/* Level/XP Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowExperienceModal(true)}
            className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-amber-500/50 transition-all text-left group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
                <ArrowUp className="w-6 h-6 text-white" />
              </div>
              {canLevelUp && (
                <div className="animate-pulse bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg shadow-green-500/50">
                  UP!
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-semibold">Уровень {character.level}</div>
              <div className="text-2xl font-bold flex items-baseline gap-1">
                <span>{character.experience}</span>
                <span className="text-sm text-gray-500 font-normal">XP</span>
              </div>
            </div>
            {/* XP Bar Mini */}
            <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden border border-amber-500/10">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              />
            </div>
          </motion.button>
        </div>

        {/* Secondary Stats Strip */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="flex flex-wrap items-stretch bg-dark-card/30 backdrop-blur-md border border-dark-border/50 rounded-2xl overflow-hidden shadow-xl">
            {/* Proficiency */}
            <div className="flex-1 min-w-[120px] flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3 h-3 text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Мастерство</span>
              </div>
              <div className="text-xl font-black text-blue-400">+{character.proficiencyBonus}</div>
            </div>

            {/* Speed */}
            <div className="flex-1 min-w-[140px] flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-1.5 mb-1">
                <Move className="w-3 h-3 text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Скорость</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateSpeed(Math.max(0, character.speed - 5))}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-dark-bg border border-dark-border hover:border-emerald-500/50 hover:text-emerald-400 transition-all text-xs font-bold"
                >
                  −
                </button>
                <div className="text-xl font-black text-gray-200">{character.speed}<span className="text-[10px] text-gray-500 ml-0.5 font-normal">фт</span></div>
                <button
                  onClick={() => updateSpeed(character.speed + 5)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-dark-bg border border-dark-border hover:border-emerald-500/50 hover:text-emerald-400 transition-all text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Initiative */}
            <div className="flex-1 min-w-[120px] flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-1.5 mb-1">
                <Timer className="w-3 h-3 text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Инициатива</span>
              </div>
              <div className="text-xl font-black text-orange-400">{getModifier('dexterity')}</div>
            </div>

            {/* Perception */}
            <div className="flex-1 min-w-[120px] flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="w-3 h-3 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Восприятие</span>
              </div>
              <div className="text-xl font-black text-purple-400">{getSkillModifier('perception')}</div>
            </div>

            {/* Passive Senses Group */}
            <div className="flex-[1.5] min-w-[200px] flex items-stretch bg-black/20">
              <div className="flex-1 flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-white/5 transition-all group">
                <div className="flex items-center gap-1.5 mb-1">
                  <Compass className="w-3 h-3 text-amber-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider whitespace-nowrap">Пасс. Вниман.</span>
                </div>
                <div className="text-xl font-black text-amber-400">{10 + parseInt(getSkillModifier('perception'))}</div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center py-3 px-4 hover:bg-white/5 transition-all group">
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain className="w-3 h-3 text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider whitespace-nowrap">Пасс. Ознак.</span>
                </div>
                <div className="text-xl font-black text-cyan-400">{10 + parseInt(getSkillModifier('insight'))}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:items-stretch">
          {/* Left Side - Attributes with Skills */}
          <div className={`space-y-4 flex flex-col ${activeTab !== 'stats' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ATTRIBUTES_LIST.map((attr, index) => {
                const value = character.attributes[attr.id] || 10;
                const modifier = getModifier(attr.id);
                const savingThrow = getSavingThrowModifier(attr.id);
                const isProficient = character.savingThrowProficiencies?.includes(attr.id);
                
                // Get skills for this attribute
                const attrSkills = character.skills?.filter(s => s.attribute === attr.id) || [];
                
                return (
                  <motion.div
                    key={attr.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-xl p-3 border border-dark-border bg-transparent"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-bold uppercase text-gray-300">{attr.name}</div>
                        <div className="flex gap-2 mt-1">
                          <div className="flex-1 bg-dark-bg rounded-lg p-1.5 text-center">
                            <div className="text-xs text-gray-400">Провер.</div>
                            <div className="text-lg font-bold">{modifier}</div>
                          </div>
                          <div className={`flex-1 rounded-lg p-1.5 text-center ${
                            isProficient ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-dark-bg'
                          }`}>
                            <div className="text-xs text-gray-400">Спасбр.</div>
                            <div className={`text-lg font-bold ${isProficient ? 'text-blue-400' : ''}`}>
                              {savingThrow}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAttribute(attr.id)}
                        className="text-4xl font-bold ml-2 hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        {value}
                      </button>
                    </div>
                    
                    {/* Skills for this attribute */}
                    {attrSkills.length > 0 && (
                      <div className="border-t border-dark-border pt-2 mt-2">
                        <div className="space-y-1">
                          {attrSkills.map((skill) => {
                            const skillInfo = SKILLS_LIST.find(s => s.id === skill.id);
                            if (!skillInfo) return null;
                            
                            const skillMod = getSkillModifier(skill.id);
                            const isProficient = skill.proficient;
                            const isExpertise = skill.expertise;
                            
                            return (
                              <div
                                key={skill.id}
                                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all ${
                                  isProficient ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-dark-bg hover:bg-dark-hover'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    onClick={() => toggleSkillProficiency(skill.id)}
                                    className={`w-4 h-4 rounded border-2 transition-all flex-shrink-0 ${
                                      isProficient 
                                        ? 'bg-blue-500 border-blue-500' 
                                        : 'border-dark-border hover:border-blue-500'
                                    }`}
                                  >
                                    {isProficient && (
                                      <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  
                                  <button
                                    onClick={() => toggleSkillExpertise(skill.id)}
                                    disabled={!isProficient}
                                    className={`w-4 h-4 rounded-full border-2 transition-all flex-shrink-0 ${
                                      isExpertise 
                                        ? 'bg-purple-500 border-purple-500' 
                                        : isProficient 
                                        ? 'border-dark-border hover:border-purple-500' 
                                        : 'border-dark-border opacity-30 cursor-not-allowed'
                                    }`}
                                  >
                                    {isExpertise && (
                                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                        E
                                      </div>
                                    )}
                                  </button>
                                  
                                  <span className={`text-xs ${isProficient ? 'font-semibold' : 'text-gray-400'}`}>
                                    {skillInfo.name}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-sm ml-2">{skillMod}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}

            </div>
          </div>

          {/* Right Side - Tabs */}
          <div className={`flex flex-col ${activeTab === 'stats' ? 'hidden lg:flex' : 'flex'}`}>
            {/* Tab Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
            >
              <div className="flex-1 py-6">
                {activeTab === 'personality' && (
                  <div>
                    <h3 className="text-xl font-bold mb-6">Личность</h3>
                    
                    {/* Character Info Card */}
                    <div className="bg-gradient-to-br from-dark-bg to-dark-card border-2 border-dark-border rounded-2xl p-6 mb-8 shadow-lg group relative">
                      <button
                        onClick={() => setShowBasicInfoModal(true)}
                        className="absolute top-4 right-4 w-8 h-8 bg-dark-bg border border-dark-border rounded-lg hover:bg-dark-hover opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10"
                        title="Редактировать основные данные"
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {/* Name - prominently displayed */}
                      <div className="mb-6 pb-6 border-b border-dark-border">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Имя персонажа</div>
                        <div className="text-3xl font-bold tracking-tight">{character.name}</div>
                      </div>
                      
                      {/* Race, Class, Subclass in a clean grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Раса</div>
                          <div className="text-lg font-bold text-gray-200">
                            {race?.name}
                            {selectedSubrace && (
                              <span className="text-sm text-gray-400 font-normal ml-2">({selectedSubrace.name})</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Класс</div>
                          <div className="text-lg font-bold text-gray-200">{charClass?.name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Подкласс</div>
                          <div className="text-lg font-bold text-gray-200">{selectedSubclass?.name || '—'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Traits Section */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-300">Черты</h4>
                        <button
                          onClick={() => openTraitModal()}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all font-semibold text-sm flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить черту
                        </button>
                      </div>
                      
                      {(character.traits || []).length > 0 ? (
                        <div className="space-y-4">
                          {(character.traits || []).map((trait) => (
                            <motion.div
                              key={trait.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={() => openTraitView(trait)}
                              className="group relative bg-gradient-to-br from-dark-card to-dark-bg rounded-xl border border-dark-border hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden shadow-lg hover:shadow-xl hover:shadow-purple-500/10"
                            >
                              <div className="p-4">
                                <div className="flex items-start gap-3 mb-2">
                                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-base text-gray-100 truncate">{trait.name}</h5>
                                  </div>
                                </div>
                                {trait.description && (
                                  <p className="text-sm text-gray-400 mt-2">{trait.description}</p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTraitModal(trait);
                                }}
                                className="absolute top-2 right-2 w-8 h-8 bg-dark-bg border border-dark-border rounded-lg hover:bg-dark-hover opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10"
                                title="Редактировать"
                              >
                                <Settings className="w-4 h-4 text-gray-400" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-dark-card rounded-xl border border-dark-border">
                          <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                          <p className="text-sm text-gray-400 mb-2">Нет черт</p>
                          <p className="text-xs text-gray-500 mb-4">Добавьте черты персонажа</p>
                          <button
                            onClick={() => openTraitModal()}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all font-semibold text-sm"
                          >
                            Добавить первую черту
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Personality Fields - organized in sections */}
                    <div className="space-y-6">
                      {/* Physical & Background Section */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-bold text-gray-300 border-b border-dark-border pb-2">Физическое описание и история</h4>
                        
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Внешность</label>
                          <textarea
                            value={character.appearance || ''}
                            onChange={(e) => updatePersonalityField('appearance', e.target.value)}
                            rows={4}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Опишите внешний вид персонажа..."
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Предыстория</label>
                          <textarea
                            value={character.backstory || ''}
                            onChange={(e) => updatePersonalityField('backstory', e.target.value)}
                            rows={6}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Расскажите историю персонажа..."
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Мировоззрение</label>
                          <input
                            type="text"
                            value={character.alignment || ''}
                            onChange={(e) => updatePersonalityField('alignment', e.target.value)}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Например: Законно-доброе, Хаотично-нейтральное..."
                          />
                        </div>
                      </div>

                      {/* Character Traits Section */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-bold text-gray-300 border-b border-dark-border pb-2">Характер</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Черты характера</label>
                            <textarea
                              value={character.personalityTraits || ''}
                              onChange={(e) => updatePersonalityField('personalityTraits', e.target.value)}
                              rows={4}
                              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Опишите характер и манеры..."
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Идеалы</label>
                            <textarea
                              value={character.ideals || ''}
                              onChange={(e) => updatePersonalityField('ideals', e.target.value)}
                              rows={4}
                              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Во что верит персонаж..."
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Привязанности</label>
                            <textarea
                              value={character.bonds || ''}
                              onChange={(e) => updatePersonalityField('bonds', e.target.value)}
                              rows={4}
                              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Люди, места или вещи..."
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Слабости</label>
                            <textarea
                              value={character.flaws || ''}
                              onChange={(e) => updatePersonalityField('flaws', e.target.value)}
                              rows={4}
                              className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Недостатки и уязвимости..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Connections & Skills Section */}
                      <div className="space-y-4">
                        <h4 className="text-lg font-bold text-gray-300 border-b border-dark-border pb-2">Связи и навыки</h4>
                        
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Союзники и организации</label>
                          <textarea
                            value={character.alliesAndOrganizations || ''}
                            onChange={(e) => updatePersonalityField('alliesAndOrganizations', e.target.value)}
                            rows={4}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Союзники, друзья, организации..."
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Владения и языки</label>
                          <textarea
                            value={character.languagesAndProficiencies || ''}
                            onChange={(e) => updateLanguagesAndProficiencies(e.target.value)}
                            rows={4}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Доспехи, оружие, языки..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'health' && (
                  <div>
                    <h3 className="text-xl font-bold mb-6">Здоровье конечностей</h3>
                    
                    {/* Body Diagram */}
                    <div className="flex justify-center mb-6">
                      <div className="relative" style={{ width: '300px', height: '450px' }}>
                        {/* SVG Body */}
                        <svg viewBox="0 0 300 450" className="absolute inset-0">
                          {/* Head */}
                          <ellipse cx="150" cy="50" rx="32" ry="40" className="fill-dark-bg stroke-dark-border" strokeWidth="2" />
                          <circle cx="150" cy="45" r="28" className="fill-dark-bg stroke-dark-border" strokeWidth="1.5" />
                          
                          {/* Neck */}
                          <rect x="140" y="85" width="20" height="15" className="fill-dark-bg stroke-dark-border" strokeWidth="1.5" />
                          
                          {/* Torso - более анатомичный */}
                          <path 
                            d="M 125 100 Q 115 130 118 180 L 118 200 Q 120 220 135 225 L 165 225 Q 180 220 182 200 L 182 180 Q 185 130 175 100 Z" 
                            className="fill-dark-bg stroke-dark-border" 
                            strokeWidth="2" 
                          />
                          
                          {/* Shoulders */}
                          <ellipse cx="118" cy="105" rx="18" ry="12" className="fill-dark-bg stroke-dark-border" strokeWidth="1.5" />
                          <ellipse cx="182" cy="105" rx="18" ry="12" className="fill-dark-bg stroke-dark-border" strokeWidth="1.5" />
                          
                          {/* Left Arm */}
                          <path 
                            d="M 100 105 Q 85 110 75 130 Q 70 145 72 160 L 75 165"
                            className="fill-none stroke-dark-border" 
                            strokeWidth="16" 
                            strokeLinecap="round"
                          />
                          
                          {/* Right Arm */}
                          <path 
                            d="M 200 105 Q 215 110 225 130 Q 230 145 228 160 L 225 165"
                            className="fill-none stroke-dark-border" 
                            strokeWidth="16" 
                            strokeLinecap="round"
                          />
                          
                          {/* Left Leg */}
                          <path 
                            d="M 135 225 L 133 280 Q 132 320 130 360 L 128 410"
                            className="fill-none stroke-dark-border" 
                            strokeWidth="22" 
                            strokeLinecap="round"
                          />
                          
                          {/* Right Leg */}
                          <path 
                            d="M 165 225 L 167 280 Q 168 320 170 360 L 172 410"
                            className="fill-none stroke-dark-border" 
                            strokeWidth="22" 
                            strokeLinecap="round"
                          />
                        </svg>

                        {/* Clickable Limbs */}
                        {character.limbs && character.limbs.map((limb) => {
                          const injuryLevel = getLimbInjuryLevel(limb.currentHP);
                          const getColor = () => {
                            switch (injuryLevel) {
                              case 'destroyed': return 'bg-red-600/90 border-red-500';
                              case 'severe': return 'bg-orange-500/90 border-orange-400';
                              case 'light': return 'bg-yellow-500/90 border-yellow-400';
                              default: return 'bg-green-500/90 border-green-400';
                            }
                          };

                          const getPosition = () => {
                            switch (limb.id) {
                              case 'head': return { top: '25px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 };
                              case 'torso': return { top: '150px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 };
                              case 'leftArm': return { top: '130px', left: '45px', zIndex: 10 };
                              case 'rightArm': return { top: '130px', right: '45px', zIndex: 10 };
                              case 'leftLeg': return { top: '300px', left: '95px', zIndex: 10 };
                              case 'rightLeg': return { top: '300px', right: '95px', zIndex: 10 };
                              default: return {};
                            }
                          };

                          return (
                            <button
                              key={limb.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openLimbModal(limb);
                              }}
                              className={`absolute px-3 py-1.5 rounded-lg border-2 ${getColor()} hover:scale-110 transition-all cursor-pointer text-sm font-bold shadow-lg`}
                              style={getPosition()}
                            >
                              {limb.currentHP}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Equipped Armor Indicator */}
                    {character.inventory && character.inventory.find(i => i.equipped && i.type === 'armor') && (
                      <div className="mb-6">
                        {character.inventory.filter(i => i.equipped && i.type === 'armor').map((armor) => (
                          <button
                            key={armor.id}
                            onClick={() => openItemView(armor)}
                            className="w-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/50 rounded-xl p-4 hover:border-blue-500 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Shield className="w-6 h-6 text-blue-400" />
                                </div>
                                <div className="text-left">
                                  <div className="text-sm text-blue-400 font-semibold">Экипирована броня</div>
                                  <div className="font-bold text-lg">{armor.name}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-400">Базовый КБ</div>
                                <div className="text-3xl font-bold text-blue-400">{armor.baseAC || 0}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Limbs List */}
                    <div className="space-y-2">
                      {character.limbs && character.limbs.map((limb) => {
                        const injuryLevel = getLimbInjuryLevel(limb.currentHP);
                        const getBorderColor = () => {
                          switch (injuryLevel) {
                            case 'destroyed': return 'border-red-500';
                            case 'severe': return 'border-orange-500';
                            case 'light': return 'border-yellow-500';
                            default: return 'border-dark-border';
                          }
                        };

                        return (
                          <div
                            key={limb.id}
                            onClick={() => openLimbModal(limb)}
                            className={`bg-dark-bg rounded-lg p-3 border-2 ${getBorderColor()} hover:border-blue-500/50 transition-all cursor-pointer`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold">{limb.name}</div>
                                <div className="text-xs text-gray-400">КБ: {limb.ac}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">{limb.currentHP}</div>
                                <div className="text-xs text-gray-400">/ {limb.maxHP}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'abilities' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Способности</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openResourceModal()}
                          className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-lg transition-all font-semibold text-xs"
                        >
                          + Ресурс
                        </button>
                        <button
                          onClick={() => openAbilityModal()}
                          className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:shadow-lg transition-all font-semibold text-xs"
                        >
                          + Способность
                        </button>
                      </div>
                    </div>

                    {/* Resources Section */}
                    {character.resources && character.resources.length > 0 && (
                      <>
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-px flex-1 bg-dark-border"></div>
                            <span className="text-xs text-gray-400 uppercase font-semibold">Ресурсы</span>
                            <div className="h-px flex-1 bg-dark-border"></div>
                          </div>
                          <div className="space-y-2">
                            {character.resources.map((resource) => {
                              const percentage = (resource.current / resource.max) * 100;
                              return (
                                <motion.div
                                  key={resource.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="group relative bg-dark-card rounded-lg border border-dark-border border-l-4 border-l-blue-500 hover:border-blue-400 transition-all overflow-hidden"
                                >
                                  <div className="flex items-center gap-3 p-3">
                                    <div className="flex-shrink-0 w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                                      {getLucideIcon(resource.iconName, { size: 24, className: 'text-blue-400' })}
                                    </div>
                                    
                                    <h4 className="font-bold text-sm text-gray-100 truncate min-w-[80px]">{resource.name}</h4>
                                    
                                    <button
                                      onClick={() => updateResourceCount(resource.id, -1)}
                                      disabled={resource.current <= 0}
                                      className="w-8 h-8 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex-shrink-0 text-gray-300 text-lg"
                                    >
                                      −
                                    </button>
                                    
                                    <div className="flex-1 min-w-0 relative">
                                      <div className="h-10 bg-dark-bg rounded-lg overflow-hidden border border-dark-border relative">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${percentage}%` }}
                                          transition={{ duration: 0.3 }}
                                          className={`h-full rounded-lg transition-all ${
                                            percentage > 75 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                            percentage > 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                            percentage > 25 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                            'bg-gradient-to-r from-red-500 to-pink-500'
                                          }`}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-sm font-bold text-gray-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                            {resource.current} / {resource.max}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <button
                                      onClick={() => updateResourceCount(resource.id, 1)}
                                      disabled={resource.current >= resource.max}
                                      className="w-8 h-8 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold flex-shrink-0 text-gray-300 text-lg"
                                    >
                                      +
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        const newResources = character.resources.map(r =>
                                          r.id === resource.id ? { ...r, current: r.max } : r
                                        );
                                        updateCharacter({ ...character, resources: newResources });
                                      }}
                                      className="px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 transition-all text-xs font-semibold flex-shrink-0"
                                    >
                                      Восст.
                                    </button>
                                    
                                    <button
                                      onClick={() => openResourceModal(resource)}
                                      className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded transition-all opacity-0 group-hover:opacity-100"
                                      title="Настроить"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Abilities Section */}
                    {character.abilities && character.abilities.length > 0 && (
                      <>
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-px flex-1 bg-dark-border"></div>
                            <span className="text-xs text-gray-400 uppercase font-semibold">Способности</span>
                            <div className="h-px flex-1 bg-dark-border"></div>
                          </div>
                          <div className="space-y-2">
                            {character.abilities.map((ability) => {
                              const usedResource = ability.resourceId ? character.resources.find(r => r.id === ability.resourceId) : null;
                              const canUse = usedResource ? usedResource.current >= (ability.resourceCost || 0) : true;
                              return (
                                <motion.div
                                  key={ability.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  onClick={() => openAbilityView(ability)}
                                  className="group relative bg-dark-card rounded-lg border border-dark-border border-l-4 border-l-purple-500 hover:border-purple-400 transition-all cursor-pointer overflow-hidden"
                                >
                                  <div className="flex items-center gap-2.5 p-2.5">
                                    <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                                      <Zap className="w-4 h-4 text-purple-400" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-sm text-gray-100 truncate">{ability.name}</h4>
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getActionTypeColor(ability.actionType)}`}>
                                          {getActionTypeLabel(ability.actionType)}
                                        </span>
                                        {usedResource && ability.resourceCost && (
                                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                                            canUse 
                                              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                                          }`}>
                                            {canUse ? (
                                              <CheckCircle2 className="w-3 h-3" />
                                            ) : (
                                              <>
                                                <XCircle className="w-3 h-3" />
                                                <span className="text-xs">{usedResource.current}/{ability.resourceCost}</span>
                                              </>
                                            )}
                                          </div>
                                        )}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openAbilityModal(ability); }}
                                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded transition-all opacity-0 group-hover:opacity-100 ml-auto"
                                          title="Настроить"
                                        >
                                          <Settings className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      
                                      {(ability.description || (usedResource && ability.resourceCost)) && (
                                        <div className="flex items-center gap-2 text-xs mt-0.5">
                                          {ability.description && (
                                            <span className="text-gray-400 line-clamp-1">{ability.description}</span>
                                          )}
                                          {usedResource && ability.resourceCost && (
                                            <>
                                              {ability.description && <span className="text-gray-600">•</span>}
                                              <span className="text-gray-500">
                                                Тратит: <span className="text-purple-400 font-semibold">{ability.resourceCost} {usedResource.name}</span>
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                      
                                      {ability.effect && (
                                        <div className="mt-1 text-xs text-gray-300 line-clamp-1">
                                          <span className="text-gray-500">Эффект:</span> {ability.effect}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {!character.resources?.length && !character.abilities?.length && (
                      <div className="text-gray-400 text-center py-12">
                        <p className="mb-4">Нет ресурсов и способностей</p>
                        <p className="text-sm">Добавьте ресурсы и способности</p>
                      </div>
                    )}

                    {/* Text notes at the end */}
                    <div className="mt-6">
                      <div className="text-xs text-gray-400 mb-2 uppercase">Заметки</div>
                      <textarea
                        value={character.abilitiesNotes || ''}
                        onChange={(e) => {
                          updateAbilitiesNotes(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Дополнительные заметки о способностях..."
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'attacks' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Атаки</h3>
                      <button
                        onClick={() => openAttackModal()}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold text-sm"
                      >
                        + Добавить атаку
                      </button>
                    </div>

                    {character.attacks && character.attacks.length > 0 ? (
                      <>
                        {/* Weapon Attacks */}
                        {character.attacks.filter(a => a.weaponId).length > 0 && (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-px flex-1 bg-dark-border"></div>
                              <span className="text-xs text-gray-400 uppercase font-semibold">Атаки от оружия</span>
                              <div className="h-px flex-1 bg-dark-border"></div>
                            </div>
                            <div className="space-y-2 mb-4">
                              {character.attacks.filter(a => a.weaponId).map((attack) => (
                                <motion.div
                                  key={attack.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  onClick={() => openAttackView(attack)}
                                  className="group relative bg-dark-card rounded-lg border border-dark-border border-l-4 border-l-red-500 hover:border-red-400 transition-all cursor-pointer overflow-hidden"
                                >
                                  <div className="flex items-center gap-3 p-3">
                                    <div className="flex-shrink-0 w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
                                      <Sword className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-sm text-gray-100 truncate">{attack.name}</h4>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionTypeColor(attack.actionType)}`}>
                                          {getActionTypeLabel(attack.actionType)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs">
                                        <span className="text-gray-300">
                                          <span className="text-gray-500">Бонус:</span> <span className="font-bold text-blue-400">{attack.hitBonus >= 0 ? '+' : ''}{attack.hitBonus}</span>
                                        </span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-300">
                                          <span className="text-gray-500">Урон:</span> <span className="font-bold text-red-400">{attack.damage}</span>
                                        </span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-300 truncate">
                                          <span className="text-gray-500">Тип:</span> <span className="font-bold text-purple-400">{attack.damageType}</span>
                                        </span>
                                        {attack.usesAmmunition && (
                                          <>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-orange-400 flex items-center gap-1">
                                              <Target className="w-3 h-3" />
                                              {attack.ammunitionCost}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openAttackModal(attack); }}
                                      className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded transition-all opacity-0 group-hover:opacity-100"
                                      title="Настроить"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Custom Attacks */}
                        {character.attacks.filter(a => !a.weaponId).length > 0 && (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-px flex-1 bg-dark-border"></div>
                              <span className="text-xs text-gray-400 uppercase font-semibold">Пользовательские атаки</span>
                              <div className="h-px flex-1 bg-dark-border"></div>
                            </div>
                            <div className="space-y-2">
                              {character.attacks.filter(a => !a.weaponId).map((attack) => (
                                <motion.div
                                  key={attack.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  onClick={() => openAttackView(attack)}
                                  className="group relative bg-dark-card rounded-lg border border-dark-border border-l-4 border-l-purple-500 hover:border-purple-400 transition-all cursor-pointer overflow-hidden"
                                >
                                  <div className="flex items-center gap-3 p-3">
                                    <div className="flex-shrink-0 w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                                      <Zap className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-sm text-gray-100 truncate">{attack.name}</h4>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionTypeColor(attack.actionType)}`}>
                                          {getActionTypeLabel(attack.actionType)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs">
                                        <span className="text-gray-300">
                                          <span className="text-gray-500">Бонус:</span> <span className="font-bold text-blue-400">{attack.hitBonus >= 0 ? '+' : ''}{attack.hitBonus}</span>
                                        </span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-300">
                                          <span className="text-gray-500">Урон:</span> <span className="font-bold text-red-400">{attack.damage}</span>
                                        </span>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-gray-300 truncate">
                                          <span className="text-gray-500">Тип:</span> <span className="font-bold text-purple-400">{attack.damageType}</span>
                                        </span>
                                        {attack.usesAmmunition && (
                                          <>
                                            <span className="text-gray-500">•</span>
                                            <span className="text-orange-400 flex items-center gap-1">
                                              <Target className="w-3 h-3" />
                                              {attack.ammunitionCost}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openAttackModal(attack); }}
                                      className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-200 hover:bg-dark-hover rounded transition-all opacity-0 group-hover:opacity-100"
                                      title="Настроить"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-400 text-center py-12">
                        <Sword className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                        <p className="text-sm">Нет атак</p>
                        <p className="text-xs mt-1">Экипируйте оружие или добавьте атаку</p>
                      </div>
                    )}

                    {/* Text notes at the end */}
                    <div className="mt-6">
                      <div className="text-xs text-gray-400 mb-2 uppercase">Заметки</div>
                      <textarea
                        value={character.attacksNotes || ''}
                        onChange={(e) => {
                          updateAttacksNotes(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Дополнительные заметки об атаках..."
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'equipment' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Снаряжение</h3>
                      <button
                        onClick={() => setShowAmmunitionModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:shadow-lg transition-all font-semibold text-sm flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Боеприпасы
                      </button>
                    </div>

                    {character.inventory && character.inventory.filter(i => i.equipped).length > 0 ? (
                      <div className="space-y-2">
                        {character.inventory.filter(i => i.equipped).map((item) => {
                          const ItemIcon = getItemIcon(item.type);
                          return (
                            <div
                              key={item.id}
                              className="bg-dark-bg rounded-lg p-3 border-2 border-blue-500/50 bg-blue-500/5"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <ItemIcon className="w-4 h-4 text-blue-400" />
                                    <span className="px-2 py-0.5 bg-dark-card text-xs rounded">
                                      {getItemTypeLabel(item.type)}
                                    </span>
                                    <h4 className="font-bold">{item.name}</h4>
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-gray-400 mt-1 break-words overflow-wrap-anywhere">{item.description}</div>
                                  )}
                                  {item.type === 'weapon' && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      Урон: <span className="text-white font-semibold">{item.damage}</span> • {item.damageType}
                                      {item.weaponClass === 'ranged' && item.ammunitionType && (
                                        <> • Боеприпас: {item.ammunitionType}</>
                                      )}
                                    </div>
                                  )}
                                  {item.type === 'armor' && item.baseAC && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      КБ: {item.baseAC}
                                      {item.dexModifier && (
                                        <span> + Ловк.{item.maxDexModifier !== null ? ` (макс ${item.maxDexModifier})` : ''}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => unequipItem(item.id)}
                                  className="px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded hover:bg-red-500/30 transition-all text-xs font-semibold"
                                >
                                  Снять
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-12">
                        <Backpack className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                        <p className="text-sm">Нет экипированных предметов</p>
                        <p className="text-xs mt-1">Экипируйте предметы из инвентаря</p>
                      </div>
                    )}

                    {/* Text notes at the end */}
                    <div className="mt-6">
                      <div className="text-xs text-gray-400 mb-2 uppercase">Заметки</div>
                      <textarea
                        value={character.equipmentNotes || ''}
                        onChange={(e) => {
                          updateEquipmentNotes(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Дополнительные заметки о снаряжении..."
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Инвентарь</h3>
                      <button
                        onClick={() => openItemModal()}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold text-sm"
                      >
                        + Добавить предмет
                      </button>
                    </div>

                    {/* Sub-tabs for inventory */}
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                      {(['all', 'armor', 'weapon', 'item', 'ammunition'] as InventorySubTab[]).map((subTab) => (
                        <button
                          key={subTab}
                          onClick={() => setInventorySubTab(subTab)}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                            inventorySubTab === subTab
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                              : 'bg-dark-card border border-dark-border text-gray-400 hover:border-blue-500/50'
                          }`}
                        >
                          {subTab === 'all' && 'Все'}
                          {subTab === 'armor' && 'Броня'}
                          {subTab === 'weapon' && 'Оружие'}
                          {subTab === 'item' && 'Предметы'}
                          {subTab === 'ammunition' && 'Боеприпасы'}
                        </button>
                      ))}
                    </div>

                    {character.inventory && character.inventory.filter(item => 
                      inventorySubTab === 'all' || item.type === inventorySubTab
                    ).length > 0 ? (
                      <div className="space-y-2">
                        {character.inventory.filter(item => 
                          inventorySubTab === 'all' || item.type === inventorySubTab
                        ).map((item) => {
                          const ItemIcon = getItemIcon(item.type);
                          return (
                            <div
                              key={item.id}
                              onClick={() => openItemView(item)}
                              className={`bg-dark-bg rounded-lg p-3 border transition-all cursor-pointer ${
                                item.equipped ? 'border-blue-500/30 bg-blue-500/5' : 'border-dark-border hover:border-blue-500/50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <ItemIcon className="w-4 h-4 text-gray-400" />
                                    <span className="px-2 py-0.5 bg-dark-card text-xs rounded">
                                      {getItemTypeLabel(item.type)}
                                    </span>
                                    <h4 className="font-bold">{item.name}</h4>
                                    {item.equipped && (
                                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                        Экип.
                                      </span>
                                    )}
                                    {(item.quantity !== undefined && item.quantity > 1) && (
                                      <span className="px-2 py-0.5 bg-gray-500/30 text-white text-xs rounded-full">
                                        x{item.quantity}
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-gray-400 mt-1 break-words overflow-wrap-anywhere">{item.description}</div>
                                  )}
                                  {item.type === 'weapon' && (
                                    <div className="text-xs text-gray-400 mt-1 break-words">
                                      Урон: {item.damage} • {item.damageType} • {item.weaponClass === 'melee' ? 'Мили' : 'Огнестрел'}
                                    </div>
                                  )}
                                  {item.type === 'armor' && item.baseAC && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      КБ: {item.baseAC}
                                      {item.dexModifier && (
                                        <span> + Ловк.{item.maxDexModifier !== null ? ` (макс ${item.maxDexModifier})` : ''}</span>
                                      )}
                                    </div>
                                  )}
                                  {item.itemClass && (
                                    <div className="text-xs text-gray-400 mt-1 break-words">
                                      Класс: {item.itemClass}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openItemModal(item); }}
                                    className="px-2 py-1 bg-dark-card border border-dark-border rounded text-xs hover:bg-dark-hover transition-all"
                                  >
                                    Изм.
                                  </button>
                                  {(item.type === 'armor' || item.type === 'weapon') && (item.equipped ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); unequipItem(item.id); }}
                                      className="px-2 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded hover:bg-red-500/30 transition-all text-xs font-semibold"
                                    >
                                      Снять
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); equipItem(item.id); }}
                                      className="px-2 py-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-all text-xs font-semibold"
                                    >
                                      Экип.
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2 text-xs flex-wrap items-center">
                                <div className="bg-dark-card rounded px-2 py-1">
                                  <span className="text-gray-400">Вес:</span> <span className="font-bold">{item.weight % 1 === 0 ? item.weight : item.weight.toFixed(1)}</span>
                                </div>
                                <div className="bg-dark-card rounded px-2 py-1">
                                  <span className="text-gray-400">Цена:</span> <span className="font-bold">{item.cost}</span>
                                </div>
                                {(item.type === 'item' || item.type === 'ammunition') && item.quantity !== undefined && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateItemQuantity(item.id, -1); }}
                                      className="w-6 h-6 bg-red-500/20 border border-red-500/50 text-red-400 rounded hover:bg-red-500/30 transition-all font-bold text-sm flex items-center justify-center"
                                    >
                                      −
                                    </button>
                                    <div className="bg-dark-card rounded px-3 py-1 min-w-[50px] text-center">
                                      <span className="font-bold">{item.quantity}</span>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateItemQuantity(item.id, 1); }}
                                      className="w-6 h-6 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-all font-bold text-sm flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-8">
                        <p className="text-sm">Нет предметов в инвентаре</p>
                      </div>
                    )}

                    {/* Text notes at the end */}
                    <div className="mt-6">
                      <div className="text-xs text-gray-400 mb-2 uppercase">Быстрые заметки</div>
                      <textarea
                        value={character.inventoryNotes || ''}
                        onChange={(e) => {
                          updateInventoryNotes(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Список предметов в текстовом виде..."
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Attribute Modal */}
        <AttributeModal
          isOpen={!!selectedAttribute}
          onClose={() => setSelectedAttribute(null)}
          attributeName={selectedAttribute ? ATTRIBUTES_LIST.find(a => a.id === selectedAttribute)?.name || '' : ''}
          attributeValue={selectedAttribute ? character.attributes[selectedAttribute] || 10 : 10}
          attributeBonus={selectedAttribute ? character.attributeBonuses?.[selectedAttribute] || 0 : 0}
          isProficient={selectedAttribute ? character.savingThrowProficiencies?.includes(selectedAttribute) || false : false}
          proficiencyBonus={character.proficiencyBonus}
          onUpdateValue={(newValue, newBonus) => {
            if (selectedAttribute) {
              updateAttributeValue(selectedAttribute, newValue, newBonus);
            }
          }}
          onToggleProficiency={() => {
            if (selectedAttribute) {
              toggleSavingThrowProficiency(selectedAttribute);
            }
          }}
        />

        {/* Health Modal */}
        <HealthModal
          isOpen={showHealthModal}
          onClose={() => setShowHealthModal(false)}
          currentHP={character.currentHP}
          maxHP={character.maxHP}
          tempHP={character.tempHP}
          maxHPBonus={character.maxHPBonus}
          onUpdate={updateHealth}
        />

        {/* Sanity Modal */}
        <SanityModal
          isOpen={showSanityModal}
          onClose={() => setShowSanityModal(false)}
          currentSanity={character.sanity}
          maxSanity={getMaxSanity()}
          onUpdate={updateSanity}
        />

        {/* Experience Modal */}
        <ExperienceModal
          isOpen={showExperienceModal}
          onClose={() => setShowExperienceModal(false)}
          experience={character.experience}
          level={character.level}
          onUpdate={saveExperience}
        />

        {/* Resource Modal */}
        <ResourceModal
          isOpen={showResourceModal}
          onClose={closeResourceModal}
          resource={editingResource}
          onSave={saveResource}
          onDelete={editingResource ? () => deleteResource(editingResource.id) : undefined}
        />

        {/* Limb Modal */}
        {selectedLimb && (
          <LimbModal
            isOpen={showLimbModal}
            onClose={() => setShowLimbModal(false)}
            limb={selectedLimb}
            limbType={getLimbType(selectedLimb.id)}
            onUpdate={updateLimb}
          />
        )}

        {/* Armor Class Modal */}
        <ArmorClassModal
          isOpen={showACModal}
          onClose={() => setShowACModal(false)}
          armorClass={character.armorClass}
          limbs={character.limbs || []}
          onUpdate={updateArmorClass}
        />

        {/* Item Modal */}
        <ItemModal
          isOpen={showItemModal}
          onClose={closeItemModal}
          item={editingItem}
          onSave={saveItem}
          onDelete={editingItem ? () => deleteItem(editingItem.id) : undefined}
        />

        {/* Attack Modal */}
        <AttackModal
          isOpen={showAttackModal}
          onClose={closeAttackModal}
          attack={editingAttack}
          onSave={saveAttack}
          onDelete={editingAttack && !editingAttack.weaponId ? () => deleteAttack(editingAttack.id) : undefined}
        />

        {/* Ability Modal */}
        <AbilityModal
          isOpen={showAbilityModal}
          onClose={closeAbilityModal}
          ability={editingAbility}
          resources={character.resources || []}
          onSave={saveAbility}
          onDelete={editingAbility ? () => deleteAbility(editingAbility.id) : undefined}
        />

        {/* Ammunition Modal */}
        <AnimatePresence>
          {showAmmunitionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAmmunitionModal(false)}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-dark-card rounded-2xl border border-dark-border p-5 w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Боеприпасы</h2>
                  <button onClick={() => setShowAmmunitionModal(false)} className="w-7 h-7 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {character.inventory.filter(i => i.type === 'ammunition').length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {character.inventory.filter(i => i.type === 'ammunition').map((ammo) => (
                      <div key={ammo.id} className="bg-dark-bg rounded-lg p-3 border border-dark-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-400" />
                            <h4 className="font-bold">{ammo.name}</h4>
                          </div>
                          <span className="text-lg font-bold">×{ammo.quantity || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateAmmunitionQuantity(ammo.id, -1)}
                            className="w-8 h-8 bg-red-500/20 border border-red-500/50 text-red-400 rounded hover:bg-red-500/30 transition-all font-bold"
                          >
                            −
                          </button>
                          <div className="flex-1 bg-dark-card rounded px-3 py-1.5 text-center text-sm">
                            <span className="text-gray-400">Вес:</span> <span className="font-bold">{ammo.weight % 1 === 0 ? ammo.weight : ammo.weight.toFixed(1)}</span> • 
                            <span className="text-gray-400 ml-2">Цена:</span> <span className="font-bold">{ammo.cost}</span>
                          </div>
                          <button
                            onClick={() => updateAmmunitionQuantity(ammo.id, 1)}
                            className="w-8 h-8 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-all font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-8">
                    <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Нет боеприпасов</p>
                    <p className="text-xs mt-1">Добавьте боеприпасы в инвентаре</p>
                  </div>
                )}

                <button
                  onClick={() => setShowAmmunitionModal(false)}
                  className="w-full mt-4 py-2 bg-dark-bg border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-sm font-semibold"
                >
                  Закрыть
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modals */}
        {viewingAttack && (
          <AttackViewModal
            isOpen={showAttackViewModal}
            onClose={() => setShowAttackViewModal(false)}
            attack={viewingAttack}
            onEdit={() => { setEditingAttack(viewingAttack); setShowAttackModal(true); }}
          />
        )}

        {viewingAbility && (
          <AbilityViewModal
            isOpen={showAbilityViewModal}
            onClose={() => setShowAbilityViewModal(false)}
            ability={viewingAbility}
            resource={viewingAbility.resourceId ? character.resources.find(r => r.id === viewingAbility.resourceId) : undefined}
            onEdit={() => { setEditingAbility(viewingAbility); setShowAbilityModal(true); }}
          />
        )}

        {viewingItem && (
          <ItemViewModal
            isOpen={showItemViewModal}
            onClose={() => setShowItemViewModal(false)}
            item={viewingItem}
            onEdit={() => { setEditingItem(viewingItem); setShowItemModal(true); }}
          />
        )}

        {viewingResource && (
          <ResourceViewModal
            isOpen={showResourceViewModal}
            onClose={() => setShowResourceViewModal(false)}
            resource={viewingResource}
            onEdit={() => { 
              setShowResourceViewModal(false);
              openResourceModal(viewingResource); 
            }}
            onUpdate={(updatedResource) => {
              const newResources = character.resources.map(r =>
                r.id === updatedResource.id ? updatedResource : r
              );
              updateCharacter({ ...character, resources: newResources });
            }}
          />
        )}
        
        {/* Trait Modal */}
        <TraitModal
          isOpen={showTraitModal}
          onClose={closeTraitModal}
          trait={editingTrait}
          onSave={saveTrait}
          onDelete={editingTrait ? () => deleteTrait(editingTrait.id) : undefined}
        />

        {viewingTrait && (
          <TraitViewModal
            isOpen={showTraitViewModal}
            onClose={() => setShowTraitViewModal(false)}
            trait={viewingTrait}
            onEdit={() => {
              setShowTraitViewModal(false);
              openTraitModal(viewingTrait);
            }}
          />
        )}

        {/* Basic Info Modal */}
        <BasicInfoModal
          isOpen={showBasicInfoModal}
          onClose={() => setShowBasicInfoModal(false)}
          character={character}
          onSave={(updatedCharacter) => updateCharacter(updatedCharacter)}
        />

        {/* Currency Modal */}
        <CurrencyModal
          isOpen={showCurrencyModal}
          onClose={() => setShowCurrencyModal(false)}
          currency={character.currency}
          onSave={saveCurrency}
        />
      </motion.div>
    </div>
  );
};
