import React from 'react';
import { RailButton } from '../../ui/Rail';
import { IconHub, IconPrev, IconTable } from '../../ui/icons';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { useTableOfCharacter } from '../../store/usePartyStore';

/**
 * The ways out of an open hero, at the top of its rail: straight to the hub — or to the party's
 * table, when the hero was opened from it or sits at a table in session — and back to the heroes.
 */
export const HeroExits: React.FC = () => {
  const { tableId, leave } = useHeroExits();
  return (
    <>
      {tableId ? (
        <RailButton label="Стол" Icon={IconTable} onClick={() => leave({ screen: 'party', partyId: tableId })} hint="К столу партии" />
      ) : (
        <RailButton label="Хаб" Icon={IconHub} onClick={() => leave({ screen: 'home' })} hint="На главную" />
      )}
      <RailButton label="Герои" Icon={IconPrev} onClick={() => leave({ screen: 'heroes' })} hint="К выбору героя" />
    </>
  );
};

/**
 * Where an open hero leaves to: the party's table it was opened from or sits at in session, if any,
 * and a way to leave for a place.
 */
export const useHeroExits = () => {
  const characterId = useCharacterStore((s) => s.character?.id);
  const goToCharacterList = useCharacterStore((s) => s.goToCharacterList);
  const place = useNavStore((s) => s.place);
  const go = useNavStore((s) => s.go);
  const { listed, atTable } = useTableOfCharacter(characterId);
  const tableId = place.screen === 'party' ? place.partyId : atTable ? listed?.id : undefined;
  const leave = (to: Parameters<typeof go>[0]) => {
    go(to);
    goToCharacterList();
  };
  return { tableId, leave };
};
