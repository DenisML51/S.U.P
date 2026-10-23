import React, { useState } from 'react';
import { DAMAGE_TYPES } from '@itd/game-logic';
import type { Character, DamageComponent, Resource } from '@itd/schema';
import { ConfirmDialog } from '../../../ui/Dialog';
import { NumberField, Select, Suggest } from '../../../ui/forms';
import { Button, IconButton, Rule, cx } from '../../../ui/primitives';
import { IconClose, IconPlus } from '../../../ui/icons';

/** The figures a card leads with ("Попадание +14", "Урон 3d10+10 рубящий"), large and side by side. */
export const KeyFacts: React.FC<{ facts: { label: string; value: React.ReactNode }[] }> = ({ facts }) => (
  <dl className="ui-keyfacts">
    {facts.map((fact) => (
      <div key={fact.label}>
        <dt>{fact.label}</dt>
        <dd className="ui-display ui-numeric">{fact.value}</dd>
      </div>
    ))}
  </dl>
);

/** Damage as figures: one line per component, the formula large and its type small beside it. */
export const DamageFigures: React.FC<{ parts: DamageComponent[] }> = ({ parts }) => (
  <span className="-ml-5 flex flex-col">
    {parts.map((part, index) => (
      <span key={index} className="flex items-baseline gap-2">
        <span className="w-3 shrink-0 text-base opacity-50">{index > 0 && '+'}</span>
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span>{part.damage}</span>
          {part.type && (
            <span className="font-[family-name:var(--font-body)] text-sm font-normal normal-case tracking-normal opacity-75">{part.type.toLowerCase()}</span>
          )}
        </span>
      </span>
    ))}
  </span>
);

/** The setting's ornamental divider between the figures and the text of a card. */
export const CardRule: React.FC = () => <Rule className="my-4 opacity-70" />;

/** Secondary facts as "label value" pairs on one wrapping line. */
export const MinorFacts: React.FC<{ facts: (readonly [string, React.ReactNode] | false | null | undefined)[] }> = ({ facts }) => {
  const shown = facts.filter((f): f is readonly [string, React.ReactNode] => !!f && f[1] !== '' && f[1] !== undefined);
  if (shown.length === 0) return null;
  return (
    <dl className="ui-minorfacts mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
      {shown.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className="opacity-60">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

/** "Удалить" with a confirmation naming what goes away. */
export const DeleteButton: React.FC<{ what: string; name: string; onDelete: () => void }> = ({ what, name, onDelete }) => {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button variant="ghost" size="row" className="!text-danger/80 hover:!text-danger" onClick={() => setAsking(true)}>
        Удалить
      </Button>
      <ConfirmDialog
        open={asking}
        title={`Удалить ${what}?`}
        message={
          <>
            <span className="text-ink">{name}</span> исчезнет из листа.
          </>
        }
        confirmLabel="Удалить"
        danger
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          onDelete();
        }}
      />
    </>
  );
};

/** A labelled block of a form. */
export const FormSection: React.FC<{ label: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  label,
  aside,
  children,
  className,
}) => (
  <section className={cx('space-y-[0.35rem]', className)}>
    <div className="flex items-center justify-between">
      <h3 className="ui-label !mb-0">{label}</h3>
      {aside}
    </div>
    {children}
  </section>
);

/** Damage as a list of "formula + type" rows: "3d10+10 рубящий", "2d6 некротический". */
export const DamageEditor: React.FC<{
  value: DamageComponent[];
  onChange: (value: DamageComponent[]) => void;
  /** Attacks always deal damage; an ability or spell may not. */
  required?: boolean;
}> = ({ value, onChange, required }) => {
  const set = (index: number, patch: Partial<DamageComponent>) =>
    onChange(value.map((part, i) => (i === index ? { ...part, ...patch } : part)));
  return (
    <FormSection
      label="Урон"
      aside={
        <button
          type="button"
          onClick={() => onChange([...value, { damage: '1d6', type: '' }])}
          className="flex items-center gap-1 text-xs text-ink-muted hover:text-frame-bright"
        >
          <IconPlus width={12} height={12} /> {value.length === 0 ? 'Добавить урон' : 'Ещё тип урона'}
        </button>
      }
    >
      {value.length === 0 && <p className="text-sm text-ink-faint">Без урона</p>}
      {value.map((part, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            className="ui-input w-36 font-mono text-sm"
            value={part.damage}
            onChange={(e) => set(index, { damage: e.target.value })}
            placeholder="2d6+3"
            aria-label="Формула урона"
          />
          <Suggest
            value={part.type}
            onChange={(type) => set(index, { type })}
            suggestions={DAMAGE_TYPES}
            placeholder="Тип урона"
            label="Тип урона"
            className="flex-1"
          />
          <IconButton
            label="Убрать"
            size={32}
            disabled={required && value.length === 1}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <IconClose width={14} height={14} />
          </IconButton>
        </div>
      ))}
    </FormSection>
  );
};

/** "2 Магия": what using an entry costs, or nothing when it is free. */
export const costLabel = (character: Character, resourceId?: string, cost?: number): React.ReactNode => {
  if (!resourceId) return null;
  const resource = character.resources.find((r) => r.id === resourceId);
  return (
    <span className="flex items-baseline gap-2">
      <span>{cost ?? 1}</span>
      <span className="font-[family-name:var(--font-body)] text-sm font-normal normal-case tracking-normal opacity-75">
        {resource?.name ?? 'ресурс'}
      </span>
    </span>
  );
};

/** Which resource an entry spends and how much of it. */
export const CostEditor: React.FC<{
  resources: Resource[];
  resourceId?: string;
  cost?: number;
  onChange: (resourceId: string | undefined, cost: number | undefined) => void;
}> = ({ resources, resourceId, cost, onChange }) => (
  <FormSection label="Стоимость" className="min-w-0 flex-1">
    <div className="flex gap-2">
      <Select
        value={resourceId ?? ''}
        onChange={(id) => onChange(id || undefined, id ? (cost ?? 1) : undefined)}
        options={[{ value: '', label: 'Бесплатно' }, ...resources.map((r) => ({ value: r.id, label: r.name, hint: `${r.current}/${r.max}` }))]}
        className="min-w-0 flex-1"
      />
      {resourceId && <NumberField label="Сколько" min={1} value={cost ?? 1} onChange={(value) => onChange(resourceId, value)} className="w-28" />}
    </div>
  </FormSection>
);
