import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { HistoryEvent } from '@itd/game-logic';
import {
  SUCCESS_LABELS,
  afterIntRoll,
  afterSkillRoll,
  checkSkill,
  cocCharacteristics,
  damageBonusOf,
  loseSanity,
  luckToSucceed,
  sanityCheck,
  spendLuck,
  type Difficulty,
  type SkillCheck,
} from '@itd/game-logic/coc';
import type { Character } from '@itd/schema';

/** What was rolled: a skill (ticked on success), a characteristic, Luck, Sanity or an attack. */
export type RollKind = 'skill' | 'characteristic' | 'luck' | 'sanity' | 'attack' | 'int';

export interface RollRequest {
  label: string;
  value: number;
  kind: RollKind;
  /** Skill id (ticks it on success) or attack id. */
  id?: string;
  difficulty?: Difficulty;
  bonus?: number;
  penalty?: number;
}

export interface RollRecord extends RollRequest {
  check: SkillCheck;
  /** A pushed roll cannot be pushed again, nor bought with Luck. */
  pushed?: boolean;
  /** Luck bought this result. */
  luckSpent?: number;
  /** After a sanity roll: what it cost and what it set off. */
  sanity?: { loss: number; needsIntRoll: boolean; indefinite: boolean; permanent: boolean };
  serial: number;
}

export interface CocSheetApi {
  character: Character;
  /** One edit of the sheet, with its line in the journal. */
  update: (edit: (doc: Character) => Character, log?: HistoryEvent) => void;
  last: RollRecord | null;
  roll: (request: RollRequest) => RollRecord;
  /** The same roll again, at the risk the Keeper names; only after a failure, only once. */
  push: () => void;
  /** Turns the last failed roll into a success for as much Luck as it missed by. */
  buyWithLuck: () => void;
  /** A sanity roll with its cost ("0/1d6"); the loss and any insanity go onto the sheet. */
  sanityRoll: (label: string, spec: string) => void;
  dismiss: () => void;
  damageBonus: string;
}

const CocSheetContext = createContext<CocSheetApi | null>(null);

export const useCoc = (): CocSheetApi => {
  const api = useContext(CocSheetContext);
  if (!api) throw new Error('useCoc outside CocSheetProvider');
  return api;
};

/** Luck cannot buy Luck, Sanity or pushed rolls (7th edition). */
export const canBuyWithLuck = (record: RollRecord, luck: number): boolean =>
  !record.check.success &&
  !record.pushed &&
  record.check.level !== 'fumble' &&
  !['luck', 'sanity'].includes(record.kind) &&
  luckToSucceed(record.check.total, target(record)) <= luck;

export const canPush = (record: RollRecord): boolean =>
  !record.check.success && !record.pushed && !record.luckSpent && (record.kind === 'skill' || record.kind === 'characteristic');

/** The number the roll had to beat for its difficulty. */
export const target = (record: Pick<RollRecord, 'value' | 'difficulty'>): number =>
  record.difficulty === 'extreme' ? Math.floor(record.value / 5) : record.difficulty === 'hard' ? Math.floor(record.value / 2) : record.value;

const describe = (record: RollRecord): string =>
  `${record.label}${record.pushed ? ' (повтор)' : ''}: ${record.check.total} из ${target(record)} — ${SUCCESS_LABELS[record.check.level]}`;

/**
 * Everything an investigator's screens do goes through here: the sheet in the app (backed by the
 * store) and the design showcase (backed by local state) work the same way.
 */
export const CocSheetProvider: React.FC<{
  character: Character;
  update: CocSheetApi['update'];
  children: React.ReactNode;
}> = ({ character, update, children }) => {
  const [last, setLast] = useState<RollRecord | null>(null);
  const [serial, setSerial] = useState(0);

  const record = useCallback(
    (request: RollRequest, extra: Partial<RollRecord> = {}): RollRecord => {
      const check = checkSkill(request.value, { difficulty: request.difficulty, bonus: request.bonus, penalty: request.penalty });
      const next = { ...request, check, serial: serial + 1, ...extra };
      setSerial((n) => n + 1);
      setLast(next);
      return next;
    },
    [serial],
  );

  const roll = useCallback<CocSheetApi['roll']>(
    (request) => {
      const next = record(request);
      update((doc) => {
        let edited = request.kind === 'skill' && request.id ? afterSkillRoll(request.id, next.check)(doc) : doc;
        if (request.kind === 'int') edited = afterIntRoll(next.check.success)(edited);
        return edited;
      }, { message: describe(next), type: 'other' });
      return next;
    },
    [record, update],
  );

  const push = useCallback(() => {
    if (!last || !canPush(last)) return;
    const next = record(last, { pushed: true });
    update((doc) => (last.kind === 'skill' && last.id ? afterSkillRoll(last.id, next.check)(doc) : doc), {
      message: describe(next),
      type: 'other',
    });
  }, [last, record, update]);

  const buyWithLuck = useCallback(() => {
    if (!last || !canBuyWithLuck(last, character.coc?.luck ?? 0)) return;
    const cost = luckToSucceed(last.check.total, target(last));
    const check: SkillCheck = { ...last.check, level: 'regular', success: true };
    setLast({ ...last, check, luckSpent: cost });
    update((doc) => spendLuck(cost)(doc), { message: `${last.label}: потрачено ${cost} удачи — успех`, type: 'other' });
  }, [last, character.coc?.luck, update]);

  const sanityRoll = useCallback(
    (label: string, spec: string) => {
      const result = sanityCheck(character, spec);
      const next: RollRecord = {
        label,
        value: character.sanity,
        kind: 'sanity',
        check: result.check,
        serial: serial + 1,
        sanity: { loss: result.loss, needsIntRoll: result.needsIntRoll, indefinite: result.indefinite, permanent: result.permanent },
      };
      setSerial((n) => n + 1);
      setLast(next);
      update(loseSanity(result.loss).edit, {
        message: `${label} (${spec}): ${result.check.total} из ${character.sanity} — потеряно ${result.loss} рассудка`,
        type: 'sanity',
      });
    },
    [character, serial, update],
  );

  const c = cocCharacteristics(character);
  const api = useMemo<CocSheetApi>(
    () => ({
      character,
      update,
      last,
      roll,
      push,
      buyWithLuck,
      sanityRoll,
      dismiss: () => setLast(null),
      damageBonus: damageBonusOf(c.str + c.siz).damageBonus,
    }),
    [character, update, last, roll, push, buyWithLuck, sanityRoll, c.str, c.siz],
  );
  return <CocSheetContext.Provider value={api}>{children}</CocSheetContext.Provider>;
};
