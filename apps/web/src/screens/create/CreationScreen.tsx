import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { findBackground, findClass, findSubclass, pointsRemaining } from '@itd/game-logic';
import { SETTINGS, DEFAULT_SETTING, type Setting } from '@itd/schema';
import { SettingEmblem } from '../../ui/ornaments';
import { Button, Panel, cx } from '../../ui/primitives';
import { IconCheck, IconPrev } from '../../ui/icons';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import { HeroSummary } from './HeroSummary';
import { TrainingChoice } from './parts';
import { OriginStep, PointBuyStep } from './custom/steps';
import {
  AbilitiesStep,
  BackgroundStep,
  ClassStep,
  EquipmentStep,
  IdentityStep,
  ProgressionStep,
  SpeciesStep,
} from './dnd/steps';
import { useDndCreation } from './dnd/useDndCreation';
import { useCreation } from './useCreation';
import { clearDraft, useDraftState } from './useDraftState';

type Path = 'dnd' | 'custom';

interface Step {
  id: string;
  label: string;
  /** What was chosen on the step, shown under its name in the step list. */
  value?: string;
  question: string;
  content: React.ReactNode;
  /** What is still missing before the next step. */
  issues: string[];
  /** The step fills the whole stage (the world and path cards) instead of the panel beside the summary. */
  stage?: boolean;
}

/** A big card to choose with; inside a setting scope it takes that setting's hover effect. */
const BigChoice: React.FC<{ selected: boolean; onSelect: () => void; children: React.ReactNode; className?: string }> = ({
  selected,
  onSelect,
  children,
  className,
}) => (
  <Panel as="button" interactive active={selected} onClick={onSelect} aria-pressed={selected} className={cx('text-left', className)}>
    <span className="relative block">{children}</span>
  </Panel>
);

const METHOD_NAMES = { pointBuy: 'Покупка очков', roll: 'Бросок 4к6', manual: 'Вручную' } as const;

/**
 * Creating a hero, laid out like a game's character creator: the steps down the left with what was
 * chosen on each, the step's panel in the middle (a grid of emblems, then what the pick gives and
 * asks), the hero as it stands on the right. The world comes first, still in the service's own
 * type; once it is chosen the whole screen takes that setting's look.
 */
