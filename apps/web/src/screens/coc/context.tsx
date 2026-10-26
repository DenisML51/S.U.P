import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { toast } from 'react-hot-toast';
import { createEntityId, rollDie, type HistoryEvent } from '@itd/game-logic';
import {
  BOUTS_REAL_TIME,
  BOUTS_SUMMARY,
  CONDITION_IDS,
  MANIAS,
  PHOBIAS,
  SUCCESS_LABELS,
  addMadness,
  afterIntRoll,
  afterSkillRoll,
  checkSkill,
  cocCharacteristics,
  damageBonusOf,
  loseSanity,
  luckToSucceed,
  malfunctions,
  sanityCheck,
  spendLuck,
  weaponDamageDetailed,
  type DamageDie,
  type Difficulty,
  type SanityOutcome,
  type SkillCheck,
} from '@itd/game-logic/coc';
import type { Character } from '@itd/schema';
import { NO_MODS, diceOnly, modsAfterRoll, modsToRoll, type RollMods } from './sheetRules';
import { rollVerdictOf, type RollVerdict } from './verdict';

/** What was rolled: a skill (ticked on success), a characteristic, Luck, Sanity, an attack, INT, a roll the rules make (a week's recovery, a first casting: neither pushed nor bought with Luck). */
export type RollKind = 'skill' | 'characteristic' | 'luck' | 'sanity' | 'attack' | 'int' | 'rule';

export interface RollRequest {
  label: string;
  value: number;
  kind: RollKind;
  /** Skill id, or the attack's id for an attack. */
  id?: string;
  /** The skill a success ticks (an attack's weapon skill). */
  skill?: string;
  difficulty?: Difficulty;
  bonus?: number;
  penalty?: number;
  /** A gun jams on a roll at or above this. */
  malfunction?: number;
  /** The damage band of the range (a shotgun's "4d6/2d6/1d6"): 0 up close. */
  band?: number;
  /** The screen that rolled the attack rolls its damage itself (a volley, a farther band): no "Урон" on the toast. */
  damageRolled?: boolean;
  /**
   * A roll of the fight: combat rolls are never pushed (7th edition), and a fight back deals its
   * damage only once the opposed roll is won.
   */
  combat?: 'attack' | 'dodge' | 'fightBack' | 'cover' | 'manoeuvre' | 'wound';
}

export interface RollRecord extends RollRequest {
  check: SkillCheck;
  /** A pushed roll cannot be pushed again, nor bought with Luck. */
  pushed?: boolean;
  /** Luck bought this result. */
  luckSpent?: number;
  jammed?: boolean;
  /** After a sanity roll: what it cost and what it set off. */
  sanity?: {
    loss: number;
    needsIntRoll: boolean;
    indefinite: boolean;
    permanent: boolean;
    /** Already insane: the loss brings a bout of madness. */
    boutTriggered?: boolean;
    /** The dice of the loss, to show them thrown. */
    dice?: { sides: number; value: number }[];
  };
  /** An attack's damage, once rolled, with the dice behind it. */
  damage?: { total: number; formula: string; dice?: DamageDie[] };
  /** A line of what the roll meant (a week's recovery, a first casting). */
  note?: string;
  serial: number;
}

/** Options of one edit: `quiet` keeps it out of the app's own messages (a roll tells it itself). */
export interface UpdateOptions {
  quiet?: boolean;
}

/** What a shock left to do, kept on screen until it is done or waved away. */
export interface FollowUps {
  /** A loss of 5 or more: the INT roll that decides whether the horror sinks in. */
  int: { source: string } | null;
  /** A bout of madness to roll (a loss while insane, a passed INT roll, indefinite insanity). */
  bout: { reason: string } | null;
}

const NO_FOLLOW_UPS: FollowUps = { int: null, bout: null };

