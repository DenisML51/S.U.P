import { Character } from '../types';
import { apiFetch } from './client';

type CharacterListItem = {
  id: string;
  name: string;
  class: string;
  level: number;
  currentHP: number;
  maxHP: number;
  subclass: string;
  avatar?: string;
  resistances?: Character['resistances'];
};

export const listCharactersApi = () => apiFetch<{ characters: CharacterListItem[] }>('/characters');

export const getCharacterApi = (id: string) =>
  apiFetch<{ character: Character }>(`/characters/${id}`);

export const createCharacterApi = (character: Character) =>
  apiFetch<{ character: { id: string } }>('/characters', {
    method: 'POST',
    body: JSON.stringify({
      id: character.id,
      name: character.name,
      class: character.class,
      level: character.level,
      data: character
    })
  });

export const updateCharacterApi = (id: string, character: Character) =>
  apiFetch<{ character: { id: string } }>(`/characters/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: character.id,
      name: character.name,
      class: character.class,
      level: character.level,
      data: character
    })
  });

export const deleteCharacterApi = (id: string) =>
  apiFetch<{ ok: boolean }>(`/characters/${id}`, {
    method: 'DELETE'
  });
