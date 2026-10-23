import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ATTRIBUTES_LIST, CLASSES, RACES, abilityModifier, formatModifier } from '@itd/game-logic';
import { SETTINGS } from '@itd/schema';
import { SettingEmblem } from '../../ui/art/emblems';
import { ImageSlot } from '../../ui/ImageSlot';
import { Button, IconButton, Panel, cx } from '../../ui/primitives';
import { IconMinus, IconPlus } from '../../ui/icons';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import { HeroPreview, TrainingChoice } from './parts';
import type { Creation } from './useCreation';

type Step = 'world' | 'race' | 'class' | 'attributes' | 'training' | 'identity';
const STEPS: { id: Step; question: string }[] = [
  { id: 'world', question: 'В каком мире начнётся история?' },
  { id: 'race', question: 'Откуда родом ваш герой?' },
  { id: 'class', question: 'Чему он посвятил жизнь?' },
  { id: 'attributes', question: 'В чём его сила?' },
  { id: 'training', question: 'Чему он обучен?' },
  { id: 'identity', question: 'Как его зовут?' },
];

/** A large card to choose with; inside a setting scope it takes that setting's hover effect. */
const BigChoice: React.FC<{
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ selected, onSelect, children, className }) => (
  <Panel
    as="button"
    interactive
    active={selected}
    onClick={onSelect}
    aria-pressed={selected}
    className={cx('text-left', className)}
  >
    <span className="relative block">{children}</span>
  </Panel>
);

/**
 * A card for what the lists do not have: the player names their own race or class (and its
 * subrace or path). Chosen as soon as something is typed in it.
 */
