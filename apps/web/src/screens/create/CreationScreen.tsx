import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { pointsRemaining } from '@itd/game-logic';
import { TALENTS } from '@itd/game-logic/coc';
import { findBackground, findClass } from '@itd/game-logic/dnd';
import { DEFAULT_SETTING, type Setting } from '@itd/schema';
import { Button, IconButton, Panel, cx } from '../../ui/primitives';
import { IconCharacter, IconCheck, IconClose, IconPrev } from '../../ui/icons';
import { Drawer } from '../../ui/Drawer';
import { useAtLeast } from '../../ui/useBreakpoint';
import { RulesCarousel } from '../../ui/RulesetCards';
import type { RulesChoice } from '../../systems';
import { SettingScope, useDocumentSetting } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';
import { Flourish } from '../../ui/Flourish';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { WorldCarousel } from './WorldCarousel';
import { HeroSummary } from './HeroSummary';
import { OriginStep, ScoresStep } from './custom/steps';
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
import {
  AgeStep,
  ArchetypeStep,
  CharacteristicsStep,
  CocSummary,
  GearStep,
  IdentityStep as CocIdentityStep,
  OccupationStep,
  RulesStep,
  SkillsStep,
  StoryStep,
  TalentsStep,
} from './coc/steps';
import { useCocCreation } from './coc/useCocCreation';
import { useCreation } from './useCreation';
import { useDraftState } from './useDraftState';
import { t } from '../../i18n';

type Path = 'dnd' | 'coc' | 'custom';

const PATH_OF: Record<RulesChoice, Path> = { dnd2024: 'dnd', coc7: 'coc', custom: 'custom' };
const RULES_OF: Record<Path, RulesChoice> = { dnd: 'dnd2024', coc: 'coc7', custom: 'custom' };
/** A step's page turning: in from the side the player is going, out the other way, with a slight swing. */
const PAGE_TURN = {
  enter: (dir: number) => ({ opacity: 0, x: 56 * dir, rotateY: -7 * dir }),
  shown: { opacity: 1, x: 0, rotateY: 0 },
  leave: (dir: number) => ({ opacity: 0, x: -40 * dir, rotateY: 6 * dir }),
};

const PATH_NAMES: Record<Path, string> = { dnd: 'D&D 2024', coc: 'Зов Ктулху', custom: 'Свои правила' };

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

/**
 * Brings the field an issue names into view on the step's panel and flashes it. Issues carry the
 * field's title, prefixed with its level on the level plan ("1: Навыки").
 */
