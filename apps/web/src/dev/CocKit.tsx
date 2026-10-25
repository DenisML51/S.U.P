import React, { useCallback, useState } from 'react';
import { appendHistory, type HistoryEvent } from '@itd/game-logic';
import {
  CONDITION_IDS,
  addMadness,
  createInvestigator,
  loseSanity,
  recoverFrom,
  type Characteristics,
} from '@itd/game-logic/coc';
import { createCharacterDocument, type Character, type Setting } from '@itd/schema';
import { SETTING_LIST } from '../ui/theme/settings';
import { SettingScope, useDocumentSetting } from '../ui/theme/SettingScope';
import { SettingBackdrop } from '../ui/SettingBackdrop';
import { Segmented } from '../ui/forms';
import { Button, Panel, SectionTitle } from '../ui/primitives';
import { Toasts } from '../ui/Toasts';
import { CocSheetProvider, useCoc } from '../screens/coc/context';
import { CocSheetView } from '../screens/coc/CocSheet';
import { CharacteristicsGrid, DerivedStrip, RollResult, SkillList, Track } from '../screens/coc/parts';
import { madnessStage } from '../screens/coc/InsanityVeil';

const HARVEY: Characteristics = { str: 45, con: 60, siz: 65, dex: 50, app: 55, int: 80, pow: 70, edu: 85 };

/** A professor of Miskatonic, mid-investigation: some skills ticked, a revolver, a phobia ready. */
function sampleInvestigator(): Character {
  const doc = createCharacterDocument(
    createInvestigator({
      name: 'Харви Уолтерс',
      build: {
        ruleset: 'coc7',
        variant: 'classic',
        era: '1920s',
        occupation: 'professor',
        talents: [],
        age: 42,
      },
      characteristics: HARVEY,
      luck: 55,
      skills: {
        'library-use': 70,
        'credit-rating': 35,
        'language-other:latin': 51,
        history: 60,
        occult: 45,
        psychology: 40,
        'spot-hidden': 45,
        persuade: 35,
        'cthulhu-mythos': 6,
        'firearms:handgun': 30,
      },
      occupationSkills: ['library-use', 'language-other:latin', 'history', 'psychology', 'persuade'],
      weapons: ['revolver-38', 'knife-small'],
      residence: 'Аркхэм, Массачусетс',
      birthplace: 'Бостон',
      backstory: {
        personalDescription: 'Сухопарый, в пенсне, вечно с пятнами чернил на манжетах.',
        ideology: 'Всё на свете имеет рациональное объяснение. Пока что.',
        significantPeople: 'Доктор Армитидж — наставник и единственный, кто ему верит.',
        meaningfulLocations: 'Читальный зал Мискатоника после закрытия.',
        treasuredPossessions: 'Записная книжка отца с непонятными знаками на полях.',
      },
    }),
  );
  return {
    ...doc,
    setting: 'lovecraft',
    currentHP: 9,
    coc: {
      ...doc.coc!,
      skills: doc.coc!.skills.map((s) =>
        s.id === 'spot-hidden' || s.id === 'history' ? { ...s, check: true } : s,
      ),
      spells: [
        {
          id: 'elder-sign',
          name: 'Старший знак',
          cost: 'ПМ и 1 рассудка',
          castingTime: '1 раунд',
          description: '',
        },
      ],
    },
  };
}

/** The showcase's sheet lives in local state; every action runs the real rules on it. */
const useLocalInvestigator = () => {
  const [character, setCharacter] = useState(sampleInvestigator);
  const update = useCallback((edit: (doc: Character) => Character, log?: HistoryEvent) => {
    setCharacter((doc) => {
      const next = edit(doc);
      return log ? appendHistory(next, log) : next;
    });
  }, []);
  return { character, update, reset: () => setCharacter(sampleInvestigator()) };
};

