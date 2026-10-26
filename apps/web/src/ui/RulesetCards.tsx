import React, { useState } from 'react';
import { Kraken, type TentacleSpec } from './art/lovecraft';
import { ChoiceCarousel } from './ChoiceCarousel';
import { Corners } from './ornaments';
import { cx } from './primitives';
import { WireDie, type DieShape } from './WireDie';
import { RULES_CHOICES, RULES_TITLE, type RulesChoice } from '../systems';

export type EditionChoice = 'classic' | 'pulp';

// ------------------------------------------------------------------------------------------------
// Scenes: each rulebook's own living ornament behind its dice
// ------------------------------------------------------------------------------------------------

/** Arms rising round the dice from below the card, reaching up when the card wakes. */
const COC_ARMS: TentacleSpec[] = [
  { x: 40, y: 470, angle: -1.38, length: 330, width: 24, curl: 3.9, phase: 0 },
  { x: 360, y: 470, angle: -1.76, length: 330, width: 24, curl: -3.9, phase: 1.7 },
  { x: 120, y: 520, angle: -1.5, length: 240, width: 16, curl: -4.6, phase: 3.3 },
  { x: 290, y: 520, angle: -1.62, length: 230, width: 15, curl: 4.6, phase: 4.6 },
];
const CLASSIC_ARMS: TentacleSpec[] = [
  { x: 330, y: 470, angle: -1.86, length: 360, width: 22, curl: -4.2, phase: 0.8 },
];

const TentacleScene: React.FC<{ awake: boolean; arms: TentacleSpec[] }> = ({ awake, arms }) => (
  <div
    className="absolute inset-0 transition-transform duration-[1400ms] ease-out"
    style={{ transform: `translateY(${awake ? '2%' : '16%'})` }}
  >
    <Kraken arms={arms} speed={awake ? 2.4 : 0.6} className="h-full w-full text-frame-bright/70" />
  </div>
);

/** Runes round the summoning circle, as engraved letters of no tongue a reader knows. */
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

/**
 * Something infernal behind the d20: a summoning circle turning slowly — rings of runes going opposite
 * ways — a glow breathing inside it, sparks rising. Awake, the circle
 * flares and turns faster.
 */
const InfernalScene: React.FC<{ awake: boolean }> = ({ awake }) => (
  <div className={cx('ui-infernal absolute inset-0', awake && 'ui-infernal--awake')}>
    <svg
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      className="h-full w-full text-frame-bright/70"
      aria-hidden
    >
      <g className="ui-infernal__circle">
        <circle cx="200" cy="170" r="150" strokeWidth="1.2" />
        <circle cx="200" cy="170" r="128" strokeWidth="0.6" />
        <g className="ui-infernal__runes" fill="currentColor" stroke="none" fontSize="15" textAnchor="middle">
          {RUNES.split('').map((rune, i, all) => {
            const a = (i / all.length) * 360;
            return (
              <text key={i} x="200" y="31" transform={`rotate(${a} 200 170)`}>
                {rune}
              </text>
            );
          })}
        </g>
        <circle cx="200" cy="170" r="52" strokeWidth="0.7" strokeDasharray="2 5" />
      </g>
    </svg>
    <span className="ui-infernal__glow" aria-hidden />
    <span className={cx('ui-embers', 'ui-embers--awake')} aria-hidden>
      {Array.from({ length: awake ? 18 : 8 }, (_, i) => (
        <i key={i} style={{ left: `${6 + ((i * 37) % 88)}%`, animationDelay: `${(i * 0.47) % 4}s` }} />
      ))}
    </span>
  </div>
);

/** A quill's flourish written round the d6 again and again, faster when the card wakes. */
const InkScene: React.FC<{ awake: boolean }> = ({ awake }) => (
  <div className="absolute inset-0">
    <svg
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      className="h-full w-full text-frame-bright/60"
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1="40" x2="360" y1={250 + i * 22} y2={250 + i * 22} strokeWidth="0.5" opacity="0.25" />
      ))}
      <path
        className={cx('ui-ink-flourish', awake && 'ui-ink-flourish--awake')}
        pathLength={1}
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M60 300 C 110 220, 150 380, 200 300 S 300 200, 330 260 S 280 360, 220 330 C 170 305, 140 250, 190 215 C 230 190, 300 205, 340 160"
      />
    </svg>
  </div>
);

/** Pulp's arms: more of them, reaching in from the sides and curling round where the dice stand. */
const PULP_ARMS: TentacleSpec[] = [
  { x: -40, y: 330, angle: -0.35, length: 300, width: 22, curl: 5.4, phase: 0 },
  { x: 440, y: 330, angle: -2.8, length: 300, width: 22, curl: -5.4, phase: 1.3 },
  { x: 60, y: 480, angle: -1.15, length: 280, width: 18, curl: 4.8, phase: 2.6 },
  { x: 340, y: 480, angle: -1.99, length: 280, width: 18, curl: -4.8, phase: 3.9 },
  { x: 200, y: 520, angle: -1.57, length: 200, width: 14, curl: 5.8, phase: 5.2 },
];

/**
 * Pulp: the arms of the thing lashing in from every side, quicker and wilder than the classic one, snatching at the dice when the card wakes.
 */
const PulpScene: React.FC<{ awake: boolean }> = ({ awake }) => (
  <div className="absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0 transition-transform duration-700 ease-out"
      style={{ transform: `scale(${awake ? 1.06 : 1}) translateY(${awake ? '0%' : '8%'})` }}
    >
      <Kraken arms={PULP_ARMS} speed={awake ? 4.2 : 1.2} className="h-full w-full text-frame-bright/75" />
    </div>
  </div>
);

