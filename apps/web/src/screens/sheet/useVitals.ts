import { toast } from 'react-hot-toast';
import {
  applyDamage,
  applyHealing,
  boundSanity,
  clampSanity,
  experienceProgress,
  grantTempHP,
  keepConcentration,
  maxSanityOf,
  receiveCoins,
  setExperience,
  spendCoins,
  totalMaxHP,
  type Coin,
} from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useConcentrationPrompt } from './Concentration';

const COIN_NAME: Record<Coin, string> = { gold: 'зм', silver: 'см', copper: 'мм' };

/**
 * What changes minute to minute at the table: health, sanity, experience, coins. Every change is
 * written to the hero's log; the same calls serve the quick controls and the dialogs.
 */
export function useVitals() {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const max = totalMaxHP(character);

  const damage = (value: number) => {
    const preview = applyDamage(character, value);
    const absorbed = preview.absorbed ? ` (${preview.absorbed} поглощено временными)` : '';
    updateCharacter((doc) => applyDamage(doc, value).character, { log: { message: `Получен урон: ${value}${absorbed} — ${preview.character.currentHP}/${max}`, type: 'health' },
    });
    // Concentration that survives the hit still has to survive a Constitution save.
    if (preview.character.concentratingOn) useConcentrationPrompt.getState().askSave(value);
  };

  const heal = (value: number) => {
    const preview = applyHealing(character, value);
    updateCharacter((doc) => applyHealing(doc, value).character, { log: { message: `Лечение: +${preview.amount} — ${preview.character.currentHP}/${max}`, type: 'health' },
    });
  };

  const addTemp = (value: number) =>
    updateCharacter((doc) => grantTempHP(doc, value), { log: { message: `Временные хиты: ${Math.max(character.tempHP, value)}`, type: 'health' },
    });

  const healFully = () => heal(max - character.currentHP);

  const setHealthField = (field: 'maxHP' | 'maxHPBonus' | 'tempHP' | 'currentHP', value: number) =>
    updateCharacter((doc) => {
      const next = { ...doc, [field]: Math.max(field === 'maxHPBonus' ? -Infinity : 0, value) };
      return keepConcentration({ ...next, currentHP: Math.min(next.currentHP, totalMaxHP(next)) });
    });

  const changeSanity = (delta: number) => {
    const maxSanity = maxSanityOf(character);
    const sanity = clampSanity(character.sanity + delta, maxSanity);
    if (sanity === character.sanity) return;
    updateCharacter((doc) => ({ ...doc, sanity: clampSanity(doc.sanity + delta, maxSanity) }), { log: {
        message: delta < 0 ? `Потеря рассудка: ${sanity - character.sanity} — ${sanity}/${maxSanity}` : `Рассудок восстановлен: +${sanity - character.sanity} — ${sanity}/${maxSanity}`,
        type: 'sanity',
      },
    });
  };

  /** A smaller bonus lowers the maximum, and sanity above it goes with it. */
  const setSanityBonus = (value: number) =>
    updateCharacter((doc) => boundSanity({ ...doc, maxSanityBonus: Math.trunc(value) }));

  const addExperience = (delta: number) => {
    const experience = Math.max(0, character.experience + delta);
    updateCharacter((doc) => setExperience(doc, Math.max(0, doc.experience + delta), doc.level), { log: { message: delta > 0 ? `Опыт: +${delta} (${experience})` : `Опыт: ${delta} (${experience})`, type: 'exp' },
    });
  };

  const setLevel = (level: number) => {
    if (level === character.level) return;
    updateCharacter((doc) => setExperience(doc, doc.experience, level), { log: { message: level > character.level ? `Уровень повышен до ${level}` : `Уровень изменён: ${level}`, type: 'exp' },
    });
    if (level > character.level) toast.success(`Новый уровень: ${level}`);
  };

  const canLevelUp = experienceProgress(character.level, character.experience).canLevelUp;

  const receive = (amount: number, coin: Coin) =>
    updateCharacter((doc) => ({ ...doc, currency: receiveCoins(doc.currency, amount, coin) }), { log: { message: `Получено: ${amount} ${COIN_NAME[coin]}`, type: 'inventory' },
    });

  /** Pays with change-making; refuses with a message when the purse is short. */
  const spend = (amount: number, coin: Coin): boolean => {
    const after = spendCoins(character.currency, amount, coin);
    if (!after) {
      toast.error(`Не хватает денег: нужно ${amount} ${COIN_NAME[coin]}`);
      return false;
    }
    updateCharacter((doc) => ({ ...doc, currency: spendCoins(doc.currency, amount, coin) ?? doc.currency }), { log: { message: `Потрачено: ${amount} ${COIN_NAME[coin]}`, type: 'inventory' },
    });
    return true;
  };

  const setCoins = (coin: Coin, value: number) =>
    updateCharacter((doc) => ({ ...doc, currency: { ...doc.currency, [coin]: Math.max(0, Math.trunc(value)) } }));

  return {
    damage,
    heal,
    addTemp,
    healFully,
    setHealthField,
    changeSanity,
    setSanityBonus,
    addExperience,
    setLevel,
    canLevelUp,
    receive,
    spend,
    setCoins,
  };
}
