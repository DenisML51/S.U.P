import { create } from 'zustand';
import { Character, Resistance, CharacterPreview, TabType, ViewMode } from '../types';
import { toast } from 'react-hot-toast';
import { translations, Locale } from '../i18n/translations';
import {
  createCharacterApi,
  deleteCharacterApi,
  getCharacterApi,
  listCharactersApi,
  updateCharacterApi
} from '../api/characters';

const getLocale = (): Locale => {
  const saved = localStorage.getItem('itd_locale');
  return saved === 'en' ? 'en' : 'ru';
};

const tStore = (key: string): string => {
  const locale = getLocale();
  return translations[locale][key] ?? translations.ru[key] ?? key;
};

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

  setCharacter: (character: Character | null) => void;
  setCharactersList: (list: CharacterPreview[]) => void;
  setActiveTab: (tab: TabType) => void;
  setViewMode: (mode: ViewMode) => void;
  setIsLoaded: (isLoaded: boolean) => void;
  updateCharacter: (updater: Character | ((prev: Character) => Character), silent?: boolean) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  logHistory: (message: string, type?: 'health' | 'sanity' | 'resource' | 'inventory' | 'exp' | 'other') => void;
  loadCharacter: (characterId: string) => Promise<void>;
  createCharacter: (character: Character) => Promise<string>;
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
    spellcastingDifficultyName:
      parsed.spellcastingDifficultyName && parsed.spellcastingDifficultyName !== 'СЛ ЗКЛ'
        ? parsed.spellcastingDifficultyName
        : '',
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
    if (!normalized.id) return;
    await updateCharacterApi(normalized.id, normalized);

    // Auto-save is silent to avoid noisy technical toasts.
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
        ? `${tStore('log.resourceSpent')}: ${resource.name} (${newCurrent}/${maxVal})`
        : `${tStore('log.resourceRestored')}: ${resource.name} (${newCurrent}/${maxVal})`;
      
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
      const { character } = await getCharacterApi(characterId);
      const char: Character | null = character ?? null;

      if (char) {
        const normalized = normalizeCharacter(char);
        set({ 
          character: normalized,
          activeTab: 'personality',
          viewMode: 'tabs'
        });
        if (settings.notifications) {
          toast.success(`${tStore('log.loaded')}: ${normalized.name}`);
        }
      }
    } catch (e) {
      console.error('Failed to load character:', e);
    }
  },

  createCharacter: async (newCharacter) => {
    const { settings, charactersList } = get();
    const id = newCharacter.id || `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const characterWithId = { ...newCharacter, id };
    const normalized = normalizeCharacter(characterWithId);

    let persistedId = id;
    try {
      const response = await createCharacterApi(normalized);
      persistedId = response.character.id || id;
    } catch (e) {
      console.error('Failed to create character:', e);
      toast.error(tStore('log.serverSaveFailed'));
      throw e;
    }

    const persistedCharacter = persistedId === normalized.id ? normalized : { ...normalized, id: persistedId };

    const newList = updateListInStorage(persistedCharacter, charactersList);
    set({ 
      character: persistedCharacter, 
      charactersList: newList,
      activeTab: 'personality',
      viewMode: 'tabs'
    });
    
    return persistedId;
  },

  deleteCharacter: async (characterId) => {
    const { charactersList, character } = get();
    try {
      await deleteCharacterApi(characterId);
      
      const newList = charactersList.filter(c => c.id !== characterId);
      
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
    try {
      const response = await listCharactersApi();
      set({ charactersList: response.characters, isLoaded: true });
    } catch (e) {
      console.error('Failed to load characters list:', e);
      set({ charactersList: [], isLoaded: true });
    }
  },

  migrateOldData: () => {
    // Local migration disabled after moving persistence to backend API.
  },

  exportToJSON: (characterId) => {
    const { character, charactersList } = get();
    const id = characterId || character?.id;
    if (!id) return;
    const charToExport = character?.id === id ? character : charactersList.find((c) => c.id === id);
    if (!charToExport) return;
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
      reader.onload = async (e) => {
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

          // Import should be idempotent for already-known ids: update existing or create new.
          const response = await updateCharacterApi(id, characterWithId);
          const persistedId = response.character.id || id;
          const persistedCharacter = persistedId === characterWithId.id
            ? characterWithId
            : { ...characterWithId, id: persistedId };

          const newList = updateListInStorage(persistedCharacter, charactersList);
          
          set({ 
            character: persistedCharacter, 
            charactersList: newList,
            activeTab: 'personality',
            viewMode: 'tabs'
          });
          if (settings.notifications) {
            toast.success(`${tStore('log.characterImported')}: ${persistedCharacter.name}`);
          }
          resolve(persistedId);
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
    logHistory(tStore('log.allResourcesRestoredLongRest'), 'resource');
    toast.success(tStore('log.allResourcesRestored'));
  },
}));

