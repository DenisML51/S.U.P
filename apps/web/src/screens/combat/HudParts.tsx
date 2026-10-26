import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ACTION_SLOTS,
  CONDITIONS,
  actionLimitsOf,
  armorClassOf,
  experienceProgress,
  formatModifier,
  initiativeModifier,
  isStackable,
  itemQuantity,
  maxSanityOf,
  setActionLimit,
  setSpentActions,
  spentActionsOf,
  totalCopper,
  totalMaxHP,
  type ActionSlot,
} from '@itd/game-logic';
import type { Character, Resource } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { ACTION_TYPES } from '../../ui/actionTypes';
import { CharacterArt } from '../../ui/CharacterArt';
import { NumberField } from '../../ui/forms';
import { CONDITION_ICONS, CatalogIcon, GameIcon } from '../../ui/GameIcon';
import { Panel, cx } from '../../ui/primitives';
import { LevelReady } from '../../ui/ornaments';
import { IconAmmunition, IconCoins } from '../../ui/icons';
import { useEndConcentration } from '../sheet/Concentration';
import { useSheetDialogs } from '../sheet/dialogs/context';
import { ActionShape } from './Hotbar';
import { longPress } from '../../ui/longPress';
import { HudTip, below, useHudTip, useTouchHud, type TipBinding } from './HudTip';
import { locale } from '../../i18n';

interface Hint {
  key: string;
  title: string;
  lines: string[];
}

/** Small hints of the HUD: a title and a line or two. */
function useHint() {
  const { tip, bind, hold } = useHudTip<Hint>();
  const view = (
    <HudTip rect={tip?.rect ?? null} tipKey={tip?.value.key ?? ''} width={240} className="text-center" hold={hold}>
      {tip && (
        <>
          <div className="ui-display text-base leading-tight text-ink">{tip.value.title}</div>
          {tip.value.lines.map((line, i) => (
            <div
              key={i}
              className={cx(
                'text-sm',
                i === tip.value.lines.length - 1 && tip.value.lines.length > 1
                  ? 'mt-2 text-[11px] text-ink-faint'
                  : 'mt-1 text-ink-muted',
              )}
            >
              {line}
            </div>
          ))}
        </>
      )}
    </HudTip>
  );
  return { bind, view };
}

