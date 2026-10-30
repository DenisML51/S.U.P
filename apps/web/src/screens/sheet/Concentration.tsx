import React, { useState } from 'react';
import { create } from 'zustand';
import { activeFeaturesOf, concentrationSaveDC, endConcentration, endFeature, formatModifier, savingThrowModifier } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { ConfirmDialog, Dialog } from '../../ui/Dialog';
import { CatalogIcon, GameIcon } from '../../ui/GameIcon';
import { Button, IconButton, cx } from '../../ui/primitives';
import { IconClose } from '../../ui/icons';
import { DieGlyph, LandedValue, RollingDice, type ThrownDie } from '../../ui/RollingDie';
import { useRolls } from './useRolls';

interface ConcentrationPromptState {
  /** Damage taken while concentrating: a Constitution save is due. */
  save: { damage: number } | null;
  /** Starting a new concentration while keeping another: confirm dropping the old one. */
  replace: { current: string; next: string; onConfirm: () => void } | null;
  askSave: (damage: number) => void;
  askReplace: (current: string, next: string, onConfirm: () => void) => void;
  close: () => void;
}

/** Questions about concentration, answered by `ConcentrationPrompt`. */
export const useConcentrationPrompt = create<ConcentrationPromptState>((set) => ({
  save: null,
  replace: null,
  askSave: (damage) => set({ save: { damage }, replace: null }),
  askReplace: (current, next, onConfirm) => set({ replace: { current, next, onConfirm }, save: null }),
  close: () => set({ save: null, replace: null }),
}));

/** Ends the hero's concentration and writes why into the log. */
export function useEndConcentration() {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const character = useCharacterStore((s) => s.character);
  return (reason: string) => {
    const name = character?.concentratingOn?.name;
    if (!name) return;
    updateCharacter(endConcentration, { log: { message: `Концентрация прекращена: ${name} (${reason})`, type: 'other' } });
  };
}

/** Turns off a feature that is on (Rage, Bladesong) and writes it into the log. */
export function useEndFeature() {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  return (id: string, name: string) =>
    updateCharacter((doc) => endFeature(doc, id), { log: { message: `Прекращено: ${name}`, type: 'other' } });
}

/** The features that are on (Rage, Bladesong), each with a way to end it. Nothing when none is. */
export const ActiveFeaturesBadge: React.FC<{ character: Character; className?: string }> = ({ character, className }) => {
  const end = useEndFeature();
  const active = activeFeaturesOf(character);
  if (active.length === 0) return null;
  return (
    <div className={cx('space-y-1', className)}>
      {active.map((ability) => (
        <div key={ability.id} className="flex items-center gap-2 text-sm" title={`Действует: ${ability.name}`}>
          <GameIcon name={ability.iconName} kind="ability" size={16} className="shrink-0 text-accent" />
          <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-ink-faint">Действует</span>
          <span className="min-w-0 flex-1 truncate text-ink">{ability.name}</span>
          <IconButton label={`Прекратить: ${ability.name}`} size={22} onClick={() => end(ability.id, ability.name)}>
            <IconClose width={12} height={12} />
          </IconButton>
        </div>
      ))}
    </div>
  );
};

/** Small mark on a spell or ability that needs concentration; takes the colour of the text it sits in. */
export const ConcentrationMark: React.FC<{ className?: string }> = ({ className }) => (
  <span
    title="Требует концентрации"
    className={cx(
      'ml-2 inline-block border border-current px-1 align-middle font-sans text-[10px] uppercase leading-[1.4] tracking-wider opacity-70',
      className,
    )}
    style={{ borderRadius: 'var(--radius)' }}
  >
    конц.
  </span>
);

/** What the hero concentrates on, with a way to stop. Nothing when not concentrating. */
export const ConcentrationBadge: React.FC<{ character: Character; className?: string }> = ({ character, className }) => {
  const end = useEndConcentration();
  if (!character.concentratingOn) return null;
  return (
    <div
      className={cx('flex items-center gap-2 text-sm', className)}
      title={`Концентрация: ${character.concentratingOn.name}. Урон требует спасброска Телосложения.`}
    >
      <CatalogIcon id="psychic-waves" size={16} className="shrink-0 text-accent" />
      <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-ink-faint">Конц.</span>
      <span className="min-w-0 flex-1 truncate text-ink">{character.concentratingOn.name}</span>
      <IconButton label="Прекратить концентрацию" size={22} onClick={() => end('по желанию')}>
        <IconClose width={12} height={12} />
      </IconButton>
    </div>
  );
};

