import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  COC_CONDITIONS,
  CONDITION_IDS,
  SUCCESS_LABELS,
  cocCharacteristics,
  derivedOf,
  displaySkillName,
  firearmModifiers,
  initiativeOf,
  manoeuvreChance,
  meleeModifiers,
  newRound,
  opposedResult,
  skillName,
  skillValue,
  castSpell,
  applyDamage,
  changeMagic,
  heal,
  setLuck,
  type FirearmRange,
  type RollModifiers,
  type RoundState,
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
import { NumberField, Segmented } from '../../ui/forms';
import { Dialog } from '../../ui/Dialog';
import { IconDice, IconExit, IconPrev, IconSettings } from '../../ui/icons';
import { SyncStatus } from '../../ui/SyncStatus';
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

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/** The round of this investigator, kept with the tab like the D&D fight is. */
function useRound(
  characterId: string,
): [
  RoundState & { inCombat: boolean; initiative: number | null },
  (next: RoundState & { inCombat: boolean; initiative: number | null }) => void,
] {
  const key = `itd.coc-round.${characterId}`;
  const [state, setState] = useState(() => {
    try {
      return {
        ...newRound(0),
        inCombat: false,
        initiative: null as number | null,
        ...JSON.parse(sessionStorage.getItem(key) ?? '{}'),
      };
    } catch {
      return { ...newRound(0), inCombat: false, initiative: null as number | null };
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

/** A group of the bottom bar under its small title, groups parted by a rule. */
const BarGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-1.5 border-l border-line/50 px-3 first:border-l-0">
    <span className="text-center text-[10px] uppercase tracking-[0.18em] text-ink-faint">{title}</span>
    <div className="flex items-end gap-2">{children}</div>
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
    className="ui-interactive group flex min-w-[6.5rem] flex-col items-center gap-0.5 rounded-[var(--radius)] border border-line/60 px-3 py-1.5 transition-colors hover:border-frame-bright/70 disabled:opacity-35"
  >
    <span className="text-sm text-ink">{label}</span>
    {value !== undefined && (
      <span className="ui-display ui-numeric text-xl leading-none text-frame-bright">{value}</span>
    )}
    {hint && <span className="max-w-[8rem] truncate text-[10px] text-ink-faint">{hint}</span>}
  </button>
);

const LEVELS: SuccessLevel[] = ['failure', 'regular', 'hard', 'extreme', 'critical'];

/** Spells shown on the bar itself; the rest wait behind «Заклинания (N)». */
const INLINE_SPELLS = 2;

/** An opposed roll told as a telegram reads it: what the defence did, then what the blow did. */
function verdictOf(
  winner: 'attacker' | 'defender' | 'none',
  defence: 'dodge' | 'fightBack',
): Omit<RollVerdict, 'serial'> {
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
  const { character, update, roll, last } = useCoc();
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

  const c = cocCharacteristics(character);
  const build = character.build?.ruleset === 'coc7' ? character.build : undefined;
  const derived = derivedOf(c, build?.variant, build?.age);
  const coc = character.coc!;

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
  }>({
    pointBlank: false,
    shots: 1,
    range: 'base',
    intoMelee: false,
    cover: false,
    hidden: false,
  });
  const [melee, setMelee] = useState({ outnumbering: false, hampered: false });
  const [targetBuild, setTargetBuild] = useState(0);
  const [skillPicker, setSkillPicker] = useState(false);
  const [gunReady, setGunReady] = useState(false);
  const [amount, setAmount] = useState(1);

  const aimed = !!weapon && round.aimedWith === weapon.id;
  const mods: RollModifiers = firearm
    ? firearmModifiers({
        pointBlank: shot.pointBlank,
        aimed,
        shots: shot.shots,
        range: shot.range,
        intoMelee: shot.intoMelee,
        targetDivedForCover: shot.cover,
        targetHidden: shot.hidden,
      })
    : meleeModifiers({ defenderReactedThisRound: melee.outnumbering ? 1 : 0, hampered: melee.hampered });

  const spendAction = () => setRound({ ...round, actionUsed: true, aimedWith: undefined });
  const cast = (spell: { name: string; cost: string }) => {
    const result = castSpell(character, spell.cost);
    update(result.edit, { message: `Сотворено «${spell.name}»`, type: 'sanity' });
    spendAction();
  };

  const attack = () => {
    if (!weapon) return;
    const value = weapon.skill ? skillValue(character, weapon.skill) : 0;
    const shots = firearm ? Math.max(1, shot.shots) : 1;
    roll({
      label: weapon.name,
      value,
      kind: 'attack',
      id: weapon.id,
      skill: weapon.skill,
      malfunction: weapon.malfunction,
      ...mods,
    });
    if (weapon.ammo !== undefined) {
      update((doc) => ({
        ...doc,
        attacks: doc.attacks.map((a) =>
          a.id === weapon.id && a.ammo !== undefined ? { ...a, ammo: Math.max(0, a.ammo - shots) } : a,
        ),
      }));
    }
    spendAction();
  };

  const defend = (mode: 'dodge' | 'fightBack') => {
    const id = mode === 'dodge' ? 'dodge' : 'fighting:brawl';
    roll({
      label: mode === 'dodge' ? 'Уклонение' : 'Контратака',
      value: skillValue(character, id),
      kind: 'skill',
      id,
    });
    setRound({ ...round, reactions: round.reactions + 1 });
    setDefence(mode);
  };
  const [defence, setDefence] = useState<'dodge' | 'fightBack' | null>(null);
  const [incoming, setIncoming] = useState<SuccessLevel | null>(null);
  const defending = last && defence && (last.label === 'Уклонение' || last.label === 'Контратака');
  const verdict = defending && incoming ? opposedResult(incoming, last.check.level, defence) : null;
  const told = verdict && defence ? verdictOf(verdict, defence) : null;
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
  // Messages rise above the bottom bar instead of covering it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--toast-offset', '12.5rem');
    return () => {
      root.style.removeProperty('--toast-offset');
    };
  }, []);
  // When the telegram is already gone, the verdict stays readable under the bar instead.
  const rollToastShown = useRollShown();
  const [spellsOpen, setSpellsOpen] = useState(false);

  const manoeuvre = manoeuvreChance(derived.build, targetBuild);

  const start = () => {
    const initiative = initiativeOf(c.dex, gunReady);
    setRound({ ...newRound(1), inCombat: true, initiative });
    update((doc) => doc, {
      message: `Бой начался · порядок хода ${initiative} (ЛВК${gunReady ? ' +50' : ''})`,
      type: 'other',
    });
  };
  const nextRound = () =>
    setRound({ ...newRound(round.round + 1, round.aimedWith), inCombat: true, initiative: round.initiative });
  const finish = () => {
    setRound({ ...newRound(0), inCombat: false, initiative: null });
    update((doc) => doc, { message: 'Бой окончен', type: 'other' });
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

  const actionDone = inCombat && round.actionUsed;
  /** Actions wait for the hero's turn at a table and for a new round; defences and wounds never do. */
  const noAction = actionDone || locked;
  const actionNote = locked
    ? turnLock
    : actionDone
      ? 'Действие раунда потрачено — защищаться ещё можно'
      : null;
  const firearmReady = weapon && weapon.ammo !== undefined && weapon.ammo <= 0;

  return (
    <div className="relative h-full overflow-hidden">
      <SettingBackdrop setting={settingOf(character)} strength={0.55} />

      {/* Top: back to the sheet, the turn order, the tools. */}
      <header className="relative z-20 flex h-16 items-center gap-4 px-6">
        <Button
          variant="ghost"
          size="sm"
          icon={<IconPrev width={16} height={16} />}
          onClick={() => setViewMode('tabs')}
        >
          Лист
        </Button>
        <div className="absolute left-1/2 top-3 -translate-x-1/2">
          {party ? (
            <PartyCombatBar
              party={party}
              characterId={character.id}
              onMyTurn={() => {
                setRound({
                  ...newRound(round.round + 1, round.aimedWith),
                  inCombat: true,
                  initiative: round.initiative,
                });
                update((doc) => doc, { message: 'Ваш ход', type: 'other' }, { quiet: true });
              }}
            />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {round.inCombat ? (
                <motion.div
                  key="fight"
                  className="flex items-center gap-3"
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
        className="absolute left-6 top-20 z-10 flex w-[19rem] flex-col gap-4"
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
              title="Половина хитов за раз — серьёзная рана; 0 хитов — без сознания или при смерти"
              onClick={() => update(applyDamage(amount), { message: `Урон ${amount}`, type: 'health' })}
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
          'absolute right-6 top-20 z-10 flex w-[22rem] flex-col gap-4',
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
                    'flex items-baseline gap-2 px-2 py-1 text-left text-sm transition-colors',
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
              </div>
              <Segmented
                label="Выстрелов"
                value={String(shot.shots) as '1' | '2' | '3'}
                onChange={(v) => setShot({ ...shot, shots: Number(v) })}
                options={[
                  { value: '1', label: '1 выстрел' },
                  { value: '2', label: '2' },
                  { value: '3', label: '3' },
                ]}
                className="ui-segmented--compact"
              />
              <Segmented
                label="Дистанция"
                value={shot.range}
                onChange={(range) => setShot({ ...shot, range })}
                options={[
                  { value: 'base', label: 'Обычная' },
                  { value: 'long', label: 'Дальняя' },
                  { value: 'veryLong', label: 'Оч. дальняя' },
                ]}
                className="ui-segmented--compact"
              />
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
            {[...mods.reasons, aimed && 'прицелился: бонусная кость'].filter(Boolean).join(' · ') ||
              'Без модификаторов'}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!weapon || noAction || !!firearmReady}
            onClick={attack}
          >
            {firearmReady ? 'Нет патронов' : `Атаковать${weapon ? ` · ${weapon.damage}` : ''}`}
          </Button>
          {firearm && weapon && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={noAction}
                title="Бонусная кость на следующий выстрел"
                onClick={() => {
                  setRound({ ...round, actionUsed: true, aimedWith: weapon.id });
                  update((doc) => doc, { message: `Прицеливается: ${weapon.name}`, type: 'other' });
                }}
              >
                Прицелиться
              </Button>
              {weapon.magazine !== undefined && (
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={noAction}
                  onClick={() => {
                    update(
                      (doc) => ({
                        ...doc,
                        attacks: doc.attacks.map((a) =>
                          a.id === weapon.id ? { ...a, ammo: a.magazine } : a,
                        ),
                      }),
                      { message: `${weapon.name}: перезаряжено`, type: 'inventory' },
                    );
                    spendAction();
                  }}
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
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <motion.div
          className={cx('pointer-events-auto', locked && 'ui-turn-locked')}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...ENTER, delay: 0.1 }}
        >
          <Panel className="flex items-stretch gap-0 px-2 py-3">
            {inCombat && (
              <div className="flex flex-col justify-center gap-1.5 px-4 text-xs">
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
            <BarGroup title="Защита">
              <BarButton
                label="Уклонение"
                value={skillValue(character, 'dodge')}
                hint="ничья — в вашу пользу"
                onClick={() => defend('dodge')}
              />
              <BarButton
                label="Контратака"
                value={skillValue(character, 'fighting:brawl')}
                hint="ничья — атакующему"
                onClick={() => defend('fightBack')}
              />
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
                onClick={() => {
                  if (!manoeuvre.possible) return;
                  roll({
                    label: 'Манёвр',
                    value: skillValue(character, 'fighting:brawl'),
                    kind: 'skill',
                    id: 'fighting:brawl',
                    difficulty: manoeuvre.difficulty,
                    penalty: manoeuvre.penalty,
                  });
                  spendAction();
                }}
              />
            </BarGroup>
            <BarGroup title="Ещё">
              <BarButton
                label="Навык"
                hint="любой навык"
                disabled={noAction}
                onClick={() => setSkillPicker(true)}
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
          {defending && (
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
                    ? defence === 'fightBack'
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
        onPick={(id) => {
          roll({ label: skillName(id), value: skillValue(character, id), kind: 'skill', id });
          spendAction();
        }}
      />
      <InsanityVeil stage={madnessStage(character)} />
    </div>
  );
};
