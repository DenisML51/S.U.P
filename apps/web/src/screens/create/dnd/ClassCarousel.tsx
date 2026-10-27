import React, { useState } from 'react';
import { DND, DND_ICONS, type ClassDef } from '@itd/game-logic/dnd';
import { ChoiceCarousel } from '../../../ui/ChoiceCarousel';
import { GameIcon } from '../../../ui/GameIcon';
import { Corners } from '../../../ui/ornaments';
import { useAtLeast } from '../../../ui/useBreakpoint';
import { WireDie, type DieShape } from '../../../ui/WireDie';
import { DIE } from '../../../i18n';

/**
 * A class as a card in the frame the rulebooks have: its emblem above with a quiet halo, its name on
 * the line between, and the die of its hit points turning below. It wakes under the pointer, on
 * focus and on a tap; the chosen one keeps a calm, lit halo.
 */
const ClassCard: React.FC<{ classDef: ClassDef; focused: boolean; hovered: boolean; chosen: boolean }> = ({
  classDef,
  focused,
  hovered,
  chosen,
}) => {
  const [engaged, setEngaged] = useState(false);
  const awake = focused && (hovered || engaged);
  // A phone card is small: corners would crowd the emblem and the die.
  const ornate = useAtLeast('tablet');
  return (
    <div
      className="ui-world ui-class-card"
      role="button"
      tabIndex={0}
      aria-label={`${classDef.name}, кость хитов ${DIE}${classDef.hitDie}`}
      aria-pressed={chosen}
      data-awake={awake || undefined}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') setEngaged(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
    >
      <span className="ui-world__veil" aria-hidden />
      {ornate && <Corners />}
      <span className="ui-class-card__half">
        <span className="ui-class-card__emblem">
          <svg
            className="ui-class-card__halo"
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            aria-hidden
          >
            <circle cx="100" cy="100" r="92" strokeWidth="0.8" strokeDasharray="1 7" strokeLinecap="round" />
            <circle cx="100" cy="100" r="74" strokeWidth="0.6" opacity="0.5" />
          </svg>
          <GameIcon name={DND_ICONS.classes[classDef.id]} kind="ability" size={76} />
        </span>
      </span>
      <span className="ui-class-card__title">
        <span
          className="ui-class-card__name ui-display ui-title"
          data-long={classDef.name.length > 14 || undefined}
        >
          {classDef.name}
        </span>
        {classDef.source && <span className="ui-class-card__source">Хоумбрю · {classDef.source}</span>}
      </span>
      <span className="ui-class-card__half ui-class-card__half--die">
        <WireDie
          shape={`d${classDef.hitDie}` as DieShape}
          spin={awake ? 6 : chosen ? 1.6 : 0.6}
          phase={classDef.hitDie}
          className="ui-class-card__die"
        />
        <span className="ui-class-card__die-label">
          Кость хитов <b className="ui-numeric">{`${DIE}${classDef.hitDie}`}</b>
        </span>
      </span>
    </div>
  );
};

/** The classes fanned round the one in front, as the rules are; only the near ones are drawn. */
export const ClassCarousel: React.FC<{ value?: string; onChange: (id: string) => void }> = ({
  value,
  onChange,
}) => (
  // The fan is wider than the step's panel: the cards at its sides are cut at the panel's edge.
  <div className="overflow-x-clip">
    <ChoiceCarousel
      label="класс"
      height="min(44vh, 420px)"
      reach={2}
      chosen={value || null}
      onChoose={onChange}
      chooseLabel="Выбрать класс"
      chosenLabel="Класс выбран"
      items={DND.classes.map((classDef) => ({
        id: classDef.id,
        render: ({ focused, hovered }) => (
          <ClassCard classDef={classDef} focused={focused} hovered={hovered} chosen={value === classDef.id} />
        ),
      }))}
    />
  </div>
);
