import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Setting } from '@itd/schema';
import { SETTING_LIST } from '../ui/theme/settings';
import { SettingScope, useDocumentSetting, useSetting } from '../ui/theme/SettingScope';
import { Button, Field, IconButton, Input, Meter, Panel, Rule, SectionTitle, Tabs, Tag, cx } from '../ui/primitives';
import { NumberField, Segmented, Switch } from '../ui/forms';
import { Ledger, LedgerGroup, LedgerRow, MetaLine, MetaValue } from '../ui/Ledger';
import { DetailsPane } from '../ui/DetailsPane';
import { Dialog } from '../ui/Dialog';
import { GameIcon, tileStyle } from '../ui/GameIcon';
import { Rail, RailButton, RailDivider } from '../ui/Rail';
import { SettingBackdrop } from '../ui/SettingBackdrop';
import { Toasts } from '../ui/Toasts';
import { LevelReady, SettingEmblem, useSettingArt } from '../ui/ornaments';
import { WorldCard } from '../screens/create/WorldCard';
import { RollToast } from '../screens/sheet/useRolls';
import { DieGlyph } from '../ui/RollingDie';
import { CheckPanel } from '../ui/CheckPanel';
import { LevelUpBurst } from '../ui/LevelUpBurst';
import type { LevelUpMoment } from '../store/useMomentStore';
import {
  IconArmor,
  IconAttacks,
  IconAttributes,
  IconCharacter,
  IconCheck,
  IconClose,
  IconCombat,
  IconDice,
  IconHealth,
  IconHistory,
  IconInventory,
  IconPrev,
  IconRest,
  IconSanity,
  IconSettings,
  IconSpells,
} from '../ui/icons';

/**
 * Design showcase, opened with `?kit`: one screen of the sheet and every primitive, in the setting
 * chosen at the top. It renders the real components, so what is approved here is what ships.
 */

/** The current setting's level token (status medallion), shown at the rank the samples use. */
const LevelDemo: React.FC = () => {
  const { StatusLevel } = useSettingArt();
  return StatusLevel ? (
    <span className="ui-level relative inline-flex h-[5.3rem] w-[4rem] items-center justify-center">
      <StatusLevel level={20} />
    </span>
  ) : null;
};

interface SampleSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  meta: string;
  icon: string;
  color?: string;
  prepared: boolean;
  damage?: string;
}

const SPELLS: SampleSpell[] = [
  { id: 'shield', name: 'Латунный щит', level: 1, school: 'Ограждение', meta: 'Реакция · на себя', icon: 'magic-shield', prepared: true },
  { id: 'haste', name: 'Ускорение механизма', level: 3, school: 'Преобразование', meta: '1 действие · 30 футов', icon: 'gear-hammer', prepared: true },
  { id: 'fireball', name: 'Огненный шар', level: 3, school: 'Воплощение', meta: '1 действие · 150 футов', icon: 'fire', color: '#c2532f', prepared: false, damage: '8к6 огонь' },
  { id: 'chain', name: 'Цепная молния', level: 6, school: 'Воплощение', meta: '1 действие · 150 футов', icon: 'chain-lightning', color: '#4d7fc4', prepared: true, damage: '10к8 электричество' },
  { id: 'time', name: 'Остановка хода', level: 9, school: 'Преобразование', meta: '1 действие · на себя', icon: 'hourglass', prepared: false },
];

const LEVEL_TABS = [
  { id: 'all', label: 'Все круги' },
  { id: '1', label: '1', count: 1 },
  { id: '3', label: '3', count: 2 },
  { id: '6', label: '6', count: 1 },
  { id: '9', label: '9', count: 1 },
] as const;

const ATTRIBUTES = [
  ['Сила', 10, '+0'],
  ['Ловкость', 14, '+2'],
  ['Телосложение', 16, '+3'],
  ['Интеллект', 26, '+8'],
  ['Мудрость', 20, '+5'],
  ['Харизма', 14, '+2'],
] as const;

const SECTIONS = [
  ['Навыки', IconAttributes],
  ['Действия', IconAttacks],
  ['Магия', IconSpells],
  ['Вещи', IconInventory],
  ['Тело', IconArmor],
  ['Личность', IconCharacter],
  ['Журнал', IconHistory],
] as const;

const Tile: React.FC<{ spell: SampleSpell; large?: boolean }> = ({ spell, large }) => (
  <span
    className={cx('ui-hud-slot ui-hud-slot--tile shrink-0', large && 'ui-hud-slot--large')}
    data-kind="spell"
    style={tileStyle(spell.color)}
  >
    <GameIcon name={spell.icon} kind="spell" size={large ? 40 : 30} className="ui-hud-slot__icon" />
  </span>
);