function revealIssue(issue: string) {
  const title = issue.replace(/^\d+:\s*/, '');
  const panel = document.querySelector('[data-creation-panel]');
  const field = [...(panel?.querySelectorAll('h3, h4, h5, label, .ui-label') ?? [])].find((el) =>
    el.textContent?.trim().startsWith(t(title)),
  );
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
  /** The table's rules (a hero made for a party): only that path is offered. */
  rules?: RulesChoice;
  onDone: () => void;
  /** Forgets the draft and starts the creation over. */
  onRestart: () => void;
}> = ({ world, rules, onDone, onRestart }) => {
  const [confirmRestart, setConfirmRestart] = React.useState(false);
  // Below the desktop width the steps and the hero's summary leave the sides for drawers.
  const desktop = useAtLeast('desktop');
  const [stepsOpen, setStepsOpen] = React.useState(false);
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [setting, setSetting] = useDraftState<Setting>('setting', world ?? DEFAULT_SETTING);
  const [worldChosen, setWorldChosen] = useDraftState('worldChosen', world !== undefined);
  const [path, setPath] = useDraftState<Path | null>('path', rules ? PATH_OF[rules] : null);
  const [index, setIndex] = useDraftState('step', world ? 1 : 0);
  /** Which way the last step went: the next page comes in from that side, the old one leaves the other way. */
  const lastIndex = React.useRef(index);
  const direction = index >= lastIndex.current ? 1 : -1;
  React.useEffect(() => {
    lastIndex.current = index;
  }, [index]);
  const dnd = useDndCreation(setting, onDone);
  const custom = useCreation(setting, onDone);
  const coc = useCocCreation(setting, onDone);
  /** The world in front of the world carousel: on the world step the screen wears its look. */
  const [inFront, setInFront] = React.useState<Setting | null>(null);
  const previewing = index === 0 && inFront !== null;
  const shown = previewing ? inFront : setting;
  useDocumentSetting(shown);
  /** The flourish of the world just chosen, while it plays. */
  const [flourish, setFlourish] = React.useState<{
    setting: Setting;
    x: number;
    y: number;
    key: number;
  } | null>(null);
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
      value: path ? PATH_NAMES[path] : undefined,
      question: 'По каким правилам играем?',
      issues: path ? [] : ['Правила'],
      stage: true,
      content: (
        <RulesCarousel
          value={path ? RULES_OF[path] : null}
          allowed={rules ? [rules] : undefined}
          setting={setting}
          onChange={(choice) => {
            setPath(PATH_OF[choice]);
            setIndex(2);
          }}
        />
      ),
    },
  ];

  const { build, preview } = dnd;
  const classDef = findClass(dnd.classId);
  const dndSteps: Step[] = [
    {
      id: 'species',
      label: 'Вид',
      value: build.species ? preview.subrace || preview.race : undefined,
      question: 'Кто ваш герой по крови?',
      issues: dnd.issues.species,
      content: <SpeciesStep creation={dnd} />,
    },
    {
      id: 'background',
      label: 'Предыстория',
      value: findBackground(build.background)?.name,
      question: 'Кем он был до приключений?',
      issues: dnd.issues.background,
      content: <BackgroundStep creation={dnd} />,
    },
    {
      id: 'class',
      label: 'Класс',
      value: classDef ? [preview.class, preview.subclass].filter(Boolean).join(' · ') : undefined,
      question: 'Чему он посвятил жизнь?',
      issues: dnd.issues.class,
      content: <ClassStep creation={dnd} />,
    },
    {
      id: 'abilities',
      label: 'Характеристики',
      value:
        build.abilityMethod === 'pointBuy'
          ? `${METHOD_NAMES.pointBuy} · ${27 - pointsRemaining(build.baseAttributes)}/27`
          : METHOD_NAMES[build.abilityMethod],
      question: 'В чём его сила?',
      issues: dnd.issues.abilities,
      content: <AbilitiesStep creation={dnd} />,
    },
    {
      id: 'progression',
      label: 'Развитие',
      value: classDef ? `Уровень ${dnd.level}` : undefined,
      question: 'Чему он научился на своём пути?',
      issues: dnd.issues.progression,
      content: <ProgressionStep creation={dnd} />,
    },
    {
      id: 'equipment',
      label: 'Снаряжение',
      value: dnd.classKitId && dnd.backgroundKitId ? 'Выбрано' : undefined,
      question: 'С чем он выходит в дорогу?',
      issues: dnd.issues.equipment,
      content: <EquipmentStep creation={dnd} />,
    },
    {
      id: 'identity',
      label: 'Имя',
      value: dnd.name || undefined,
      question: 'Как его зовут?',
      issues: dnd.issues.identity,
      content: <IdentityStep creation={dnd} />,
    },
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
    {
      id: 'attributes',
      label: 'Характеристики',
      value:
        custom.method === 'pointBuy'
          ? `${METHOD_NAMES.pointBuy} · ${27 - custom.points}/27`
          : METHOD_NAMES[custom.method],
      question: 'В чём его сила и чему он обучен?',
      issues: custom.valid.attributes
        ? []
        : [custom.method === 'roll' ? 'Бросок характеристик' : custom.method === 'manual' ? 'Значения от 3 до 20' : 'Очки характеристик'],
      content: <ScoresStep creation={custom} />,
    },
    {
      id: 'identity',
      label: 'Имя',
      value: custom.name || undefined,
      question: 'Как его зовут?',
      issues: custom.valid.identity ? [] : ['Имя'],
      content: <IdentityStep creation={custom} />,
    },
  ];

  const cocSteps: Step[] = [
    {
      id: 'coc-rules',
      label: 'Редакция',
      value: coc.editionChosen
        ? `${coc.pulp ? 'Pulp' : 'Классика'} · ${coc.era === '1920s' ? '1920-е' : 'наши дни'}`
        : undefined,
      question: 'Какая история?',
      issues: coc.issues.rules,
      stage: true,
      content: <RulesStep creation={coc} onChosen={() => setIndex(index + 1)} />,
    },
    ...(coc.pulp
      ? [
          {
            id: 'coc-archetype',
            label: 'Архетип',
            value: coc.archetypeInfo?.name,
            question: 'Кем он был бы на обложке?',
            issues: coc.issues.archetype,
            content: <ArchetypeStep creation={coc} />,
          },
        ]
      : []),
    {
      id: 'coc-characteristics',
      label: 'Характеристики',
      value: coc.rolled ? `Удача ${coc.luck || '—'}` : undefined,
      question: 'Каков он от природы?',
      issues: coc.issues.characteristics,
      content: <CharacteristicsStep creation={coc} />,
    },
    {
      id: 'coc-age',
      label: 'Возраст',
      value: `${coc.age} лет`,
      question: 'Сколько ему лет?',
      issues: coc.issues.age,
      content: <AgeStep creation={coc} />,
    },
    {
      id: 'coc-occupation',
      label: 'Профессия',
      value: coc.occupationInfo?.name,
      question: 'Чем он зарабатывает на жизнь?',
      issues: coc.issues.occupation,
      content: <OccupationStep creation={coc} />,
    },
    {
      id: 'coc-skills',
      label: 'Навыки',
      value: coc.occupationInfo ? `Средства ${coc.creditRating}` : undefined,
      question: 'Что он умеет?',
      issues: coc.issues.skills,
      content: <SkillsStep creation={coc} />,
    },
    ...(coc.pulp
      ? [
          {
            id: 'coc-talents',
            label: 'Таланты',
            value: coc.talents.map((id) => TALENTS.find((t) => t.id === id)?.name ?? id).join(', ') || undefined,
            question: 'Чем он особенный?',
            issues: coc.issues.talents,
            content: <TalentsStep creation={coc} />,
          },
        ]
      : []),
    {
      id: 'coc-story',
      label: 'Предыстория',
      question: 'Что у него за душой?',
      issues: coc.issues.story,
      content: <StoryStep creation={coc} />,
    },
    {
      id: 'coc-gear',
      label: 'Снаряжение',
      value: coc.weapons.length ? `Оружие: ${coc.weapons.length}` : undefined,
      question: 'Что у него с собой?',
      issues: coc.issues.gear,
      content: <GearStep creation={coc} />,
    },
    {
      id: 'coc-identity',
      label: 'Имя',
      value: coc.name || undefined,
      question: 'Как его зовут?',
      issues: coc.issues.identity,
      content: <CocIdentityStep creation={coc} />,
    },
  ];

  const steps = [...common, ...(path === 'custom' ? customSteps : path === 'coc' ? cocSteps : dndSteps)];
  const step = steps[Math.min(index, steps.length - 1)]!;
  const last = index === steps.length - 1;
  /** A step can be opened once every step before it is done. */
  const reachable = (i: number) => steps.slice(0, i).every((s) => s.issues.length === 0);
  const summary = path === 'custom' ? custom.preview() : dnd.preview;
  const images = path === 'custom' ? custom.images : dnd.images;
  const creating = path === 'custom' ? custom.creating : path === 'coc' ? coc.creating : dnd.creating;
  const create = () =>
    void (path === 'custom' ? custom.create() : path === 'coc' ? coc.create() : dnd.create());

  const content = (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={step.id}
        custom={direction}
        className={cx('min-h-0', step.stage ? 'w-full' : 'h-full')}
        style={{ transformPerspective: 1400 }}
        variants={PAGE_TURN}
        initial="enter"
        animate="shown"
        exit="leave"
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
          <button
            type="button"
            className="text-danger underline-offset-4 hover:underline"
            onClick={onRestart}
          >
            Да
          </button>
          <button
            type="button"
            className="text-ink-faint underline-offset-4 hover:underline"
            onClick={() => setConfirmRestart(false)}
          >
            Нет
          </button>
        </>
      ) : (
        <button
          type="button"
          className="text-ink-faint underline-offset-4 hover:text-ink hover:underline"
          onClick={() => setConfirmRestart(true)}
        >
          Начать заново
        </button>
      )}
    </div>
  );

  const stepList = (
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
            onClick={() => {
              setIndex(i);
              setStepsOpen(false);
            }}
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
  );
  const heroSummary =
    path === 'coc' ? (
      <CocSummary creation={coc} />
    ) : (
      <HeroSummary
        sheet={summary}
        setting={setting}
        images={images}
        classIcon={path === 'dnd' ? dnd.classId : undefined}
      />
    );

  return (
    <SettingScope
      setting={shown}
      className={cx(
        'ui-morph relative flex h-screen overflow-clip bg-bg max-lg:h-dvh max-lg:flex-col',
        !worldChosen && !previewing && 'ui-service',
      )}
      data-flourish={flourish?.setting}
    >
      {flourish && (
        <Flourish
          key={flourish.key}
          setting={flourish.setting}
          x={flourish.x}
          y={flourish.y}
          onEnd={endFlourish}
        />
      )}
      {/* The atmosphere of the world in front, behind the world step only. */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{ opacity: index === 0 ? 1 : 0 }}
      >
        <SettingBackdrop setting={shown} strength={0.6} frame={false} />
      </div>
      {/* The steps appear once the world is behind: choosing a world is a stage of its own. */}
      <AnimatePresence initial={false}>
        {index > 0 && desktop && (
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
              <h1
                className={cx('ui-display ui-title mt-6 px-2 text-xl text-frame-bright', !restart && 'mb-4')}
              >
                Новый герой
              </h1>
              {restart}
              {stepList}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* On a phone or a tablet the steps fold into a line along the top: where one is, and the
          way to the list of them and to the hero as made so far. */}
      {index > 0 && !desktop && (
        <header className="ui-touch relative z-10 flex shrink-0 items-center gap-1 border-b border-line/50 px-4 py-1.5">
          <IconButton label="К героям" size={40} onClick={onDone} className="-ml-2 shrink-0">
            <IconPrev width={20} height={20} />
          </IconButton>
          <button
            type="button"
            onClick={() => setStepsOpen(true)}
            aria-expanded={stepsOpen}
            className="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center text-left"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              Шаг {index + 1} из {steps.length}
            </span>
            <span className="ui-display truncate text-lg leading-tight text-frame-bright">{step.label}</span>
          </button>
          {!step.stage && (
            <Button
              variant="secondary"
              size="sm"
              icon={<IconCharacter width={16} height={16} />}
              onClick={() => setSummaryOpen(true)}
              aria-expanded={summaryOpen}
              className="-mr-1 shrink-0"
            >
              Герой
            </Button>
          )}
        </header>
      )}
      {!desktop && (
        <>
          <Drawer open={stepsOpen} onClose={() => setStepsOpen(false)} label="Шаги">
            <div className="ui-touch flex min-h-0 flex-1 flex-col px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className={cx('ui-display ui-title px-2 text-xl text-frame-bright', !restart && 'mb-4')}>
                  Новый герой
                </h1>
                <IconButton label="Свернуть" size={40} onClick={() => setStepsOpen(false)} className="-mr-2">
                  <IconClose width={18} height={18} />
                </IconButton>
              </div>
              {restart}
              {stepList}
            </div>
          </Drawer>
          <Drawer open={summaryOpen} onClose={() => setSummaryOpen(false)} label="Герой" side="right">
            <div className="ui-touch relative flex min-h-0 flex-1 flex-col p-4 pt-14">
              <IconButton
                label="Свернуть"
                size={40}
                onClick={() => setSummaryOpen(false)}
                className="absolute right-2 top-2 z-10"
              >
                <IconClose width={18} height={18} />
              </IconButton>
              {heroSummary}
            </div>
          </Drawer>
        </>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {step.stage ? (
          // A stage step (the world, the path): its question on top, its choices centred in the room left.
          <main className="ui-stage relative flex min-h-0 flex-1 flex-col px-10 pt-14 max-lg:px-4 max-lg:pt-4">
            {index === 0 && (
              <div className="absolute left-24 top-14 max-lg:static max-lg:mb-2">{backToHeroes}</div>
            )}
            <h2 className="ui-display ui-title text-center text-[1.9rem] leading-tight text-ink max-sm:text-[1.5rem]">
              {step.question}
            </h2>
            <div className="flex min-h-0 flex-1 items-center">{content}</div>
          </main>
        ) : (
          <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] gap-6 px-6 pt-6 max-lg:grid-cols-1 max-lg:px-4 max-lg:pt-3 max-sm:px-2">
            <Panel ornate className="flex min-h-0 flex-col">
              <h2 className="ui-display ui-title border-b border-line/60 px-6 py-4 text-center text-[1.5rem] leading-tight text-frame-bright max-sm:px-4 max-sm:py-3 max-sm:text-[1.25rem]">
                {step.question}
              </h2>
              {/* Keyed by the step: each step opens at its top, not where the last one was scrolled. */}
              <div
                key={step.id}
                className="ui-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5 max-sm:px-4 max-sm:py-4"
                data-creation-panel
              >
                {content}
              </div>
            </Panel>
            {desktop && heroSummary}
          </main>
        )}

        {/* Centred on the screen, not on the room beside the steps: when the steps slide in, «Дальше»
            does not turn into «Назад» under the pointer. */}
        <footer
          className={cx(
            'grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-4 transition-[margin] duration-[450ms]',
            // Below the desktop: what is left above the buttons, the buttons sharing the width.
            'max-lg:flex max-lg:flex-col-reverse max-lg:items-stretch max-lg:gap-2 max-lg:px-4 max-lg:py-3',
            index > 0 && desktop && '-ml-60',
          )}
        >
          <span className="max-lg:hidden" />
          <div className="flex gap-4 max-lg:gap-3 max-lg:[&>*]:flex-1">
            <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              Назад
            </Button>
            {last ? (
              <Button
                variant="primary"
                disabled={!steps.every((s) => s.issues.length === 0) || creating}
                onClick={create}
              >
                Начать путь
              </Button>
            ) : (
              <Button variant="primary" disabled={step.issues.length > 0} onClick={() => setIndex(index + 1)}>
                Дальше
              </Button>
            )}
          </div>
          {/* What is left on this step: each one a link to its field on the panel. */}
          {/* On a narrow screen what is left keeps to one line that scrolls sideways. */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-ink-faint max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:whitespace-nowrap max-lg:[scrollbar-width:none]">
            {step.issues.length > 0 && (
              <>
                Осталось выбрать:
                {step.issues.map((issue) => (
                  <button
                    key={issue}
                    type="button"
                    className="ui-issue-link"
                    onClick={() => revealIssue(issue)}
                  >
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
