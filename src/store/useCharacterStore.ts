import { create } from 'zustand';
import { Character, Resistance, CharacterPreview, TabType, ViewMode } from '../types';
import { toast } from 'react-hot-toast';

interface CharacterState {
  character: Character | null;
  charactersList: CharacterPreview[];
  activeTab: TabType;
  viewMode: ViewMode;
  isLoaded: boolean;
  settings: {
    storagePath: string | null;
    autoSave: boolean;
    compactCards: boolean;
    notifications: boolean;
  };

  // Actions
  setCharacter: (character: Character | null) => void;
  setCharactersList: (list: CharacterPreview[]) => void;
  setActiveTab: (tab: TabType) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsLoaded: (isLoaded: boolean) => void;
  updateCharacter: (updater: Character | ((prev: Character) => Character), silent?: boolean) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  logHistory: (message: string, type?: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other') => void;
  loadCharacter: (characterId: string) => Promise<void>;
  createCharacter: (character: Character) => string;
  deleteCharacter: (characterId: string) => Promise<void>;
  clearCharacter: () => void;
  exportToJSON: (characterId?: string) => void;
  importFromJSON: (file: File) => Promise<string>;
  goToCharacterList: () => void;
  loadCharactersList: () => Promise<void>;
  migrateOldData: () => void;
  updateSettings: (settings: Partial<CharacterState['settings']>) => void;
  resetAllResources: () => void;
}

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
    spellcastingDifficultyName: parsed.spellcastingDifficultyName || 'СЛ ЗКЛ',
    spellcastingDifficultyValue: parsed.spellcastingDifficultyValue || 10,
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

const saveToStorage = async (normalized: Character, settings: CharacterState['settings'], silent: boolean) => {
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

const updateListInStorage = (normalized: Character, prevList: CharacterPreview[]) => {
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
};

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  charactersList: [],
  activeTab: 'personality',
  viewMode: (localStorage.getItem('trpg_view_mode') as ViewMode) || 'tabs',
  isLoaded: false,
  settings: {
    storagePath: localStorage.getItem('trpg_storage_path'),
    autoSave: localStorage.getItem('trpg_auto_save') !== 'false',
    compactCards: localStorage.getItem('trpg_compact_cards') === 'true',
    notifications: localStorage.getItem('trpg_notifications') !== 'false',
  },

  setCharacter: (character) => set({ character }),
  setCharactersList: (charactersList) => set({ charactersList }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setViewMode: (viewMode) => {
    localStorage.setItem('trpg_view_mode', viewMode);
    set({ viewMode });
  },
  setIsLoaded: (isLoaded) => set({ isLoaded }),

  updateCharacter: (updater, silent = false) => {
    const { character, settings, charactersList } = get();
    if (!character) return;

    const updated = typeof updater === 'function' ? updater(character) : updater;
    const normalized = normalizeCharacter(updated);
    
    set({ character: normalized });
    
    // Sync to storage
    saveToStorage(normalized, settings, silent);
    const newList = updateListInStorage(normalized, charactersList);
    set({ charactersList: newList });
  },

  updateResourceCount: (resourceId, delta) => {
    const { character, updateCharacter, logHistory, settings } = get();
    if (!character) return;

    const resource = character.resources.find(r => r.id === resourceId);
    if (!resource) return;

    const currentVal = isNaN(Number(resource.current)) ? 0 : Number(resource.current);
    const maxVal = isNaN(Number(resource.max)) ? 0 : Number(resource.max);
    
    const newCurrent = Math.min(maxVal, Math.max(0, currentVal + delta));
    const newResources = character.resources.map(r =>
      r.id === resourceId ? { ...r, current: newCurrent } : r
    );

    if (delta !== 0) {
      const message = delta < 0 
        ? `Потрачен ресурс: ${resource.name} (${newCurrent}/${maxVal})`
        : `Восстановлен ресурс: ${resource.name} (${newCurrent}/${maxVal})`;
      
      logHistory(message, 'resource');

      if (settings.notifications) {
        if (delta < 0) toast.error(`${resource.name}: ${newCurrent}/${maxVal}`);
        else toast.success(`${resource.name}: ${newCurrent}/${maxVal}`);
      }
    }

    updateCharacter({ ...character, resources: newResources }, true);
  },

  logHistory: (message, type = 'other') => {
    const newEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      message,
      type
    };

    set(state => {
      if (!state.character) return state;
      const history = Array.isArray(state.character.history) ? state.character.history : [];
      const updatedHistory = [newEntry, ...history].slice(0, 10);
      return { 
        character: { ...state.character, history: updatedHistory } 
      };
    });
  },

  loadCharacter: async (characterId) => {
    const { settings } = get();
    try {
      let char: Character | null = null;
      if (settings.storagePath && (window as any).electronAPI) {
        const characters = await (window as any).electronAPI.loadCharacters(settings.storagePath);
        char = characters.find((c: Character) => c.id === characterId) || null;
      } else {
        const saved = localStorage.getItem(getCharacterStorageKey(characterId));
        if (saved) char = JSON.parse(saved);
      }

      if (char) {
        const normalized = normalizeCharacter(char);
        set({ 
          character: normalized,
          activeTab: 'personality',
          viewMode: 'tabs'
        });
        if (settings.notifications) {
          toast.success(`Загружен: ${normalized.name}`);
        }
      }
    } catch (e) {
      console.error('Failed to load character:', e);
    }
  },

  createCharacter: (newCharacter) => {
    const { settings, charactersList } = get();
    const id = newCharacter.id || `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const characterWithId = { ...newCharacter, id };
    const normalized = normalizeCharacter(characterWithId);
    
    saveToStorage(normalized, settings, true);
    const newList = updateListInStorage(normalized, charactersList);
    set({ 
      character: normalized, 
      charactersList: newList,
      activeTab: 'personality',
      viewMode: 'tabs'
    });
    
    return id;
  },

  deleteCharacter: async (characterId) => {
    const { settings, charactersList, character } = get();
    try {
      if (settings.storagePath && (window as any).electronAPI) {
        const filePath = `${settings.storagePath}/${characterId}.json`;
        await (window as any).electronAPI.deleteCharacter(filePath);
      } else {
        localStorage.removeItem(getCharacterStorageKey(characterId));
      }
      
      const newList = charactersList.filter(c => c.id !== characterId);
      localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(newList));
      
      set({ 
        charactersList: newList,
        character: character?.id === characterId ? null : character
      });
    } catch (e) {
      console.error('Failed to delete character:', e);
    }
  },

  clearCharacter: () => set({ character: null }),
  
  goToCharacterList: () => set({ character: null }),

  loadCharactersList: async () => {
    const { settings } = get();
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
        set({ charactersList: previews, isLoaded: true });
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

      set({ charactersList: list, isLoaded: true });
    } catch (e) {
      console.error('Failed to load characters list:', e);
      set({ charactersList: [], isLoaded: true });
    }
  },

  migrateOldData: () => {
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
            
            set(state => {
              const newList = [...state.charactersList, preview];
              localStorage.setItem(CHARACTERS_LIST_KEY, JSON.stringify(newList));
              return { charactersList: newList };
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
  },

  exportToJSON: (characterId) => {
    const { character } = get();
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
  },

  importFromJSON: async (file) => {
    const { charactersList, settings } = get();
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
          
          const newList = updateListInStorage(characterWithId, charactersList);
          
          set({ 
            character: characterWithId, 
            charactersList: newList,
            activeTab: 'personality',
            viewMode: 'tabs'
          });
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
  },

  updateSettings: (newSettings) => set(state => ({
    settings: { ...state.settings, ...newSettings }
  })),

  resetAllResources: () => {
    const { character, updateCharacter, logHistory } = get();
    if (!character) return;

    const newResources = character.resources.map(r => ({
      ...r,
      current: r.max
    }));

    updateCharacter({ ...character, resources: newResources }, true);
    logHistory('Все ресурсы восстановлены (Длинный отдых)', 'resource');
    toast.success('Все ресурсы восстановлены');
  },
}));

