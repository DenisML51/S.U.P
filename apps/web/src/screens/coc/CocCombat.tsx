import React, { useEffect, useMemo, useState } from 'react';
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
  firearmModifiers,
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
  castSpell,
  applyDamage,
  changeMagic,
  heal,
  setLuck,
  weaponDamageDetailed,
  type Defence,
  type FirearmRange,
  type RollModifiers,
  type SuccessLevel,
} from '@itd/game-logic/coc';
import { maxSanityOf } from '@itd/game-logic';
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
import {
  BIG_TARGET_BUILD,
  diveForCover,
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
 * A group of the bottom bar under its small title, groups parted by a rule; `head` goes between the
 * title and the buttons. On a narrow screen the groups wrap, a phone gives each its own row.
 */
const BarGroup: React.FC<{ title: string; head?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  head,
  children,
}) => (
  <div className="flex flex-col gap-1.5 border-l border-line/50 px-3 first:border-l-0 max-lg:border-l-0 max-sm:basis-full">
    <span className="text-center text-[10px] uppercase tracking-[0.18em] text-ink-faint">{title}</span>
    {head}
    <div className="flex items-end gap-2 max-lg:flex-wrap max-lg:justify-center">{children}</div>
  </div>
);

/** A button of the bottom bar: the action, its number in the setting's figures, a hint under it. */
const BarButton: React.FC<{
  label: string;
  value?: number;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ label, value, hint, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="ui-interactive group flex min-w-[6.5rem] flex-col items-center gap-0.5 rounded-[var(--radius)] border border-line/60 px-3 py-1.5 transition-colors hover:border-frame-bright/70 disabled:opacity-35 max-sm:min-w-[5.75rem] max-sm:flex-1"
  >
    <span className="text-sm text-ink">{label}</span>
    {value !== undefined && (
      <span className="ui-display ui-numeric text-xl leading-none text-frame-bright">{value}</span>
    )}
    {hint && <span className="max-w-[8rem] truncate text-[10px] text-ink-faint">{hint}</span>}
  </button>
);

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

