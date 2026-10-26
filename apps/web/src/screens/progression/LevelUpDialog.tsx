import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { applyBuild, dndBuildOf, findClass } from '@itd/game-logic/dnd';
import type { DndBuild, Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { announceRoll } from '../../store/useTableRollStore';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/primitives';
import { LevelPlanView, planIssues } from './LevelPlanView';

/**
 * Level-up of a hero built from presets: what the next level brings and the picks it asks for.
 * Nothing changes on the sheet until the player confirms.
 */
export const LevelUpDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const level = character.level + 1;
  const [draft, setDraft] = useState<DndBuild | undefined>(() => {
    const build = dndBuildOf(character);
    return build ? { ...build, level } : undefined;
  });
  if (!draft) return null;

  const issues = planIssues(draft, level);

  // A thrown hit die stands: it goes onto the hero at once (closing the dialog does not undo it)
  // and the table sees it like any other throw.
  const keepHitDie = (at: number, value: number) => {
    const hitDie = findClass(draft.class)?.hitDie ?? value;
    announceRoll(character.id, [{ sides: hitDie, value }], `Хиты, уровень ${at}: ${value}`);
    updateCharacter(
      (doc) => {
        const build = dndBuildOf(doc);
        if (!build) return doc;
        const hitPoints = [...build.hitPoints.filter((e) => e.level !== at), { level: at, method: 'roll' as const, value }];
        return { ...doc, build: { ...build, hitPoints } };
      },
      { log: { message: `Хиты, уровень ${at}: бросок к${hitDie} = ${value}`, type: 'exp' }, undoable: false },
    );
  };
  const confirm = () => {
    updateCharacter((doc) => applyBuild(doc, draft).character, {
      log: { message: `Уровень повышен до ${level}`, type: 'exp' },
    });
    toast.success(`Новый уровень: ${level}`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="xl"
      eyebrow={`${findClass(draft.class)?.name ?? character.class} · уровень ${level}`}
      title="Новый уровень"
      footerStart={
        issues.length > 0 ? <span className="text-sm text-ink-faint">Осталось выбрать: {issues.join(', ')}</span> : null
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Позже
          </Button>
          <Button variant="primary" disabled={issues.length > 0} onClick={confirm}>
            Подтвердить
          </Button>
        </>
      }
    >
      <LevelPlanView build={draft} level={level} onChange={setDraft} onHitDieRolled={keepHitDie} />
    </Dialog>
  );
};
