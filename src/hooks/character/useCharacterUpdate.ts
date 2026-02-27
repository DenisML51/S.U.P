import { toast } from 'react-hot-toast';
import { Character, Currency, Skill, Limb, getProficiencyBonus } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';

export const useCharacterUpdate = (
  character: Character | null,
  updateCharacter: (char: Character | ((prev: Character) => Character), silent?: boolean) => void,
  logHistory: (message: string, type?: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other') => void,
  settings: any
) => {
  const { t } = useI18n();
  if (!character) return null;

  const updateHealth = (current: number, max: number, temp: number, bonus: number) => {
    const nextHP = isNaN(Number(current)) ? 0 : Number(current);
    const nextMax = isNaN(Number(max)) ? 10 : Number(max);
    const nextTemp = isNaN(Number(temp)) ? 0 : Number(temp);
    const nextBonus = isNaN(Number(bonus)) ? 0 : Number(bonus);
    
    const currentHP = isNaN(Number(character?.currentHP)) ? 0 : Number(character?.currentHP);
    const diff = nextHP - currentHP;
    
    if (diff !== 0) {
      const message = diff > 0 
        ? `${t('log.healReceived')}: +${diff} HP (${nextHP}/${nextMax + nextBonus})`
        : `${t('log.damageReceived')}: ${diff} HP (${nextHP}/${nextMax + nextBonus})`;
      logHistory(message, 'health');
    }

    if (settings.notifications && diff !== 0) {
      if (diff > 0) toast.success(`${t('health.title')}: +${diff} (${nextHP}/${nextMax + nextBonus})`);
      else toast.error(`${t('health.title')}: ${diff} (${nextHP}/${nextMax + nextBonus})`);
    }

    updateCharacter((prev: Character) => ({
      ...prev,
      currentHP: nextHP,
      maxHP: nextMax,
      tempHP: nextTemp,
      maxHPBonus: nextBonus,
    }), true);
  };

  const updateSanity = (newSanity: number, maxSanity: number) => {
    const nextSanity = isNaN(Number(newSanity)) ? 0 : Number(newSanity);
    const maxVal = isNaN(Number(maxSanity)) ? 100 : Number(maxSanity);
    const clampedSanity = Math.min(maxVal, Math.max(0, nextSanity));
    
    const currentSanity = isNaN(Number(character?.sanity)) ? 0 : Number(character?.sanity);
    const diff = clampedSanity - currentSanity;

    if (diff !== 0) {
      const message = diff > 0 
        ? `${t('log.sanityRestored')}: +${diff} (${clampedSanity}/${maxVal})`
        : `${t('log.sanityLost')}: ${diff} (${clampedSanity}/${maxVal})`;
      logHistory(message, 'sanity');
    }

    if (settings.notifications && diff !== 0) {
      if (diff < 0) toast.error(`${t('log.sanityLost')}: ${diff} (${clampedSanity}/${maxVal})`);
      else toast.success(`${t('log.sanityRestored')}: +${diff} (${clampedSanity}/${maxVal})`);
    }

    updateCharacter((prev: Character) => ({ ...prev, sanity: clampedSanity }), true);
  };

  const saveExperience = (newExperience: number, newLevel: number) => {
    const oldLevel = character?.level || 1;
    const oldExp = character?.experience || 0;
    const newProfBonus = getProficiencyBonus(newLevel);

    if (newLevel > oldLevel) {
      logHistory(`${t('log.levelUpTo')} ${newLevel}!`, 'exp');
    } else if (newExperience !== oldExp) {
      logHistory(`${t('log.experienceUpdated')}: ${newExperience}`, 'exp');
    }

    if (settings.notifications) {
      if (newLevel > oldLevel) {
        toast.success(`${t('log.levelUpNow')} ${newLevel}`, { duration: 5000, icon: '🎉' });
      } else {
        toast.success(`${t('log.experienceUpdated')}: ${newExperience}`);
      }
    }

    updateCharacter((prev: Character) => ({
      ...prev,
      experience: newExperience,
      level: newLevel,
      proficiencyBonus: newProfBonus,
    }), true);
  };

  const updateAttributeValue = (attrId: string, newValue: number, newBonus: number) => {
    updateCharacter({
      ...character,
      attributes: { ...character.attributes, [attrId]: newValue },
      attributeBonuses: { ...character.attributeBonuses, [attrId]: newBonus },
    });
  };

  const toggleSkillProficiency = (skillId: string) => {
    const updatedSkills = character.skills.map((skill: Skill) =>
      skill.id === skillId ? { ...skill, proficient: !skill.proficient, expertise: false } : skill
    );
    updateCharacter({ ...character, skills: updatedSkills });
  };

  const toggleSkillExpertise = (skillId: string) => {
    const updatedSkills = character.skills.map((skill: Skill) =>
      skill.id === skillId ? { ...skill, expertise: !skill.expertise } : skill
    );
    updateCharacter({ ...character, skills: updatedSkills });
  };

  const toggleSavingThrowProficiency = (attrId: string) => {
    const current = character.savingThrowProficiencies || [];
    const newProficiencies = current.includes(attrId)
      ? current.filter(id => id !== attrId)
      : [...current, attrId];
    updateCharacter({ ...character, savingThrowProficiencies: newProficiencies });
  };

  const updateLimb = (updatedLimb: Limb) => {
    const newLimbs = character.limbs.map(l => l.id === updatedLimb.id ? updatedLimb : l);
    updateCharacter({ ...character, limbs: newLimbs });
  };

  const updateCurrency = (currency: Currency) => {
    updateCharacter({ ...character, currency });
    if (settings.notifications) toast.success(t('log.walletUpdated'));
  };

  const updateCondition = (conditionId: string, active: boolean) => {
    const current = character.conditions || [];
    const next = active 
      ? [...new Set([...current, conditionId])]
      : current.filter(id => id !== conditionId);
    updateCharacter({ ...character, conditions: next });
  };

  return {
    updateHealth,
    updateSanity,
    saveExperience,
    updateAttributeValue,
    toggleSkillProficiency,
    toggleSkillExpertise,
    toggleSavingThrowProficiency,
    updateLimb,
    updateCurrency,
    updateCondition,
  };
};