/**
 * The Constitution save after damage: the d20 waits in the middle of the window, as a die the master
 * calls for does; a click throws it there, it lands green or red against the DC and the total shows
 * under it. A die thrown at the table is told with the buttons instead.
 */
const SaveDialog: React.FC<{ character: Character; damage: number; onClose: () => void }> = ({ character, damage, onClose }) => {
  const roll = useRolls();
  const end = useEndConcentration();
  const logHistory = useCharacterStore((s) => s.logHistory);
  const [thrown, setThrown] = useState<{ total: number; dice: ThrownDie[] } | null>(null);
  const [landed, setLanded] = useState(false);
  const dc = concentrationSaveDC(damage);
  const bonus = savingThrowModifier(character, 'constitution');
  const name = character.concentratingOn?.name ?? '';

  const kept = () => {
    logHistory(`Концентрация сохранена: ${name} (СЛ ${dc})`);
    onClose();
  };
  const lost = () => {
    end(`провален спасбросок, СЛ ${dc}`);
    onClose();
  };

  const throwDie = () => {
    const result = roll.roll20(`Концентрация (СЛ ${dc})`, bonus, { inPlace: true, test: { kind: 'save', attribute: 'constitution' } });
    // Of two d20 (advantage, disadvantage) the one that counts takes the outcome's colour, the other is set aside.
    const keptAt = result.dice.findIndex((die) => die.sides === 20 && die.value === result.die);
    const tone = result.total >= dc ? 'success' : 'danger';
    setThrown({
      total: result.total,
      dice: result.dice.map((die, index) => (die.sides !== 20 ? die : index === keptAt ? { ...die, tone } : { ...die, dropped: true })),
    });
  };
  const made = thrown !== null && thrown.total >= dc;

  return (
    <Dialog
      open
      onClose={onClose}
      width="sm"
      eyebrow="Спасбросок концентрации"
      title={name}
      footer={
        <>
          <Button variant="danger" onClick={lost}>
            Провалил
          </Button>
          <Button variant="primary" onClick={kept}>
            Выдержал
          </Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-ink-muted">
        Урон {damage}: спасбросок Телосложения <span className="text-ink">СЛ {dc}</span>, ваш бонус{' '}
        <span className="text-ink">{formatModifier(bonus)}</span>.
      </p>
      <div className="mt-5 flex min-h-[8.5rem] flex-col items-center justify-center gap-3">
        {thrown ? (
          <RollingDice dice={thrown.dice} size="4.5rem" className="justify-center gap-3" onLanded={() => setLanded(true)} />
        ) : (
          <button type="button" className="ui-check__die-button" onClick={throwDie} aria-label="Бросить кубик" title="Бросить кубик">
            <span className="ui-check__idle-die h-[4.5rem] w-[4.5rem]">
              <DieGlyph sides={20} spin={0.5} />
            </span>
          </button>
        )}
        {!thrown ? (
          <span className="text-sm text-ink-faint">Нажмите на кубик</span>
        ) : (
          <LandedValue landed={landed}>
            <span className="flex items-baseline gap-3">
              <span className={cx('ui-display ui-numeric text-[2.4rem] leading-none', made ? 'text-success' : 'text-danger')}>
                {thrown.total}
              </span>
              <span className="text-sm text-ink-muted">{made ? 'концентрация удержана' : 'концентрация потеряна'}</span>
            </span>
          </LandedValue>
        )}
      </div>
    </Dialog>
  );
};

/** Mounted once per screen where the hero acts (the sheet, combat). */
export const ConcentrationPrompt: React.FC = () => {
  const { save, replace, close } = useConcentrationPrompt();
  const character = useCharacterStore((s) => s.character);
  return (
    <>
      {save && character?.concentratingOn && <SaveDialog character={character} damage={save.damage} onClose={close} />}
      <ConfirmDialog
        open={!!replace}
        title="Сменить концентрацию?"
        message={
          replace && (
            <>
              Вы концентрируетесь на «{replace.current}». «{replace.next}» тоже требует концентрации — прежняя прервётся.
            </>
          )
        }
        confirmLabel="Прервать и продолжить"
        onConfirm={() => {
          replace?.onConfirm();
          close();
        }}
        onCancel={close}
      />
    </>
  );
};
