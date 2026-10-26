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
