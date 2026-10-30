import React, { useMemo, useState } from 'react';
import { rulesOf, upsertById, type CatalogSpell } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { compareText, t } from '../../../i18n';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Dialog } from '../../../ui/Dialog';
import { Segmented } from '../../../ui/forms';
import { Button, Input, cx } from '../../../ui/primitives';

const LEVELS = ['все', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/**
 * The rules system's book of spells, to write one onto the sheet: a Wizard copying a found spell
 * into the book, a spell from a scroll or a feat. The class list comes first and the levels the
 * hero cannot cast yet are marked; a spell of one's own is still made by hand (`onOwn`).
 */
export const SpellCatalogDialog: React.FC<{ open: boolean; onClose: () => void; onOwn: () => void }> = ({
  open,
  onClose,
  onOwn,
}) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const catalog = character.build ? rulesOf(character.build).spellCatalog : undefined;
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'own' | 'all'>('own');
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('все');
  const have = new Set(character.spells.map((s) => s.id.replace(/^spell-/, '')));

  const spells = useMemo<CatalogSpell[]>(() => (character.build && catalog ? catalog.list(character.build) : []), [character.build, catalog]);
  const anyOwn = spells.some((s) => s.ownList);
  const shown = spells
    .filter((s) => (scope === 'own' && anyOwn ? s.ownList : true))
    .filter((s) => level === 'все' || s.level === Number(level))
    .filter((s) => !query.trim() || t(s.name).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.level - b.level || compareText(a.name, b.name));

  const add = (spell: CatalogSpell) => {
    const entry = character.build && catalog?.entry(character.build, spell.id);
    if (!entry) return;
    updateCharacter((doc) => ({ ...doc, spells: upsertById(doc.spells, entry) }), {
      log: { message: `Заклинание записано: ${entry.name}`, type: 'other' },
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="lg"
      eyebrow="Книга заклинаний"
      title="Добавить заклинание"
      footerStart={
        <Button variant="ghost" onClick={onOwn}>
          Своё заклинание
        </Button>
      }
      footer={
        <Button variant="primary" onClick={onClose}>
          Готово
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            aria-label="Поиск"
            placeholder="Поиск по названию"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[12rem] flex-1"
            data-autofocus
          />
          {anyOwn && (
            <Segmented
              label="Какие заклинания"
              value={scope}
              onChange={setScope}
              options={[
                { value: 'own', label: 'Список класса' },
                { value: 'all', label: 'Все' },
              ]}
            />
          )}
        </div>
        <Segmented
          label="Круг"
          value={level}
          onChange={setLevel}
          options={LEVELS.map((l) => ({ value: l, label: l === '0' ? 'заговоры' : l }))}
          className="ui-segmented--compact w-full"
        />
        <ul className="max-h-[50vh] divide-y divide-line/40 overflow-y-auto pr-1">
          {shown.map((spell) => {
            const owned = have.has(spell.id);
            return (
              <li key={spell.id} className={cx('flex items-center gap-3 py-2', !spell.castable && 'opacity-60')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{spell.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {[
                      spell.level === 0 ? 'Заговор' : `${spell.level} круг`,
                      spell.school,
                      spell.ritual && 'ритуал',
                      spell.concentration && 'концентрация',
                      !spell.castable && 'круг вам пока недоступен',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Button size="row" variant={owned ? 'ghost' : 'secondary'} disabled={owned} onClick={() => add(spell)}>
                  {owned ? 'Уже в листе' : 'Добавить'}
                </Button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="py-6 text-center text-sm text-ink-faint">Ничего не найдено</li>}
        </ul>
      </div>
    </Dialog>
  );
};
