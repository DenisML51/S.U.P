import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  COC_CONDITIONS,
  CONDITION_IDS,
  SUCCESS_LABELS,
  cocCharacteristics,
  derivedOf,
  displaySkillName,
  absorbArmor,
  applyHitDamage,
  damageDieOf,
  firearmModifiers,
  hasTalent,
  firearmRangeOf,
  fireWeapon,
  initiativeOf,
  manoeuvreChance,
  meleeModifiers,
  opposedResult,
  rangeBands,
  reloadWeapon,
  skillName,
  skillValue,
  applyDamage,
  changeMagic,
  heal,
  setLuck,
  spendLuck,
  weaponDamageDetailed,
  type Defence,
  type FirearmRange,
  type RollModifiers,
  type SuccessLevel,
} from '@itd/game-logic/coc';
import { maxSanityOf, rollDie } from '@itd/game-logic';
import type { Attack, Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useTableOfCharacter } from '../../store/usePartyStore';
import { useNavStore } from '../../store/useNavStore';
import { useSessionStore } from '../../store/useSessionStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { Button, IconButton, Panel, cx } from '../../ui/primitives';
import { NumberField, Segmented, Select } from '../../ui/forms';
import { Dialog } from '../../ui/Dialog';
import { IconDice, IconExit, IconPrev, IconSettings } from '../../ui/icons';
import { SyncStatus } from '../../ui/SyncStatus';
import { useAtLeast } from '../../ui/useBreakpoint';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { settingOf } from '../../ui/theme/settings';
import { foldRepeats } from '../sheet/parts/history';
import { CombatChat } from '../party/CombatChat';
import { PartyCombatBar } from '../party/PartyCombatBar';
import { useFollowTurn } from '../party/useFollowTurn';
import { useCoc } from './context';
import { setRollVerdict, useRollShown, type RollVerdict } from './verdict';
import { InsanityVeil, madnessStage } from './InsanityVeil';
import { Track } from './parts';
import { PickerDialog } from './picker';
import { CocEntryDialog, CocSelectionProvider, useCocSelection } from './details';
import {
  BIG_TARGET_BUILD,
  TALENT_LUCK,
  afterHurt,
  diveForCover,
  shrugOff,
  enterRound,
  fightBackSkill,
  freshRound,
  idleRound,
  meleeWeapons,
  readRound,
  shotsPerRound,
  shotsToFire,
  syncWithTable,
  withBigTarget,
  type CocRound,
} from './combatRules';

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/** The round of this investigator, kept with the tab like the D&D fight is. */
function useRound(characterId: string): [CocRound, React.Dispatch<React.SetStateAction<CocRound>>] {
  const key = `itd.coc-round.${characterId}`;
  const [state, setState] = useState<CocRound>(() => {
    try {
      return readRound(sessionStorage.getItem(key));
    } catch {
      return idleRound();
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Not kept across reloads.
    }
  }, [key, state]);
  return [state, setState];
}

const isFirearm = (attack: Attack) => attack.skill?.startsWith('firearms') ?? false;

/** The last things that happened, newest at the bottom, older ones fading. */
const CombatLog: React.FC<{ character: Character }> = ({ character }) => {
  const recent = foldRepeats([...character.history].sort((a, b) => a.timestamp - b.timestamp)).slice(-9);
  if (recent.length === 0) return null;
  return (
    <ol className="space-y-1.5 text-sm" aria-label="Последние события">
      {recent.map(({ entry, count }, index) => (
        <li
          key={entry.id}
          className="text-ink-muted"
          style={{ opacity: 0.35 + (0.65 * (index + 1)) / recent.length }}
        >
          {entry.message}
          {count > 1 && <span className="ml-2 tabular-nums opacity-60">×{count}</span>}
        </li>
      ))}
    </ol>
  );
};

/** A toggle chip of the attack's situation. */
const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode; title?: string }> = ({
  on,
  onClick,
  children,
  title,
}) => (
  <button type="button" aria-pressed={on} onClick={onClick} title={title} className="ui-chip">
    {children}
  </button>
);

/**
 * A card of the dock: its mark and title, what it has left this round, an optional switch on the
 * right, then a row of equal tiles. A narrow screen lays the tiles out as a grid.
 */
const DockCard: React.FC<{
  mark: string;
  title: string;
  tone: 'action' | 'reaction';
  state?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ mark, title, tone, state, aside, className, children }) => (
  <Panel className={cx('flex flex-col gap-3 px-4 pb-4 pt-3', className)}>
    <div className="flex min-h-[2rem] items-center gap-3">
      <span className={cx('text-sm', tone === 'action' ? 'text-act-action' : 'text-act-reaction')} aria-hidden>
        {mark}
      </span>
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">{title}</span>
      {state && <span className="text-[11px] text-ink-faint">{state}</span>}
      {aside && <div className="ml-auto">{aside}</div>}
    </div>
    <div className="flex gap-2 max-lg:grid max-lg:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">{children}</div>
  </Panel>
);

/** A tile of the dock: the action, its number in the setting's figures, one line of hint. */
const DockTile: React.FC<{
  label: string;
  value?: number;
  hint?: string;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, value, hint, title, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    title={title ?? hint}
    className="ui-interactive flex h-[4.75rem] w-[7.25rem] flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-line/60 px-2 transition-colors hover:border-frame-bright/70 disabled:opacity-35 max-lg:w-auto"
  >
    <span className="max-w-full truncate text-sm leading-none text-ink">{label}</span>
    {value !== undefined && (
      <span className="ui-display ui-numeric text-xl leading-none text-frame-bright">{value}</span>
    )}
    {hint && <span className="max-w-full truncate text-[10px] leading-none text-ink-faint">{hint}</span>}
  </button>
);

/** Opens a spell's card (inside the cards' provider), where its price is chosen and paid. */
const SpellCards: React.FC<{ children: (open: (id: string) => void) => React.ReactNode }> = ({ children }) => {
  const { open } = useCocSelection();
  return <>{children((id) => open('spell', id))}</>;
};

const LEVELS: SuccessLevel[] = ['failure', 'regular', 'hard', 'extreme', 'critical'];

const RANGE_LABELS: Record<FirearmRange, string> = {
  base: 'обычная',
  long: 'дальняя',
  veryLong: 'очень дальняя',
  beyond: 'вне досягаемости',
};

/** The defences of the bar: the two opposed ones, and diving for cover from a shot. */
type DefenceMode = Defence | 'cover';

