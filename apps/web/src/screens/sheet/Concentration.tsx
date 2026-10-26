import React, { useState } from 'react';
import { create } from 'zustand';
import { concentrationSaveDC, endConcentration, formatModifier, savingThrowModifier } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { ConfirmDialog, Dialog } from '../../ui/Dialog';
import { CatalogIcon } from '../../ui/GameIcon';
import { Button, IconButton, cx } from '../../ui/primitives';
import { IconClose, IconDice } from '../../ui/icons';
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

/** The Constitution save after damage: roll it here, or say how it went at the table. */
const SaveDialog: React.FC<{ character: Character; damage: number; onClose: () => void }> = ({ character, damage, onClose }) => {
  const roll = useRolls();
  const end = useEndConcentration();
  const logHistory = useCharacterStore((s) => s.logHistory);
  const [result, setResult] = useState<number | null>(null);
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

  return (
    <Dialog
      open
      onClose={onClose}
      width="sm"
      eyebrow="Спасбросок концентрации"
      title={name}
      footerStart={
        <Button
          variant="secondary"
          icon={<IconDice width={16} height={16} />}
          onClick={() => setResult(roll.check(`Концентрация (СЛ ${dc})`, bonus, { test: { kind: 'save', attribute: 'constitution' } }))}
        >
          Бросить
        </Button>
      }
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
      {result !== null && (
        <p className="mt-4 flex items-baseline gap-3">
          <span className={cx('ui-display ui-numeric text-[2.4rem] leading-none', result >= dc ? 'text-success' : 'text-danger')}>
            {result}
          </span>
          <span className="text-sm text-ink-muted">
            к20 {result - bonus} {formatModifier(bonus)} — {result >= dc ? 'концентрация удержана' : 'концентрация потеряна'}
          </span>
        </p>
      )}
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
