import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CLASSES, RACES } from '@itd/game-logic';
import { ImageSlot } from '../../ui/ImageSlot';
import { Button, Field, Input, SectionTitle, cx } from '../../ui/primitives';
import { ChoiceList, HeroPreview, PointBuy, TrainingChoice, WorldChoice } from './parts';
import type { Creation } from './useCreation';

type Step = 'world' | 'origin' | 'attributes' | 'training' | 'identity';

const STEPS: { id: Step; title: string; hint: string }[] = [
  { id: 'world', title: 'Мир', hint: 'Во что вы играете' },
  { id: 'origin', title: 'Происхождение', hint: 'Раса и класс' },
  { id: 'attributes', title: 'Характеристики', hint: '27 очков' },
  { id: 'training', title: 'Навыки', hint: 'Чему обучен' },
  { id: 'identity', title: 'Облик', hint: 'Имя и изображения' },
];

/**
 * Prototype A, "Летопись": one question at a time. Steps are listed on the left and can be
 * revisited; the hero card on the right fills in as the choices are made.
 */
export const ChronicleCreation: React.FC<{ creation: Creation }> = ({ creation }) => {
  const [step, setStep] = useState<Step>('world');
  const index = STEPS.findIndex((s) => s.id === step);
  const done: Record<Step, boolean> = {
    world: true,
    origin: creation.valid.origin,
    attributes: creation.valid.attributes,
    training: true,
    identity: creation.valid.identity,
  };
  const ready = creation.valid.origin && creation.valid.attributes && creation.valid.identity;

  return (
    <div className="grid h-full grid-cols-[15rem_minmax(0,1fr)_21rem] gap-8">
      <nav aria-label="Шаги создания" className="flex flex-col gap-1 pt-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            aria-current={s.id === step}
            className={cx(
              'ui-step',
              s.id === step && 'ui-step--current',
              done[s.id] && i < index && 'ui-step--done',
            )}
          >
            <span className="ui-step__mark">{i + 1}</span>
            <span>
              <span className="block text-ink">{s.title}</span>
              <span className="block text-xs text-ink-faint">{s.hint}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            className="ui-scroll min-h-0 flex-1 overflow-y-auto pr-2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <SectionTitle className="mb-5">{STEPS[index]!.title}</SectionTitle>
            {step === 'world' && (
              <>
                <p className="mb-4 max-w-xl text-ink-muted">
                  Мир задаёт облик листа: шрифты, цвета, узоры. Его можно сменить позже в профиле героя.
                </p>
                <WorldChoice creation={creation} className="max-w-2xl" />
              </>
            )}
            {step === 'origin' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="ui-label">Раса</h3>
                  <ChoiceList
                    label="Раса"
                    options={RACES}
                    value={creation.race}
                    onChange={creation.setRace}
                  />
                  {creation.raceInfo?.subraces && (
                    <>
                      <h3 className="ui-label mt-4">Подраса</h3>
                      <ChoiceList
                        label="Подраса"
                        options={creation.raceInfo.subraces.map((s) => ({
                          id: s.id,
                          name: s.name,
                          description: s.appearance,
                        }))}
                        value={creation.subrace}
                        onChange={creation.setSubrace}
                      />
                    </>
                  )}
                </div>
                <div>
                  <h3 className="ui-label">Класс</h3>
                  <ChoiceList
                    label="Класс"
                    options={CLASSES}
                    value={creation.characterClass}
                    onChange={creation.setCharacterClass}
                  />
                  {creation.classInfo && (
                    <>
                      <h3 className="ui-label mt-4">Подкласс</h3>
                      <ChoiceList
                        label="Подкласс"
                        options={creation.classInfo.subclasses}
                        value={creation.subclass}
                        onChange={creation.setSubclass}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
            {step === 'attributes' && (
              <div className="max-w-xl">
                <PointBuy creation={creation} />
              </div>
            )}
            {step === 'training' && <TrainingChoice creation={creation} columns={3} />}
            {step === 'identity' && (
              <div className="grid max-w-3xl grid-cols-[1fr_14rem] gap-8">
                <div className="space-y-4">
                  <Field label="Имя">
                    {(props) => (
                      <Input
                        {...props}
                        value={creation.name}
                        onChange={(e) => creation.setName(e.target.value)}
                        placeholder="Как зовут героя"
                      />
                    )}
                  </Field>
                  <p className="text-sm text-ink-muted">
                    Внешность, предысторию и черты можно дописать в листе, во вкладке «Личность».
                  </p>
                </div>
                <div className="grid grid-rows-[1fr_auto] gap-3">
                  <ImageSlot
                    label="Полный арт"
                    hint="Вертикальная, во весь рост"
                    asset={creation.images.full}
                    onUploaded={(full) => creation.setImages({ ...creation.images, full })}
                    className="min-h-[14rem]"
                  />
                  <ImageSlot
                    label="Портрет"
                    hint="Лицо крупно"
                    asset={creation.images.portrait}
                    onUploaded={(portrait) => creation.setImages({ ...creation.images, portrait })}
                    className="h-28 w-28"
                  />
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        <footer className="flex items-center gap-3 border-t border-line/60 pt-4">
          <Button variant="ghost" disabled={index === 0} onClick={() => setStep(STEPS[index - 1]!.id)}>
            Назад
          </Button>
          <span className="ml-auto text-sm text-ink-faint">
            {!creation.valid.origin
              ? 'Выберите расу и класс'
              : !creation.valid.attributes
                ? 'Распределите все очки'
                : !creation.valid.identity
                  ? 'Дайте герою имя'
                  : 'Всё готово'}
          </span>
          {index < STEPS.length - 1 ? (
            <Button variant="primary" onClick={() => setStep(STEPS[index + 1]!.id)}>
              Дальше
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!ready || creation.creating}
              onClick={() => void creation.create()}
            >
              Создать героя
            </Button>
          )}
        </footer>
      </div>

      <HeroPreview creation={creation} tall className="h-full" />
    </div>
  );
};
