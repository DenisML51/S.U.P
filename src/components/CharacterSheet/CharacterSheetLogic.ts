import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useCharacter } from '../../context/CharacterContext';
import { 
  RACES, CLASSES, EXPERIENCE_BY_LEVEL, getProficiencyBonus, 
  calculateMaxSanity, Resource, Limb, Character, InventoryItem, 
  Attack, Ability, Currency, Trait, Race, Class, Subrace, Subclass, Skill
} from '../../types';

export type InventorySubTab = 'all' | 'armor' | 'weapon' | 'item' | 'ammunition';

export const useCharacterSheetLogic = () => {
  const { 
    character, 
    updateCharacter, 
    activeTab, 
    setActiveTab, 
    // exportToJSON, 
    // goToCharacterList, 
    updateResourceCount,
    settings
  } = useCharacter();
  
  const [inventorySubTab, setInventorySubTab] = useState<InventorySubTab>('all');
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);

  // Modals state
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

  // Global event listener for modal opening from Navbar
  useEffect(() => {
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
        setActiveTab('inventory');
        setInventorySubTab('ammunition');
      }
    };
    window.addEventListener('open-character-modal', handleOpenModal);
    return () => window.removeEventListener('open-character-modal', handleOpenModal);
  }, [setActiveTab]);

  if (!character) {
    return { character: null };
  }

  const race = RACES.find((r: Race) => r.id === character.race);
  const selectedSubrace = race?.subraces?.find((sr: Subrace) => sr.id === character.subrace);
  const charClass = CLASSES.find((c: Class) => c.id === character.class);
  const selectedSubclass = charClass?.subclasses.find((sc: Subclass) => sc.id === character.subclass);

  const getModifier = (attrId: string) => {
    const value = character.attributes[attrId] || 10;
    const bonus = character.attributeBonuses?.[attrId] || 0;
    const total = Math.floor((value - 10) / 2) + bonus;
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getSkillModifier = (skillId: string) => {
    if (!character.skills || !Array.isArray(character.skills)) return '+0';
    const skill = character.skills.find((s: Skill) => s.id === skillId);
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

  const getMaxSanity = () => {
    return calculateMaxSanity(
      character.class,
      character.attributes.wisdom || 10,
      character.level
    );
  };

  const currentLevelXP = EXPERIENCE_BY_LEVEL[character.level];
  const nextLevelXP = EXPERIENCE_BY_LEVEL[character.level + 1] || EXPERIENCE_BY_LEVEL[20];
  const xpInCurrentLevel = character.experience - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const xpProgress = (xpInCurrentLevel / xpNeededForLevel) * 100;
  const canLevelUp = character.experience >= nextLevelXP && character.level < 20;

  // Handlers
  const saveExperience = (newExperience: number, newLevel: number) => {
    const oldLevel = character.level;
    const newProfBonus = getProficiencyBonus(newLevel);
    
    updateCharacter({
      ...character,
      experience: newExperience,
      level: newLevel,
      proficiencyBonus: newProfBonus,
    });

    if (settings.notifications) {
      if (newLevel > oldLevel) {
        toast.success(`Уровень повышен! Теперь вы ${newLevel} уровня`, {
          duration: 5000,
          icon: '🎉'
        });
      } else {
        toast.success(`Опыт обновлен: ${newExperience}`);
      }
    }
  };

  const updateSpeed = (newSpeed: number) => {
    updateCharacter({ ...character, speed: newSpeed });
  };

  const updateSanity = (newSanity: number) => {
    const maxSanity = getMaxSanity();
    const clampedSanity = Math.min(maxSanity, Math.max(0, newSanity));
    const diff = clampedSanity - character.sanity;

    updateCharacter({ ...character, sanity: clampedSanity });

    if (settings.notifications && diff !== 0) {
      if (diff < 0) toast.error(`Потеря рассудка: ${diff} (${clampedSanity}/${maxSanity})`);
      else toast.success(`Рассудок восстановлен: +${diff} (${clampedSanity}/${maxSanity})`);
    }
  };

  const updateHealth = (current: number, max: number, temp: number, bonus: number) => {
    const diff = current - character.currentHP;

    updateCharacter({
      ...character,
      currentHP: current,
      maxHP: max,
      tempHP: temp,
      maxHPBonus: bonus,
    });

    if (settings.notifications && diff !== 0) {
      if (diff > 0) toast.success(`Здоровье: +${diff} (${current}/${max + bonus})`);
      else toast.error(`Здоровье: ${diff} (${current}/${max + bonus})`);
    }
  };

  const updateLanguagesAndProficiencies = (value: string) => {
    updateCharacter({ ...character, languagesAndProficiencies: value });
  };

  const saveResource = (resource: Resource) => {
    const existingIndex = character.resources.findIndex((r: Resource) => r.id === resource.id);
    let newResources;
    if (existingIndex >= 0) {
      newResources = [...character.resources];
      newResources[existingIndex] = resource;
    } else {
      newResources = [...character.resources, resource];
    }
    updateCharacter({ ...character, resources: newResources });
  };

  const deleteResource = (resourceId: string) => {
    const newResources = character.resources.filter((r: Resource) => r.id !== resourceId);
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
    const newLimbs = character.limbs.map((l: Limb) => l.id === updatedLimb.id ? updatedLimb : l);
    updateCharacter({ ...character, limbs: newLimbs });
  };

  const updateArmorClass = (newAC: number, newLimbs: Limb[]) => {
    updateCharacter({ ...character, armorClass: newAC, limbs: newLimbs });
  };

  const updatePersonalityField = (field: keyof Character, value: any) => {
    updateCharacter({ ...character, [field]: value });
  };

  const saveItem = (item: InventoryItem) => {
    const existingIndex = character.inventory.findIndex((a: InventoryItem) => a.id === item.id);
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
    const newInventory = character.inventory.filter((a: InventoryItem) => a.id !== itemId);
    updateCharacter({ ...character, inventory: newInventory });
  };

  const equipItem = (itemId: string) => {
    const item = character.inventory.find((a: InventoryItem) => a.id === itemId);
    if (!item) return;

    let newAttacks = [...character.attacks];

    if (item.type === 'armor') {
      const newInventory = character.inventory.map((a: InventoryItem) => ({
        ...a,
        equipped: a.id === itemId ? true : (a.type === 'armor' ? false : a.equipped),
      }));
      const dexMod = Math.floor(((character.attributes.dexterity || 10) - 10) / 2);
      let calculatedAC = item.baseAC || 10;
      if (item.dexModifier) {
        const appliedDexMod = (item.maxDexModifier !== null && item.maxDexModifier !== undefined)
          ? Math.min(dexMod, item.maxDexModifier)
          : dexMod;
        calculatedAC += appliedDexMod;
      }
      const newLimbs = character.limbs.map((limb: Limb) => ({
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
      const newInventory = character.inventory.map((a: InventoryItem) => 
        a.id === itemId ? { ...a, equipped: true } : a
      );
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
      const newInventory = character.inventory.map((a: InventoryItem) => 
        a.id === itemId ? { ...a, equipped: true } : a
      );
      updateCharacter({ ...character, inventory: newInventory });
    }

    if (settings.notifications) {
      toast.success(`Экипировано: ${item.name}`);
    }
  };

  const unequipItem = (itemId: string) => {
    const item = character.inventory.find((a: InventoryItem) => a.id === itemId);
    if (!item) return;

    const newInventory = character.inventory.map((a: InventoryItem) => ({
      ...a,
      equipped: a.id === itemId ? false : a.equipped,
    }));

    if (item.type === 'armor') {
      const dexMod = Math.floor(((character.attributes.dexterity || 10) - 10) / 2);
      const baseAC = 10 + dexMod;
      const newLimbs = character.limbs.map((limb: Limb) => ({
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
      const newAttacks = character.attacks.filter((attack: Attack) => attack.weaponId !== itemId);
      updateCharacter({ ...character, inventory: newInventory, attacks: newAttacks });
    } else {
      updateCharacter({ ...character, inventory: newInventory });
    }

    if (settings.notifications) {
      toast(`Снято: ${item.name}`, { icon: '📦' });
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
    const newInventory = character.inventory.map((item: InventoryItem) => {
      if (item.id === itemId && (item.type === 'item' || item.type === 'ammunition')) {
        return { ...item, quantity: Math.max(0, (item.quantity || 1) + delta) };
      }
      return item;
    });
    updateCharacter({ ...character, inventory: newInventory });
  };

  const updateAmmunitionQuantity = (itemId: string, delta: number) => {
    const newInventory = character.inventory.map((item: InventoryItem) => {
      if (item.id === itemId && item.type === 'ammunition') {
        return { ...item, quantity: Math.max(0, (item.quantity || 0) + delta) };
      }
      return item;
    });
    updateCharacter({ ...character, inventory: newInventory });
  };

  const saveAttack = (attack: Attack) => {
    const existingIndex = character.attacks.findIndex((a: Attack) => a.id === attack.id);
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
    const newAttacks = character.attacks.filter((a: Attack) => a.id !== attackId);
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
    const existingIndex = character.abilities.findIndex((a: Ability) => a.id === ability.id);
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
    const newAbilities = character.abilities.filter((a: Ability) => a.id !== abilityId);
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
    const existingIndex = currentTraits.findIndex((t: Trait) => t.id === trait.id);
    const newTraits = existingIndex >= 0
      ? currentTraits.map((t: Trait, i: number) => i === existingIndex ? trait : t)
      : [...currentTraits, trait];
    updateCharacter({ ...character, traits: newTraits });
  };

  const deleteTrait = (traitId: string) => {
    const currentTraits = character.traits || [];
    const newTraits = currentTraits.filter((t: Trait) => t.id !== traitId);
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
    if (settings.notifications) {
      toast.success('Кошелек обновлен');
    }
  };

  const toggleSkillProficiency = (skillId: string) => {
    const updatedSkills = character.skills.map((skill: Skill) =>
      skill.id === skillId
        ? { ...skill, proficient: !skill.proficient, expertise: false }
        : skill
    );
    updateCharacter({ ...character, skills: updatedSkills });
  };

  const toggleSkillExpertise = (skillId: string) => {
    const skill = character.skills.find((s: Skill) => s.id === skillId);
    if (!skill?.proficient) return;
    
    const updatedSkills = character.skills.map((s: Skill) =>
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
      ? currentProficiencies.filter((id: string) => id !== attrId)
      : [...currentProficiencies, attrId];
    updateCharacter({
      ...character,
      savingThrowProficiencies: newProficiencies,
    });
  };

  const isDying = character.currentHP <= 0;
  const isInsane = character.sanity <= 0;
  const getTotalMaxHP = () => character.maxHP + character.maxHPBonus;

  const getLimbType = (limbId: string): 'head' | 'arm' | 'leg' | 'torso' => {
    if (limbId === 'head') return 'head';
    if (limbId === 'torso') return 'torso';
    if (limbId.includes('Arm')) return 'arm';
    return 'leg';
  };

  return {
    character,
    activeTab,
    setActiveTab,
    inventorySubTab,
    setInventorySubTab,
    selectedAttribute,
    setSelectedAttribute,
    race,
    selectedSubrace,
    charClass,
    selectedSubclass,
    getModifier,
    getSkillModifier,
    getSavingThrowModifier,
    getMaxSanity,
    xpProgress,
    canLevelUp,
    isDying,
    isInsane,
    getTotalMaxHP,
    getLimbType,
    // Modals state
    showHealthModal, setShowHealthModal,
    showSanityModal, setShowSanityModal,
    showExperienceModal, setShowExperienceModal,
    showResourceModal, setShowResourceModal,
    editingResource, setEditingResource,
    showLimbModal, setShowLimbModal,
    selectedLimb, setSelectedLimb,
    showACModal, setShowACModal,
    showItemModal, setShowItemModal,
    editingItem, setEditingItem,
    showAmmunitionModal, setShowAmmunitionModal,
    showAttackModal, setShowAttackModal,
    editingAttack, setEditingAttack,
    showAbilityModal, setShowAbilityModal,
    editingAbility, setEditingAbility,
    showAttackViewModal, setShowAttackViewModal,
    viewingAttack, setViewingAttack,
    showAbilityViewModal, setShowAbilityViewModal,
    viewingAbility, setViewingAbility,
    showItemViewModal, setShowItemViewModal,
    viewingItem, setViewingItem,
    showResourceViewModal, setShowResourceViewModal,
    viewingResource, setViewingResource,
    showTraitModal, setShowTraitModal,
    editingTrait, setEditingTrait,
    showTraitViewModal, setShowTraitViewModal,
    viewingTrait, setViewingTrait,
    showBasicInfoModal, setShowBasicInfoModal,
    showCurrencyModal, setShowCurrencyModal,
    // Handlers
    saveExperience,
    updateSpeed,
    updateSanity,
    updateHealth,
    updateLanguagesAndProficiencies,
    saveResource,
    deleteResource,
    openResourceModal,
    closeResourceModal,
    openLimbModal,
    updateLimb,
    updateArmorClass,
    updatePersonalityField,
    saveItem,
    deleteItem,
    equipItem,
    unequipItem,
    openItemModal,
    closeItemModal,
    updateInventoryNotes,
    updateAttacksNotes,
    updateEquipmentNotes,
    updateAbilitiesNotes,
    updateItemQuantity,
    updateAmmunitionQuantity,
    saveAttack,
    deleteAttack,
    openAttackModal,
    closeAttackModal,
    saveAbility,
    deleteAbility,
    openAbilityModal,
    closeAbilityModal,
    openAttackView,
    openAbilityView,
    saveTrait,
    deleteTrait,
    openTraitView,
    openTraitModal,
    closeTraitModal,
    openItemView,
    openResourceView,
    saveCurrency,
    toggleSkillProficiency,
    toggleSkillExpertise,
    updateAttributeValue,
    toggleSavingThrowProficiency,
    updateCharacter,
    updateResourceCount
  };
};