export interface CocSheetApi {
  character: Character;
  /** One edit of the sheet, with its line in the journal. */
  update: (edit: (doc: Character) => Character, log?: HistoryEvent, options?: UpdateOptions) => void;
  last: RollRecord | null;
  roll: (request: RollRequest) => RollRecord;
  /**
   * A roll with the sheet's modifiers (`mods`), which go back to plain afterwards unless pinned.
   * `diceOnly` keeps the difficulty out (an opposed roll such as a dodge compares levels instead).
   */
  rollModded: (request: RollRequest, options?: { diceOnly?: boolean }) => RollRecord;
  /** A roll already made by the rules (a week's CON roll, a first casting), shown as the latest. */
  present: (request: RollRequest, check: SkillCheck, extra?: Partial<RollRecord>) => RollRecord;
  /** The same roll again, at the risk the Keeper names; only after a failure, only once. */
  push: () => void;
  /** Turns the last failed roll into a success for as much Luck as it missed by. */
  buyWithLuck: () => void;
  /** The damage of the last roll, when it was a hit. */
  rollDamage: () => void;
  /** A sanity roll with its cost ("0/1d6"); the loss and any insanity go onto the sheet. */
  sanityRoll: (label: string, spec: string) => void;
  /** What a loss of sanity already paid (a spell's price) sets off: the INT roll, a bout. */
  sanityLost: (source: string, outcome: Omit<SanityOutcome, 'sanity'>) => void;
  dismiss: () => void;
  damageBonus: string;

  /** Difficulty and bonus or penalty dice of the next roll, the same wherever it is rolled from. */
  mods: RollMods;
  setMods: (mods: RollMods) => void;

  followUps: FollowUps;
  rollInt: () => void;
  dismissInt: () => void;
  /** Rolls a bout of madness from the tables; `summary` when the investigator is alone (the summary table). */
  rollBout: (summary: boolean) => void;
  dismissBout: () => void;
  /** The last bout rolled, kept while the sheet is open. */
  bout: string | null;

  /** Why the hero cannot act now (a party's fight, someone else's turn), or null. */
  turnLock: string | null;
  /** Runs an action of the fight only on the hero's turn; otherwise says why and returns false. */
  onTurn: (run: () => void) => boolean;

  /** A gun that jammed stays jammed until it is cleared (kept on this screen, not in the sheet). */
  isJammed: (weaponId: string) => boolean;
  clearJam: (weaponId: string) => void;
}

const CocSheetContext = createContext<CocSheetApi | null>(null);

/** The latest api for the roll's toast, which is drawn outside the provider and must follow it. */
interface ApiStore {
  get: () => CocSheetApi | null;
  subscribe: (listener: () => void) => () => void;
}
const ApiStoreContext = createContext<ApiStore | null>(null);