const CustomChoice: React.FC<{
  /** The stored value; a known id means a listed card is chosen instead. */
  value: string;
  known: { id: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  sub: string;
  subPlaceholder: string;
  onSubChange: (value: string) => void;
  className?: string;
}> = ({ value, known, placeholder, onChange, sub, subPlaceholder, onSubChange, className }) => {
  const custom = value !== '' && !known.some((k) => k.id === value);
  const field =
    'w-full border-b border-frame/40 bg-transparent pb-1 text-ink outline-none placeholder:text-ink-faint focus:border-frame-bright';
  return (
    <Panel interactive active={custom} className={cx('cursor-text', className)}>
      <span className="relative block">
        <span className="ui-display block text-xl text-ink">Свой вариант</span>
        <input
          value={custom ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cx(field, 'mt-2 text-base')}
        />
        {custom && (
          <input
            value={sub}
            onChange={(e) => onSubChange(e.target.value)}
            placeholder={subPlaceholder}
            aria-label={subPlaceholder}
            className={cx(field, 'mt-3 text-sm')}
          />
        )}
      </span>
    </Panel>
  );
};

/**
 * Hero creation as a journey: a question per screen with big cards, like a game's character
 * creator. The world is chosen first and the whole screen turns into it at once.
 */
export const JourneyCreation: React.FC<{ creation: Creation }> = ({ creation }) => {
  const [step, setStep] = useState<Step>('world');
  const index = STEPS.findIndex((s) => s.id === step);
  const canGoOn: Record<Step, boolean> = {
    world: true,
    race: creation.race.trim() !== '',
    class: creation.characterClass.trim() !== '',
    attributes: creation.valid.attributes,
    training: true,
    identity: creation.valid.identity,
  };
  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]!.id);

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait" initial={false}>
        <motion.h2
          key={step}
          className="ui-display ui-title text-center text-[2rem] leading-tight text-ink"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {STEPS[index]!.question}
        </motion.h2>
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          className="ui-scroll mt-8 min-h-0 flex-1 overflow-y-auto px-1"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.25 }}
        >
          {step === 'world' && (
            <div className="mx-auto grid h-full max-h-[26rem] max-w-6xl grid-cols-4 gap-5">
              {SETTINGS.map((setting) => (
                <SettingScope key={setting} setting={setting} className="h-full">
                  <BigChoice
                    selected={creation.setting === setting}
                    onSelect={() => {
                      creation.setSetting(setting);
                      next();
                    }}
                    className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
                  >
                    <SettingEmblem size={64} className="mx-auto text-frame-bright" />
                    <span className="ui-display ui-title mt-6 block text-2xl leading-tight text-ink">
                      {SETTING_INFO[setting].label}
                    </span>
                    <span className="mt-3 block text-sm text-ink-muted">{SETTING_INFO[setting].hint}</span>
                  </BigChoice>
                </SettingScope>
              ))}
            </div>
          )}

          {step === 'race' && (
            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-3 gap-4">
                {RACES.map((race) => (
                  <BigChoice
                    key={race.id}
                    selected={creation.race === race.id}
                    onSelect={() => creation.setRace(race.id)}
                    className="px-6 py-5"
                  >
                    <span className="ui-display block text-2xl text-ink">{race.name}</span>
                    <span className="mt-2 block text-sm text-ink-muted">{race.description}</span>
                  </BigChoice>
                ))}
                <CustomChoice
                  value={creation.race}
                  known={RACES}
                  placeholder="Например, азари"
                  onChange={creation.setRace}
                  sub={creation.subrace}
                  subPlaceholder="Подраса, если есть"
                  onSubChange={creation.setSubrace}
                  className="px-6 py-5"
                />
              </div>
              {creation.raceInfo?.subraces && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {creation.raceInfo.subraces.map((subrace) => (
                    <BigChoice
                      key={subrace.id}
                      selected={creation.subrace === subrace.id}
                      onSelect={() => creation.setSubrace(subrace.id)}
                      className="px-5 py-4"
                    >
                      <span className="ui-display block text-xl text-ink">{subrace.name}</span>
                      <span className="mt-2 block text-sm text-ink-muted">{subrace.appearance}</span>
                    </BigChoice>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'class' && (
            <div className="mx-auto max-w-6xl">
              <div className="grid grid-cols-4 gap-3">
                {CLASSES.map((characterClass) => (
                  <BigChoice
                    key={characterClass.id}
                    selected={creation.characterClass === characterClass.id}
                    onSelect={() => creation.setCharacterClass(characterClass.id)}
                    className="px-5 py-4"
                  >
                    <span className="ui-display block text-xl text-ink">{characterClass.name}</span>
                    <span className="mt-1 block text-sm text-ink-muted">{characterClass.description}</span>
                  </BigChoice>
                ))}
                <CustomChoice
                  value={creation.characterClass}
                  known={CLASSES}
                  placeholder="Например, биотик"
                  onChange={creation.setCharacterClass}
                  sub={creation.subclass}
                  subPlaceholder="Путь, если есть"
                  onSubChange={creation.setSubclass}
                  className="px-5 py-4"
                />
              </div>
              {creation.classInfo && (
                <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                  <span className="text-sm text-ink-faint">Путь:</span>
                  {creation.classInfo.subclasses.map((subclass) => (
                    <button
                      key={subclass.id}
                      type="button"
                      onClick={() => creation.setSubclass(subclass.id)}
                      className={cx(
                        'border-b text-sm transition-colors',
                        creation.subclass === subclass.id
                          ? 'border-frame-bright text-ink'
                          : 'border-transparent text-ink-muted hover:text-ink',
                      )}
                    >
                      {subclass.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'attributes' && (
            <div className="mx-auto max-w-5xl">
              <p
                className={cx(
                  'mb-6 text-center text-lg tabular-nums',
                  creation.points === 0 ? 'text-success' : 'text-ink-muted',
                )}
              >
                {creation.points === 0 ? 'Все очки распределены' : `Осталось очков: ${creation.points}`}
              </p>
              <div className="grid grid-cols-6 gap-3">
                {ATTRIBUTES_LIST.map((attribute) => {
                  const score = creation.attributes[attribute.id] ?? 8;
                  return (
                    <Panel key={attribute.id} className="flex flex-col items-center px-3 py-5 text-center">
                      <span className="text-sm text-ink-muted">{attribute.name}</span>
                      <span className="ui-display ui-numeric my-3 text-5xl leading-none text-ink">
                        {score}
                      </span>
                      <span className="text-frame-bright">{formatModifier(abilityModifier(score))}</span>
                      <span className="mt-4 flex gap-2">
                        <IconButton
                          label="Уменьшить"
                          size={34}
                          onClick={() => creation.lower(attribute.id)}
                          disabled={!creation.canLower(attribute.id)}
                        >
                          <IconMinus width={16} height={16} />
                        </IconButton>
                        <IconButton
                          label="Увеличить"
                          size={34}
                          onClick={() => creation.raise(attribute.id)}
                          disabled={!creation.canRaise(attribute.id)}
                        >
                          <IconPlus width={16} height={16} />
                        </IconButton>
                      </span>
                      <span className="mt-3 text-xs text-ink-faint">{attribute.description}</span>
                    </Panel>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'training' && (
            <div className="mx-auto max-w-4xl">
              <TrainingChoice creation={creation} columns={3} />
            </div>
          )}

          {step === 'identity' && (
            <div className="mx-auto grid max-w-5xl grid-cols-[1fr_20rem] gap-10">
              <div className="flex flex-col justify-center gap-8">
                <input
                  value={creation.name}
                  onChange={(e) => creation.setName(e.target.value)}
                  placeholder="Имя героя"
                  aria-label="Имя героя"
                  autoFocus
                  className="ui-display border-b border-frame/50 bg-transparent pb-2 text-center text-4xl text-ink outline-none placeholder:text-ink-faint focus:border-frame-bright"
                />
                {/* Slots in the shape of each picture: the art stands 2:3, the portrait is square. */}
                <div className="flex items-start justify-center gap-6">
                  <ImageSlot
                    label="Полный арт"
                    kind="full"
                    hint="Во весь рост"
                    asset={creation.images.full}
                    onUploaded={(full) => creation.setImages({ ...creation.images, full })}
                    className="h-[16.6rem] w-40"
                  />
                  <ImageSlot
                    label="Портрет"
                    kind="portrait"
                    hint="Лицо"
                    asset={creation.images.portrait}
                    onUploaded={(portrait) => creation.setImages({ ...creation.images, portrait })}
                    className="h-[9.6rem] w-32"
                  />
                </div>
              </div>
              <HeroPreview creation={creation} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <footer className="mt-6 flex items-center justify-center gap-6">
        <Button variant="ghost" disabled={index === 0} onClick={() => setStep(STEPS[index - 1]!.id)}>
          Назад
        </Button>
        <div className="flex gap-2" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={cx('h-1.5 w-6 transition-colors', i <= index ? 'bg-frame-bright' : 'bg-line')}
            />
          ))}
        </div>
        {step === 'identity' ? (
          <Button
            variant="primary"
            size="lg"
            disabled={
              !creation.valid.origin ||
              !creation.valid.attributes ||
              !creation.valid.identity ||
              creation.creating
            }
            onClick={() => void creation.create()}
          >
            Начать путь
          </Button>
        ) : (
          <Button variant="primary" disabled={!canGoOn[step]} onClick={next}>
            Дальше
          </Button>
        )}
      </footer>
    </div>
  );
};