/**
 * What the attack on the investigator is: a blow is dodged or fought back, a shot cannot be dodged
 * (7th edition) — the only answer to it is diving for cover.
 */
type IncomingAttack = 'melee' | 'firearm';

/** One shot of the last volley, with the damage rolled for it when it hit. */
interface ShotOutcome {
  total: number;
  level: SuccessLevel;
  jammed: boolean;
  damage?: { total: number; formula: string };
}

/** Spells shown on the bar itself; the rest wait behind «Заклинания (N)». */
const INLINE_SPELLS = 2;

/** An opposed roll told as a telegram reads it: what the defence did, then what the blow did. */
function verdictOf(winner: 'attacker' | 'defender' | 'none', defence: Defence): Omit<RollVerdict, 'serial'> {
  if (winner === 'none') return { parts: ['Никто не преуспел', 'удар не нанесён'], tone: 'neutral' };
  if (winner === 'defender')
    return defence === 'fightBack'
      ? { parts: ['Контратака удалась', 'вы наносите урон'], tone: 'success' }
      : { parts: ['Уклонение удалось', 'удар прошёл мимо'], tone: 'success' };
  return defence === 'fightBack'
    ? { parts: ['Контратака не удалась', 'удар прошёл'], tone: 'danger' }
    : { parts: ['Уклонение не удалось', 'удар прошёл'], tone: 'danger' };
}

/**
 * The investigator's fight by the 7th edition: one action a round (attack, aim, manoeuvre, a skill,
 * a spell), any number of defences (dodge or fight back, each making the next attacker's job easier),
 * modifiers of the situation worked out by the rules, and the rolls coming as the toast.
 */
