import React from 'react';
import type { Setting } from '@itd/schema';
import { StarRule, VineCorner, VineFrameCorner } from '../ui/art/highFantasy';
import { SETTING_LIST } from '../ui/theme/settings';
import { SettingScope } from '../ui/theme/SettingScope';
import { Button, Field, IconButton, Input, Meter, Panel, Rule, SectionTitle, Tag } from '../ui/primitives';
import {
  IconAttacks,
  IconDice,
  IconHealth,
  IconInventory,
  IconSanity,
  IconSpells,
} from '../ui/icons';

const ATTRIBUTES = [
  ['Сила', 10, '+0'],
  ['Ловкость', 16, '+3'],
  ['Телосл.', 16, '+3'],
  ['Интеллект', 22, '+6'],
  ['Мудрость', 20, '+5'],
  ['Харизма', 20, '+5'],
] as const;

const Sample: React.FC<{ setting: Setting; label: string }> = ({ setting, label }) => (
  <SettingScope setting={setting} className="bg-bg p-8 space-y-6 min-h-[880px]">
    <div className="flex items-baseline justify-between">
      <span className="ui-display text-3xl text-frame-bright">{label}</span>
      <span className="text-xs text-ink-faint">{setting}</span>
    </div>

    <Panel className="p-5 flex gap-5">
      <div className="w-24 h-32 shrink-0 ui-panel ui-panel--inset grid place-items-center text-ink-faint text-xs">портрет</div>
      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <div className="ui-display text-[1.9rem] leading-tight text-ink">Лиара Т’Сони</div>
          <div className="text-sm text-ink-muted">Азари · Учёный-биотик</div>
        </div>
        <div className="space-y-2">
          {[
            ['Здоровье', 168, 290, 'hp', 20],
            ['Рассудок', 61, 84, 'sanity', 0],
          ].map(([name, value, max, tone, extra]) => (
            <div key={name as string} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">{name}</span>
                <span className="ui-numeric text-ink">
                  {value} <span className="text-ink-faint">/ {max}</span>
                </span>
              </div>
              <Meter value={value as number} max={max as number} extra={extra as number} tone={tone as 'hp'} ticks />
            </div>
          ))}
        </div>
      </div>
      <div className="w-20 shrink-0 flex flex-col items-center justify-center border-l border-line pl-4">
        <span className="text-[11px] tracking-[0.2em] text-ink-muted">УРОВЕНЬ</span>
        <span className="ui-display ui-numeric text-5xl text-frame-bright leading-none mt-1">18</span>
        <Meter value={265} max={305} tone="xp" height={4} className="w-full mt-3" />
      </div>
    </Panel>

    <div className="grid grid-cols-6 gap-2">
      {ATTRIBUTES.map(([name, score, mod]) => (
        <Panel key={name} ornate={false} className="py-3 px-2 text-center">
          <div className="text-[11px] text-ink-muted truncate">{name}</div>
          <div className="ui-display ui-numeric text-3xl text-ink leading-tight">{mod}</div>
          <div className="ui-numeric text-xs text-ink-faint">{score}</div>
        </Panel>
      ))}
    </div>

    <Panel variant="paper" ornate className="p-5 space-y-3">
      <div className="ui-display text-xl">Внешность и происхождение</div>
      <p className="text-[15px] leading-relaxed">
        Азари с характерным гребнем, спокойной осанкой и внимательным взглядом учёного. Броня собрана под
        биотику: минимум лишней массы, максимум контроля поля.
      </p>
    </Panel>

    <SectionTitle action={<IconButton label="Бросить кубики"><IconDice width={20} height={20} /></IconButton>}>
      Действия
    </SectionTitle>

    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Сохранить</Button>
      <Button>Отмена</Button>
      <Button variant="ghost">Подробнее</Button>
      <Button variant="danger">Удалить</Button>
      <div className="flex gap-1 ml-auto">
        {[IconHealth, IconSanity, IconAttacks, IconSpells, IconInventory].map((Icon, i) => (
          <IconButton key={i} label="иконка" pressed={i === 2}>
            <Icon width={20} height={20} />
          </IconButton>
        ))}
      </div>
    </div>

    <Rule />

    <div className="grid grid-cols-2 gap-4 items-end">
      <Field label="Имя заклинания">{(props) => <Input {...props} defaultValue="Сингулярность" />}</Field>
      <div className="flex flex-wrap gap-2">
        <Tag tone="act-action">Основное</Tag>
        <Tag tone="act-bonus">Бонусное</Tag>
        <Tag tone="act-reaction">Реакция</Tag>
        <Tag tone="act-passive">Пассивное</Tag>
      </div>
    </div>
  </SettingScope>
);

/** Ornaments at a size where their drawing can be judged. */
const OrnamentSpecimen: React.FC = () => (
  <SettingScope setting="high-fantasy" className="col-span-2 bg-bg p-10">
    <div className="flex items-center gap-16 text-frame">
    <svg width="180" height="180" viewBox="0 0 32 32">
      <VineCorner />
    </svg>
    <div style={{ transform: 'scale(3)', transformOrigin: 'left center', width: 260 }}>
      <StarRule />
    </div>
    <div style={{ transform: 'scale(2)', transformOrigin: 'left top', width: 260, height: 260 }}>
      <VineFrameCorner />
    </div>
    </div>
  </SettingScope>
);

export const UiKit = () => (
  <div className="grid grid-cols-2">
    <OrnamentSpecimen />
    {SETTING_LIST.map((s) => (
      <Sample key={s.id} setting={s.id} label={s.label} />
    ))}
  </div>
);