/** The hero column of the sheet, reduced to what shows the setting's look. */
const HeroSample: React.FC = () => (
  <aside className="ui-hero-column flex w-[320px] shrink-0 flex-col gap-4 p-4">
    <div className="ui-panel ui-panel--inset grid h-[150px] place-items-center text-ink-faint">
      <SettingEmblem size={56} className="text-frame" />
    </div>
    <div>
      <div className="ui-display text-[1.7rem] leading-tight">Сота Сил</div>
      <div className="text-sm text-ink-muted">Химер · Механик-чародей</div>
    </div>
    <Panel className="space-y-3 p-4">
      {(
        [
          ['Здоровье', 214, 240, 'hp', 13],
          ['Рассудок', 61, 85, 'sanity', 0],
        ] as const
      ).map(([name, value, max, tone, extra]) => (
        <div key={name} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-ink-muted">{name}</span>
            <span className="ui-numeric">
              {value} <span className="text-ink-faint">/ {max}</span>
              {extra > 0 && <span className="text-temp-hp"> +{extra}</span>}
            </span>
          </div>
          <Meter value={value} max={max} extra={extra} tone={tone} ticks />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">Опыт</span>
        <Meter value={265} max={305} tone="xp" height={4} className="flex-1" />
        <span className="ui-numeric text-xs text-ink-muted">20 ур.</span>
      </div>
    </Panel>
    <div className="grid grid-cols-4 gap-2">
      {(
        [
          ['15', 'КБ'],
          ['+4', 'Инициатива'],
          ['30', 'Скорость'],
          ['+6', 'Мастерство'],
        ] as const
      ).map(([value, label]) => (
        <Panel key={label} ornate={false} interactive className="ui-stat flex flex-col items-center px-1 py-2">
          <span className="ui-display ui-numeric text-[1.35rem] leading-none">{value}</span>
          <span className="ui-stat__label mt-1 block w-full truncate text-center text-[10px]">{label}</span>
        </Panel>
      ))}
    </div>
    <div className="flex items-center justify-between">
      <span className="ui-label !mb-0">Ресурсы</span>
      <Button size="sm" variant="ghost" icon={<IconRest width={16} height={16} />}>
        Отдых
      </Button>
    </div>
  </aside>
);

/** One section of the sheet: a list of spells and the chosen spell's card beside it. */
const ScreenSample: React.FC<{ bare: boolean }> = ({ bare }) => {
  const [selected, setSelected] = useState('chain');
  const [level, setLevel] = useState<(typeof LEVEL_TABS)[number]['id']>('all');
  const spell = SPELLS.find((s) => s.id === selected) ?? SPELLS[0];
  const shown = SPELLS.filter((s) => level === 'all' || String(s.level) === level);
  const levels = [...new Set(shown.map((s) => s.level))];

  return (
    <div className={cx('ui-screen relative flex h-[860px] overflow-hidden', bare && 'invisible')}>
      <Rail label="Разделы">
        <RailButton label="Герои" Icon={IconPrev} onClick={() => undefined} />
        <RailDivider />
        <div className="flex flex-1 flex-col">
          {SECTIONS.map(([label, Icon]) => (
            <RailButton key={label} label={label} Icon={Icon} active={label === 'Магия'} onClick={() => undefined} />
          ))}
        </div>
        <RailButton label="Бой" Icon={IconCombat} onClick={() => undefined} />
        <RailButton label="Кубики" Icon={IconDice} onClick={() => undefined} />
        <RailButton label="Опции" Icon={IconSettings} onClick={() => undefined} />
      </Rail>
      <HeroSample />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
        <SectionTitle>Характеристики</SectionTitle>
        <div className="grid grid-cols-6 gap-2">
          {ATTRIBUTES.map(([name, score, mod]) => (
            <Panel key={name} ornate={false} interactive className="ui-stat px-2 py-3 text-center">
              <div className="ui-stat__label truncate">{name}</div>
              <div className="ui-display ui-numeric text-3xl leading-tight">{mod}</div>
              <div className="ui-numeric text-xs text-ink-faint">{score}</div>
            </Panel>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 gap-5">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <Tabs label="Круги" value={level} items={[...LEVEL_TABS]} onChange={setLevel} />
            <Ledger title="Книга заклинаний" addLabel="Добавить заклинание" onAdd={() => undefined} className="min-h-0 flex-1">
              {levels.map((lvl) => (
                <React.Fragment key={lvl}>
                  <LedgerGroup aside={`подготовлено ${shown.filter((s) => s.level === lvl && s.prepared).length}`}>{lvl} круг</LedgerGroup>
                  {shown
                    .filter((s) => s.level === lvl)
                    .map((s) => (
                      <LedgerRow
                        key={s.id}
                        title={s.name}
                        meta={<MetaLine parts={[s.school, s.meta, s.damage && <MetaValue>{s.damage}</MetaValue>]} />}
                        dim={!s.prepared}
                        active={s.prepared}
                        selected={s.id === selected}
                        onOpen={() => setSelected(s.id)}
                        action={
                          <Button size="row" variant="secondary">
                            Сотворить
                          </Button>
                        }
                      />
                    ))}
                </React.Fragment>
              ))}
            </Ledger>
          </div>
          <DetailsPane
            className="w-[380px] shrink-0"
            eyebrow={`Заклинание · ${spell.level} круг`}
            title={spell.name}
            icon={<Tile spell={spell} large />}
            facts={[
              { label: 'Время', value: '1 действие' },
              { label: 'Дистанция', value: '150 фт' },
              { label: 'Длительность', value: 'мгновенно' },
            ]}
            actions={
              <>
                <Button variant="primary">Сотворить</Button>
                <Button>Изменить</Button>
                <Button variant="ghost">В бою</Button>
              </>
            }
          >
            {spell.damage && (
              <div className="ui-damage-block mb-4">
                <div className="ui-label">Урон</div>
                <div className="ui-display ui-numeric text-2xl">{spell.damage}</div>
              </div>
            )}
            <p className="text-[15px] leading-relaxed text-ink-muted">
              Разряд молнии бьёт в цель, которую вы видите в пределах дистанции, и перескакивает ещё на три цели
              рядом с ней. Каждая цель совершает спасбросок Ловкости, при провале получая полный урон, при успехе —
              половину.
            </p>
          </DetailsPane>
        </div>
      </main>
    </div>
  );
};

const Board: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <Panel ornate={false} className={cx('space-y-4 p-5', className)}>
    <div className="ui-label">{title}</div>
    {children}
  </Panel>
);

/** The vitals panel of the sheet as StatusCluster draws it: the bars, the level token, the plaque of experience. */
const VitalsSample: React.FC = () => {
  const { StatusLevel } = useSettingArt();
  return (
    <div className="ui-status">
      <Panel className="ui-status__panel space-y-2.5 px-4 py-3">
        <span className="ui-level">
          <StatusLevel level={7} />
        </span>
        <div className="ui-status__bars">
          {(
            [
              ['Здоровье', 31, 44, 'hp', 5, <IconHealth key="hp" width={18} height={18} />],
              ['Рассудок', 57, 57, 'sanity', 0, <IconSanity key="sanity" width={18} height={18} />],
            ] as const
          ).map(([label, value, max, tone, extra, icon]) => (
            <button key={label} type="button" className="ui-vital" data-tone={tone}>
              <span className="ui-vital__icon">{icon}</span>
              <span className="ui-vital__label">{label}</span>
              <span className="ui-vital__value ui-numeric">
                <span className="ui-vital__current">{value}</span>
                <span className="ui-vital__max">/{max}</span>
              </span>
              <span className="ui-vital__gauge">
                <Meter value={value} max={max} extra={extra} tone={tone} height={8} ticks label={label} />
              </span>
              {extra > 0 && <span className="ui-vital__extra ui-numeric">+{extra}</span>}
            </button>
          ))}
        </div>
      </Panel>
      <button type="button" className="ui-xp">
        <span className="ui-xp__label">Опыт</span>
        <span className="ui-xp__value ui-numeric">
          6 500<span className="ui-xp__of"> / 14 000</span>
        </span>
        <span className="ui-xp__rail" aria-hidden>
          <span className="ui-xp__track">
            <span className="ui-xp__fill" style={{ width: '46%' }} />
          </span>
        </span>
      </button>
    </div>
  );
};

/** A hero's card on hero select, focused: the rulebook plate under it, the setting's readout beside it. */
const HeroCardSample: React.FC = () => {
  const { HeroReadout } = useSettingArt();
  const setting = useSetting();
  const tag = { '--tag-tone': 'var(--c-frame-bright)' } as React.CSSProperties;
  return (
    <div className="flex justify-center px-10 pb-16 pt-6">
      <SettingScope setting={setting} className="ui-hero-card relative h-[360px] w-[230px]" data-focused="">
        <div className="ui-rulebook-plate">
          <span className="ui-tag ui-rulebook" style={tag}>
            D&amp;D 5e
          </span>
        </div>
        {HeroReadout && <HeroReadout id="kit-hero" level={7} hp={31} maxHp={44} />}
        <Panel as="button" interactive active className="flex h-full w-full flex-col overflow-hidden p-0 text-left">
          <span className="absolute inset-0 grid place-items-center text-frame/40">
            <SettingEmblem size={120} />
          </span>
          <span className="absolute inset-0 bg-gradient-to-t from-bg-deep from-10% via-bg-deep/60 via-35% to-transparent to-60%" />
          <span className="relative mt-auto block space-y-2 p-5">
            <span className="ui-display block text-[1.75rem] leading-[1.05] text-ink">Сота Сил</span>
            <span className="block text-sm text-ink-muted">Химер · Механик-чародей</span>
            <span className="ui-tag ui-rulebook" style={tag}>
              D&amp;D 5e
            </span>
          </span>
        </Panel>
      </SettingScope>
    </div>
  );
};

/** The steps of hero creation, origin tiles and the small picks. */
const CreationSample: React.FC = () => {
  const [origin, setOrigin] = useState('wizard');
  const [picks, setPicks] = useState<string[]>(['arcana']);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-0.5">
        {(
          [
            ['Мир', 'Высокое фэнтези', 'done'],
            ['Происхождение', 'Химер', 'done'],
            ['Класс', 'выбор…', 'current'],
            ['Снаряжение', '—', 'ahead'],
          ] as const
        ).map(([label, value, state], i) => (
          <button
            key={label}
            type="button"
            className="ui-steps__item"
            aria-current={state === 'current' ? 'step' : undefined}
            data-done={state === 'done' || undefined}
            disabled={state === 'ahead'}
          >
            <span className="ui-steps__mark">
              <span>{state === 'done' ? <IconCheck width={12} height={12} /> : i + 1}</span>
            </span>
            <span className="ui-steps__label">{label}</span>
            <span className="ui-steps__value">{value}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            ['wizard', 'Волшебник', 'wizard-staff'],
            ['rogue', 'Плут', 'hood'],
            ['bard', 'Бард', 'lyre'],
          ] as const
        ).map(([id, name, icon]) => (
          <button key={id} type="button" className="ui-origin" aria-pressed={origin === id} onClick={() => setOrigin(id)}>
            <GameIcon name={icon} kind="ability" size={40} className="ui-origin__icon" />
            <span className="ui-origin__name">{name}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['arcana', 'Магия'],
            ['history', 'История'],
            ['insight', 'Проницательность'],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            type="button"
            className="ui-option ui-option--chip"
            aria-pressed={picks.includes(id)}
            onClick={() => setPicks((all) => (all.includes(id) ? all.filter((p) => p !== id) : [...all, id]))}
          >
            {name}
          </button>
        ))}
        <span className="ui-count" data-done={picks.length >= 2 || undefined}>
          {picks.length} / 2
        </span>
      </div>
    </div>
  );
};

/** The setting's type, from the largest title down to a figure and a line of prose. */
const TypeSample: React.FC = () => (
  <div className="space-y-3">
    <div className="ui-display ui-title text-[2.4rem] leading-none text-ink">Цепная молния</div>
    <SectionTitle>Заклинания</SectionTitle>
    <div className="flex items-baseline gap-4">
      <span className="ui-label !mb-0">Метка поля</span>
      <span className="ui-display ui-numeric text-3xl text-frame-bright">+8 · 14 200</span>
    </div>
    <p className="text-[15px] leading-relaxed text-ink-muted">
      Разряд молнии бьёт в цель и перескакивает ещё на три цели рядом. <em>Курсив для заметок,</em>{' '}
      <b className="text-ink">полужирный для главного.</b>
    </p>
    <Rule />
  </div>
);

/** The setting's colours, as the tokens the parts are painted with. */
const PALETTE = [
  ['bg', 'фон'],
  ['surface', 'панель'],
  ['surface-2', 'панель 2'],
  ['frame', 'рамка'],
  ['frame-bright', 'рамка ярк.'],
  ['ink', 'текст'],
  ['ink-muted', 'текст 2'],
  ['accent', 'акцент'],
  ['hp', 'здоровье'],
  ['sanity', 'рассудок'],
  ['xp', 'опыт'],
  ['success', 'успех'],
  ['danger', 'опасность'],
  ['warning', 'внимание'],
  ['act-bonus', 'бонусное'],
  ['act-reaction', 'реакция'],
] as const;

const PaletteSample: React.FC = () => (
  <div className="grid grid-cols-4 gap-x-3 gap-y-2.5">
    {PALETTE.map(([token, name]) => (
      <div key={token} className="flex min-w-0 items-center gap-2">
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-white/15"
          style={{ background: `rgb(var(--c-${token}))` }}
        />
        <span className="truncate text-xs text-ink-muted">{name}</span>
      </div>
    ))}
  </div>
);

/** Messages as they stand on the screen, without waiting for a click. */
const ToastSample: React.FC = () => (
  <div className="flex flex-col items-center gap-4">
    {(
      [
        [undefined, 'Отряд разбил лагерь'],
        ['success', 'Заклинание сохранено'],
        ['error', 'Не хватает ячеек 5 круга'],
      ] as const
    ).map(([type, text]) => (
      <div key={text} className={cx('ui-toast', type && `ui-toast--${type}`)}>
        <div className="ui-toast__body flex min-w-0 items-center gap-3">
          {type === 'success' && <IconCheck width={18} height={18} className="shrink-0 text-success" />}
          {type === 'error' && <IconClose width={18} height={18} className="shrink-0 text-danger" />}
          <span className="ui-toast__text min-w-0 text-left">{text}</span>
        </div>
      </div>
    ))}
    <div className="ui-toast">
      <div className="ui-toast__body flex min-w-0 items-center gap-3">
        <span className="min-w-0 text-left">
          <RollToast
            label="Атака: Посох"
            total={27}
            detail="1к20 (20) + 7"
            tone="crit"
            dice={[{ sides: 20, value: 20 }]}
            kept={20}
            actions={[{ label: 'Урон', onClick: () => undefined }]}
          />
        </span>
      </div>
    </div>
  </div>
);

/** A window as it stands open, in place: its head, a field, its foot. */
const DialogSample: React.FC = () => (
  <Panel as="section" ornate crest className="ui-dialog">
    <span className="ui-dialog__frame" aria-hidden />
    <header className="ui-dialog__head relative pb-4 pl-6 pr-14 pt-5">
      <div className="min-w-0">
        <div className="ui-dialog__eyebrow mb-1.5 text-[11px] uppercase tracking-[0.18em] opacity-70">Ресурс</div>
        <div className="ui-dialog__title ui-display ui-title text-2xl leading-tight">Ячейки 5 круга</div>
      </div>
      <Rule className="ui-dialog__rule mt-3" />
    </header>
    <div className="space-y-4 px-6 pb-5">
      <Field label="Название">{(props) => <Input {...props} defaultValue="Ячейки 5 круга" />}</Field>
      <p className="text-sm leading-relaxed text-ink-muted">Восстанавливаются после долгого отдыха.</p>
    </div>
    <footer className="ui-dialog__foot flex items-center gap-3 px-6 py-4">
      <Button variant="danger">Удалить</Button>
      <div className="ml-auto flex gap-3">
        <Button variant="ghost">Отмена</Button>
        <Button variant="primary">Сохранить</Button>
      </div>
    </footer>
    <IconButton label="Закрыть" className="!absolute right-4 top-4 z-[2]">
      <IconClose width={18} height={18} />
    </IconButton>
  </Panel>
);

/** A list that drops out of a field, in place. */
const PopoverSample: React.FC = () => (
  <div className="ui-popover !static w-64">
    {(
      [
        ['Огненный шар', '3 круг', 'active'],
        ['Цепная молния', '6 круг', 'selected'],
        ['Остановка хода', '9 круг', ''],
      ] as const
    ).map(([name, level, state]) => (
      <div key={name} className="ui-popover__option" data-active={state === 'active' || undefined} aria-selected={state === 'selected'}>
        <span>{name}</span>
        <span className="text-xs opacity-70">{level}</span>
      </div>
    ))}
  </div>
);

/** The dice tray: a die put into the pool, the rest waiting. */
const DiceSample: React.FC = () => (
  <div className="grid grid-cols-6 gap-2">
    {[4, 6, 8, 10, 12, 20].map((sides) => (
      <button key={sides} type="button" className={cx('ui-die', sides === 20 && 'ui-die--in')}>
        <DieGlyph sides={sides} />
        <span className="ui-die__name">к{sides}</span>
        {sides === 20 && <span className="ui-die__count">2</span>}
      </button>
    ))}
  </div>
);

/** The combat HUD: the hero's portrait between the tall bars, a panel of the hotbar beside it. */
const HudSample: React.FC = () => (
  <div className="flex items-end gap-5">
    <span className="ui-vbar">
      <span className="ui-vbar__track">
        <span className="ui-vbar__fill" style={{ height: '70%', backgroundColor: 'rgb(var(--c-hp))' }} />
        <span className="ui-vbar__extra" style={{ bottom: '70%', height: '11%' }} />
      </span>
      <span className="ui-vbar__label">Здоровье</span>
      <span className="ui-vbar__value">31</span>
    </span>
    <span className="ui-hud-portrait ui-hud-portrait--shielded grid place-items-center">
      <span className="grid h-full w-full place-items-center rounded-[inherit] bg-inset text-frame/60">
        <SettingEmblem size={72} />
      </span>
      <span className="ui-hud-portrait__temp">+5</span>
    </span>
    <span className="ui-vbar">
      <span className="ui-vbar__track">
        <span className="ui-vbar__fill" style={{ height: '100%', backgroundColor: 'rgb(var(--c-sanity))' }} />
      </span>
      <span className="ui-vbar__label">Рассудок</span>
      <span className="ui-vbar__value">57</span>
    </span>
    <Panel className="ui-hud-panel ml-2 flex min-w-0 flex-1 flex-col">
      <header className="ui-hud-panel__head">
        <IconSpells width={16} height={16} className="text-frame-bright" />
        <span>Заклинания</span>
        <span className="ml-auto tabular-nums text-ink-faint">{SPELLS.length}</span>
      </header>
      <div className="flex flex-wrap gap-2 p-3">
        {SPELLS.map((spell) => (
          <Tile key={spell.id} spell={spell} />
        ))}
      </div>
    </Panel>
  </div>
);

/** A page of notes on the setting's paper. */
const PaperSample: React.FC = () => (
  <Panel variant="paper" className="space-y-2 p-6">
    <div className="ui-display text-xl">Дневник</div>
    <Rule />
    <p className="text-[15px] leading-relaxed">
      День третий. Ковен оставил знаки на камнях у старой мельницы; молния в ладони отвечает им дрожью. Завтра —
      к башне, пока туман не сошёл с холмов.
    </p>
  </Panel>
);

/** Every primitive in its states. */
const ComponentsSample: React.FC<{ setting: Setting }> = ({ setting }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [segment, setSegment] = useState<'action' | 'bonus' | 'reaction'>('action');
  const [on, setOn] = useState(true);
  const [count, setCount] = useState(3);
  const [tab, setTab] = useState<'all' | 'weapon' | 'armor'>('all');

  return (
    <div className="grid grid-flow-row-dense grid-cols-3 gap-5 p-6">
      <Board title="Кнопки" className="col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg">
            Создать героя
          </Button>
          <Button variant="primary">Сохранить</Button>
          <Button>Изменить</Button>
          <Button variant="ghost">Подробнее</Button>
          <Button variant="danger">Удалить</Button>
          <Button variant="primary" disabled>
            Недоступно
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="primary">
            Бросить
          </Button>
          <Button size="sm">Отмена</Button>
          <Button size="row">Сотворить</Button>
          <Button size="row" variant="danger">
            Снять
          </Button>
          <div className="ml-auto flex gap-1">
            {[IconAttacks, IconSpells, IconInventory, IconDice].map((Icon, i) => (
              <IconButton key={i} label="Кнопка-иконка" pressed={i === 1}>
                <Icon width={20} height={20} />
              </IconButton>
            ))}
          </div>
        </div>
      </Board>

      <Board title="Окна и сообщения">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setDialogOpen(true)}>Открыть окно</Button>
          <Button onClick={() => toast.success('Бросок 1к20 + 8: 23')}>Сообщение</Button>
          <Button onClick={() => toast.error('Не хватает ячеек 5 круга')}>Ошибка</Button>
          <Button onClick={() => toast('Отряд разбил лагерь')}>Весть</Button>
          {(
            [
              ['Бросок', 14, undefined],
              ['Крит', 20, 'crit'],
              ['Провал', 1, 'fumble'],
            ] as const
          ).map(([name, die, tone]) => (
            <Button
              key={name}
              size="sm"
              onClick={() =>
                toast(
                  <RollToast
                    label="Атака: Посох"
                    total={die + 7}
                    detail={`1к20 (${die}) + 7`}
                    tone={tone}
                    dice={[{ sides: 20, value: die }]}
                    kept={die}
                    actions={tone === 'fumble' ? [] : [{ label: 'Урон', onClick: () => undefined }]}
                  />,
                  { duration: 6000 },
                )
              }
            >
              {name}
            </Button>
          ))}
        </div>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          eyebrow="Ресурс"
          title="Ячейки 5 круга"
          footerStart={<Button variant="danger">Удалить</Button>}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Сохранить
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Название">{(props) => <Input {...props} defaultValue="Ячейки 5 круга" />}</Field>
            <div className="flex items-end gap-4">
              <Field label="Сейчас">{() => <NumberField value={count} onChange={setCount} min={0} max={3} />}</Field>
              <Field label="Восстановление">
                {() => (
                  <Segmented
                    label="Восстановление"
                    value={segment}
                    onChange={setSegment}
                    options={[
                      { value: 'action', label: 'Долгий отдых' },
                      { value: 'bonus', label: 'Короткий' },
                      { value: 'reaction', label: 'Вручную' },
                    ]}
                  />
                )}
              </Field>
            </div>
          </div>
        </Dialog>
      </Board>

      <Board title="Поля">
        <Field label="Имя заклинания" hint="Как оно записано в книге">
          {(props) => <Input {...props} defaultValue="Цепная молния" />}
        </Field>
        <Field label="Ошибка" error="Нужно название">
          {(props) => <Input {...props} placeholder="Название" />}
        </Field>
      </Board>

      <Board title="Переключатели">
        <Segmented
          label="Тип действия"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'action', label: 'Основное', tone: 'act-action' },
            { value: 'bonus', label: 'Бонусное', tone: 'act-bonus' },
            { value: 'reaction', label: 'Реакция', tone: 'act-reaction' },
          ]}
        />
        <div className="flex items-center gap-6">
          <Switch checked={on} onChange={setOn} label="Концентрация" />
          <NumberField value={count} onChange={setCount} min={0} max={9} />
        </div>
        <Tabs
          label="Вещи"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'Всё' },
            { id: 'weapon', label: 'Оружие' },
            { id: 'armor', label: 'Броня' },
          ]}
        />
      </Board>

      <Board title="Метки и шкалы">
        <div className="flex flex-wrap gap-2">
          <Tag tone="act-action">Основное</Tag>
          <Tag tone="act-bonus">Бонусное</Tag>
          <Tag tone="act-reaction">Реакция</Tag>
          <Tag tone="act-passive">Пассивное</Tag>
          <Tag tone="danger">Уязвимость</Tag>
        </div>
        <Meter value={120} max={240} tone="hp" ticks />
        <Meter value={60} max={85} tone="sanity" ticks />
        <Meter value={30} max={100} tone="xp" height={4} />
      </Board>

      <Board title="Ячейки боя" className="col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          {SPELLS.map((s) => (
            <Tile key={s.id} spell={s} />
          ))}
          <span className="ui-hud-chip ui-hud-chip--condition">
            <GameIcon name="grab" kind="ability" size={20} />
          </span>
          <span className="ui-hud-chip">
            <GameIcon name="magic-shield" kind="ability" size={20} />
            <span className="ui-hud-chip__count">2</span>
          </span>
          <span className="ui-hud-chip ui-hud-chip--add">+</span>
        </div>
      </Board>

      <Board title="Новый уровень">
        {/* The setting's level token (status medallion) and the experience plaque in its "ready" state. */}
        <div className="flex items-center justify-center py-3">
          <LevelDemo />
        </div>
        <div className="ui-status pt-2">
          <span className="ui-xp" data-ready>
            <span className="ui-xp__label">Новый уровень</span>
            <span className="ui-xp__value ui-numeric">
              14 200<span className="ui-xp__of"> / 14 000</span>
            </span>
            <span className="ui-xp__rail" aria-hidden>
              <span className="ui-xp__track">
                <span className="ui-xp__fill" style={{ width: '100%' }} />
              </span>
              <LevelReady />
            </span>
          </span>
        </div>
      </Board>

      <Board title="Карточка мира" className="row-span-2">
        {/* The setting's world card as hero creation shows it, at rest and chosen. */}
        <div className="flex justify-center gap-4">
          {[false, true].map((selected) => (
            <div key={String(selected)} style={{ height: 300, aspectRatio: '0.62' }}>
              <WorldCard setting={setting} selected={selected} onSelect={() => undefined} />
            </div>
          ))}
        </div>
      </Board>

      <Board title="Здоровье и уровень">
        <VitalsSample />
      </Board>

      <Board title="Шрифты" className="col-span-2">
        <TypeSample />
      </Board>

      <Board title="Палитра">
        <PaletteSample />
      </Board>

      <Board title="Сообщения" className="col-span-2">
        <ToastSample />
      </Board>

      <Board title="Список">
        <PopoverSample />
      </Board>

      <Board title="Окно" className="col-span-2">
        <DialogSample />
      </Board>

      <Board title="Записи">
        <PaperSample />
      </Board>

      <Board title="Бой" className="col-span-2">
        <HudSample />
      </Board>

      <Board title="Кубики">
        <DiceSample />
      </Board>

      <Board title="Проверка у стола" className="col-span-3">
        <CheckSample />
      </Board>

      <Board title="Новый уровень: момент" className="col-span-3">
        <LevelUpSample key={setting} setting={setting} />
      </Board>

      <Board title="Карточка героя" className="row-span-2">
        <HeroCardSample />
      </Board>

      <Board title="Создание">
        <CreationSample />
      </Board>

      <Board title="Выбор">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="ui-option" aria-pressed>
            <span>Высший эльф</span>
            <span className="ui-option__meta">Заговор «Фокусы»</span>
          </button>
          <button type="button" className="ui-option" aria-pressed={false}>
            <span>Лесной эльф</span>
            <span className="ui-option__meta">Скорость 35 фт</span>
          </button>
        </div>
      </Board>
    </div>
  );
};

