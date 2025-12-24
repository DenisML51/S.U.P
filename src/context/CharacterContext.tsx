import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Character } from '../types';

export interface CharacterPreview {
  id: string;
  name: string;
  class: string;
  subclass: string;
  level: number;
  currentHP: number;
  maxHP: number;
  avatar?: string;
}

export type TabType = 'personality' | 'health' | 'abilities' | 'attacks' | 'equipment' | 'inventory' | 'stats';

interface CharacterContextType {
  character: Character | null;
  charactersList: CharacterPreview[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  updateCharacter: (character: Character) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  loadCharacter: (characterId: string) => void;
  createCharacter: (character: Character) => string;
  deleteCharacter: (characterId: string) => void;
  clearCharacter: () => void;
  exportToJSON: (characterId?: string) => void;
  importFromJSON: (file: File) => Promise<string>;
  goToCharacterList: () => void;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

const CHARACTERS_LIST_KEY = 'trpg_characters_list';

const getCharacterStorageKey = (id: string) => `trpg_character_${id}`;

const normalizeCharacter = (parsed: any): Character => {
  return {
    ...parsed,
    id: parsed.id,
    level: parsed.level || 1,
    experience: parsed.experience || 0,
    speed: parsed.speed || 30,
    armorClass: parsed.armorClass || 10,
    sanity: parsed.sanity !== undefined ? parsed.sanity : 50,
    currentHP: parsed.currentHP !== undefined ? parsed.currentHP : 10,
    maxHP: parsed.maxHP || 10,
    tempHP: parsed.tempHP || 0,
    maxHPBonus: parsed.maxHPBonus || 0,
    limbs: parsed.limbs || [],
    inventory: parsed.inventory || [],
    inventoryNotes: parsed.inventoryNotes || '',
    attacksNotes: parsed.attacksNotes || '',
    equipmentNotes: parsed.equipmentNotes || '',
    abilitiesNotes: parsed.abilitiesNotes || '',
    attacks: (parsed.attacks || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
    abilities: (parsed.abilities || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
    attributeBonuses: parsed.attributeBonuses || {},
    savingThrowProficiencies: parsed.savingThrowProficiencies || [],
    resources: parsed.resources || [],
    currency: parsed.currency || { copper: 0, silver: 0, gold: 0 },
    skills: parsed.skills || [],
    proficiencyBonus: parsed.proficiencyBonus || 2,
    languagesAndProficiencies: parsed.languagesAndProficiencies || '',
    appearance: parsed.appearance || '',
    backstory: parsed.backstory || '',
    alignment: parsed.alignment || '',
    alliesAndOrganizations: parsed.alliesAndOrganizations || '',
    personalityTraits: parsed.personalityTraits || '',
    ideals: parsed.ideals || '',
    bonds: parsed.bonds || '',
    flaws: parsed.flaws || '',
    traits: parsed.traits || [],
    subrace: parsed.subrace,
    avatar: parsed.avatar,
  };
};

export const CharacterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [charactersList, setCharactersList] = useState<CharacterPreview[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('personality');

  // Загружаем список персонажей при монтировании и мигрируем старые данные
  useEffect(() => {
    migrateOldData();
    loadCharactersList();
  }, []);

  const migrateOldData = () => {
    try {
      // Проверяем старый формат (один персонаж в 'trpg_character')
      const oldCharacter = localStorage.getItem('trpg_character');
      if (oldCharacter) {
        try {
          const parsed = JSON.parse(oldCharacter);
          if (parsed && typeof parsed === 'object' && parsed.name && parsed.attributes) {
            // Мигрируем старого персонажа в новый формат
            const id = `char_migrated_${Date.now()}`;
            const normalized = normalizeCharacter({ ...parsed, id });
            
            // Сохраняем в новом формате
            localStorage.setItem(getCharacterStorageKey(id), JSON.stringify(normalized));
            
            // Добавляем в список
            const preview: CharacterPreview = {
              id,
              name: normalized.name,
              class: normalized.class,
              subclass: normalized.subclass,
              level: normalized.level,
              currentHP: normalized.currentHP,
              maxHP: normalized.maxHP,
              avatar: normalized.avatar,
            };
            
            const existingList = (() => {
              try {
                const saved = localStorage.getItem(CHARACTERS_LIST_KEY);
                return saved ? JSON.parse(saved) : [];
              } catch {
                return [];
              }
            })();
            
            if (!existingList.find((c: CharacterPreview) => c.id === id)) {
              localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify([...existingList, preview]));
            }
            
            // Удаляем старый формат
            localStorage.removeItem('trpg_character');
          }
        } catch (e) {
          console.error('Failed to migrate old character:', e);
        }
      }
    } catch (e) {
      console.error('Failed to migrate old data:', e);
    }
  };

  const loadCharactersList = () => {
    try {
      const saved = localStorage.getItem(CHARACTERS_LIST_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        setCharactersList(Array.isArray(list) ? list : []);
      } else {
        setCharactersList([]);
      }
    } catch (e) {
      console.error('Failed to load characters list:', e);
      setCharactersList([]);
    }
  };

  const saveCharactersList = (list: CharacterPreview[]) => {
    try {
      localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(list));
      setCharactersList(list);
    } catch (e) {
      console.error('Failed to save characters list:', e);
    }
  };

  const updateCharacter = (newCharacter: Character) => {
    if (!newCharacter.id) {
      console.error('Character must have an ID');
      return;
    }

    const normalized = normalizeCharacter(newCharacter);
    if (!normalized.id) {
      console.error('Normalized character must have an ID');
      return;
    }
    
    setCharacter(normalized);
    
    // Сохраняем персонажа
    try {
      localStorage.setItem(getCharacterStorageKey(normalized.id), JSON.stringify(normalized));
      
      // Обновляем список персонажей
      const updatedList = charactersList.map(c => 
        c.id === normalized.id 
          ? {
              id: normalized.id,
              name: normalized.name,
              class: normalized.class,
              subclass: normalized.subclass,
              level: normalized.level,
              currentHP: normalized.currentHP,
              maxHP: normalized.maxHP,
              avatar: normalized.avatar,
            }
          : c
      );
      
      // Если персонажа нет в списке, добавляем
      if (!updatedList.find(c => c.id === normalized.id)) {
        updatedList.push({
          id: normalized.id,
          name: normalized.name,
          class: normalized.class,
          subclass: normalized.subclass,
          level: normalized.level,
          currentHP: normalized.currentHP,
          maxHP: normalized.maxHP,
          avatar: normalized.avatar,
        });
      }
      
      saveCharactersList(updatedList);
    } catch (e) {
      console.error('Failed to save character:', e);
    }
  };

  const updateResourceCount = (resourceId: string, delta: number) => {
    if (!character) return;
    const resource = character.resources.find(r => r.id === resourceId);
    if (!resource) return;
    
    const newCurrent = Math.min(resource.max, Math.max(0, resource.current + delta));
    const newResources = character.resources.map(r =>
      r.id === resourceId ? { ...r, current: newCurrent } : r
    );
    updateCharacter({ ...character, resources: newResources });
  };

  const loadCharacter = (characterId: string) => {
    try {
      const saved = localStorage.getItem(getCharacterStorageKey(characterId));
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized = normalizeCharacter(parsed);
        setCharacter(normalized);
      } else {
        console.error('Character not found:', characterId);
      }
    } catch (e) {
      console.error('Failed to load character:', e);
    }
  };

  const createCharacter = (newCharacter: Character): string => {
    const id = newCharacter.id || `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const characterWithId = { ...newCharacter, id };
    const normalized = normalizeCharacter(characterWithId);
    
    // Сохраняем персонажа
    try {
      localStorage.setItem(getCharacterStorageKey(id), JSON.stringify(normalized));
      
      // Добавляем в список
      const preview: CharacterPreview = {
        id,
        name: normalized.name,
        class: normalized.class,
        subclass: normalized.subclass,
        level: normalized.level,
        currentHP: normalized.currentHP,
        maxHP: normalized.maxHP,
        avatar: normalized.avatar,
      };
      
      const updatedList = [...charactersList, preview];
      saveCharactersList(updatedList);
      
      setCharacter(normalized);
      return id;
    } catch (e) {
      console.error('Failed to create character:', e);
      throw e;
    }
  };

  const deleteCharacter = (characterId: string) => {
    try {
      // Удаляем из localStorage
      localStorage.removeItem(getCharacterStorageKey(characterId));
      
      // Удаляем из списка
      const updatedList = charactersList.filter(c => c.id !== characterId);
      saveCharactersList(updatedList);
      
      // Если удаляемый персонаж был загружен, очищаем
      if (character?.id === characterId) {
        setCharacter(null);
      }
    } catch (e) {
      console.error('Failed to delete character:', e);
    }
  };

  const clearCharacter = () => {
    setCharacter(null);
  };

  const goToCharacterList = () => {
    setCharacter(null);
  };

  const exportToJSON = (characterId?: string) => {
    const charToExport = characterId 
      ? (() => {
          try {
            const saved = localStorage.getItem(getCharacterStorageKey(characterId));
            return saved ? JSON.parse(saved) : null;
          } catch {
            return null;
          }
        })()
      : character;
    
    if (!charToExport) return;
    
    const dataStr = JSON.stringify(charToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${charToExport.name || 'character'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          
          // Validate basic structure
          if (!parsed || typeof parsed !== 'object' || !parsed.name || !parsed.attributes) {
            reject(new Error('Invalid character data'));
            return;
          }
          
          const normalized = normalizeCharacter(parsed);
          const id = normalized.id || `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const characterWithId = { ...normalized, id };
          
          // Сохраняем персонажа
          localStorage.setItem(getCharacterStorageKey(id), JSON.stringify(characterWithId));
          
          // Добавляем в список
          const preview: CharacterPreview = {
            id,
            name: characterWithId.name,
            class: characterWithId.class,
            subclass: characterWithId.subclass,
            level: characterWithId.level,
            currentHP: characterWithId.currentHP,
            maxHP: characterWithId.maxHP,
            avatar: characterWithId.avatar,
          };
          
          const updatedList = [...charactersList.filter(c => c.id !== id), preview];
          saveCharactersList(updatedList);
          
          setCharacter(characterWithId);
          resolve(id);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return (
    <CharacterContext.Provider
      value={{
        character,
        charactersList,
        activeTab,
        setActiveTab,
        updateCharacter,
        updateResourceCount,
        loadCharacter,
        createCharacter,
        deleteCharacter,
        clearCharacter,
        exportToJSON,
        importFromJSON,
        goToCharacterList,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacter = () => {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error('useCharacter must be used within CharacterProvider');
  }
  return context;
};