// ------------------------------------------------------------------------------------------------
// The card
// ------------------------------------------------------------------------------------------------

/**
 * A rulebook as a card in the setting's world frame: its living scene, its dice, its name. A
 * button for the keyboard and screen readers (pressed when chosen); it wakes under the pointer,
 * on keyboard focus and on a tap, not only on hover. Enter or Space acts as a click, which the
 * carousel turns into bringing the card forward or choosing it.
 */
const RulebookCard: React.FC<{
  title: string;
  dice: DieShape[];
  scene: (awake: boolean) => React.ReactNode;
  /** The card stands in front of the carousel. */
  focused: boolean;
  hovered: boolean;
  chosen: boolean;
}> = ({ title, dice, scene, focused, hovered, chosen }) => {
  const [engaged, setEngaged] = useState(false);
  const awake = focused && (hovered || engaged);
  return (
    <div
      className="ui-world ui-rulebook-card"
      role="button"
      tabIndex={0}
      aria-label={title}
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
      <RulebookFace title={title} dice={dice} scene={scene(awake || (focused && chosen))} awake={awake} chosen={chosen} />
    </div>
  );
};

const RulebookFace: React.FC<{
  title: string;
  dice: DieShape[];
  scene: React.ReactNode;
  awake: boolean;
  chosen: boolean;
}> = ({ title, dice, scene, awake, chosen }) => (
  <>
    <span className="ui-world__scene" aria-hidden>
      {scene}
    </span>
    <span className="ui-world__veil" aria-hidden />
    <Corners />
    <span className="ui-rulebook-card__dice text-frame-bright">
      {dice.map((shape, i) => (
        <WireDie
          key={i}
          shape={shape}
          spin={(awake ? 7 : chosen ? 2 : 0.7) * (i % 2 === 0 ? 1 : 1.3)}
          phase={i * 1.9}
          className={dice.length > 1 ? 'h-24 w-24' : 'h-36 w-36'}
        />
      ))}
    </span>
    <span className="ui-world__name ui-display ui-title">{title}</span>
  </>
);

/** Every rulebook's card: a new system needs one before the carousel compiles. */
const RULES_CARDS: Record<RulesChoice, { dice: DieShape[]; scene: (awake: boolean) => React.ReactNode }> = {
  dnd2024: { dice: ['d20'], scene: (awake) => <InfernalScene awake={awake} /> },
  coc7: { dice: ['d10', 'd10'], scene: (awake) => <TentacleScene awake={awake} arms={COC_ARMS} /> },
  custom: { dice: ['d6'], scene: (awake) => <InkScene awake={awake} /> },
};

/**
 * Choosing the rules as the worlds are chosen: rulebooks fanned round the one in front, each in the
 * frame of the current setting with its own living ornament — a summoning circle over hellfire for D&D, the arms of
 * something below for Call of Cthulhu, a quill's flourish for one's own rules.
 */
export const RulesCarousel: React.FC<{
  value: RulesChoice | null;
  onChange: (choice: RulesChoice) => void;
  /** Only these can be chosen (a hero for a table with fixed rules). */
  allowed?: RulesChoice[];
  height?: string;
  chooseLabel?: string;
  /** The world chosen before: its own rules come in front first (Lovecraft: Call of Cthulhu). */
  setting?: string;
}> = ({ value, onChange, allowed, height, chooseLabel = 'Играть по этим правилам', setting }) => (
  <ChoiceCarousel
    label="правила"
    height={height}
    chosen={value}
    preferred={
      allowed?.length === 1 ? allowed[0] : setting === 'lovecraft' ? 'coc7' : undefined
    }
    onChoose={onChange}
    chooseLabel={chooseLabel}
    chosenLabel="Эти правила выбраны"
    disabledLabel="Стол играет по другим правилам"
    items={RULES_CHOICES.map((id) => ({
      id,
      disabled: allowed ? !allowed.includes(id) : false,
      render: ({ focused, hovered }) => (
        <RulebookCard
          title={RULES_TITLE[id]}
          dice={RULES_CARDS[id].dice}
          scene={RULES_CARDS[id].scene}
          focused={focused}
          hovered={hovered}
          chosen={value === id}
        />
      ),
    }))}
  />
);

/** Call of Cthulhu's two editions in the same manner: classic horror, or pulp adventure. */
export const EditionCarousel: React.FC<{
  value: EditionChoice | null;
  onChange: (choice: EditionChoice) => void;
}> = ({ value, onChange }) => (
  <ChoiceCarousel
    label="редакция"
    height="min(42vh, 420px)"
    chosen={value}
    onChoose={onChange}
    chooseLabel="Выбрать редакцию"
    chosenLabel="Редакция выбрана"
    items={[
      {
        id: 'classic' as EditionChoice,
        render: ({ focused, hovered }) => (
          <RulebookCard
            title="Классика"
            dice={['d10']}
            scene={(awake) => <TentacleScene awake={awake} arms={CLASSIC_ARMS} />}
            focused={focused}
            hovered={hovered}
            chosen={value === 'classic'}
          />
        ),
      },
      {
        id: 'pulp' as EditionChoice,
        render: ({ focused, hovered }) => (
          <RulebookCard
            title="Pulp Cthulhu"
            dice={['d10', 'd10']}
            scene={(awake) => <PulpScene awake={awake} />}
            focused={focused}
            hovered={hovered}
            chosen={value === 'pulp'}
          />
        ),
      },
    ]}
  />
);