export const CreationScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [setting, setSetting] = useDraftState<Setting>('setting', DEFAULT_SETTING);
  const [worldChosen, setWorldChosen] = useDraftState('worldChosen', false);
  const [path, setPath] = useDraftState<Path | null>('path', null);
  const [index, setIndex] = useDraftState('step', 0);
  const dnd = useDndCreation(setting, onDone);
  const custom = useCreation(setting, onDone);
  useDocumentSetting(setting);

  const common: Step[] = [
    {
      id: 'world',
      label: 'Мир',
      value: worldChosen ? SETTING_INFO[setting].label : undefined,
      question: 'В каком мире начнётся история?',
      issues: worldChosen ? [] : ['Мир'],
      stage: true,
      content: (
        <div className="mx-auto grid h-[26rem] max-w-6xl grid-cols-4 gap-5 [margin-top:max(0px,calc(50vh-22rem))]">
          {SETTINGS.map((id) => (
            <SettingScope key={id} setting={id} className="h-full">
              <BigChoice
                selected={worldChosen && setting === id}
                onSelect={() => {
                  setSetting(id);
                  setWorldChosen(true);
                  setIndex(1);
                }}
                className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
              >
                <SettingEmblem size={64} className="mx-auto text-frame-bright" />
                <span className="ui-display ui-title mt-6 block text-2xl leading-tight text-ink">{SETTING_INFO[id].label}</span>
                <span className="mt-3 block text-sm text-ink-muted">{SETTING_INFO[id].hint}</span>
              </BigChoice>
            </SettingScope>
          ))}
        </div>
      ),
    },
    {
      id: 'path',
      label: 'Путь',
      value: path === 'dnd' ? 'D&D 2024' : path === 'custom' ? 'Свой герой' : undefined,
      question: 'Как создадим героя?',
      issues: path ? [] : ['Путь'],
      stage: true,
      content: (
        <div className="mx-auto grid h-[22rem] max-w-4xl grid-cols-2 gap-5 [margin-top:max(0px,calc(50vh-20rem))]">
          <BigChoice selected={path === 'dnd'} onSelect={() => { setPath('dnd'); setIndex(2); }} className="flex flex-col justify-center px-8">
            <span className="ui-display ui-title block text-[1.8rem] leading-tight text-frame-bright">По правилам D&D 2024</span>
            <span className="mt-3 block text-ink-muted">
              Виды, предыстории и классы Книги игрока. Умения, ячейки и выборы приходят сами с каждым уровнем.
            </span>
            <span className="mt-4 block text-sm text-ink-faint">Сейчас: паладин и воин со всеми подклассами</span>
          </BigChoice>
          <BigChoice selected={path === 'custom'} onSelect={() => { setPath('custom'); setIndex(2); }} className="flex flex-col justify-center px-8">
            <span className="ui-display ui-title block text-[1.8rem] leading-tight text-frame-bright">Свой герой</span>
            <span className="mt-3 block text-ink-muted">
              Раса, класс и всё остальное — своими словами. Лист заполняете сами, по правилам вашего стола.
            </span>
          </BigChoice>
        </div>
      ),
    },
  ];

  const { build, preview } = dnd;
  const classDef = findClass(build.class);
  const subclass = findSubclass(classDef, build.subclass);
  const dndSteps: Step[] = [
    { id: 'species', label: 'Вид', value: build.species ? preview.subrace || preview.race : undefined, question: 'Кто ваш герой по крови?', issues: dnd.issues.species, content: <SpeciesStep creation={dnd} /> },
    { id: 'background', label: 'Предыстория', value: findBackground(build.background)?.name, question: 'Кем он был до приключений?', issues: dnd.issues.background, content: <BackgroundStep creation={dnd} /> },
    { id: 'class', label: 'Класс', value: [classDef?.name, subclass?.name].filter(Boolean).join(' · ') || undefined, question: 'Чему он посвятил жизнь?', issues: dnd.issues.class, content: <ClassStep creation={dnd} /> },
    {
      id: 'abilities',
      label: 'Характеристики',
      value: build.abilityMethod === 'pointBuy' ? `${METHOD_NAMES.pointBuy} · ${27 - pointsRemaining(build.baseAttributes)}/27` : METHOD_NAMES[build.abilityMethod],
      question: 'В чём его сила?',
      issues: dnd.issues.abilities,
      content: <AbilitiesStep creation={dnd} />,
    },
    { id: 'progression', label: 'Развитие', value: classDef ? `Уровень ${build.level}` : undefined, question: 'Чему он научился на своём пути?', issues: dnd.issues.progression, content: <ProgressionStep creation={dnd} /> },
    {
      id: 'equipment',
      label: 'Снаряжение',
      value: dnd.classKitId && dnd.backgroundKitId ? 'Выбрано' : undefined,
      question: 'С чем он выходит в дорогу?',
      issues: dnd.issues.equipment,
      content: <EquipmentStep creation={dnd} />,
    },
    { id: 'identity', label: 'Имя', value: dnd.name || undefined, question: 'Как его зовут?', issues: dnd.issues.identity, content: <IdentityStep creation={dnd} /> },
  ];

  const customSteps: Step[] = [
    {
      id: 'origin',
      label: 'Происхождение',
      value: [custom.race, custom.characterClass].filter(Boolean).join(' · ') || undefined,
      question: 'Кто ваш герой?',
      issues: custom.valid.origin ? [] : ['Раса и класс'],
      content: <OriginStep creation={custom} />,
    },
    { id: 'attributes', label: 'Характеристики', value: `${27 - custom.points}/27`, question: 'В чём его сила?', issues: custom.valid.attributes ? [] : ['Очки характеристик'], content: <PointBuyStep creation={custom} /> },
    { id: 'training', label: 'Навыки', question: 'Чему он обучен?', issues: [], content: <TrainingChoice creation={custom} columns={3} /> },
    { id: 'identity', label: 'Имя', value: custom.name || undefined, question: 'Как его зовут?', issues: custom.valid.identity ? [] : ['Имя'], content: <IdentityStep creation={custom} /> },
  ];

  const steps = [...common, ...(path === 'custom' ? customSteps : dndSteps)];
  const step = steps[Math.min(index, steps.length - 1)]!;
  const last = index === steps.length - 1;
  /** A step can be opened once every step before it is done. */
  const reachable = (i: number) => steps.slice(0, i).every((s) => s.issues.length === 0);
  const summary = path === 'custom' ? custom.preview() : dnd.preview;
  const images = path === 'custom' ? custom.images : dnd.images;
  const creating = path === 'custom' ? custom.creating : dnd.creating;
  const create = () => void (path === 'custom' ? custom.create() : dnd.create());

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step.id}
        className="h-full min-h-0"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {step.content}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <SettingScope setting={setting} className={cx('ui-morph flex h-screen overflow-hidden bg-bg', !worldChosen && 'ui-service')}>
      <aside className="flex w-60 shrink-0 flex-col border-r border-line/50 px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          icon={<IconPrev width={16} height={16} />}
          className="self-start"
          onClick={() => {
            clearDraft();
            onDone();
          }}
        >
          Герои
        </Button>
        <h1 className="ui-display ui-title mb-4 mt-6 px-2 text-xl text-frame-bright">Новый герой</h1>
        <nav className="ui-scroll flex min-h-0 flex-col gap-0.5 overflow-y-auto" aria-label="Шаги">
          {steps.map((s, i) => {
            const done = i !== index && s.issues.length === 0 && reachable(i);
            return (
              <button
                key={s.id}
                type="button"
                className="ui-steps__item"
                aria-current={i === index ? 'step' : undefined}
                data-done={done || undefined}
                disabled={!reachable(i)}
                onClick={() => setIndex(i)}
              >
                <span className="ui-steps__mark">
                  <span>{done ? <IconCheck width={12} height={12} /> : i + 1}</span>
                </span>
                <span className="ui-steps__label">{s.label}</span>
                <span className="ui-steps__value">{s.value ?? (i === index ? 'выбор…' : '—')}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {step.stage ? (
          <main className="min-h-0 flex-1 px-10 pt-8">
            <h2 className="ui-display ui-title text-center text-[1.9rem] leading-tight text-ink">{step.question}</h2>
            {content}
          </main>
        ) : (
          <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] gap-6 px-6 pt-6">
            <Panel ornate className="flex min-h-0 flex-col">
              <h2 className="ui-display ui-title border-b border-line/60 px-6 py-4 text-center text-[1.5rem] leading-tight text-frame-bright">
                {step.question}
              </h2>
              <div className="ui-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">{content}</div>
            </Panel>
            <HeroSummary sheet={summary} setting={setting} images={images} classIcon={path === 'dnd' ? build.class : undefined} />
          </main>
        )}

        <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-4">
          <span />
          <div className="flex gap-4">
            <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              Назад
            </Button>
            {last ? (
              <Button variant="primary" disabled={!steps.every((s) => s.issues.length === 0) || creating} onClick={create}>
                Начать путь
              </Button>
            ) : (
              <Button variant="primary" disabled={step.issues.length > 0} onClick={() => setIndex(index + 1)}>
                Дальше
              </Button>
            )}
          </div>
          <span className="truncate text-sm text-ink-faint">{step.issues.length > 0 && `Осталось выбрать: ${step.issues.join(', ')}`}</span>
        </footer>
      </div>
    </SettingScope>
  );
};