/** Fighting back with fists, when no melee weapon is picked. */
const BRAWL = 'brawl';

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
  const [volley, setVolley] = useState<{ weaponId: string; shots: ShotOutcome[] } | null>(null);

  // The master may pick a foe of the fight: its Build (when its sheet has one) settles a big target
  // and a manoeuvre; players, who do not see the NPCs' numbers, mark a big target themselves.
  const targets = (partyFight?.combatants ?? [])
    .filter((x) => x.kind === 'npc')
    .map((x) => ({ combatant: x, build: party?.npcs?.find((n) => n.id === x.refId)?.coc?.build }));
  const knownTargets = targets.filter((t) => t.build !== undefined);
  const pickTarget = (id: string) => {
    setTargetId(id);
    const found = knownTargets.find((t) => t.combatant.id === id);
    if (found?.build === undefined) return;
    setTargetBuild(found.build);
    setShot((s) => ({ ...s, bigTarget: found.build! >= BIG_TARGET_BUILD }));
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
        }),
        shot.bigTarget,
      )
    : meleeModifiers({ defenderReactedThisRound: melee.outnumbering ? 1 : 0, hampered: melee.hampered });

  const actionDone = inCombat && round.actionUsed;
  /** Actions wait for the hero's turn at a table and for a new round; defences and wounds never do. */
  const noAction = actionDone || locked;
  const actionNote = locked
    ? turnLock
    : actionDone
      ? 'Действие раунда потрачено — защищаться ещё можно'
      : null;
  /** An action of the round, refused with the reason out of the hero's turn (as the D&D sheet does). */
  const onTurn = (run: () => void) => {
    if (turnLock) toast.error(turnLock, { id: 'turn-lock' });
    else if (actionDone) toast.error('Действие раунда уже потрачено', { id: 'turn-lock' });
    else run();
  };

  const spendAction = () => setRound((r) => ({ ...r, actionUsed: true, aimedWith: undefined }));
  const cast = (spell: { name: string; cost: string }) =>
    onTurn(() => {
      const result = castSpell(character, spell.cost);
      update(result.edit, { message: `Сотворено «${spell.name}»`, type: 'sanity' });
      spendAction();
    });

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

  const melees = meleeWeapons(character.attacks);
  const [fightWithId, setFightWithId] = useState<string | null>(null);
  // Fighting back is made with the melee weapon in hand unless another is picked; Brawl without one.
  const fightWith =
    fightWithId === BRAWL
      ? undefined
      : (melees.find((a) => a.id === fightWithId) ?? (weapon && !firearm ? melees.find((a) => a.id === weapon.id) : undefined));
  const fightBackId = fightBackSkill(fightWith);

  const [attackOn, setAttackOn] = useState<IncomingAttack>('melee');
  const [defence, setDefence] = useState<{ mode: DefenceMode; serial: number } | null>(null);
  const [incoming, setIncoming] = useState<SuccessLevel | null>(null);
  const defend = (mode: DefenceMode) => {
    const id = mode === 'fightBack' ? fightBackId : 'dodge';
    const record = roll(
      mode === 'fightBack' && fightWith
        ? // With a weapon the roll is its attack: a won fight back rolls that weapon's damage.
          { label: `Контратака · ${fightWith.name}`, value: skillValue(character, id), kind: 'attack', id: fightWith.id, skill: id }
        : {
            label: mode === 'dodge' ? 'Уклонение' : mode === 'cover' ? 'Укрыться от выстрела' : 'Контратака',
            value: skillValue(character, id),
            kind: 'skill',
            id,
          },
    );
    if (mode === 'cover') {
      if (inCombat) setRound(diveForCover);
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

  const manoeuvre = manoeuvreChance(derived.build, targetBuild);

  const start = () => {
    const initiative = initiativeOf(c.dex, gunReady);
    setRound(freshRound(`solo:${Date.now()}`, 1, initiative));
    update((doc) => doc, {
      message: `Бой начался · порядок хода ${initiative} (ЛВК${gunReady ? ' +50' : ''})`,
      type: 'other',
    });
  };
  const nextRound = () => setRound((r) => enterRound(r, r.round + 1));
  const finish = () => {
    setRound(idleRound());
    update((doc) => doc, { message: 'Бой окончен', type: 'other' });
  };

  const takeHit = () => {
    const worn = throughArmor ? armor : 0;
    const taken = absorbArmor(amount, worn);
    update(throughArmor ? applyHitDamage(amount) : applyDamage(amount), {
      message: worn > 0 ? `Урон ${amount} − броня ${amount - taken} = ${taken}` : `Урон ${amount}`,
      type: 'health',
    });
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
    <div className="coc-touch relative h-full overflow-hidden">
      <SettingBackdrop setting={settingOf(character)} strength={0.55} />

      {/* On the desktop the panels float over the backdrop, placed each on its own; below it they
          go one under another (two abreast on a tablet) in a page that scrolls down. */}
      <div className="contents max-lg:absolute max-lg:inset-0 max-lg:z-10 max-lg:flex max-lg:flex-wrap max-lg:content-start max-lg:gap-4 max-lg:overflow-y-auto max-lg:px-4 max-lg:pb-6 max-lg:pt-3">
        {/* Top: back to the sheet, the turn order, the tools. */}
        <header className="relative z-20 flex h-16 items-center gap-4 px-6 max-lg:h-auto max-lg:basis-full max-lg:flex-wrap max-lg:gap-x-2 max-lg:gap-y-3 max-lg:px-0 max-lg:pt-2">
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
                onClick={() =>
                  roll({
                    label: dying ? 'При смерти: бросок ВЫН' : 'Серьёзная рана: бросок ВЫН',
                    value: c.con,
                    kind: 'characteristic',
                  })
                }
                title={dying ? 'Каждый раунд: провал — смерть' : 'Провал — потеря сознания'}
              >
                Бросок ВЫН
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
            {knownTargets.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-ink-faint">
                <span className="shrink-0">Цель</span>
                <Select
                  value={targetId}
                  onChange={pickTarget}
                  placeholder="не выбрана"
                  options={knownTargets.map((t) => ({
                    value: t.combatant.id,
                    label: t.combatant.name,
                    hint: `комплекция ${t.build}`,
                  }))}
                  className="flex-1 text-sm"
                />
              </label>
            )}
            {firearm ? (
              <div className="flex flex-col gap-2 border-t border-line/50 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {!inCombat && (
                    <Chip
                      on={gunReady}
                      onClick={() => setGunReady(!gunReady)}
                      title="Оружие уже в руке: +50 к порядку хода в первом раунде"
                    >
                      Наготове +50
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
                    onClick={() =>
                      onTurn(() => {
                        update(reloadWeapon(weapon.id), { message: `${weapon.name}: перезаряжено`, type: 'inventory' });
                        spendAction();
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

        {/* Bottom: the defences and every other action of the round. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center max-lg:static max-lg:basis-full">
          <motion.div
            className={cx('pointer-events-auto max-lg:w-full', locked && 'ui-turn-locked')}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...ENTER, delay: 0.1 }}
          >
            <Panel className="flex items-stretch gap-0 px-2 py-3 max-lg:flex-wrap max-lg:justify-center max-lg:gap-y-4">
              {inCombat && (
                <div className="flex flex-col justify-center gap-1.5 px-4 text-xs max-lg:basis-full max-lg:flex-row max-lg:gap-4">
                  <span
                    className={cx(round.actionUsed ? 'text-ink-faint line-through' : 'text-act-action')}
                    title="Одно действие в раунд"
                  >
                    ◆ действие
                  </span>
                  <span
                    className="text-act-reaction"
                    title="Защит в раунде: каждая следующая атака на вас получает бонусную кость"
                  >
                    ◇ защит: {round.reactions}
                  </span>
                </div>
              )}
              <BarGroup
                title="Защита"
                head={
                  <Segmented
                    label="Атака по вам"
                    value={attackOn}
                    onChange={setAttackOn}
                    options={[
                      { value: 'melee', label: 'Ближний бой' },
                      { value: 'firearm', label: 'Огнестрел' },
                    ]}
                    className="ui-segmented--compact self-center"
                  />
                }
              >
                {attackOn === 'melee' ? (
                  <>
                    <BarButton
                      label="Уклонение"
                      value={skillValue(character, 'dodge')}
                      hint="ничья — в вашу пользу"
                      onClick={() => defend('dodge')}
                    />
                    <div className="flex flex-col items-center gap-1 max-sm:flex-1 max-sm:items-stretch">
                      <BarButton
                        label="Контратака"
                        value={skillValue(character, fightBackId)}
                        hint={fightWith ? fightWith.name : 'ничья — атакующему'}
                        onClick={() => defend('fightBack')}
                      />
                      {melees.length > 0 && (
                        <Select
                          value={fightWith?.id ?? BRAWL}
                          onChange={setFightWithId}
                          options={[
                            { value: BRAWL, label: 'Драка', hint: String(skillValue(character, 'fighting:brawl')) },
                            ...melees.map((a) => ({
                              value: a.id,
                              label: a.name,
                              hint: String(skillValue(character, fightBackSkill(a))),
                            })),
                          ]}
                          className="w-[6.5rem] py-0.5 text-[11px] max-sm:w-full"
                        />
                      )}
                    </div>
                  </>
                ) : (
                  // A bullet is not dodged: the target can only dive for cover (7th edition).
                  <BarButton
                    label="Укрыться"
                    value={skillValue(character, 'dodge')}
                    hint="от выстрела: теряете атаку"
                    onClick={() => defend('cover')}
                  />
                )}
              </BarGroup>
              <BarGroup title="Манёвр">
                <div className="flex flex-col items-center gap-1">
                  <NumberField
                    label="Комплекция цели"
                    value={targetBuild}
                    min={-2}
                    max={10}
                    onChange={setTargetBuild}
                    className="w-28"
                  />
                  <span className="max-w-[9rem] text-center text-[10px] leading-tight text-ink-faint">
                    {manoeuvre.possible
                      ? manoeuvre.reasons.join(' · ') || `ваша комплекция ${derived.build}`
                      : manoeuvre.reason}
                  </span>
                </div>
                <BarButton
                  label="Провести"
                  value={skillValue(character, 'fighting:brawl')}
                  hint="обезоружить, сбить, схватить"
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
                      });
                      spendAction();
                    })
                  }
                />
              </BarGroup>
              <BarGroup title="Ещё">
                <BarButton
                  label="Навык"
                  hint="любой навык"
                  disabled={noAction}
                  onClick={() => onTurn(() => setSkillPicker(true))}
                />
                <BarButton
                  label="Удача"
                  value={coc.luck}
                  hint="бросок удачи"
                  onClick={() => roll({ label: 'Удача', value: coc.luck, kind: 'luck' })}
                />
                {coc.spells
                  .slice(0, coc.spells.length > INLINE_SPELLS ? INLINE_SPELLS - 1 : INLINE_SPELLS)
                  .map((sp) => (
                    <BarButton
                      key={sp.id}
                      label={sp.name}
                      hint={sp.cost}
                      disabled={noAction}
                      onClick={() => cast(sp)}
                    />
                  ))}
                {coc.spells.length > INLINE_SPELLS && (
                  <BarButton
                    label={`Заклинания (${coc.spells.length})`}
                    hint="все известные"
                    onClick={() => setSpellsOpen(true)}
                  />
                )}
              </BarGroup>
            </Panel>
            {actionNote && inCombat && (
              <p className="mt-1.5 text-center text-xs text-ink-faint" role="status">
                {actionNote}
              </p>
            )}
            {defending === 'cover' && last && (
              <Panel ornate={false} className="mt-2 px-4 py-2 text-center text-sm">
                <span role="status" className={last.check.success ? 'text-success' : 'text-danger'}>
                  {last.check.success
                    ? 'Вы укрылись — стрелок бросает со штрафной костью'
                    : 'Укрыться не успели — выстрел без штрафа'}
                </span>
                <span className="ml-2 text-ink-muted">· следующая атака потеряна</span>
              </Panel>
            )}
            {defending && defending !== 'cover' && last && (
              <Panel
                ornate={false}
                className="mt-2 flex flex-wrap items-center justify-center gap-1.5 px-4 py-2 text-sm"
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
              <Button
                size="sm"
                variant="secondary"
                disabled={noAction}
                onClick={() => {
                  cast(sp);
                  setSpellsOpen(false);
                }}
              >
                Сотворить
              </Button>
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
      <InsanityVeil stage={madnessStage(character)} />
    </div>
  );
};
