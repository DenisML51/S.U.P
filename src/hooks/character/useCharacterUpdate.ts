import { toast } from 'react-hot-toast';
import { Character, Currency, Limb } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';
import {
  updateHealthApi,
  updateSanityApi,
  updateExperienceApi,
  updateAttributeApi,
  updateSkillApi,
  toggleSavingThrowApi,
  updateLimbApi,
  updateCurrencyApi,
  updateConditionApi,
} from '../../api/characters';

export const useCharacterUpdate = (
  character: Character | null,
  applyServerCharacter: (char: Character) => void,
  logHistory: (message: string, type?: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other') => void,
  settings: { notifications: boolean }
) => {
  const { t } = useI18n();
  if (!character?.id) return null;

  const id = character.id;

  const updateHealth = async (current: number, max: number, temp: number, bonus: number) => {
    const nextHP = isNaN(Number(current)) ? 0 : Number(current);
    const nextMax = isNaN(Number(max)) ? 10 : Number(max);
    const nextTemp = isNaN(Number(temp)) ? 0 : Number(temp);
    const nextBonus = isNaN(Number(bonus)) ? 0 : Number(bonus);
    const currentHP = isNaN(Number(character?.currentHP)) ? 0 : Number(character?.currentHP);
    const diff = nextHP - currentHP;

    try {
      const result = await updateHealthApi(id, { currentHP: nextHP, maxHP: nextMax, tempHP: nextTemp, maxHPBonus: nextBonus });
      applyServerCharacter(result.character);
      if (diff !== 0) {
        const msg = diff > 0
          ? `${t('log.healReceived')}: +${diff} HP (${nextHP}/${nextMax + nextBonus})`
          : `${t('log.damageReceived')}: ${diff} HP (${nextHP}/${nextMax + nextBonus})`;
        logHistory(msg, 'health');
        if (settings.notifications) {
          if (diff > 0) toast.success(`${t('health.title')}: +${diff} (${nextHP}/${nextMax + nextBonus})`);
          else toast.error(`${t('health.title')}: ${diff} (${nextHP}/${nextMax + nextBonus})`);
        }
      }
    } catch (e) {
      console.error('Failed to update health:', e);
    }
  };

  const updateSanity = async (newSanity: number, maxSanity: number) => {
    const maxVal = isNaN(Number(maxSanity)) ? 100 : Number(maxSanity);
    const clamped = Math.min(maxVal, Math.max(0, isNaN(Number(newSanity)) ? 0 : Number(newSanity)));
    const diff = clamped - (isNaN(Number(character?.sanity)) ? 0 : Number(character?.sanity));

    try {
      const result = await updateSanityApi(id, clamped);
      applyServerCharacter(result.character);
      if (diff !== 0) {
        const msg = diff > 0
          ? `${t('log.sanityRestored')}: +${diff} (${clamped}/${maxVal})`
          : `${t('log.sanityLost')}: ${diff} (${clamped}/${maxVal})`;
        logHistory(msg, 'sanity');
        if (settings.notifications) {
          if (diff < 0) toast.error(`${t('log.sanityLost')}: ${diff} (${clamped}/${maxVal})`);
          else toast.success(`${t('log.sanityRestored')}: +${diff} (${clamped}/${maxVal})`);
        }
      }
    } catch (e) {
      console.error('Failed to update sanity:', e);
    }
  };

  const saveExperience = async (newExperience: number, newLevel: number) => {
    const oldLevel = character?.level || 1;
    const oldExp = character?.experience || 0;

    try {
      const result = await updateExperienceApi(id, newExperience);
      applyServerCharacter(result.character);
      if (newLevel > oldLevel) {
        logHistory(`${t('log.levelUpTo')} ${newLevel}!`, 'exp');
        if (settings.notifications) toast.success(`${t('log.levelUpNow')} ${newLevel}`, { duration: 5000, icon: '🎉' });
      } else if (newExperience !== oldExp) {
        logHistory(`${t('log.experienceUpdated')}: ${newExperience}`, 'exp');
        if (settings.notifications) toast.success(`${t('log.experienceUpdated')}: ${newExperience}`);
      }
    } catch (e) {
      console.error('Failed to update experience:', e);
    }
  };

  const updateAttributeValue = async (attrId: string, newValue: number, newBonus: number) => {
    try {
      const result = await updateAttributeApi(id, attrId, newValue, newBonus);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to update attribute:', e);
    }
  };

  const toggleSkillProficiency = async (skillId: string) => {
    const skill = character.skills.find(s => s.id === skillId);
    if (!skill) return;
    try {
      const result = await updateSkillApi(id, skillId, !skill.proficient, false);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to toggle skill proficiency:', e);
    }
  };

  const toggleSkillExpertise = async (skillId: string) => {
    const skill = character.skills.find(s => s.id === skillId);
    if (!skill) return;
    try {
      const result = await updateSkillApi(id, skillId, skill.proficient, !skill.expertise);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to toggle skill expertise:', e);
    }
  };

  const toggleSavingThrowProficiency = async (attrId: string) => {
    try {
      const result = await toggleSavingThrowApi(id, attrId);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to toggle saving throw:', e);
    }
  };

  const updateLimb = async (updatedLimb: Limb) => {
    const current = character.limbs.find(l => l.id === updatedLimb.id);
    if (!current) return;
    const fields: Array<'currentHP' | 'maxHP' | 'ac'> = ['currentHP', 'maxHP', 'ac'];
    for (const field of fields) {
      if (current[field] !== updatedLimb[field]) {
        try {
          const result = await updateLimbApi(id, updatedLimb.id, field, updatedLimb[field]);
          applyServerCharacter(result.character);
        } catch (e) {
          console.error('Failed to update limb:', e);
        }
      }
    }
  };

  const updateCurrency = async (currency: Currency) => {
    try {
      const result = await updateCurrencyApi(id, currency);
      applyServerCharacter(result.character);
      if (settings.notifications) toast.success(t('log.walletUpdated'));
    } catch (e) {
      console.error('Failed to update currency:', e);
    }
  };

  const updateCondition = async (conditionId: string, active: boolean) => {
    try {
      const result = await updateConditionApi(id, conditionId, active);
      applyServerCharacter(result.character);
    } catch (e) {
      console.error('Failed to update condition:', e);
    }
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