/** A tall bar that fills from the bottom: health or sanity, as in the old combat HUD. */
const VitalBar: React.FC<{
  label: string;
  value: number;
  max: number;
  extra?: number;
  tone: 'hp' | 'sanity';
  onClick: () => void;
  hint: TipBinding;
}> = ({ label, value, max, extra = 0, tone, onClick, hint }) => {
  const share = (n: number) => `${Math.max(0, Math.min(100, (n / Math.max(max, 1)) * 100))}%`;
  const low = value <= 0 || value / Math.max(max, 1) < 0.25;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value} из ${max}`}
      className={cx('ui-vbar group', low && 'ui-vbar--low')}
      {...hint}
    >
      <span className="ui-vbar__track">
        <motion.span
          className="ui-vbar__fill"
          style={{ backgroundColor: `rgb(var(--c-${low ? 'danger' : tone}))` }}
          animate={{ height: share(value) }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {extra > 0 && (
          <motion.span
            className="ui-vbar__extra"
            style={{ bottom: share(value) }}
            animate={{ height: share(extra) }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        )}
      </span>
      <span className="ui-vbar__label">{label}</span>
      <span className="ui-vbar__value">
        {value}
        {extra > 0 && <span className="mb-0.5 text-[0.7rem] text-temp-hp">+{extra}</span>}
      </span>
    </button>
  );
};

/**
 * Sanity and health side by side; given `between` (the portrait on a narrow screen), they stand on
 * either side of it instead.
 */
export const VitalBars: React.FC<{ character: Character; between?: React.ReactNode }> = ({ character, between }) => {
  const dialogs = useSheetDialogs();
  const { bind, view } = useHint();
  const maxHP = totalMaxHP(character);
  const maxSanity = maxSanityOf(character);
  return (
    <div className={cx('flex', between ? 'items-end justify-center gap-3' : 'gap-2.5')}>
      <VitalBar
        label="Рассудок"
        value={character.sanity}
        max={maxSanity}
        tone="sanity"
        onClick={() => dialogs.open({ kind: 'sanity' })}
        hint={bind({
          key: 'sanity',
          title: 'Рассудок',
          lines: [`${character.sanity} / ${maxSanity}`, 'Нажмите, чтобы изменить'],
        })}
      />
      {between}
      <VitalBar
        label="Здоровье"
        value={character.currentHP}
        max={maxHP}
        extra={character.tempHP}
        tone="hp"
        onClick={() => dialogs.open({ kind: 'health' })}
        hint={bind({
          key: 'hp',
          title: 'Здоровье',
          lines: [
            `${character.currentHP} / ${maxHP}${character.tempHP > 0 ? ` · временные ${character.tempHP}` : ''}`,
            'Нажмите: урон и лечение',
          ],
        })}
      />
      {view}
    </div>
  );
};

/** A list floating above an anchor, e.g. the condition picker over the portrait. */
const Flyout: React.FC<{
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchor, open, onClose, children }) => {
  const rect = open ? anchor.current?.getBoundingClientRect() : undefined;
  return createPortal(
    <AnimatePresence>
      {open && rect && (
        <>
          <div className="fixed inset-0 z-[55]" onPointerDown={onClose} />
          <motion.div
            className="fixed z-[56] w-80"
            style={{
              ...(below(rect) ? { top: rect.bottom + 10 } : { bottom: window.innerHeight - rect.top + 10 }),
              left: Math.max(12, rect.left + rect.width / 2 - 160),
            }}
            initial={{ opacity: 0, y: below(rect) ? -8 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16 }}
          >
            <Panel ornate={false} className="p-3">
              {children}
            </Panel>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** Conditions marked on the portrait; the rest are counted, and all are listed in the body window. */
const CONDITIONS_SHOWN = 3;

/**
 * The hero's face, framed by their state, with the first conditions marked on it. A click opens the
 * body window: wounds by limb, every condition, defences.
 */
export const Portrait: React.FC<{ character: Character }> = ({ character }) => {
  const dialogs = useSheetDialogs();
  const { bind, view } = useHint();
  const endConcentration = useEndConcentration();
  const down = character.currentHP <= 0;
  const conditions = character.conditions.map((id) => ({ id, condition: CONDITIONS.find((c) => c.id === id) }));
  const shown = conditions.slice(0, CONDITIONS_SHOWN);
  const more = conditions.length - shown.length;
  const openBody = () => dialogs.open({ kind: 'body' });

  return (
    <div
      className={cx(
        'ui-hud-portrait',
        down && 'ui-hud-portrait--down',
        character.tempHP > 0 && 'ui-hud-portrait--shielded',
      )}
    >
      <button
        type="button"
        onClick={openBody}
        className="block h-full w-full overflow-hidden"
        aria-label="Тело и состояния"
        {...bind({ key: 'body', title: 'Тело и состояния', lines: ['Раны, состояния, защита'] })}
      >
        <CharacterArt
          source={character}
          kind="portrait"
          className="h-full w-full transition-transform duration-700 hover:scale-105"
        />
      </button>
      <div className="absolute left-2 top-2 flex flex-col gap-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map(({ id, condition }) => (
            <motion.button
              key={id}
              layout
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              onClick={openBody}
              className="ui-hud-chip ui-hud-chip--condition ui-hud-chip--mini"
              aria-label={condition?.name ?? id}
              {...bind({
                key: `c:${id}`,
                title: condition?.name ?? id,
                lines: [condition?.description ?? '', 'Нажмите: тело и состояния'],
              })}
            >
              <CatalogIcon id={CONDITION_ICONS[id] ?? 'terror'} size={16} />
            </motion.button>
          ))}
        </AnimatePresence>
        {more > 0 && (
          <button
            type="button"
            onClick={openBody}
            className="ui-hud-chip ui-hud-chip--condition ui-hud-chip--mini text-xs tabular-nums"
            {...bind({
              key: 'c:more',
              title: `Ещё состояний: ${more}`,
              lines: [...conditions.slice(CONDITIONS_SHOWN).map((c) => c.condition?.name ?? c.id), 'Нажмите: все состояния'],
            })}
          >
            +{more}
          </button>
        )}
      </div>
      {character.concentratingOn && (
        <button
          type="button"
          onClick={() => endConcentration('по желанию')}
          className="ui-hud-chip ui-hud-chip--mini absolute right-2 top-2"
          style={{ color: 'rgb(var(--c-accent))', borderColor: 'rgb(var(--c-accent) / 0.6)' }}
          aria-label={`Прекратить концентрацию: ${character.concentratingOn.name}`}
          {...bind({
            key: 'concentration',
            title: `Концентрация: ${character.concentratingOn.name}`,
            lines: ['Урон требует спасброска Телосложения', 'Нажмите, чтобы прекратить'],
          })}
        >
          <CatalogIcon id="psychic-waves" size={16} />
        </button>
      )}
      {character.tempHP > 0 && <span className="ui-hud-portrait__temp">+{character.tempHP}</span>}
      {view}
    </div>
  );
};

/** This turn's action budget: a token per action, a click spends or returns it. */
export const ActionTokens: React.FC<{ character: Character }> = ({ character }) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const { bind, view } = useHint();
  const [editing, setEditing] = useState(false);
  const touch = useTouchHud();
  const anchor = useRef<HTMLElement>(null);
  const limits = actionLimitsOf(character);
  const spent = spentActionsOf(character);
  const toggle = (slot: ActionSlot, index: number) =>
    updateCharacter((doc) =>
      setSpentActions(doc, slot, index < spentActionsOf(doc)[slot] ? index : index + 1),
    );

  return (
    <Panel className="ui-hud-strip" ref={anchor}>
      {ACTION_SLOTS.map((slot) => (
        <div key={slot} className="flex gap-1" aria-label={ACTION_TYPES[slot].label}>
          {Array.from({ length: limits[slot] }, (_, i) => {
            const used = i < spent[slot];
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(slot, i)}
                {...longPress(() => setEditing(true))}
                aria-pressed={used}
                className={cx('ui-token', used && 'ui-token--spent')}
                {...bind({
                  key: `${slot}:${i}`,
                  title: ACTION_TYPES[slot].label,
                  lines: [
                    used ? 'Потрачено' : 'Доступно',
                    touch ? 'Нажать — отметить · удерживать — сколько за ход' : 'ЛКМ — отметить · ПКМ — сколько за ход',
                  ],
                })}
              >
                <ActionShape type={slot} size={20} hollow={used} />
              </button>
            );
          })}
        </div>
      ))}
      <Flyout anchor={anchor} open={editing} onClose={() => setEditing(false)}>
        <div className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-muted">Действий за ход</div>
        <div className="grid grid-cols-3 gap-2">
          {ACTION_SLOTS.map((slot) => (
            <label key={slot} className="space-y-1 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <ActionShape type={slot} size={10} />
                {ACTION_TYPES[slot].short}
              </span>
              <NumberField
                label={ACTION_TYPES[slot].label}
                min={1}
                max={9}
                value={limits[slot]}
                onChange={(n) => updateCharacter((doc) => setActionLimit(doc, slot, n))}
                className="w-full"
              />
            </label>
          ))}
        </div>
      </Flyout>
      {view}
    </Panel>
  );
};

/** Resources shown in the bar; the rest wait behind a button that lays the full set out over the bar. */
const RESOURCES_SHOWN = 5;

/** Resources as icons with what is left; a click spends one, a right click opens the card. */
export const ResourceStrip: React.FC<{ character: Character }> = ({ character }) => {
  const updateResourceCount = useCharacterStore((s) => s.updateResourceCount);
  const dialogs = useSheetDialogs();
  const { bind, view } = useHint();
  const touch = useTouchHud();
  const [expanded, setExpanded] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Room to the right of the strip: the laid-out set grows that way, then upward in rows.
  const [room, setRoom] = useState(0);
  const resources = character.resources.filter((r) => r.max > 0);
  const hiddenCount = resources.length - RESOURCES_SHOWN;
  const open = expanded && hiddenCount > 0;
  const ammunition = character.inventory.filter((i) => i.type === 'ammunition' && isStackable(i));
  const arrows = ammunition.reduce((sum, i) => sum + itemQuantity(i), 0);
  const gold = totalCopper(character.currency) / 100;

  // The laid-out set closes on a click elsewhere or on Escape.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setExpanded(false);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const tile = (resource: Resource) => (
    <button
      key={resource.id}
      type="button"
      onClick={() => updateResourceCount(resource.id, -1)}
      {...longPress(() => dialogs.open({ kind: 'resource', id: resource.id }))}
      className={cx('ui-hud-chip', resource.current === 0 && 'ui-hud-chip--empty')}
      {...bind({
        key: resource.id,
        title: resource.name,
        lines: [
          `${resource.current} / ${resource.max}`,
          touch ? 'Нажать — потратить · удерживать — карточка' : 'ЛКМ — потратить · ПКМ — карточка',
        ],
      })}
    >
      <GameIcon name={resource.iconName} kind="resource" size={20} color={resource.color} />
      <span className="ui-hud-chip__count">{resource.current}</span>
    </button>
  );

  const toggle = (
    <button
      type="button"
      onClick={() => {
        const rect = box.current?.getBoundingClientRect();
        if (rect) setRoom(window.innerWidth - rect.left - 16);
        setExpanded(!open);
      }}
      className="ui-hud-chip ui-hud-chip--add text-xs tabular-nums"
      aria-expanded={open}
      {...bind({
        key: 'more-resources',
        title: open ? 'Свернуть ресурсы' : 'Все ресурсы',
        lines: open ? ['Нажмите, чтобы свернуть'] : [`Ещё ${hiddenCount}`, 'Нажмите, чтобы раскрыть'],
      })}
    >
      {open ? '−' : `+${hiddenCount}`}
    </button>
  );

  const extras = (
    <>
      {resources.length > 0 && <span className="h-6 w-px bg-line" aria-hidden />}
      <button
        type="button"
        onClick={() => dialogs.open({ kind: 'currency' })}
        className="flex items-center gap-1.5 px-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        {...bind({
          key: 'coins',
          title: 'Кошелёк',
          lines: [
            `${gold.toLocaleString(locale, { maximumFractionDigits: 2 })} зм`,
            'Нажмите: получить или потратить',
          ],
        })}
      >
        <IconCoins width={18} height={18} className="text-xp" />
        <span className="tabular-nums">{Math.floor(gold)}</span>
      </button>
      {ammunition.length > 0 && (
        <button
          type="button"
          onClick={() => dialogs.open({ kind: 'item', id: ammunition[0]!.id })}
          className="flex items-center gap-1.5 px-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          {...bind({
            key: 'ammo',
            title: 'Боеприпасы',
            lines: [...ammunition.map((i) => `${i.name}: ${itemQuantity(i)}`), 'Нажмите: карточка'],
          })}
        >
          <IconAmmunition width={18} height={18} className="text-frame-bright" />
          <span className="tabular-nums">{arrows}</span>
        </button>
      )}
    </>
  );

  return (
    <div ref={box} className="relative max-sm:w-full">
      {/* The bar keeps its place (and its width) while the full set lies over it. */}
      <Panel className={cx('ui-hud-strip h-full max-sm:justify-center', open && 'invisible')}>
        {resources.slice(0, RESOURCES_SHOWN).map(tile)}
        {hiddenCount > 0 && toggle}
        {extras}
      </Panel>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-0 left-0 z-30 min-w-full"
            style={{ width: 'max-content', maxWidth: room > 0 ? room : undefined }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Panel className="ui-hud-strip h-full shadow-2xl">
              {/* Resources wrap into rows above; the purse and ammunition stay on the bar's line. */}
              <div className="flex min-w-0 flex-wrap-reverse items-center gap-[0.4rem]">
                {resources.map(tile)}
                {toggle}
              </div>
              <div className="flex h-[2.4rem] shrink-0 items-center gap-[0.4rem] self-end">{extras}</div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
      {view}
    </div>
  );
};

/** The numbers a fight asks for: armour, initiative, proficiency, speed and spell difficulty. */
export const CombatStats: React.FC<{
  character: Character;
  initiative: number | null;
  /** Rolls initiative and starts a fight; absent when the fight is a party's, started by its master. */
  onInitiative?: () => void;
}> = ({ character, initiative, onInitiative }) => {
  const dialogs = useSheetDialogs();
  const stats: { label: string; value: React.ReactNode; onClick?: () => void; hint: string }[] = [
    {
      label: 'КБ',
      value: armorClassOf(character),
      onClick: () => dialogs.open({ kind: 'armor' }),
      hint: 'Класс брони: нажмите, чтобы изменить',
    },
    {
      label: 'Иниц.',
      value: initiative ?? formatModifier(initiativeModifier(character)),
      onClick: onInitiative,
      hint: initiative !== null ? 'Выпавшая инициатива' : onInitiative ? 'Бросить инициативу и начать бой' : 'Модификатор инициативы',
    },
    { label: 'Мастер.', value: formatModifier(character.proficiencyBonus), hint: 'Бонус мастерства' },
    { label: 'Скор.', value: character.speed, hint: 'Скорость, фт' },
    {
      label: character.spellcastingDifficultyName || 'СЛ',
      value: character.spellcastingDifficultyValue ?? '—',
      hint: 'Сложность спасброска от ваших чар',
    },
  ];
  return (
    <Panel className="ui-hud-strip !gap-0 divide-x divide-line/60 max-lg:w-full">
      {stats.map((stat) => {
        const Tag = stat.onClick ? 'button' : 'div';
        return (
          <Tag
            key={stat.label}
            type={stat.onClick ? 'button' : undefined}
            onClick={stat.onClick}
            title={stat.hint}
            className={cx(
              'flex min-w-[3.6rem] flex-col items-center px-3 max-lg:min-w-0 max-lg:flex-1 max-lg:px-1',
              stat.onClick && 'transition-colors hover:text-frame-bright',
            )}
          >
            <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint max-lg:max-w-full max-lg:truncate max-lg:tracking-normal">{stat.label}</span>
            <span className="ui-display ui-numeric text-lg leading-tight">{stat.value}</span>
          </Tag>
        );
      })}
    </Panel>
  );
};

/** Experience as a thin bar under the panels, with the level at its end. */
export const ExperienceBar: React.FC<{ character: Character }> = ({ character }) => {
  const dialogs = useSheetDialogs();
  const progress = experienceProgress(character.level, character.experience);
  return (
    <button
      type="button"
      onClick={() => dialogs.open({ kind: 'experience' })}
      className="group flex w-full items-center gap-3"
      title="Опыт и уровень"
    >
      {/* The bar with room around it for the setting's level-up marvel, as on the sheet. */}
      <span className="relative block flex-1">
        <span className="ui-hud-xp">
          <motion.span
            className="ui-hud-xp__fill"
            animate={{ width: `${Math.min(progress.progress, 100)}%` }}
            transition={{ duration: 0.6 }}
          />
        </span>
        {progress.canLevelUp && <LevelReady />}
      </span>
      <span className="flex items-baseline gap-2 text-xs text-ink-muted">
        <span className="ui-display ui-numeric text-base text-frame-bright">{character.level}</span>
        ур.
        <span className="tabular-nums">
          {character.experience.toLocaleString(locale)}
          {!progress.isMaxLevel && ` / ${progress.nextLevelXP.toLocaleString(locale)}`}
        </span>
        {progress.canLevelUp && <span className="text-xp">новый уровень</span>}
      </span>
    </button>
  );
};