/**
 * A check at the table, as the middle of the screen shows it: thrown against a difficulty (played
 * again on demand, to watch it frame by frame), and waiting for the player's click on a call.
 */
const CheckSample: React.FC = () => {
  const [run, setRun] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [hit, setHit] = useState(true);
  const value = hit ? 14 : 6;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setRun((n) => n + 1)}>
          Ещё раз
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setHit((h) => !h)}>
          {hit ? 'Показать провал' : 'Показать успех'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setWaiting(true)}>
          Ждать клика
        </Button>
      </div>
      {/* One under the other: each plate's weather spreads wide, as it does alone on the screen. */}
      <div className="flex flex-col items-center gap-48 py-24">
        <CheckPanel
          key={`thrown-${run}-${hit}`}
          title="Магия"
          subtitle="Проверка Интеллекта · 1d20 + 5"
          dice={[{ sides: 20, value }]}
          check={{ title: 'Магия', formula: '1d20 + 5', bonus: 5, total: value + 5, target: 15 }}
          parts={[
            { label: 'Интеллект', value: 3, icon: 'brain' },
            { label: 'Владение навыком', value: 2, icon: 'laurel-crown' },
          ]}
        />
        <CheckPanel
          key={`call-${run}`}
          title="Спасбросок Телосложения"
          subtitle="Мастер просит бросок · Эдгар Хайт"
          dice={waiting ? [] : [{ sides: 20, value: 17 }]}
          check={{ title: 'Спасбросок Телосложения', formula: '1d20 + 6', bonus: 6, total: 23, target: 18 }}
          parts={[
            { label: 'Телосложение', value: 3, icon: 'heart-plus' },
            { label: 'Владение спасброском', value: 3, icon: 'laurel-crown' },
          ]}
          onRoll={waiting ? () => setWaiting(false) : undefined}
        />
      </div>
    </div>
  );
};

