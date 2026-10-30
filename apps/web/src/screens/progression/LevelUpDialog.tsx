import React, { useEffect, useRef, useState } from 'react';
import { addLevel, applyBuild, classAtLevel, dndBuildOf, findClass, heroLevel, hitDieAt } from '@itd/game-logic/dnd';
import type { DndBuild, Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useMomentStore } from '../../store/useMomentStore';
import { announceRoll } from '../../store/useTableRollStore';
import { Dialog } from '../../ui/Dialog';
import { LEVEL_DOCK } from '../../ui/LevelUpBurst';
import { Button } from '../../ui/primitives';
import { LevelPlanView, planIssues } from './LevelPlanView';

/**
 * Level-up of a hero built from presets: what the next level brings and the picks it asks for.
 * Nothing changes on the sheet until the player confirms.
 */
export const LevelUpDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const landed = useMomentStore((s) => s.landed);
  const [draft, setDraft] = useState<DndBuild | undefined>(() => {
    const build = dndBuildOf(character);
    const last = build && classAtLevel(build, heroLevel(build));
    return build && last ? addLevel(build, last.entry.def.id) : undefined;
  });
  // The new level's emblem, settled over the window as it opened, leaves with it — closed or gone
  // with the sheet. Going is put off a tick, so a remount (strict mode's included) keeps it.
  const releasing = useRef(0);
  useEffect(() => {
    const release = () => useMomentStore.getState().release();
    if (!open) return release();
    window.clearTimeout(releasing.current);
    return () => {
      releasing.current = window.setTimeout(release, 0);
    };
  }, [open]);
  if (!draft) return null;

  const level = heroLevel(draft);
  const issues = planIssues(draft, level);

  // A thrown hit die stands: it goes onto the hero at once (closing the dialog does not undo it)
  // and the table sees it like any other throw.
  const keepHitDie = (at: number, value: number) => {
    const hitDie = hitDieAt(draft, at) ?? value;
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
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="xl"
      // The new level's emblem stands on the window's edge and says it: the heading names the class.
      hole={{ y: LEVEL_DOCK.y, r: LEVEL_DOCK.hole, cut: landed }}
      title={findClass(classAtLevel(draft, level)?.entry.def.id)?.name ?? character.class}
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
