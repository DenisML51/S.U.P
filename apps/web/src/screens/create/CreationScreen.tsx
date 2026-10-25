import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { pointsRemaining } from '@itd/game-logic';
import { findBackground, findClass, findSubclass } from '@itd/game-logic/dnd';
import { DEFAULT_SETTING, type Setting } from '@itd/schema';
import { Button, Panel, cx } from '../../ui/primitives';
import { IconCheck, IconDice, IconPrev, IconQuill } from '../../ui/icons';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import { Flourish } from '../../ui/Flourish';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { WorldCarousel } from './WorldCarousel';
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
import { useDraftState } from './useDraftState';

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

/**
 * Brings the field an issue names into view on the step's panel and flashes it. Issues carry the
 * field's title, prefixed with its level on the level plan ("1: Навыки").
 */
function revealIssue(issue: string) {
  const title = issue.replace(/^\d+:\s*/, '');
  const panel = document.querySelector('[data-creation-panel]');
  const field = [...(panel?.querySelectorAll('h3, h4, h5, label, .ui-label') ?? [])].find((el) => el.textContent?.trim().startsWith(title));
  const target = field?.closest('section') ?? field;
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.remove('ui-flash');
  void (target as HTMLElement).offsetWidth;
  target.classList.add('ui-flash');
}

const METHOD_NAMES = { pointBuy: 'Покупка очков', roll: 'Бросок 4к6', manual: 'Вручную' } as const;

/**
 * Creating a hero, laid out like a game's character creator: the steps down the left with what was
 * chosen on each, the step's panel in the middle (a grid of emblems, then what the pick gives and
 * asks), the hero as it stands on the right. The world comes first, the screen wearing the look of
 * the world in front of the carousel; once one is chosen the whole screen keeps its look.
 */