/** A new level as it plays over the sheet, played again on demand. */
const LevelUpSample: React.FC<{ setting: Setting }> = ({ setting }) => {
  const [moment, setMoment] = useState<LevelUpMoment | null>(null);
  const play = () =>
    setMoment({
      key: Date.now(),
      from: 2,
      to: 3,
      setting,
      gains: [
        { label: 'Максимум здоровья', value: '+7' },
        { label: 'Бонус мастерства', value: '+1' },
        { label: 'Новые умения', value: '+2' },
      ],
    });
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button size="sm" onClick={play}>
          Сыграть
        </Button>
      </div>
      <div className="relative h-[760px] overflow-hidden">
        <LevelUpBurst moment={moment} onDone={() => setMoment(null)} inline />
      </div>
    </div>
  );
};

/** Showcase page: a setting switcher in the service's own type, then the screen and the parts. */
export const UiKit = () => {
  const [setting, setSetting] = useState<Setting>(() => (new URLSearchParams(window.location.search).get('kit') as Setting) || 'high-fantasy');
  const [bare, setBare] = useState(false);
  useDocumentSetting(setting);
  const choose = (next: Setting) => {
    setSetting(next);
    window.history.replaceState(null, '', `?kit=${next}`);
  };

  return (
    <SettingScope setting={setting} className="min-h-screen bg-bg">
      <header className="ui-service flex items-center gap-6 border-b border-line px-6 py-3">
        <span className="text-sm text-ink-muted">Витрина дизайна</span>
        <Segmented label="Сеттинг" value={setting} onChange={choose} options={SETTING_LIST.map((s) => ({ value: s.id, label: s.label }))} />
        <span className="ml-auto">
          <Switch checked={bare} onChange={setBare} label="Только фон" />
        </span>
      </header>
      <div className="relative">
        <SettingBackdrop setting={setting} strength={bare ? 1 : 0.8} />
        <ScreenSample bare={bare} />
      </div>
      <ComponentsSample setting={setting} />
      <Toasts />
    </SettingScope>
  );
};
