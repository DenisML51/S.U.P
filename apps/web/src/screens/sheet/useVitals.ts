import { toast } from 'react-hot-toast';
import {
  applyDamage,
  applyHealing,
  boundSanity,
  clampSanity,
  experienceProgress,
  grantTempHP,
  damageAfterDefences,
  isDead,
  maxSanityOf,
  rescaleLimbs,
  rollDeathSave,
  setDeathSaves,
  settleHealth,
  receiveCoins,
  setExperience,
  spendCoins,
  totalMaxHP,
  type Coin,
} from '@itd/game-logic';
import type { Character, DeathSaves } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useConcentrationPrompt } from './Concentration';

const COIN_NAME: Record<Coin, string> = { gold: 'зм', silver: 'см', copper: 'мм' };

const DEFENCE_WORD = { resistance: 'сопротивление', vulnerability: 'уязвимость', immunity: 'иммунитет' } as const;

/**
 * What changes minute to minute at the table: health, sanity, experience, coins. Every change is
 * written to the hero's log; the same calls serve the quick controls and the dialogs.
 */
export function useVitals() {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const max = totalMaxHP(character);

  const damage = (value: number, { critical = false, type }: { critical?: boolean; type?: string } = {}) => {
    const preview = applyDamage(character, value, { critical, type });
    const taken = damageAfterDefences(character, value, type);
    // Pieces joined by " — ", each said on its own in the other language.
    const parts = [
      `Получен урон: ${value}`,
      ...(type ? [type.toLowerCase()] : []),
      ...(taken.defence ? [`${DEFENCE_WORD[taken.defence]}: ${taken.amount}`] : []),
      ...(preview.absorbed ? [`поглощено временными: ${preview.absorbed}`] : []),
      `${preview.character.currentHP}/${max}`,
    ];
    if (isDead(preview.character)) parts.push('погиб');
    else if (character.currentHP <= 0 && preview.character.deathSaves)
      parts.push(`провалов спасбросков: ${preview.character.deathSaves.failures}`);
    else if (preview.character.currentHP <= 0 && character.currentHP > 0) parts.push('без сознания');
    updateCharacter((doc) => applyDamage(doc, value, { critical, type }).character, {
      log: { message: parts.join(' — '), type: 'health' },
    });
    if (isDead(preview.character)) toast.error(`${character.name} погибает`);
    // Concentration that survives the hit still has to survive a Constitution save, of the damage taken.
    if (preview.character.concentratingOn && taken.amount > 0) useConcentrationPrompt.getState().askSave(taken.amount);
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
      // A new maximum carries the limbs along (their wounds stay).
      const limbs = field === 'maxHP' || field === 'maxHPBonus' ? rescaleLimbs(next) : next;
      return settleHealth({ ...limbs, currentHP: Math.min(limbs.currentHP, totalMaxHP(limbs)) });
    });

  /** A death saving throw already thrown (`die` the d20 that counted, `modifier` what was added). */
  const deathSave = (die: number, modifier = 0) => {
    const { outcome } = rollDeathSave(character, die, modifier);
    const said = {
      success: 'успех',
      failure: die <= 1 ? 'два провала' : 'провал',
      stable: 'третий успех — стабилен',
      dead: 'третий провал — погиб',
      revived: 'приходит в себя с 1 хитом',
    }[outcome];
    updateCharacter((doc) => rollDeathSave(doc, die, modifier).character, {
      // A natural 1 or 20 is what counts; otherwise the total, exhaustion taken off.
      log: { message: `Спасбросок от смерти: ${die === 1 || die === 20 ? die : die + modifier} — ${said}`, type: 'health' },
    });
  };

  const markDeathSaves = (saves: DeathSaves) =>
    updateCharacter((doc) => setDeathSaves(doc, saves), {
      log: { message: `Спасброски от смерти: успехов ${saves.successes}, провалов ${saves.failures}`, type: 'health' },
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
    deathSave,
    markDeathSaves,
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
