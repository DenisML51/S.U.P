import React from 'react';
import { ATTRIBUTES_LIST, abilityModifier, formatModifier } from '@itd/game-logic';
import { Section } from '../../../ui/Section';
import { IconButton, Input } from '../../../ui/primitives';
import { IconMinus, IconPlus } from '../../../ui/icons';
import { ScoreCard } from '../kit';
import type { Creation } from '../useCreation';

/** A named field of the origin: its label over a plain input. */
const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder: string }> = ({
  label,
  value,
  onChange,
  placeholder,
}) => (
  <label className="flex flex-col">
    <span className="ui-label">{label}</span>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </label>
);

/** Race and class of the player's own making, each with an optional subrace or path. */
export const OriginStep: React.FC<{ creation: Creation }> = ({ creation }) => (
  <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-10 [&>.ui-section+.ui-section]:mt-0">
    <Section title="Происхождение" hint="Кто герой по крови. Подраса — если она есть в вашем мире.">
      <div className="space-y-4">
        <Field label="Раса" value={creation.race} onChange={creation.setRace} placeholder="Например, азари" />
        <Field label="Подраса" value={creation.subrace} onChange={creation.setSubrace} placeholder="Необязательно" />
      </div>
    </Section>
    <Section title="Призвание" hint="Чем герой занимается. Путь — специализация внутри класса.">
      <div className="space-y-4">
        <Field label="Класс" value={creation.characterClass} onChange={creation.setCharacterClass} placeholder="Например, биотик" />
        <Field label="Путь" value={creation.subclass} onChange={creation.setSubclass} placeholder="Необязательно" />
      </div>
    </Section>
  </div>
);

/** Point buy of the six scores. */
export const PointBuyStep: React.FC<{ creation: Creation }> = ({ creation }) => (
  <div className="mx-auto flex max-w-5xl flex-col items-center">
    <p className="mb-6 h-6 text-sm text-ink-muted">
      {creation.points === 0 ? (
        <span className="text-success">Все очки распределены</span>
      ) : (
        <>
          Осталось очков: <span className="ui-numeric text-ink">{creation.points}</span> из 27 · до 13 — по 1 очку, 14 и 15 — по 2
        </>
      )}
    </p>
    <div className="grid w-full grid-cols-6 gap-3">
      {ATTRIBUTES_LIST.map((attribute) => {
        const score = creation.attributes[attribute.id] ?? 8;
        return (
          <ScoreCard
            key={attribute.id}
            label={attribute.name}
            description={attribute.description}
            controls={
              <span className="flex gap-2">
                <IconButton label="Уменьшить" size={30} onClick={() => creation.lower(attribute.id)} disabled={!creation.canLower(attribute.id)}>
                  <IconMinus width={14} height={14} />
                </IconButton>
                <IconButton label="Увеличить" size={30} onClick={() => creation.raise(attribute.id)} disabled={!creation.canRaise(attribute.id)}>
                  <IconPlus width={14} height={14} />
                </IconButton>
              </span>
            }
          >
            <span className="ui-display ui-numeric mb-2 text-5xl leading-none text-ink">{score}</span>
            <span className="text-frame-bright">{formatModifier(abilityModifier(score))}</span>
          </ScoreCard>
        );
      })}
    </div>
  </div>
);
