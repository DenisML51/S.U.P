import { toast } from 'react-hot-toast';
import {
  clampSanity,
  replaceLimb,
  setAttribute,
  setCondition,
  setExperience,
  setHealth,
  toggleSavingThrowProficiency,
  toggleSkillExpertise,
  toggleSkillProficiency,
} from '@itd/game-logic';
import type { CharacterUpdater, UpdateOptions } from '../../store/useCharacterStore';
import type { Character, Currency, Limb } from '../../types';
import type { AppSettings } from '../../data/settings';

type UpdateCharacter = (updater: CharacterUpdater, options?: boolean | UpdateOptions) => void;

/** Finite number or a fallback: form inputs can hand over NaN. */
const finite = (value: number, fallback: number) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const useCharacterUpdate = (
  character: Character | null,
  updateCharacter: UpdateCharacter,
  settings: Pick<AppSettings, 'notifications'>,
) => {
  if (!character) return null;

  const updateHealth = (current: number, max: number, temp: number, bonus: number) => {
    const health = {
      currentHP: finite(current, 0),
      maxHP: finite(max, 10),
      tempHP: finite(temp, 0),
      maxHPBonus: finite(bonus, 0),
    };
    const diff = health.currentHP - character.currentHP;
    const total = health.maxHP + health.maxHPBonus;
    const log =
      diff === 0
        ? undefined
        : {
            message:
              diff > 0
                ? `Получено лечение: +${diff} HP (${health.currentHP}/${total})`
                : `Получен урон: ${diff} HP (${health.currentHP}/${total})`,
            type: 'health' as const,
          };

    updateCharacter((prev) => setHealth(prev, health), { silent: true, log });
    if (settings.notifications && diff !== 0) {
      if (diff > 0) toast.success(`Здоровье: +${diff} (${health.currentHP}/${total})`);
      else toast.error(`Здоровье: ${diff} (${health.currentHP}/${total})`);
    }
  };

  const updateSanity = (newSanity: number, maxSanity: number) => {
    const max = finite(maxSanity, 100);
    const sanity = clampSanity(finite(newSanity, 0), max);
    const diff = sanity - character.sanity;
    const message =
      diff > 0 ? `Рассудок восстановлен: +${diff} (${sanity}/${max})` : `Потеря рассудка: ${diff} (${sanity}/${max})`;

    updateCharacter((prev) => ({ ...prev, sanity }), {
      silent: true,
      log: diff === 0 ? undefined : { message, type: 'sanity' },
    });
    if (settings.notifications && diff !== 0) {
      if (diff < 0) toast.error(message);
      else toast.success(message);
    }
  };

  const saveExperience = (newExperience: number, newLevel: number) => {
    const leveledUp = newLevel > character.level;
    const log = leveledUp
      ? { message: `Уровень повышен до ${newLevel}!`, type: 'exp' as const }
      : newExperience !== character.experience
        ? { message: `Опыт обновлен: ${newExperience}`, type: 'exp' as const }
        : undefined;

    updateCharacter((prev) => setExperience(prev, newExperience, newLevel), { silent: true, log });
    if (settings.notifications) {
      if (leveledUp) toast.success(`Уровень повышен! Теперь вы ${newLevel} уровня`, { duration: 5000, icon: '🎉' });
      else toast.success(`Опыт обновлен: ${newExperience}`);
    }
  };

  const updateCurrency = (currency: Currency) => {
    updateCharacter((prev) => ({ ...prev, currency }));
    if (settings.notifications) toast.success('Кошелек обновлен');
  };

  return {
    updateHealth,
    updateSanity,
    saveExperience,
    updateAttributeValue: (attrId: string, value: number, bonus: number) =>
      updateCharacter((prev) => setAttribute(prev, attrId, value, bonus)),
    toggleSkillProficiency: (skillId: string) => updateCharacter((prev) => toggleSkillProficiency(prev, skillId)),
    toggleSkillExpertise: (skillId: string) => updateCharacter((prev) => toggleSkillExpertise(prev, skillId)),
    toggleSavingThrowProficiency: (attrId: string) =>
      updateCharacter((prev) => toggleSavingThrowProficiency(prev, attrId)),
    updateLimb: (limb: Limb) => updateCharacter((prev) => replaceLimb(prev, limb)),
    updateCurrency,
    updateCondition: (conditionId: string, active: boolean) =>
      updateCharacter((prev) => setCondition(prev, conditionId, active)),
  };
};