export const CreationScreen: React.FC<{
  /** A world set in advance (a hero made for a party): the world step is already taken. */
  world?: Setting;
  onDone: () => void;
  /** Forgets the draft and starts the creation over. */
  onRestart: () => void;
}> = ({ world, onDone, onRestart }) => {
  const [confirmRestart, setConfirmRestart] = React.useState(false);
  const [setting, setSetting] = useDraftState<Setting>('setting', world ?? DEFAULT_SETTING);
  const [worldChosen, setWorldChosen] = useDraftState('worldChosen', world !== undefined);
  const [path, setPath] = useDraftState<Path | null>('path', null);
  const [index, setIndex] = useDraftState('step', world ? 1 : 0);
  const dnd = useDndCreation(setting, onDone);
  const custom = useCreation(setting, onDone);
  /** The world in front of the world carousel: on the world step the screen wears its look. */
  const [inFront, setInFront] = React.useState<Setting | null>(null);
  const previewing = index === 0 && inFront !== null;
  const shown = previewing ? inFront : setting;
  useDocumentSetting(shown);
  /** The flourish of the world just chosen, while it plays. */
  const [flourish, setFlourish] = React.useState<{ setting: Setting; x: number; y: number; key: number } | null>(null);
  const endFlourish = React.useCallback(() => setFlourish(null), []);

  const common: Step[] = [
    {
      id: 'world',
      label: 'Мир',
      value: worldChosen ? SETTING_INFO[setting].label : undefined,
      question: 'Куда отправимся?',
      issues: worldChosen ? [] : ['Мир'],
      stage: true,
      content: (
        <WorldCarousel
          chosen={worldChosen ? setting : null}
          onFocus={setInFront}
          onChoose={(id, origin) => {
            if (!(worldChosen && setting === id)) setFlourish({ setting: id, ...origin, key: Date.now() });
            setSetting(id);
            setWorldChosen(true);
          }}
        />
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
        <div className="mx-auto grid h-[22rem] w-full max-w-4xl grid-cols-2 gap-5">
          <BigChoice selected={path === 'dnd'} onSelect={() => { setPath('dnd'); setIndex(2); }} className="flex flex-col justify-center px-8">
            <IconDice width={52} height={52} className="mb-5 text-frame-bright" />
            <span className="ui-display ui-title block text-[1.8rem] leading-tight text-frame-bright">По правилам D&D 2024</span>
            <span className="mt-3 block text-ink-muted">
              Виды, предыстории и классы Книги игрока. Умения, ячейки и выборы приходят сами с каждым уровнем.
            </span>
            <span className="mt-4 block text-sm text-ink-faint">12 классов, 48 подклассов и все заклинания Книги игрока</span>
          </BigChoice>
          <BigChoice selected={path === 'custom'} onSelect={() => { setPath('custom'); setIndex(2); }} className="flex flex-col justify-center px-8">
            <IconQuill width={52} height={52} className="mb-5 text-frame-bright" />
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
        className={cx('min-h-0', step.stage ? 'w-full' : 'h-full')}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {step.content}
      </motion.div>
    </AnimatePresence>
  );

  const backToHeroes = (
    <Button
      variant="ghost"
      size="sm"
      icon={<IconPrev width={16} height={16} />}
      className="self-start"
      // Leaving keeps the draft: the hero is picked up where it was from the heroes or the home page.
      onClick={onDone}
    >
      Герои
    </Button>
  );

  /** Throwing the draft away is asked once more: it is the only thing here that cannot be undone. */
  const restart = path !== null && (
    <div className="mb-2 mt-1 flex items-center gap-2 px-2 text-xs">
      {confirmRestart ? (
        <>
          <span className="text-ink-muted">Сбросить все выборы?</span>
          <button type="button" className="text-danger underline-offset-4 hover:underline" onClick={onRestart}>
            Да
          </button>
          <button type="button" className="text-ink-faint underline-offset-4 hover:underline" onClick={() => setConfirmRestart(false)}>
            Нет
          </button>
        </>
      ) : (
        <button type="button" className="text-ink-faint underline-offset-4 hover:text-ink hover:underline" onClick={() => setConfirmRestart(true)}>
          Начать заново
        </button>
      )}
    </div>
  );

  return (
    <SettingScope
      setting={shown}
      className={cx('ui-morph relative flex h-screen overflow-clip bg-bg', !worldChosen && !previewing && 'ui-service')}
      data-flourish={flourish?.setting}
    >
      {flourish && <Flourish key={flourish.key} setting={flourish.setting} x={flourish.x} y={flourish.y} onEnd={endFlourish} />}
      {/* The atmosphere of the world in front, behind the world step only. */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-700" style={{ opacity: index === 0 ? 1 : 0 }}>
        <SettingBackdrop setting={shown} strength={0.6} />
      </div>
      {/* The steps appear once the world is behind: choosing a world is a stage of its own. */}
      <AnimatePresence initial={false}>
        {index > 0 && (
          <motion.aside
            key="steps"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex shrink-0 flex-col overflow-hidden border-r border-line/50"
          >
            <div className="flex min-h-0 w-60 flex-1 flex-col px-4 py-6">
              {backToHeroes}
              <h1 className={cx('ui-display ui-title mt-6 px-2 text-xl text-frame-bright', !restart && 'mb-4')}>Новый герой</h1>
              {restart}
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
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {step.stage ? (
          // A stage step (the world, the path): its question on top, its choices centred in the room left.
          <main className="relative flex min-h-0 flex-1 flex-col px-10 pt-14">
            {index === 0 && <div className="absolute left-24 top-14">{backToHeroes}</div>}
            <h2 className="ui-display ui-title text-center text-[1.9rem] leading-tight text-ink">{step.question}</h2>
            <div className="flex min-h-0 flex-1 items-center">{content}</div>
          </main>
        ) : (
          <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] gap-6 px-6 pt-6">
            <Panel ornate className="flex min-h-0 flex-col">
              <h2 className="ui-display ui-title border-b border-line/60 px-6 py-4 text-center text-[1.5rem] leading-tight text-frame-bright">
                {step.question}
              </h2>
              <div className="ui-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5" data-creation-panel>
                {content}
              </div>
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
          {/* What is left on this step: each one a link to its field on the panel. */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-ink-faint">
            {step.issues.length > 0 && (
              <>
                Осталось выбрать:
                {step.issues.map((issue) => (
                  <button key={issue} type="button" className="ui-issue-link" onClick={() => revealIssue(issue)}>
                    {issue}
                  </button>
                ))}
              </>
            )}
          </span>
        </footer>
      </div>
    </SettingScope>
  );
};