/** Buttons that put the mind into each stage, to see the madness veil. */
const MadnessControls: React.FC<{ reset: () => void }> = ({ reset }) => {
  const { character, update } = useCoc();
  const stage = madnessStage(character);
  const clear = (doc: Character) =>
    [CONDITION_IDS.temporaryInsanity, CONDITION_IDS.indefiniteInsanity].reduce(
      (d, id) => recoverFrom(id)(d),
      doc,
    );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-muted">Безумие: ступень {stage}</span>
      <Button size="sm" onClick={reset}>
        Сброс
      </Button>
      <Button size="sm" onClick={() => update((doc) => ({ ...clear(doc), sanity: 12 }))}>
        Низкий рассудок
      </Button>
      <Button
        size="sm"
        onClick={() =>
          update((doc) => ({
            ...clear(doc),
            conditions: [...doc.conditions, CONDITION_IDS.temporaryInsanity],
          }))
        }
      >
        Временное
      </Button>
      <Button
        size="sm"
        onClick={() =>
          update((doc) =>
            addMadness({ id: 'madness-nyctophobia', name: 'Никтофобия', kind: 'phobia', description: 'Боязнь темноты.' })(
              loseSanity(20).edit({ ...clear(doc), coc: { ...doc.coc!, sanityAtDayStart: doc.sanity } }),
            ),
          )
        }
      >
        Бессрочное
      </Button>
    </div>
  );
};

const Journal: React.FC = () => {
  const { character } = useCoc();
  return (
    <Panel variant="paper" ornate={false} className="px-7 py-6">
      {character.history.length === 0 && <p className="opacity-60">Журнал пуст — бросьте что-нибудь.</p>}
      {character.history.map((h) => (
        <p key={h.id} className="border-b border-paper-muted/30 py-1.5 text-sm">
          {h.message}
        </p>
      ))}
    </Panel>
  );
};

/** Parts of the kit on their own, so each can be judged apart from the screen. */
const PartsSample: React.FC = () => {
  const { last, character } = useCoc();
  const mods = { difficulty: 'regular' as const, dice: 0 };
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 px-10 py-10">
      <div className="flex flex-col gap-4">
        <SectionTitle>Характеристики и производные</SectionTitle>
        <CharacteristicsGrid mods={mods} />
        <DerivedStrip />
        <SectionTitle>Навыки (две колонки)</SectionTitle>
        <Panel variant="paper" ornate={false} className="px-6 py-4">
          <SkillList mods={mods} filter="" />
        </Panel>
      </div>
      <div className="flex flex-col gap-4">
        <SectionTitle>Треки</SectionTitle>
        <Panel ornate={false} className="flex flex-col gap-4 px-5 py-4">
          <Track label="Хиты" value={character.currentHP} max={character.maxHP} tone="hp" />
          <Track label="Магия" value={character.coc!.magicPoints} max={14} tone="accent" />
        </Panel>
        <SectionTitle>Результат броска</SectionTitle>
        {last ? (
          <RollResult record={last} />
        ) : (
          <p className="text-sm text-ink-muted">
            Бросьте навык или характеристику — результат появится здесь и в углу листа.
          </p>
        )}
      </div>
    </div>
  );
};

/** `?coc=<setting>`: the Call of Cthulhu kit in every setting, on a working sample investigator. */
export const CocKit: React.FC = () => {
  const [setting, setSetting] = useState<Setting>(
    () => (new URLSearchParams(window.location.search).get('coc') as Setting) || 'lovecraft',
  );
  useDocumentSetting(setting);
  const { character, update, reset } = useLocalInvestigator();
  const choose = (next: Setting) => {
    setSetting(next);
    window.history.replaceState(null, '', `?coc=${next}`);
  };

  return (
    <SettingScope setting={setting} className="min-h-screen bg-bg">
      <CocSheetProvider
        character={character}
        update={update}
        renderRoll={(record) => <RollResult record={record} />}
      >
        <header className="ui-service flex flex-wrap items-center gap-6 border-b border-line px-6 py-3">
          <span className="text-sm text-ink-muted">Витрина: Зов Ктулху</span>
          <Segmented
            label="Сеттинг"
            value={setting}
            onChange={choose}
            options={SETTING_LIST.map((s) => ({ value: s.id, label: s.label }))}
          />
          <MadnessControls reset={reset} />
        </header>
        <div className="relative h-[900px] overflow-hidden">
          <SettingBackdrop setting={setting} strength={0.8} />
          <CocSheetView journal={<Journal />} />
        </div>
        <PartsSample />
      </CocSheetProvider>
      <Toasts />
    </SettingScope>
  );
};
