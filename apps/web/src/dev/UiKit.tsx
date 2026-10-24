import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { Setting } from '@itd/schema';
import { SETTING_LIST } from '../ui/theme/settings';
import { SettingScope, useDocumentSetting } from '../ui/theme/SettingScope';
import { Button, Field, IconButton, Input, Meter, Panel, SectionTitle, Tabs, Tag, cx } from '../ui/primitives';
import { NumberField, Segmented, Switch } from '../ui/forms';
import { Ledger, LedgerGroup, LedgerRow, MetaLine, MetaValue } from '../ui/Ledger';
import { DetailsPane } from '../ui/DetailsPane';
import { Dialog } from '../ui/Dialog';
import { GameIcon, tileStyle } from '../ui/GameIcon';
import { Rail, RailButton, RailDivider } from '../ui/Rail';
import { SettingBackdrop } from '../ui/SettingBackdrop';
import { Toasts } from '../ui/Toasts';
import { LevelReady, SettingEmblem } from '../ui/ornaments';
import {
  IconArmor,
  IconAttacks,
  IconAttributes,
  IconCharacter,
  IconCombat,
  IconDice,
  IconHistory,
  IconInventory,
  IconPrev,
  IconRest,
  IconSettings,
  IconSpells,
} from '../ui/icons';

/**
 * Design showcase, opened with `?kit`: one screen of the sheet and every primitive, in the setting
 * chosen at the top. It renders the real components, so what is approved here is what ships.
 */

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
const ScreenSample: React.FC = () => {
  const [selected, setSelected] = useState('chain');
  const [level, setLevel] = useState<(typeof LEVEL_TABS)[number]['id']>('all');
  const spell = SPELLS.find((s) => s.id === selected) ?? SPELLS[0];
  const shown = SPELLS.filter((s) => level === 'all' || String(s.level) === level);
  const levels = [...new Set(shown.map((s) => s.level))];

  return (
    <div className="ui-screen relative flex h-[860px] overflow-hidden">
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

/** Every primitive in its states. */
const ComponentsSample: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [segment, setSegment] = useState<'action' | 'bonus' | 'reaction'>('action');
  const [on, setOn] = useState(true);
  const [count, setCount] = useState(3);
  const [tab, setTab] = useState<'all' | 'weapon' | 'armor'>('all');

  return (
    <div className="grid grid-cols-3 gap-5 p-6">
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
        {/* The experience plaque of the status cluster in its "ready" state. */}
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

/** Showcase page: a setting switcher in the service's own type, then the screen and the parts. */
export const UiKit = () => {
  const [setting, setSetting] = useState<Setting>(() => (new URLSearchParams(window.location.search).get('kit') as Setting) || 'high-fantasy');
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
      </header>
      <div className="relative">
        <SettingBackdrop setting={setting} strength={0.8} />
        <ScreenSample />
      </div>
      <ComponentsSample />
      <Toasts />
    </SettingScope>
  );
};
