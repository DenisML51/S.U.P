import React, { useEffect, useRef, useState } from 'react';
import { addLevel, applyBuild, dndBuildOf, findClass, heroLevel, hitDieAt } from '@itd/game-logic/dnd';
import type { DndBuild, Character } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useMomentStore } from '../../store/useMomentStore';
import { announceRoll } from '../../store/useTableRollStore';
import { Dialog } from '../../ui/Dialog';
import { LEVEL_DOCK } from '../../ui/LevelUpBurst';
import { Button } from '../../ui/primitives';
import { ClassPick } from './ClassPick';
import { LevelPlanView, planIssues } from './LevelPlanView';

/**
 * Level-up of a hero built from presets: the class that takes the level, then what the level brings
 * and the picks it asks for. Nothing changes on the sheet until the player confirms.
 */
export const LevelUpDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const landed = useMomentStore((s) => s.landed);
  const build = dndBuildOf(character);
  const level = build ? heroLevel(build) + 1 : character.level + 1;
  // A die already thrown for this level names its class: the level goes to that class.
  const [draft, setDraft] = useState<DndBuild | undefined>(() => {
    const thrown = build?.hitPoints.find((e) => e.level === level && e.method === 'roll' && e.class);
    return build && thrown?.class ? addLevel(build, thrown.class) : undefined;
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
  if (!build) return null;

  const classId = draft?.classes.find((c) => c.levels.includes(level))?.class;
  const issues = draft ? planIssues(draft, level) : ['Класс'];
  // Once its die is thrown, the level stays with its class: the throw is not taken again.
  const thrown = !!draft?.hitPoints.some((e) => e.level === level && e.method === 'roll');

  // A thrown hit die stands: it goes onto the hero at once (closing the dialog does not undo it)
  // and the table sees it like any other throw.
  const keepHitDie = (at: number, value: number) => {
    if (!draft) return;
    const hitDie = hitDieAt(draft, at) ?? value;
    announceRoll(character.id, [{ sides: hitDie, value }], `Хиты, уровень ${at}: ${value}`);
    updateCharacter(
      (doc) => {
        const stored = dndBuildOf(doc);
        if (!stored) return doc;
        const hitPoints = [...stored.hitPoints.filter((e) => e.level !== at), { level: at, method: 'roll' as const, value, class: classId }];
        return { ...doc, build: { ...stored, hitPoints } };
      },
      { log: { message: `Хиты, уровень ${at}: бросок к${hitDie} = ${value}`, type: 'exp' }, undoable: false },
    );
  };
  const confirm = () => {
    if (!draft) return;
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
      title={findClass(classId)?.name ?? 'Новый уровень'}
      footerStart={
        issues.length > 0 ? <span className="text-sm text-ink-faint">Осталось выбрать: {issues.join(', ')}</span> : null
      }
      footer={
        <>
          {draft && !thrown && (
            <Button variant="ghost" onClick={() => setDraft(undefined)}>
              Другой класс
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Позже
          </Button>
          <Button variant="primary" disabled={issues.length > 0} onClick={confirm}>
            Подтвердить
          </Button>
        </>
      }
    >
      {draft ? (
        <LevelPlanView build={draft} level={level} onChange={setDraft} onHitDieRolled={keepHitDie} />
      ) : (
        <ClassPick build={build} onPick={(id) => setDraft(addLevel(build, id))} />
      )}
    </Dialog>
  );
};
