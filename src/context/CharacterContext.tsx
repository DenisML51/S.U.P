import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Character, Resistance } from '../types';
import { toast } from 'react-hot-toast';

export interface CharacterPreview {
  id: string;
  name: string;
  class: string;
  subclass: string;
  level: number;
  currentHP: number;
  maxHP: number;
  avatar?: string;
  resistances?: Resistance[];
}

export type TabType = 'personality' | 'health' | 'abilities' | 'spells' | 'attacks' | 'equipment' | 'inventory' | 'stats';

interface CharacterContextType {
  character: Character | null;
  charactersList: CharacterPreview[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  updateCharacter: (character: Character | ((prev: Character) => Character), silent?: boolean) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  logHistory: (message: string, type?: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other') => void;
  loadCharacter: (characterId: string) => void;
  createCharacter: (character: Character) => string;
  deleteCharacter: (characterId: string) => void;
  clearCharacter: () => void;
  exportToJSON: (characterId?: string) => void;
  importFromJSON: (file: File) => Promise<string>;
  goToCharacterList: () => void;
  settings: { storagePath: string | null; autoSave: boolean; compactCards: boolean; notifications: boolean };
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

const CHARACTERS_LIST_KEY = 'trpg_characters_list';

const getCharacterStorageKey = (id: string) => `trpg_character_${id}`;

const normalizeCharacter = (parsed: any): Character => {
  const sanity = (parsed.sanity !== undefined && !isNaN(Number(parsed.sanity))) ? Number(parsed.sanity) : 50;
  const currentHP = (parsed.currentHP !== undefined && !isNaN(Number(parsed.currentHP))) ? Number(parsed.currentHP) : 10;
  
  return {
    ...parsed,
    id: parsed.id,
    level: parsed.level || 1,
    experience: parsed.experience || 0,
    speed: parsed.speed || 30,
    armorClass: parsed.armorClass || 10,
    sanity: isNaN(sanity) ? 50 : sanity,
    currentHP: isNaN(currentHP) ? 10 : currentHP,
    maxHP: parsed.maxHP || 10,
    tempHP: parsed.tempHP || 0,
    maxHPBonus: parsed.maxHPBonus || 0,
    limbs: (parsed.limbs || []).map((l: any) => ({
      ...l,
      currentHP: isNaN(Number(l.currentHP)) ? (l.maxHP || 10) : Number(l.currentHP),
      maxHP: isNaN(Number(l.maxHP)) ? 10 : Number(l.maxHP),
      ac: isNaN(Number(l.ac)) ? 10 : Number(l.ac)
    })),
    inventory: parsed.inventory || [],
    inventoryNotes: parsed.inventoryNotes || '',
    attacksNotes: parsed.attacksNotes || '',
    equipmentNotes: parsed.equipmentNotes || '',
    abilitiesNotes: parsed.abilitiesNotes || '',
    spells: parsed.spells || [],
    spellsNotes: parsed.spellsNotes || '',
    knownSchools: parsed.knownSchools || [
      'Воплощение', 'Вызов', 'Иллюзия', 'Некромантия', 
      'Очарование', 'Преобразование', 'Прорицание', 'Ограждение'
    ],
    maxPreparedSpells: parsed.maxPreparedSpells || {
      0: 99, 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1
    },
    attacks: (parsed.attacks || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
    abilities: (parsed.abilities || []).map((a: any) => ({ ...a, actionType: a.actionType || 'action' })),
    attributeBonuses: parsed.attributeBonuses || {},
    savingThrowProficiencies: parsed.savingThrowProficiencies || [],
    initiativeBonus: parsed.initiativeBonus || 0,
    resources: (parsed.resources || []).map((r: any) => ({
      ...r,
      current: isNaN(Number(r.current)) ? (r.max || 0) : Number(r.current),
      max: isNaN(Number(r.max)) ? 0 : Number(r.max)
    })),
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
    conditions: parsed.conditions || [],
    resistances: parsed.resistances || [],
    history: parsed.history || [],
    subrace: parsed.subrace,
    avatar: parsed.avatar,
  };
};

export const CharacterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [charactersList, setCharactersList] = useState<CharacterPreview[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('personality');
  const [settings, setSettings] = useState({
    storagePath: localStorage.getItem('trpg_storage_path'),
    autoSave: localStorage.getItem('trpg_auto_save') !== 'false',
    compactCards: localStorage.getItem('trpg_compact_cards') === 'true',
    notifications: localStorage.getItem('trpg_notifications') !== 'false',
  });

  const updateCharacter = async (newCharacterOrUpdater: Character | ((prev: Character) => Character), silent: boolean = false) => {
    if (typeof newCharacterOrUpdater === 'function') {
      setCharacter(prev => {
        if (!prev) return null;
        const updated = newCharacterOrUpdater(prev);
        return normalizeCharacter(updated);
      });
    } else {
      const normalized = normalizeCharacter(newCharacterOrUpdater);
      setCharacter(normalized);
    }
    
    // Silence notification logic is already handled in the useEffect that watches 'character'
  };

  // Sync character changes to storage and list
  useEffect(() => {
    if (character && isLoaded) {
      saveToStorage(character, true);
      updateList(character);
    }
  }, [character, isLoaded]);

  const updateList = (normalized: Character) => {
    setCharactersList(prevList => {
      const existingIndex = prevList.findIndex(c => c.id === normalized.id);
      let updatedList;
      
      const preview: CharacterPreview = {
        id: normalized.id!,
        name: normalized.name,
        class: normalized.class,
        subclass: normalized.subclass,
        level: normalized.level,
        currentHP: normalized.currentHP,
        maxHP: normalized.maxHP,
        avatar: normalized.avatar,
        resistances: normalized.resistances,
      };

      if (existingIndex >= 0) {
        updatedList = [...prevList];
        updatedList[existingIndex] = preview;
      } else {
        updatedList = [...prevList, preview];
      }
      
      localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(updatedList));
      return updatedList;
    });
  };

  const saveToStorage = async (normalized: Character, silent: boolean) => {
    try {
      if (settings.storagePath && (window as any).electronAPI) {
        const filePath = `${settings.storagePath}/${normalized.id}.json`;
        await (window as any).electronAPI.saveCharacter(filePath, normalized);
      } else {
        localStorage.setItem(getCharacterStorageKey(normalized.id!), JSON.stringify(normalized));
      }

      if (settings.notifications && !silent) {
        toast.success('Персонаж сохранен');
      }
    } catch (e) {
      console.error('Failed to save character:', e);
    }
  };

  const logHistory = (message: string, type: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other' = 'other') => {
    const newEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      message,
      type
    };

    setCharacter(prev => {
      if (!prev) return null;
      const history = Array.isArray(prev.history) ? prev.history : [];
      const updatedHistory = [newEntry, ...history].slice(0, 10);
      return { ...prev, history: updatedHistory };
    });
  };

  const updateResourceCount = (resourceId: string, delta: number) => {
    setCharacter(prev => {
      if (!prev) return null;
      const resource = prev.resources.find(r => r.id === resourceId);
      if (!resource) return prev;
      
      const currentVal = isNaN(Number(resource.current)) ? 0 : Number(resource.current);
      const maxVal = isNaN(Number(resource.max)) ? 0 : Number(resource.max);
      
      const newCurrent = Math.min(maxVal, Math.max(0, currentVal + delta));
      const newResources = prev.resources.map(r =>
        r.id === resourceId ? { ...r, current: newCurrent } : r
      );
      
      if (delta !== 0) {
        const message = delta < 0 
          ? `Потрачен ресурс: ${resource.name} (${newCurrent}/${maxVal})`
          : `Восстановлен ресурс: ${resource.name} (${newCurrent}/${maxVal})`;
        
        setTimeout(() => logHistory(message, 'resource'), 0);
      }

      if (settings.notifications && delta !== 0) {
        if (delta < 0) toast.error(`${resource.name}: ${newCurrent}/${maxVal}`);
        else toast.success(`${resource.name}: ${newCurrent}/${maxVal}`);
      }

      return { ...prev, resources: newResources };
    });
  };

  const loadCharacter = async (characterId: string) => {
    try {
      if (settings.storagePath && (window as any).electronAPI) {
        const filePath = `${settings.storagePath}/${characterId}.json`;
        const characters = await (window as any).electronAPI.loadCharacters(settings.storagePath);
        const char = characters.find((c: Character) => c.id === characterId);
        if (char) {
          const normalized = normalizeCharacter(char);
          setCharacter(normalized);
          if (settings.notifications) {
            toast.success(`Загружен: ${normalized.name}`);
          }
        }
        return;
      }

      const saved = localStorage.getItem(getCharacterStorageKey(characterId));
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized = normalizeCharacter(parsed);
        setCharacter(normalized);
        if (settings.notifications) {
          toast.success(`Загружен: ${normalized.name}`);
        }
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
      if (settings.storagePath && (window as any).electronAPI) {
        const filePath = `${settings.storagePath}/${id}.json`;
        (window as any).electronAPI.saveCharacter(filePath, normalized);
      } else {
        localStorage.setItem(getCharacterStorageKey(id), JSON.stringify(normalized));
      }
      
      const preview: CharacterPreview = {
        id,
        name: normalized.name,
        class: normalized.class,
        subclass: normalized.subclass,
        level: normalized.level,
        currentHP: normalized.currentHP,
        maxHP: normalized.maxHP,
        avatar: normalized.avatar,
        resistances: normalized.resistances,
      };
      
      setCharactersList(prev => {
        const newList = [...prev, preview];
        localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(newList));
        return newList;
      });
      
      setCharacter(normalized);
      return id;
    } catch (e) {
      console.error('Failed to create character:', e);
      throw e;
    }
  };

  const deleteCharacter = async (characterId: string) => {
    try {
      if (settings.storagePath && (window as any).electronAPI) {
        const filePath = `${settings.storagePath}/${characterId}.json`;
        await (window as any).electronAPI.deleteCharacter(filePath);
      } else {
        localStorage.removeItem(getCharacterStorageKey(characterId));
      }
      
      setCharactersList(prev => {
        const newList = prev.filter(c => c.id !== characterId);
        localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(newList));
        return newList;
      });
      
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
    const id = characterId || character?.id;
    if (!id) return;

    const saved = localStorage.getItem(getCharacterStorageKey(id));
    if (!saved) return;
    
    const charToExport = JSON.parse(saved);
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
          
          if (!parsed || typeof parsed !== 'object' || !parsed.name || !parsed.attributes) {
            reject(new Error('Invalid character data'));
            return;
          }
          
          const normalized = normalizeCharacter(parsed);
          const id = normalized.id || `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const characterWithId = { ...normalized, id };
          
          localStorage.setItem(getCharacterStorageKey(id), JSON.stringify(characterWithId));
          
          const preview: CharacterPreview = {
            id,
            name: characterWithId.name,
            class: characterWithId.class,
            subclass: characterWithId.subclass,
            level: characterWithId.level,
            currentHP: characterWithId.currentHP,
            maxHP: characterWithId.maxHP,
            avatar: characterWithId.avatar,
            resistances: characterWithId.resistances,
          };
          
          setCharactersList(prev => {
            const newList = [...prev.filter(c => c.id !== id), preview];
            localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(newList));
            return newList;
          });
          
          setCharacter(characterWithId);
          if (settings.notifications) {
            toast.success(`Персонаж ${characterWithId.name} импортирован`);
          }
          resolve(id);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const loadCharactersList = async () => {
    try {
      if (settings.storagePath && (window as any).electronAPI) {
        const characters = await (window as any).electronAPI.loadCharacters(settings.storagePath);
        const previews: CharacterPreview[] = characters.map((c: Character) => ({
          id: c.id,
          name: c.name,
          class: c.class,
          subclass: c.subclass,
          level: c.level,
          currentHP: c.currentHP,
          maxHP: c.maxHP,
          avatar: c.avatar,
          resistances: c.resistances,
        }));
        setCharactersList(previews);
        setIsLoaded(true);
        return;
      }

      const saved = localStorage.getItem(CHARACTERS_LIST_KEY);
      let list = [];
      if (saved) {
        list = JSON.parse(saved);
        if (!Array.isArray(list)) list = [];
      }

      // Recovery logic if list is empty
      if (list.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('trpg_character_')) {
            try {
              const charData = JSON.parse(localStorage.getItem(key)!);
              if (charData && charData.id && charData.name) {
                list.push({
                  id: charData.id,
                  name: charData.name,
                  class: charData.class,
                  subclass: charData.subclass,
                  level: charData.level,
                  currentHP: charData.currentHP,
                  maxHP: charData.maxHP,
                  avatar: charData.avatar,
                  resistances: charData.resistances,
                });
              }
            } catch (e) {}
          }
        }
        if (list.length > 0) {
          localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(list));
        }
      }

      setCharactersList(list);
      setIsLoaded(true);
    } catch (e) {
      console.error('Failed to load characters list:', e);
      setCharactersList([]);
      setIsLoaded(true);
    }
  };

  const migrateOldData = () => {
    try {
      const oldCharacter = localStorage.getItem('trpg_character');
      if (oldCharacter) {
        try {
          const parsed = JSON.parse(oldCharacter);
          if (parsed && typeof parsed === 'object' && parsed.name && parsed.attributes) {
            const id = `char_migrated_${Date.now()}`;
            const normalized = normalizeCharacter({ ...parsed, id });
            localStorage.setItem(getCharacterStorageKey(id), JSON.stringify(normalized));
            
            const preview: CharacterPreview = {
              id,
              name: normalized.name,
              class: normalized.class,
              subclass: normalized.subclass,
              level: normalized.level,
              currentHP: normalized.currentHP,
              maxHP: normalized.maxHP,
              avatar: normalized.avatar,
              resistances: normalized.resistances,
            };
            
            setCharactersList(prev => {
              const newList = [...prev, preview];
              localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(newList));
              return newList;
            });
            
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

  useEffect(() => {
    const initialize = async () => {
      migrateOldData();
      await loadCharactersList();
    };
    initialize();

    const handleSettingsUpdate = (e: any) => {
      const s = e.detail;
      setSettings({
        storagePath: s.storagePath,
        autoSave: s.autoSave,
        compactCards: s.compactCards,
        notifications: s.showNotifications,
      });
    };
    window.addEventListener('app-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('app-settings-updated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      loadCharactersList();
    }
  }, [settings.storagePath]);

  return (
    <CharacterContext.Provider
      value={{
        character,
        charactersList,
        activeTab,
        setActiveTab,
        updateCharacter,
        updateResourceCount,
        logHistory,
        loadCharacter,
        createCharacter,
        deleteCharacter,
        clearCharacter,
        exportToJSON,
        importFromJSON,
        goToCharacterList,
        settings,
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