export const CocCombatView: React.FC<{ onOpenSettings: () => void; onDice: () => void }> = ({
  onOpenSettings,
  onDice,
}) => {
  const { character, update, roll, last, damageBonus } = useCoc();
  const setViewMode = useCharacterStore((s) => s.setViewMode);
  const goToCharacterList = useCharacterStore((s) => s.goToCharacterList);
  const go = useNavStore((s) => s.go);
  const userId = useSessionStore((s) => s.user?.id);
  const turnLock = useCharacterStore((s) => s.turnLock);
  const locked = turnLock !== null;
  const { party } = useTableOfCharacter(character.id);
  useFollowTurn(character.id);
  const partyFight = party?.combat ?? null;
  const [round, setRound] = useRound(character.id);
  const inCombat = party ? partyFight !== null : round.inCombat;

  // At a table the round follows the table's fight: another fight (or none) starts clean, so an aim
  // or a spent action never carries over from the last one, and the round number is the table's.
  const atTable = !!party;
  const fightStart = partyFight?.startedAt ?? null;
  const fightRound = partyFight?.round ?? 0;
  useEffect(() => {
    if (!atTable) return;
    setRound((r) => syncWithTable(r, fightStart ? { startedAt: fightStart, round: fightRound } : null));
  }, [atTable, fightStart, fightRound, setRound]);

  const c = cocCharacteristics(character);
  const build = character.build?.ruleset === 'coc7' ? character.build : undefined;
  const derived = derivedOf(c, build?.variant, build?.age);
  const coc = character.coc!;
  const armor = coc.armor ?? 0;
  /** Pulp talents the fight works out by itself, or offers to spend Luck on. */
  const talent = {
    nimble: hasTalent(character, 'nimble'),
    rapidFire: hasTalent(character, 'rapid-fire'),
    beadyEye: hasTalent(character, 'beady-eye'),
    outmaneuver: hasTalent(character, 'outmaneuver'),
    fastLoad: hasTalent(character, 'fast-load'),
    quickDraw: hasTalent(character, 'quick-draw'),
    heavyHitter: hasTalent(character, 'heavy-hitter'),
    toughGuy: hasTalent(character, 'tough-guy'),
    rapidAttack: hasTalent(character, 'rapid-attack'),
  };
  const canSpendTalentLuck = coc.luck >= TALENT_LUCK;
  /** Dying, unconscious or dead: no action, no defence (rolls the rules ask for stay). */
  const downed = [CONDITION_IDS.dying, CONDITION_IDS.unconscious, CONDITION_IDS.dead].find((id) =>
    character.conditions.includes(id),
  );
  const downedNote =
    downed === CONDITION_IDS.dead
      ? 'Сыщик мёртв'
      : downed === CONDITION_IDS.dying
        ? 'Сыщик при смерти — ни действий, ни защиты'
        : downed
          ? 'Сыщик без сознания — ни действий, ни защиты'
          : null;

  const [weaponId, setWeaponId] = useState<string>(() => character.attacks[0]?.id ?? '');
  const weapon = character.attacks.find((a) => a.id === weaponId) ?? character.attacks[0];
  const firearm = weapon ? isFirearm(weapon) : false;
  const [shot, setShot] = useState<{
    pointBlank: boolean;
    shots: number;
    range: FirearmRange;
    intoMelee: boolean;
    cover: boolean;
    hidden: boolean;
    bigTarget: boolean;
  }>({
    pointBlank: false,
    shots: 1,
    range: 'base',
    intoMelee: false,
    cover: false,
    hidden: false,
    bigTarget: false,
  });
  /** Yards to the target, for a weapon whose range is in yards. */
  const [distance, setDistance] = useState(10);
  const [melee, setMelee] = useState({ outnumbering: false, hampered: false });
  const [targetBuild, setTargetBuild] = useState(0);
  const [targetId, setTargetId] = useState<string | undefined>(undefined);
  const [skillPicker, setSkillPicker] = useState(false);
  const [gunReady, setGunReady] = useState(false);
  const [amount, setAmount] = useState(1);
  const [throughArmor, setThroughArmor] = useState(true);
  /** Pulp «Крепкий орешек» chosen for the next blow. */
  const [shrugNext, setShrugNext] = useState(false);
  /** The roll whose damage «Тяжёлая рука» already raised. */
  const [heavySerial, setHeavySerial] = useState<number | null>(null);
  const [volley, setVolley] = useState<{ weaponId: string; shots: ShotOutcome[] } | null>(null);

  // The master may pick a foe of the fight: its Build (when its sheet has one) settles a big target
  // and a manoeuvre; players, who do not see the NPCs' numbers, mark a big target themselves.
  const targets = (partyFight?.combatants ?? [])
    .filter((x) => x.kind === 'npc')
    .map((x) => ({ combatant: x, build: party?.npcs?.find((n) => n.id === x.refId)?.coc?.build }));
  const knownTargets = targets.filter((t) => t.build !== undefined);
  /** The target's Build settles a manoeuvre and marks a big target (still a chip to turn off). */
  const setBuildOfTarget = (build: number) => {
    setTargetBuild(build);
    setShot((s) => ({ ...s, bigTarget: build >= BIG_TARGET_BUILD }));
  };
  const pickTarget = (id: string) => {
    setTargetId(id);
    const found = knownTargets.find((t) => t.combatant.id === id);
    if (found?.build !== undefined) setBuildOfTarget(found.build);
  };

  const maxShots = weapon ? shotsPerRound(weapon.uses) : 1;
  const shotsAsked = Math.min(Math.max(1, shot.shots), maxShots);
  const shotsNow = weapon ? shotsToFire(shotsAsked, maxShots, weapon.ammo) : 0;
  const rangeAt = firearm && weapon ? firearmRangeOf(distance, weapon.range) : undefined;
  const reach = weapon ? rangeBands(weapon.range) : [];
  const farthest = reach.length > 1 ? reach[reach.length - 1] : reach.length === 1 ? reach[0] * 4 : undefined;
  const range = rangeAt?.range ?? shot.range;

  const aimed = !!weapon && round.aimedWith === weapon.id;
  const mods: RollModifiers = firearm
    ? withBigTarget(
        firearmModifiers({
          pointBlank: shot.pointBlank,
          aimed,
          shots: Math.max(1, shotsNow),
          range,
          bands: rangeAt?.bands ?? weapon?.damage.split('/').length ?? 1,
          intoMelee: shot.intoMelee,
          targetDivedForCover: shot.cover,
          targetHidden: shot.hidden,
          rapidFire: talent.rapidFire && weapon?.skill === 'firearms:handgun',
          beadyEye: talent.beadyEye,
        }),
        shot.bigTarget,
      )
    : meleeModifiers({ defenderReactedThisRound: melee.outnumbering ? 1 : 0, hampered: melee.hampered });

  const actionDone = inCombat && round.actionUsed;
  /**
   * Actions wait for the hero's turn at a table and for a new round; defences and wounds never do.
   * A hero down (dying, unconscious, dead) does nothing at all.
   */
  const noAction = actionDone || locked || !!downed;
  const actionNote = downedNote
    ? downedNote
    : locked
      ? turnLock
      : actionDone
        ? 'Действие раунда потрачено — защищаться ещё можно'
        : null;
  /** An action of the round, refused with the reason out of the hero's turn (as the D&D sheet does). */
  const onTurn = (run: () => void) => {
    if (downedNote) toast.error(downedNote, { id: 'turn-lock' });
    else if (turnLock) toast.error(turnLock, { id: 'turn-lock' });
    else if (actionDone) toast.error('Действие раунда уже потрачено', { id: 'turn-lock' });
    else run();
  };

  // A new round: the shot's situation (point blank, a melee, cover) is the last round's no more;
  // what the target is (big, how far) stays.
  const stillDying = character.conditions.includes(CONDITION_IDS.dying);
  const [conDue, setConDue] = useState(false);
  const seenRound = useRef(round.round);
  useEffect(() => {
    if (seenRound.current === round.round) return;
    seenRound.current = round.round;
    setShot((s) => ({ ...s, pointBlank: false, intoMelee: false, cover: false, hidden: false }));
    setMelee({ outnumbering: false, hampered: false });
    setVolley(null);
    // The dying roll CON at the end of every round.
    if (stillDying) setConDue(true);
  }, [round.round, stillDying]);
  // Hurt: an aim is lost.
  const seenHP = useRef(character.currentHP);
  useEffect(() => {
    if (character.currentHP < seenHP.current) setRound(afterHurt);
    seenHP.current = character.currentHP;
  }, [character.currentHP, setRound]);

  const spendAction = () => setRound((r) => ({ ...r, actionUsed: true, aimedWith: undefined }));
  /**
   * A spell opens its card: there the magic points of a variable spell are chosen, a first casting
   * rolls POW and the sanity it costs follows the rules; casting it spends the round's action.
   */
  const castFrom = (open: (id: string) => void) => (id: string) => onTurn(() => open(id));

  /**
   * The attack: every shot of a volley is its own roll with the volley's penalty die, a round
   * leaves the gun with each, and a jam ends the volley. A volley's hits and a shotgun's farther
   * bands roll their damage here (the roll's toast knows one hit at the closest band only).
   */
  const attack = () =>
    onTurn(() => {
      if (!weapon || mods.impossible) return;
      const fired = firearm ? shotsNow : 1;
      if (fired === 0) return;
      const value = weapon.skill ? skillValue(character, weapon.skill) : 0;
      const band = mods.band ?? 0;
      const ownDamage = fired > 1 || band > 0;
      const shots: ShotOutcome[] = [];
      for (let i = 0; i < fired; i++) {
        const record = roll({
          label: fired > 1 ? `${weapon.name} · выстрел ${i + 1}` : weapon.name,
          value,
          kind: 'attack',
          id: weapon.id,
          skill: weapon.skill,
          malfunction: weapon.malfunction,
          difficulty: mods.difficulty,
          bonus: mods.bonus,
          penalty: mods.penalty,
          band,
          damageRolled: ownDamage,
          combat: 'attack',
        });
        // Dice are rolled here, once: the edit that logs them runs twice (screen and stored copy).
        const hit =
          ownDamage && record.check.success && !record.jammed
            ? weaponDamageDetailed(weapon, damageBonus, record.check.level, Math.random, band)
            : undefined;
        shots.push({
          total: record.check.total,
          level: record.check.level,
          jammed: !!record.jammed,
          ...(hit ? { damage: { total: hit.total, formula: hit.formula } } : {}),
        });
        if (record.jammed) break;
      }
      if (weapon.ammo !== undefined) update(fireWeapon(weapon.id, shots.length), undefined, { quiet: true });
      const hits = shots.filter((x) => x.damage);
      if (ownDamage && hits.length > 0) {
        const total = hits.reduce((sum, x) => sum + x.damage!.total, 0);
        update(
          (doc) => doc,
          {
            message: `${weapon.name}: ${hits.length > 1 ? `${hits.length} попадания, ` : ''}урон ${hits
              .map((x) => `${x.damage!.total} (${x.damage!.formula})`)
              .join(' + ')}${hits.length > 1 ? ` = ${total}` : ''}`,
            type: 'other',
          },
          { quiet: true },
        );
      }
      setVolley(ownDamage ? { weaponId: weapon.id, shots } : null);
      spendAction();
    });

  // Fighting back is made with the weapon in hand: the melee weapon picked under «Оружие», else Brawl.
  const fightWith = weapon && !firearm ? meleeWeapons([weapon])[0] : undefined;
  const fightBackId = fightBackSkill(fightWith);

  const [attackOn, setAttackOn] = useState<IncomingAttack>('melee');
  const [defence, setDefence] = useState<{ mode: DefenceMode; serial: number } | null>(null);
  const [incoming, setIncoming] = useState<SuccessLevel | null>(null);
  const defend = (mode: DefenceMode) => {
    if (downedNote) {
      toast.error(downedNote, { id: 'turn-lock' });
      return;
    }
    const id = mode === 'fightBack' ? fightBackId : 'dodge';
    const record = roll(
      mode === 'fightBack' && fightWith
        ? // With a weapon the roll is its attack: a won fight back rolls that weapon's damage.
          {
            label: `Контратака · ${fightWith.name}`,
            value: skillValue(character, id),
            kind: 'attack',
            id: fightWith.id,
            skill: id,
            combat: 'fightBack',
          }
        : {
            label: mode === 'dodge' ? 'Уклонение' : mode === 'cover' ? 'Укрыться от выстрела' : 'Контратака',
            value: skillValue(character, id),
            kind: 'skill',
            id,
            combat: mode,
          },
    );
    if (mode === 'cover') {
      if (inCombat) setRound((r) => diveForCover(r, talent.nimble));
    } else {
      setRound((r) => ({ ...r, reactions: r.reactions + 1 }));
    }
    // Each defence answers its own attack: the last one's level must not decide this one.
    setIncoming(null);
    setDefence({ mode, serial: record.serial });
  };
  const defending = last && defence && last.serial === defence.serial ? defence.mode : null;
  const verdict =
    defending && defending !== 'cover' && incoming ? opposedResult(incoming, last!.check.level, defending) : null;
  const told: Omit<RollVerdict, 'serial'> | null =
    defending === 'cover'
      ? last!.check.success
        ? { parts: ['Вы укрылись', 'стрелку штрафная кость'], tone: 'success' }
        : { parts: ['Укрыться не успели', 'выстрел как обычно'], tone: 'danger' }
      : verdict && defending
        ? verdictOf(verdict, defending)
        : null;
  // The verdict goes onto the defence roll's telegram; a new roll leaves it behind.
  const toldSerial = told && last ? last.serial : null;
  const toldText = told?.parts.join('|');
  useEffect(() => {
    if (toldSerial === null || !told) return;
    setRollVerdict({ serial: toldSerial, ...told });
    // `told` is rebuilt every render; its text is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toldSerial, toldText]);
  useEffect(() => () => setRollVerdict(null), []);
  // Messages rise above the bottom bar instead of covering it; a narrow screen has the bar in the
  // page's flow, not pinned to the bottom.
  const desktop = useAtLeast('desktop');
  useEffect(() => {
    if (!desktop) return;
    const root = document.documentElement;
    root.style.setProperty('--toast-offset', '12.5rem');
    return () => {
      root.style.removeProperty('--toast-offset');
    };
  }, [desktop]);
  // When the telegram is already gone, the verdict stays readable under the bar instead.
  const rollToastShown = useRollShown();
  const [spellsOpen, setSpellsOpen] = useState(false);

  // Pulp «Ловкий приём»: the hero's Build counts one more for a manoeuvre.
  const manoeuvre = manoeuvreChance(derived.build + (talent.outmaneuver ? 1 : 0), targetBuild);

  // Pulp «Быстрое выхватывание»: the +50 of a ready firearm without holding one ready.
  const readyForOrder = gunReady || talent.quickDraw;
  const start = () => {
    const initiative = initiativeOf(c.dex, readyForOrder);
    setRound(freshRound(`solo:${Date.now()}`, 1, initiative));
    update((doc) => doc, {
      message: `Бой начался · порядок хода ${initiative} (ЛВК${readyForOrder ? ' +50' : ''})`,
      type: 'other',
    });
  };
  const nextRound = () => setRound((r) => enterRound(r, r.round + 1));
  const finish = () => {
    setRound(idleRound());
    update((doc) => doc, { message: 'Бой окончен', type: 'other' });
  };

  // The 10 Luck buy the round's 5 points once: what the first blow left over costs nothing more.
  const shrugPaid = (round.shrugged ?? 0) > 0;
  const shrugAvailable =
    talent.toughGuy && inCombat && (shrugPaid || canSpendTalentLuck) && shrugOff(round, amount) > 0;
  const takeHit = () => {
    const worn = throughArmor ? armor : 0;
    const taken = absorbArmor(amount, worn);
    // Pulp «Крепкий орешек»: 10 Luck and up to 5 hit points of the round's blows go unnoticed.
    const shrug = shrugNext && shrugAvailable ? shrugOff(round, taken) : 0;
    const parts = [`Урон ${amount}`, worn > 0 && `броня ${amount - taken}`, shrug > 0 && `крепкий орешек ${shrug}`];
    update(
      (doc) => {
        const hurt = shrug > 0 && !shrugPaid ? spendLuck(TALENT_LUCK)(doc) : doc;
        return shrug > 0 || !throughArmor ? applyDamage(taken - shrug)(hurt) : applyHitDamage(amount)(hurt);
      },
      {
        message: parts.filter(Boolean).length > 1 ? `${parts.filter(Boolean).join(' − ')} = ${taken - shrug}` : `Урон ${amount}`,
        type: 'health',
      },
    );
    if (shrug > 0) setRound((r) => ({ ...r, shrugged: (r.shrugged ?? 0) + shrug }));
    setShrugNext(false);
  };

  // Pulp «Тяжёлая рука»: a melee hit whose damage is rolled takes one more of the weapon's dice.
  const lastWeapon = last?.kind === 'attack' ? character.attacks.find((a) => a.id === last.id) : undefined;
  const heavyDie = lastWeapon && !isFirearm(lastWeapon) ? damageDieOf(lastWeapon.damage) : undefined;
  const heavyOffer =
    talent.heavyHitter && canSpendTalentLuck && !!last?.damage && heavyDie !== undefined && heavySerial !== last.serial;
  const hitHarder = () => {
    if (!last?.damage || heavyDie === undefined || !lastWeapon) return;
    const die = rollDie(heavyDie);
    setHeavySerial(last.serial);
    update(spendLuck(TALENT_LUCK), {
      message: `Тяжёлая рука: ${lastWeapon.name} +${die} (1d${heavyDie}), урон ${last.damage.total + die} · −${TALENT_LUCK} удачи`,
      type: 'other',
    });
  };

  // Pulp «Стремительная атака»: after the round's action, 10 Luck buy one more melee attack.
  const rapidOffer =
    talent.rapidAttack &&
    inCombat &&
    round.actionUsed &&
    !round.rapidAttack &&
    !locked &&
    !downed &&
    canSpendTalentLuck &&
    !firearm;
  const attackAgain = () => {
    update(spendLuck(TALENT_LUCK), { message: `Стремительная атака: ещё удар · −${TALENT_LUCK} удачи`, type: 'other' });
    setRound((r) => ({ ...r, actionUsed: false, rapidAttack: true }));
  };

  const conditions = character.conditions
    .map((id) => COC_CONDITIONS.find((x) => x.id === id))
    .filter(Boolean);
  const majorWound = character.conditions.includes(CONDITION_IDS.majorWound);
  const dying = character.conditions.includes(CONDITION_IDS.dying);
  const skills = useMemo(
    () =>
      [...coc.skills]
        .map((s) => ({ id: s.id, name: displaySkillName(s), hint: String(s.value) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [coc.skills],
  );

  const outOfAmmo = !!weapon && weapon.ammo !== undefined && weapon.ammo <= 0;
  const shownVolley = volley && volley.weaponId === weapon?.id ? volley.shots : null;

  return (
    <CocSelectionProvider onCast={spendAction}>
    <div className="coc-touch relative h-full overflow-hidden">
      <SettingBackdrop setting={settingOf(character)} strength={0.55} />

      {/* On the desktop the panels float over the backdrop, placed each on its own; below it they
          go one under another (two abreast on a tablet) in a page that scrolls down. */}
      <div className="contents max-lg:absolute max-lg:inset-0 max-lg:z-10 max-lg:flex max-lg:flex-wrap max-lg:content-start max-lg:gap-4 max-lg:overflow-y-auto max-lg:px-4 max-lg:pb-6 max-lg:pt-3">
        {/* Top: back to the sheet, the turn order, the tools. */}
        <header className="relative z-20 flex h-16 items-center gap-4 pl-20 pr-20 pt-3 max-lg:h-auto max-lg:basis-full max-lg:flex-wrap max-lg:gap-x-2 max-lg:gap-y-3 max-lg:px-0 max-lg:pt-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<IconPrev width={16} height={16} />}
            onClick={() => setViewMode('tabs')}
            className="max-lg:-ml-2"
          >
            Лист
          </Button>
          <div className="absolute left-1/2 top-3 -translate-x-1/2 max-lg:static max-lg:order-last max-lg:flex max-lg:w-full max-lg:translate-x-0 max-lg:justify-center">
            {party ? (
              <PartyCombatBar
                party={party}
                characterId={character.id}
                quickDraw={talent.quickDraw}
                onMyTurn={() => {
                  // The round was entered when it began; the turn itself only says so.
                  if (partyFight)
                    setRound((r) =>
                      syncWithTable(r, { startedAt: partyFight.startedAt, round: partyFight.round }),
                    );
                  update((doc) => doc, { message: 'Ваш ход', type: 'other' }, { quiet: true });
                }}
              />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {round.inCombat ? (
                  <motion.div
                    key="fight"
                    className="flex items-center gap-3 max-lg:flex-wrap max-lg:justify-center"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <span className="ui-display text-lg text-frame-bright">Раунд {round.round}</span>
                    <span className="text-sm text-ink-muted">порядок {round.initiative}</span>
                    <Button variant="primary" onClick={nextRound}>
                      Следующий раунд
                    </Button>
                    <Button variant="ghost" size="sm" onClick={finish}>
                      Выйти из боя
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="calm"
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <Button variant="primary" icon={<IconDice width={18} height={18} />} onClick={start}>
                      Начать бой · порядок {initiativeOf(c.dex, gunReady)}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <SyncStatus className="mr-2" />
            {party?.role === 'master' && (
              <IconButton
                label="Стол партии"
                onClick={() => {
                  goToCharacterList();
                  go({ screen: 'party', partyId: party.id });
                }}
              >
                <IconExit width={20} height={20} />
              </IconButton>
            )}
            <IconButton label="Кубики" onClick={onDice}>
              <IconDice width={20} height={20} />
            </IconButton>
            <IconButton label="Настройки" onClick={onOpenSettings}>
              <IconSettings width={20} height={20} />
            </IconButton>
          </div>
        </header>

        {/* Left: the investigator, then the table's talk. */}
        <motion.div
          className="absolute left-6 top-20 z-10 flex w-[19rem] flex-col gap-4 max-lg:static max-lg:w-auto max-lg:min-w-[min(100%,18rem)] max-lg:flex-1"
          initial={{ x: -24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={ENTER}
        >
          <Panel crest className="flex flex-col gap-3 px-5 pb-4 pt-6">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-frame/70">
                <CharacterArt
                  source={character}
                  kind="portrait"
                  position="50% 15%"
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              <div className="min-w-0">
                <div className="ui-display truncate text-lg leading-tight text-ink">{character.name}</div>
                <div className="text-[11px] text-ink-faint">
                  ЛВК {c.dex} · движение {derived.move} · БУ {derived.damageBonus}
                </div>
              </div>
            </div>
            <Track label="Хиты" value={character.currentHP} max={character.maxHP} tone="hp" />
            <div className="flex items-center gap-2">
              <NumberField
                label="Сколько"
                value={amount}
                min={1}
                onChange={(v) => setAmount(Math.max(1, v))}
                className="w-24"
              />
              <Button
                size="sm"
                variant="danger"
                className="flex-1"
                title={`Половина хитов за раз — серьёзная рана; 0 хитов — без сознания или при смерти${
                  throughArmor && armor > 0 ? `. Броня снимает ${armor}` : ''
                }`}
                onClick={takeHit}
              >
                Урон
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => update(heal(amount), { message: `Лечение ${amount}`, type: 'health' })}
              >
                Лечение
              </Button>
            </div>
            {armor > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                <Chip
                  on={throughArmor}
                  onClick={() => setThroughArmor(!throughArmor)}
                  title="Броня снимает свои очки с каждого удара оружием; падения, огонь и заклинания идут мимо неё"
                >
                  Броня {armor}
                </Chip>
                {throughArmor && (
                  <span>
                    удар {amount} → {absorbArmor(amount, armor)} (поглощено {amount - absorbArmor(amount, armor)})
                  </span>
                )}
              </div>
            )}
            {talent.toughGuy && inCombat && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                <Chip
                  on={shrugNext && shrugAvailable}
                  onClick={() => shrugAvailable && setShrugNext(!shrugNext)}
                  title={`Крепкий орешек: ${TALENT_LUCK} удачи — до 5 хитов урона за раунд не замечены`}
                >
                  {shrugPaid ? 'Крепкий орешек · оплачен' : `Крепкий орешек · −${TALENT_LUCK} удачи`}
                </Chip>
                <span>
                  {shrugAvailable
                    ? `не заметит до ${shrugOff(round, 99)} хитов следующего удара`
                    : shrugPaid
                      ? 'в этом раунде уже потрачено'
                      : 'не хватает удачи'}
                </span>
              </div>
            )}
            <Track
              label="Магия"
              value={coc.magicPoints}
              max={Math.floor(c.pow / 5)}
              tone="accent"
              onChange={(d) => update(changeMagic(d))}
            />
            <Track label="Рассудок" value={character.sanity} max={maxSanityOf(character)} tone="sanity" />
            <Track
              label="Удача"
              value={coc.luck}
              max={99}
              tone="xp"
              onChange={(d) => update(setLuck(coc.luck + d))}
            />
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {conditions.map((x) => (
                  <span
                    key={x!.id}
                    title={x!.description}
                    className="border border-danger/50 px-2 py-0.5 text-[11px] text-danger"
                  >
                    {x!.name}
                  </span>
                ))}
              </div>
            )}
            {(majorWound || dying) && (
              <Button
                size="sm"
                variant="danger"
                className={cx(dying && conDue && 'ring-2 ring-danger/70')}
                onClick={() => {
                  setConDue(false);
                  roll({
                    label: dying ? 'При смерти: бросок ВЫН' : 'Серьёзная рана: бросок ВЫН',
                    value: c.con,
                    kind: 'characteristic',
                    combat: 'wound',
                  });
                }}
                title={dying ? 'Каждый раунд: провал — смерть' : 'Провал — потеря сознания'}
              >
                {dying && conDue ? 'Конец раунда: бросок ВЫН' : 'Бросок ВЫН'}
              </Button>
            )}
          </Panel>
          {party && <CombatChat party={party} userId={userId} />}
        </motion.div>

        {/* Right: the weapon and its shot, then what happened. */}
        <motion.div
          className={cx(
            'absolute right-6 top-20 z-10 flex w-[22rem] flex-col gap-4 max-lg:static max-lg:w-auto max-lg:min-w-[min(100%,18rem)] max-lg:flex-1',
            locked && 'ui-turn-locked',
          )}
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...ENTER, delay: 0.05 }}
        >
          <Panel crest className="flex flex-col gap-3 px-5 pb-5 pt-6">
            <div className="ui-display ui-title text-center text-lg text-frame-bright">Оружие</div>
            <div className="flex flex-col gap-1">
              {character.attacks.map((a) => {
                const value = a.skill ? skillValue(character, a.skill) : 0;
                const on = a.id === weapon?.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setWeaponId(a.id)}
                    className={cx(
                      'flex items-baseline gap-2 px-2 py-1 text-left text-sm transition-colors max-lg:py-2.5',
                      on ? 'text-ink' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    <span className={cx('w-3 text-frame-bright', !on && 'opacity-0')}>◆</span>
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    {a.ammo !== undefined && (
                      <span className="text-xs text-ink-faint">
                        {a.ammo}/{a.magazine}
                      </span>
                    )}
                    <span className="ui-numeric w-7 text-right text-frame-bright">{value}</span>
                  </button>
                );
              })}
            </div>
            {/* The target: who it is (the master knows the foes' sheets) and its Build, for a manoeuvre and a big target. */}
            <div className="flex items-end gap-2 border-t border-line/50 pt-3">
              {knownTargets.length > 0 && (
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-faint">
                  <span>Цель</span>
                  <Select
                    value={targetId}
                    onChange={pickTarget}
                    placeholder="не выбрана"
                    options={knownTargets.map((t) => ({
                      value: t.combatant.id,
                      label: t.combatant.name,
                      hint: `комплекция ${t.build}`,
                    }))}
                    className="text-sm"
                  />
                </label>
              )}
              <div className="flex flex-col gap-1 text-xs text-ink-faint">
                <span>Комплекция цели</span>
                <NumberField
                  label="Комплекция цели"
                  value={targetBuild}
                  min={-2}
                  max={10}
                  onChange={setBuildOfTarget}
                  className="w-28"
                />
              </div>
              <span className="pb-2 text-xs text-ink-faint">ваша {derived.build}</span>
            </div>
            {firearm ? (
              <div className="flex flex-col gap-2 border-t border-line/50 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {!inCombat && !party && (
                    <Chip
                      on={readyForOrder}
                      onClick={() => !talent.quickDraw && setGunReady(!gunReady)}
                      title={
                        talent.quickDraw
                          ? 'Быстрое выхватывание: +50 к порядку хода без оружия наготове'
                          : 'Оружие уже в руке: +50 к порядку хода'
                      }
                    >
                      {talent.quickDraw ? 'Быстрое выхватывание +50' : 'Наготове +50'}
                    </Chip>
                  )}
                  <Chip
                    on={shot.pointBlank}
                    onClick={() => setShot({ ...shot, pointBlank: !shot.pointBlank })}
                    title={`Ближе ${Math.floor(c.dex / 5)} футов`}
                  >
                    В упор
                  </Chip>
                  <Chip on={shot.intoMelee} onClick={() => setShot({ ...shot, intoMelee: !shot.intoMelee })}>
                    В свалку
                  </Chip>
                  <Chip on={shot.cover} onClick={() => setShot({ ...shot, cover: !shot.cover })}>
                    В укрытии
                  </Chip>
                  <Chip on={shot.hidden} onClick={() => setShot({ ...shot, hidden: !shot.hidden })}>
                    Скрыта
                  </Chip>
                  <Chip
                    on={shot.bigTarget}
                    onClick={() => setShot({ ...shot, bigTarget: !shot.bigTarget })}
                    title={`Комплекция цели ${BIG_TARGET_BUILD} и больше: бонусная кость`}
                  >
                    Крупная цель
                  </Chip>
                </div>
                {maxShots > 1 && (
                  <Segmented
                    label="Выстрелов"
                    value={String(shotsAsked)}
                    onChange={(v) => setShot({ ...shot, shots: Number(v) })}
                    options={Array.from({ length: maxShots }, (_, i) => ({
                      value: String(i + 1),
                      label: i === 0 ? '1 выстрел' : String(i + 1),
                    }))}
                    className="ui-segmented--compact"
                  />
                )}
                {rangeAt ? (
                  <div className="flex items-center gap-2">
                    <NumberField
                      label="Дистанция, ярд."
                      value={distance}
                      min={0}
                      max={9999}
                      onChange={(v) => setDistance(Math.max(0, v))}
                      className="w-28"
                    />
                    <span className={cx('text-xs', range === 'beyond' ? 'text-danger' : 'text-ink-muted')}>
                      {RANGE_LABELS[range]}
                      {weapon?.range ? ` · ${weapon.range}` : ''}
                    </span>
                  </div>
                ) : (
                  <Segmented
                    label="Дистанция"
                    value={shot.range === 'beyond' ? 'base' : shot.range}
                    onChange={(next) => setShot({ ...shot, range: next })}
                    options={[
                      { value: 'base', label: 'Обычная' },
                      { value: 'long', label: 'Дальняя' },
                      { value: 'veryLong', label: 'Оч. дальняя' },
                    ]}
                    className="ui-segmented--compact"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 border-t border-line/50 pt-3">
                <Chip
                  on={melee.outnumbering}
                  onClick={() => setMelee({ ...melee, outnumbering: !melee.outnumbering })}
                >
                  Цель уже защищалась
                </Chip>
                <Chip on={melee.hampered} onClick={() => setMelee({ ...melee, hampered: !melee.hampered })}>
                  Помеха
                </Chip>
              </div>
            )}
            <p className="min-h-[1rem] text-xs text-ink-faint">
              {mods.reasons.join(' · ') || 'Без модификаторов'}
            </p>
            {mods.impossible && (
              <p className="text-xs text-danger" role="status">
                {farthest !== undefined ? `Цель дальше ${farthest} ярд.` : 'Цель вне досягаемости'} — из этого
                оружия её не достать
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!weapon || noAction || outOfAmmo || !!mods.impossible}
              onClick={attack}
            >
              {outOfAmmo
                ? 'Нет патронов'
                : mods.impossible
                  ? 'Вне досягаемости'
                  : `${shotsNow > 1 ? `Выстрелить ${shotsNow} раза` : 'Атаковать'}${weapon ? ` · ${weapon.damage}` : ''}`}
            </Button>
            {shownVolley && (
              <ol className="flex flex-col gap-0.5 text-xs" aria-label="Выстрелы">
                {shownVolley.map((x, i) => (
                  <li key={i} className={x.damage ? 'text-ink' : 'text-ink-faint'}>
                    {shownVolley.length > 1 ? `Выстрел ${i + 1}: ` : ''}
                    {x.total} — {SUCCESS_LABELS[x.level].toLowerCase()}
                    {x.jammed ? ', осечка' : ''}
                    {x.damage ? ` · урон ${x.damage.total} (${x.damage.formula})` : ''}
                  </li>
                ))}
              </ol>
            )}
            {(heavyOffer || rapidOffer) && (
              <div className="flex flex-col gap-2">
                {heavyOffer && (
                  <Button size="sm" onClick={hitHarder} title="Тяжёлая рука: ещё один кубик урона к удачному удару">
                    Тяжёлая рука · +1d{heavyDie} · −{TALENT_LUCK} удачи
                  </Button>
                )}
                {rapidOffer && (
                  <Button size="sm" onClick={attackAgain} title="Стремительная атака: ещё одна атака в ближнем бою за раунд">
                    Стремительная атака · ещё удар · −{TALENT_LUCK} удачи
                  </Button>
                )}
              </div>
            )}
            {firearm && weapon && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={noAction}
                  title="Бонусная кость на следующий выстрел"
                  onClick={() =>
                    onTurn(() => {
                      setRound((r) => ({ ...r, actionUsed: true, aimedWith: weapon.id }));
                      update((doc) => doc, { message: `Прицеливается: ${weapon.name}`, type: 'other' });
                    })
                  }
                >
                  Прицелиться
                </Button>
                {weapon.magazine !== undefined && (
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={noAction}
                    title={talent.fastLoad ? 'Быстрая перезарядка: действие раунда не тратится' : undefined}
                    onClick={() =>
                      onTurn(() => {
                        update(reloadWeapon(weapon.id), { message: `${weapon.name}: перезаряжено`, type: 'inventory' });
                        // Pulp «Быстрая перезарядка»: reload and fire in the same round.
                        if (!talent.fastLoad) spendAction();
                      })
                    }
                  >
                    Перезарядить
                  </Button>
                )}
              </div>
            )}
          </Panel>
          <CombatLog character={character} />
        </motion.div>

        {/* Bottom: the dock — answering an attack on the left, the round's one action on the right. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center max-lg:static max-lg:basis-full">
          <motion.div
            className="pointer-events-auto flex flex-col gap-2 max-lg:w-full"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...ENTER, delay: 0.1 }}
          >
            <div className="flex items-stretch gap-3 max-lg:flex-col">
              <DockCard
                mark="◇"
                tone="reaction"
                title="Ответ на атаку"
                state={inCombat ? `защит: ${round.reactions}` : undefined}
                aside={
                  <Segmented
                    label="Атака по вам"
                    value={attackOn}
                    onChange={setAttackOn}
                    options={[
                      { value: 'melee', label: 'Удар' },
                      { value: 'firearm', label: 'Выстрел' },
                    ]}
                    className="ui-segmented--compact"
                  />
                }
              >
                {attackOn === 'melee' ? (
                  <>
                    <DockTile
                      label="Уклонение"
                      value={skillValue(character, 'dodge')}
                      hint="ничья — ваша"
                      title="Ничья в вашу пользу"
                      disabled={!!downed}
                      onClick={() => defend('dodge')}
                    />
                    <DockTile
                      label="Контратака"
                      value={skillValue(character, fightBackId)}
                      hint={fightWith ? fightWith.name : 'драка'}
                      title={`${fightWith ? fightWith.name : 'Драка'}: оружие ближнего боя выбирается в списке «Оружие». Ничья — атакующему`}
                      disabled={!!downed}
                      onClick={() => defend('fightBack')}
                    />
                  </>
                ) : (
                  // A bullet is not dodged: the target can only dive for cover (7th edition).
                  <DockTile
                    label="Укрыться"
                    value={skillValue(character, 'dodge')}
                    hint={talent.nimble ? 'проворный: атака остаётся' : 'теряете атаку'}
                    title={
                      talent.nimble
                        ? 'Бросок Уклонения: успех — стрелку штрафная кость. Проворный: следующая атака не теряется'
                        : 'Бросок Уклонения: успех — стрелку штрафная кость. Удачно или нет, следующая атака потеряна'
                    }
                    disabled={!!downed}
                    onClick={() => defend('cover')}
                  />
                )}
              </DockCard>
              <DockCard
                mark="◆"
                tone="action"
                title="Действие раунда"
                state={inCombat ? (round.actionUsed ? 'потрачено' : 'одно в раунд') : undefined}
                className={cx(locked && 'ui-turn-locked')}
              >
                <DockTile
                  label="Манёвр"
                  value={skillValue(character, 'fighting:brawl')}
                  hint={
                    manoeuvre.possible
                      ? manoeuvre.reasons.join(' · ') || `цель ${targetBuild}, вы ${derived.build}`
                      : 'цель слишком велика'
                  }
                  title={`Обезоружить, сбить с ног, схватить. ${
                    manoeuvre.possible
                      ? manoeuvre.reasons.join(' · ') || 'Комплекция цели — в панели «Оружие»'
                      : manoeuvre.reason
                  }`}
                  disabled={!manoeuvre.possible || noAction}
                  onClick={() =>
                    onTurn(() => {
                      if (!manoeuvre.possible) return;
                      roll({
                        label: 'Манёвр',
                        value: skillValue(character, 'fighting:brawl'),
                        kind: 'skill',
                        id: 'fighting:brawl',
                        difficulty: manoeuvre.difficulty,
                        bonus: manoeuvre.bonus,
                        penalty: manoeuvre.penalty,
                        combat: 'manoeuvre',
                      });
                      spendAction();
                    })
                  }
                />
                <DockTile
                  label="Навык"
                  hint="любой навык"
                  disabled={noAction}
                  onClick={() => onTurn(() => setSkillPicker(true))}
                />
                <SpellCards>
                  {(open) =>
                    coc.spells
                      .slice(0, coc.spells.length > INLINE_SPELLS ? INLINE_SPELLS - 1 : INLINE_SPELLS)
                      .map((sp) => (
                        <DockTile
                          key={sp.id}
                          label={sp.name}
                          hint={sp.cost}
                          disabled={noAction}
                          onClick={() => castFrom(open)(sp.id)}
                        />
                      ))
                  }
                </SpellCards>
                {coc.spells.length > INLINE_SPELLS && (
                  <DockTile
                    label="Заклинания"
                    value={coc.spells.length}
                    hint="все известные"
                    onClick={() => setSpellsOpen(true)}
                  />
                )}
                <DockTile
                  label="Удача"
                  value={coc.luck}
                  hint="не тратит действие"
                  onClick={() => roll({ label: 'Удача', value: coc.luck, kind: 'luck' })}
                />
              </DockCard>
            </div>
            {/* One line under the dock: what the last defence came to, or why the action waits. It
                takes the dock's width and wraps (w-0 min-w-full), so a long line never shifts the dock. */}
            {defending === 'cover' && last ? (
              <Panel ornate={false} className="w-0 min-w-full px-4 py-2 text-center text-sm">
                <span role="status" className={last.check.success ? 'text-success' : 'text-danger'}>
                  {last.check.success
                    ? 'Вы укрылись — стрелок бросает со штрафной костью'
                    : 'Укрыться не успели — выстрел без штрафа'}
                </span>
                <span className="ml-2 text-ink-muted">
                  · {talent.nimble ? 'проворный: атака остаётся' : 'следующая атака потеряна'}
                </span>
              </Panel>
            ) : defending && last ? (
              <Panel
                ornate={false}
                className="flex w-0 min-w-full flex-wrap items-center justify-center gap-1.5 px-4 py-2 text-sm"
              >
                <span className="text-ink-muted">
                  {last.label}: {SUCCESS_LABELS[last.check.level].toLowerCase()}. Атака по вам была:
                </span>
                {LEVELS.map((level) => (
                  <Chip key={level} on={incoming === level} onClick={() => setIncoming(level)}>
                    {SUCCESS_LABELS[level]}
                  </Chip>
                ))}
                {verdict && !rollToastShown && (
                  <span
                    className={cx(
                      'ml-2',
                      verdict === 'defender'
                        ? 'text-success'
                        : verdict === 'attacker'
                          ? 'text-danger'
                          : 'text-ink-muted',
                    )}
                  >
                    {verdict === 'defender'
                      ? defending === 'fightBack'
                        ? 'Контратака удалась — вы наносите урон'
                        : 'Вы увернулись'
                      : verdict === 'attacker'
                        ? 'Атака достигла цели'
                        : 'Никто не преуспел'}
                  </span>
                )}
              </Panel>
            ) : (
              actionNote &&
              inCombat && (
                <p className="w-0 min-w-full text-center text-xs text-ink-faint" role="status">
                  {actionNote}
                </p>
              )
            )}
          </motion.div>
        </div>
      </div>

      <Dialog
        open={spellsOpen}
        onClose={() => setSpellsOpen(false)}
        eyebrow="Действие раунда"
        title="Заклинания"
        width="sm"
      >
        <ul className="flex flex-col gap-1.5">
          {coc.spells.map((sp) => (
            <li
              key={sp.id}
              className="flex items-center gap-3 rounded-[var(--radius)] border border-line/50 px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{sp.name}</span>
                <span className="block truncate text-xs text-ink-faint">
                  {[sp.cost, sp.castingTime].filter(Boolean).join(' · ') || 'без цены'}
                </span>
              </span>
              <SpellCards>
                {(open) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={noAction}
                    onClick={() => {
                      setSpellsOpen(false);
                      castFrom(open)(sp.id);
                    }}
                  >
                    Сотворить
                  </Button>
                )}
              </SpellCards>
            </li>
          ))}
        </ul>
        {actionNote && <p className="mt-3 text-xs text-ink-faint">{actionNote}</p>}
      </Dialog>
      <PickerDialog
        open={skillPicker}
        onClose={() => setSkillPicker(false)}
        title="Навык"
        subtitle="Бросок навыка в бою — действие раунда"
        options={skills}
        confirmLabel="Бросить"
        onPick={(id) =>
          onTurn(() => {
            roll({ label: skillName(id), value: skillValue(character, id), kind: 'skill', id });
            spendAction();
          })
        }
      />
      <CocEntryDialog />
      <InsanityVeil stage={madnessStage(character)} />
    </div>
    </CocSelectionProvider>
  );
};