const createApiStore = () => {
  let current: CocSheetApi | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (api: CocSheetApi) => {
      current = api;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const noSubscribe = () => () => undefined;
const nothing = () => null;

export const useCoc = (): CocSheetApi => {
  const api = useContext(CocSheetContext);
  if (!api) throw new Error('useCoc outside CocSheetProvider');
  return api;
};

/** The api inside the roll's toast (drawn by the app's toaster, outside the provider) or the sheet. */
export const useCocAnywhere = (): CocSheetApi => {
  const store = useContext(ApiStoreContext);
  const api = useContext(CocSheetContext);
  const live = useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.get ?? nothing);
  const found = live ?? api;
  if (!found) throw new Error('useCocAnywhere outside CocSheetProvider');
  return found;
};

/** Luck cannot buy Luck, Sanity, the rules' own or pushed rolls (7th edition). */
export const canBuyWithLuck = (record: RollRecord, luck: number): boolean =>
  !record.check.success &&
  !record.pushed &&
  record.check.level !== 'fumble' &&
  !['luck', 'sanity', 'int', 'rule'].includes(record.kind) &&
  luckToSucceed(record.check.total, target(record)) <= luck;

/** A failed skill or characteristic roll may be pushed once; never a roll of the fight (7th edition). */
export const canPush = (record: RollRecord): boolean =>
  !record.check.success &&
  !record.pushed &&
  !record.combat &&
  !record.luckSpent &&
  (record.kind === 'skill' || record.kind === 'characteristic');

/** The number the roll had to beat for its difficulty. */
export const target = (record: Pick<RollRecord, 'value' | 'difficulty'>): number =>
  record.difficulty === 'extreme'
    ? Math.floor(record.value / 5)
    : record.difficulty === 'hard'
      ? Math.floor(record.value / 2)
      : record.value;

/**
 * A hit whose damage is still to roll from the toast (not when the screen rolled it already). A
 * fight back hits only when it won the opposed roll: its damage waits for the verdict.
 */
export const canRollDamage = (
  record: RollRecord | null,
  verdict?: Pick<RollVerdict, 'tone'> | null,
): record is RollRecord =>
  !!record &&
  record.kind === 'attack' &&
  record.check.success &&
  !record.damage &&
  !record.damageRolled &&
  (record.combat !== 'fightBack' || verdict?.tone === 'success');

/** What a roll bought with Luck reaches: the level its difficulty asked for. */
export const boughtLevel = (record: Pick<RollRecord, 'difficulty'>): Difficulty => record.difficulty ?? 'regular';

const describe = (record: RollRecord): string =>
  `${record.label}${record.pushed ? ' (повтор)' : ''}: ${record.check.total} из ${target(record)} — ${
    SUCCESS_LABELS[record.check.level]
  }${record.jammed ? ', осечка' : ''}`;

/** The one toast that carries the latest roll; a new roll or a follow-up replaces its content. */
const ROLL_TOAST = 'coc-roll';

const tickFor = (request: RollRequest) =>
  request.skill ?? (request.kind === 'skill' ? request.id : undefined);

const pick = <T,>(list: T[]): T => list[rollDie(list.length) - 1]!;

/** What a sanity loss leaves to do, by the rules: the INT roll for 5+, a bout when already insane or newly indefinite. */
export function followUpsOf(
  source: string,
  outcome: Pick<SanityOutcome, 'needsIntRoll' | 'boutTriggered' | 'indefinite' | 'permanent'>,
  wasIndefinite: boolean,
): Partial<FollowUps> {
  if (outcome.permanent) return { int: null };
  const next: Partial<FollowUps> = {};
  if (outcome.needsIntRoll && !outcome.boutTriggered) next.int = { source };
  if (outcome.boutTriggered) next.bout = { reason: `${source}: потеря рассудка при безумии` };
  else if (outcome.indefinite && !wasIndefinite) next.bout = { reason: `${source}: бессрочное безумие` };
  return next;
}

/**
 * Everything an investigator's screens do goes through here: the sheet in the app (backed by the
 * store) and the design showcase (backed by local state) work the same way. The latest roll shows
 * as the app's toast, with what may follow it by the rules.
 *
 * The store runs every edit twice (on the screen's copy and the stored one): dice are thrown and
 * ids made here, outside the edits, and the edits only write down what was thrown.
 */
export const CocSheetProvider: React.FC<{
  character: Character;
  update: CocSheetApi['update'];
  /** Draws the roll's toast; the sheet passes it, so the provider stays free of the parts. */
  renderRoll?: (record: RollRecord) => React.ReactNode;
  /** Out of the hero's turn in a party's fight: why (the fight's actions are refused). */
  turnLock?: string | null;
  children: React.ReactNode;
}> = ({ character, update, renderRoll, turnLock = null, children }) => {
  const [last, setLast] = useState<RollRecord | null>(null);
  const [mods, setMods] = useState<RollMods>(NO_MODS);
  const [followUps, setFollowUps] = useState<FollowUps>(NO_FOLLOW_UPS);
  const [bout, setBout] = useState<string | null>(null);
  const [jams, setJams] = useState<Record<string, true>>({});
  const serial = useRef(0);

  const show = useCallback((request: RollRequest, check: SkillCheck, extra: Partial<RollRecord> = {}) => {
    serial.current += 1;
    const next: RollRecord = {
      ...request,
      check,
      jammed: malfunctions(check.total, request.malfunction),
      serial: serial.current,
      ...extra,
    };
    setLast(next);
    if (next.jammed && request.kind === 'attack' && request.id) {
      const id = request.id;
      setJams((current) => ({ ...current, [id]: true }));
    }
    return next;
  }, []);

  const record = useCallback(
    (request: RollRequest, extra: Partial<RollRecord> = {}): RollRecord =>
      show(
        request,
        checkSkill(request.value, {
          difficulty: request.difficulty,
          bonus: request.bonus,
          penalty: request.penalty,
        }),
        extra,
      ),
    [show],
  );

  const roll = useCallback<CocSheetApi['roll']>(
    (request) => {
      const next = record(request);
      const skill = tickFor(request);
      update(
        (doc) => {
          const edited = skill ? afterSkillRoll(skill, next.check)(doc) : doc;
          return request.kind === 'int' ? afterIntRoll(next.check.success)(edited) : edited;
        },
        { message: describe(next), type: 'other' },
        { quiet: true },
      );
      return next;
    },
    [record, update],
  );

  const rollModded = useCallback<CocSheetApi['rollModded']>(
    (request, options) => {
      const next = roll({ ...request, ...(options?.diceOnly ? diceOnly(mods) : modsToRoll(mods)) });
      setMods(modsAfterRoll(mods));
      return next;
    },
    [roll, mods],
  );

  const present = useCallback<CocSheetApi['present']>((request, check, extra) => show(request, check, extra), [show]);

  const push = useCallback(() => {
    if (!last || !canPush(last)) return;
    const next = record(last, { pushed: true });
    const skill = tickFor(last);
    update(
      (doc) => (skill ? afterSkillRoll(skill, next.check)(doc) : doc),
      { message: describe(next), type: 'other' },
      { quiet: true },
    );
  }, [last, record, update]);

  const buyWithLuck = useCallback(() => {
    if (!last || !canBuyWithLuck(last, character.coc?.luck ?? 0)) return;
    const cost = luckToSucceed(last.check.total, target(last));
    setLast({ ...last, check: { ...last.check, level: boughtLevel(last), success: true }, luckSpent: cost });
    update(
      (doc) => spendLuck(cost)(doc),
      { message: `${last.label}: потрачено ${cost} удачи — успех`, type: 'other' },
      { quiet: true },
    );
  }, [last, character.coc?.luck, update]);

  const c = cocCharacteristics(character);
  const damageBonus = damageBonusOf(c.str + c.siz).damageBonus;

  const rollDamage = useCallback(() => {
    if (!canRollDamage(last, last && rollVerdictOf(last.serial))) return;
    const weapon = character.attacks.find((a) => a.id === last.id);
    if (!weapon) return;
    const damage = weaponDamageDetailed(weapon, damageBonus, last.check.level, Math.random, last.band ?? 0);
    setLast({ ...last, damage });
    update(
      (doc) => doc,
      { message: `${weapon.name}: урон ${damage.total} (${damage.formula})`, type: 'other' },
      { quiet: true },
    );
  }, [last, character.attacks, damageBonus, update]);

  const indefinite = character.conditions.includes(CONDITION_IDS.indefiniteInsanity);
  const sanityLost = useCallback<CocSheetApi['sanityLost']>(
    (source, outcome) => {
      if (outcome.loss <= 0) return;
      const next = followUpsOf(source, outcome, indefinite);
      setFollowUps((current) => ({ ...current, ...next }));
    },
    [indefinite],
  );

  const sanityRoll = useCallback(
    (label: string, spec: string) => {
      const result = sanityCheck(character, spec);
      serial.current += 1;
      setLast({
        label,
        value: character.sanity,
        kind: 'sanity',
        check: result.check,
        serial: serial.current,
        sanity: {
          loss: result.loss,
          needsIntRoll: result.needsIntRoll,
          indefinite: result.indefinite,
          permanent: result.permanent,
          boutTriggered: result.boutTriggered,
          dice: result.lossDice,
        },
      });
      update(
        loseSanity(result.loss).edit,
        {
          message: `${label} (${spec}): ${result.check.total} из ${character.sanity} — потеряно ${result.loss} рассудка`,
          type: 'sanity',
        },
        { quiet: true },
      );
      sanityLost(label, result);
    },
    [character, update, sanityLost],
  );

  const rollInt = useCallback(() => {
    const source = followUps.int?.source;
    const next = roll({ label: 'Осознание ужаса (ИНТ)', value: cocCharacteristics(character).int, kind: 'int' });
    setFollowUps((current) => ({
      int: null,
      bout: next.check.success ? { reason: `${source ?? 'Шок'}: временное безумие` } : current.bout,
    }));
  }, [followUps.int, roll, character]);

  const dismissInt = useCallback(() => setFollowUps((current) => ({ ...current, int: null })), []);
  const dismissBout = useCallback(() => setFollowUps((current) => ({ ...current, bout: null })), []);

  const rollBout = useCallback(
    (summary: boolean) => {
      // The tables are rolled here, the id made here: the edit only writes the result down.
      const entry = pick(summary ? BOUTS_SUMMARY : BOUTS_REAL_TIME);
      let text = `${entry.name}: ${entry.description}`;
      let edit = (doc: Character) => doc;
      let extra = '';
      const madness = entry.id.includes('phobia') ? pick(PHOBIAS) : entry.id.includes('mania') ? pick(MANIAS) : null;
      if (madness) {
        const kind = entry.id.includes('phobia') ? 'phobia' : 'mania';
        text += ` — ${madness.name}`;
        const had = character.coc?.madness.some((m) => m.name === madness.name);
        if (had) extra = ` (${madness.name} уже записана)`;
        else
          edit = addMadness({
            id: createEntityId('madness'),
            name: madness.name,
            kind,
            description: madness.description,
          });
      }
      setBout(text + extra);
      setFollowUps((current) => ({ ...current, bout: null }));
      update(edit, { message: `Приступ безумия: ${text}${extra}`, type: 'sanity' });
    },
    [character.coc?.madness, update],
  );

  const onTurn = useCallback(
    (run: () => void) => {
      if (turnLock) {
        toast.error(turnLock, { id: 'turn-lock' });
        return false;
      }
      run();
      return true;
    },
    [turnLock],
  );

  const isJammed = useCallback((id: string) => !!jams[id], [jams]);
  const clearJam = useCallback((id: string) => {
    setJams((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setLast(null);
    toast.dismiss(ROLL_TOAST);
  }, []);

  // The roll's toast waits for its follow-ups (damage, Luck, a push) as long as nothing else
  // happens: another action on the sheet or a turn passing takes it away, the roll stays known.
  const hideRoll = useCallback(() => toast.dismiss(ROLL_TOAST), []);
  const act = useCallback<CocSheetApi['update']>(
    (edit, log, options) => {
      if (!options?.quiet) hideRoll();
      update(edit, log, options);
    },
    [update, hideRoll],
  );
  const turnSeen = useRef(turnLock);
  useEffect(() => {
    if (turnSeen.current === turnLock) return;
    turnSeen.current = turnLock;
    hideRoll();
  }, [turnLock, hideRoll]);

  const api = useMemo<CocSheetApi>(
    () => ({
      character,
      update: act,
      last,
      roll,
      rollModded,
      present,
      push,
      buyWithLuck,
      rollDamage,
      sanityRoll,
      sanityLost,
      dismiss,
      damageBonus,
      mods,
      setMods,
      followUps,
      rollInt,
      dismissInt,
      rollBout,
      dismissBout,
      bout,
      turnLock,
      onTurn,
      isJammed,
      clearJam,
    }),
    [
      character,
      act,
      last,
      roll,
      rollModded,
      present,
      push,
      buyWithLuck,
      rollDamage,
      sanityRoll,
      sanityLost,
      dismiss,
      damageBonus,
      mods,
      followUps,
      rollInt,
      dismissInt,
      rollBout,
      dismissBout,
      bout,
      turnLock,
      onTurn,
      isJammed,
      clearJam,
    ],
  );
  const [store] = useState(createApiStore);
  useEffect(() => {
    store.set(api);
  }, [store, api]);

  // The toast comes up for a new roll or a follow-up of it (Luck, damage); its content follows the
  // sheet by itself. It has no timer (see `hideRoll`); once it is gone (closed, another action, a
  // turn passing), a change of the sheet does not bring it back.
  const shown = useRef<RollRecord | null>(null);
  useEffect(() => {
    if (!last || !renderRoll || shown.current === last) return;
    shown.current = last;
    toast(() => <ApiStoreContext.Provider value={store}>{renderRoll(last)}</ApiStoreContext.Provider>, {
      id: ROLL_TOAST,
      duration: Infinity,
    });
  }, [last, renderRoll, store]);
  useEffect(() => () => toast.dismiss(ROLL_TOAST), []);

  return <CocSheetContext.Provider value={api}>{children}</CocSheetContext.Provider>;
};
