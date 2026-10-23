import {
  CharacterMigrationError,
  CharacterSchema,
  createCharacterDocument,
  migrateCharacter,
  newCharacterId,
  toCharacterPreview,
  type Character,
  type CharacterDraft,
  type CharacterPreview,
  type HistoryEntryType,
} from '@itd/schema';
import {
  appendHistory,
  changeResource,
  performAction as performGameAction,
  restoreAllResources,
  type HistoryEvent,
  type PerformActionRequest,
  type PerformActionResult,
} from '@itd/game-logic';
import { toast } from 'react-hot-toast';
import type { z } from 'zod';
import { create } from 'zustand';
import { loadSettings, saveSettings, type AppSettings } from '../data/settings';
import type { Workspace } from '../data/workspace';
import type { TabType, ViewMode } from '../types';

export type CharacterUpdater = Character | ((previous: Character) => Character);

export interface UpdateOptions {
  /** History entry recorded in the same write as the change. */
  log?: HistoryEvent;
}

interface CharacterState {
  character: Character | null;
  charactersList: CharacterPreview[];
  activeTab: TabType;
  viewMode: ViewMode;
  /** The character list has been read from the device for the signed-in account. */
  isLoaded: boolean;
  settings: AppSettings;

  setActiveTab(tab: TabType): void;
  setViewMode(mode: ViewMode): void;
  updateSettings(patch: Partial<AppSettings>): void;

  /**
   * Changes the open character. A function receives the latest stored version, which is the safe
   * form; an object is treated as a patch of the fields that differ from the character on screen.
   */
  updateCharacter(updater: CharacterUpdater, options?: UpdateOptions): void;
  logHistory(message: string, type?: HistoryEntryType): void;
  updateResourceCount(resourceId: string, delta: number): void;
  resetAllResources(): void;
  /** Uses an attack, ability or spell, paying its costs. Returns why it failed, if it did. */
  performAction(request: PerformActionRequest): PerformActionResult | null;

  loadCharacter(characterId: string): Promise<void>;
  createCharacter(draft: CharacterDraft): Promise<string>;
  deleteCharacter(characterId: string): Promise<void>;
  importFromJSON(file: File): Promise<string>;
  exportToJSON(characterId?: string): Promise<void>;
  goToCharacterList(): void;
  reloadList(): Promise<void>;

  /** Binds the store to the signed-in account's data (or unbinds it on sign-out). */
  attachWorkspace(workspace: Workspace | null): Promise<void>;
}

const VIEW_MODE_KEY = 'trpg_view_mode';
/** The sheet open in this tab, so a page reload returns to it instead of the hero list. */
const OPEN_CHARACTER_KEY = 'itd.openCharacterId';

const rememberOpen = (id: string | null) => {
  try {
    if (id) sessionStorage.setItem(OPEN_CHARACTER_KEY, id);
    else sessionStorage.removeItem(OPEN_CHARACTER_KEY);
  } catch {
    // Not remembered; a reload shows the hero list.
  }
};
const readOpen = (): string | null => {
  try {
    return sessionStorage.getItem(OPEN_CHARACTER_KEY);
  } catch {
    return null;
  }
};

const readViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'hotbar' ? 'hotbar' : 'tabs';
  } catch {
    return 'tabs';
  }
};

const describeIssue = (issue: z.core.$ZodIssue | undefined): string =>
  issue ? `${issue.path.join('.') || 'документ'}: ${issue.message}` : 'неизвестная ошибка';

/** Fields of `next` that are not the same objects as in `previous`: what an object-form update changed. */
const changedFields = (previous: Character, next: Character): Partial<Character> => {
  const patch: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    const value = (next as Record<string, unknown>)[key];
    if (value !== (previous as Record<string, unknown>)[key]) patch[key] = value;
  }
  return patch as Partial<Character>;
};

const downloadJson = (data: unknown, fileName: string) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

let workspace: Workspace | null = null;
let unsubscribeRepository: (() => void) | null = null;

/**
 * Edits waiting to be written, in order. The UI shows each edit immediately; the queue applies them
 * one by one to the stored document.
 */
const writeQueue: { id: string; edit: (doc: Character) => Character }[] = [];
let writing = false;

export const useCharacterStore = create<CharacterState>((set, get) => {
  const notify = (message: string, kind: 'success' | 'error' = 'success') => {
    if (get().settings.notifications) toast[kind](message);
  };

  const replacePreview = (doc: Character) =>
    get().charactersList.map((preview) => (preview.id === doc.id ? toCharacterPreview(doc) : preview));

  const flushWrites = async () => {
    if (writing) return;
    writing = true;
    try {
      while (writeQueue.length > 0) {
        const { id, edit } = writeQueue.shift()!;
        const repository = workspace?.repository;
        if (!repository) continue;
        try {
          const stored = await repository.update(id, edit);
          // Once the queue drains, show the stored truth: it includes any merged remote change.
          if (stored && writeQueue.length === 0 && get().character?.id === id) {
            set({ character: stored, charactersList: replacePreview(stored) });
          }
        } catch (error) {
          console.error('Failed to save character', error);
          toast.error('Не удалось сохранить изменения на устройстве');
        }
      }
    } finally {
      writing = false;
    }
  };

  const enqueueWrite = (id: string, edit: (doc: Character) => Character) => {
    writeQueue.push({ id, edit });
    void flushWrites();
  };

  /** Reacts to changes that did not come from this tab's edits: other tabs and the server. */
  const onRepositoryChange = async (ids: string[]) => {
    const repository = workspace?.repository;
    if (!repository) return;
    await get().reloadList();

    const open = get().character;
    if (!open || !ids.includes(open.id) || writeQueue.some((w) => w.id === open.id) || writing) return;
    const latest = await repository.get(open.id);
    if (!latest) {
      set({ character: null });
      toast('Персонаж был удалён на другом устройстве', { icon: '🗑️' });
    } else if (get().character?.id === latest.id) {
      set({ character: latest });
    }
  };

  return {
    character: null,
    charactersList: [],
    activeTab: 'personality',
    viewMode: readViewMode(),
    isLoaded: false,
    settings: loadSettings(),

    setActiveTab: (activeTab) => set({ activeTab }),

    setViewMode: (viewMode) => {
      try {
        localStorage.setItem(VIEW_MODE_KEY, viewMode);
      } catch {
        // Preference not persisted.
      }
      set({ viewMode });
    },

    updateSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      saveSettings(settings);
      set({ settings });
    },

    updateCharacter: (updater, options) => {
      const log = options?.log;
      const current = get().character;
      if (!current) return;

      const patch = typeof updater === 'function' ? null : changedFields(current, updater);
      const change = (doc: Character): Character => {
        const next = patch ? { ...doc, ...patch } : (updater as (previous: Character) => Character)(doc);
        return log ? appendHistory(next, log) : next;
      };

      const parsed = CharacterSchema.safeParse(change(current));
      if (!parsed.success) {
        toast.error(`Изменение не сохранено — ${describeIssue(parsed.error.issues[0])}`);
        return;
      }

      set({ character: parsed.data, charactersList: replacePreview(parsed.data) });
      enqueueWrite(current.id, change);
    },

    logHistory: (message, type = 'other') => {
      get().updateCharacter((doc) => doc, { log: { message, type } });
    },

    updateResourceCount: (resourceId, delta) => {
      const current = get().character;
      const preview = current && changeResource(current, resourceId, delta);
      if (!preview || preview.applied === 0) return;

      const { resource } = preview;
      const message =
        delta < 0
          ? `Потрачен ресурс: ${resource.name} (${resource.current}/${resource.max})`
          : `Восстановлен ресурс: ${resource.name} (${resource.current}/${resource.max})`;

      get().updateCharacter((doc) => changeResource(doc, resourceId, delta)?.character ?? doc, { log: { message, type: 'resource' },
      });
      notify(`${resource.name}: ${resource.current}/${resource.max}`, delta < 0 ? 'error' : 'success');
    },

    resetAllResources: () => {
      get().updateCharacter(restoreAllResources, { log: { message: 'Все ресурсы восстановлены (Длинный отдых)', type: 'resource' },
      });
      toast.success('Все ресурсы восстановлены');
    },

    performAction: (request) => {
      const current = get().character;
      if (!current) return null;
      const result = performGameAction(current, request);
      if (!result.ok) {
        toast.error(result.message);
        return result;
      }
      get().updateCharacter(
        (doc) => {
          const applied = performGameAction(doc, request);
          return applied.ok ? applied.character : doc;
        },
        { log: { message: result.message, type: 'other' } },
      );
      return result;
    },

    loadCharacter: async (characterId) => {
      const character = await workspace?.repository.get(characterId);
      if (!character) {
        toast.error('Персонаж не найден');
        return;
      }
      set({ character, activeTab: 'personality', viewMode: 'tabs' });
      rememberOpen(character.id);
    },

    createCharacter: async (draft) => {
      const repository = workspace?.repository;
      if (!repository) throw new Error('Нет активного аккаунта');
      const character = createCharacterDocument(draft);
      await repository.create(character);
      set({
        character,
        charactersList: [...get().charactersList, toCharacterPreview(character)],
        activeTab: 'personality',
        viewMode: 'tabs',
      });
      rememberOpen(character.id);
      return character.id;
    },

    deleteCharacter: async (characterId) => {
      await workspace?.repository.remove(characterId);
      set({
        charactersList: get().charactersList.filter((c) => c.id !== characterId),
        character: get().character?.id === characterId ? null : get().character,
      });
      if (readOpen() === characterId) rememberOpen(null);
    },

    importFromJSON: async (file) => {
      const repository = workspace?.repository;
      if (!repository) throw new Error('Нет активного аккаунта');

      let character: Character;
      try {
        character = migrateCharacter(JSON.parse(await file.text()));
      } catch (error) {
        const reason = error instanceof CharacterMigrationError ? error.message : 'файл не является JSON';
        toast.error(`Не удалось импортировать: ${reason}`);
        throw error;
      }
      // Importing a sheet that is already here creates a copy instead of overwriting it.
      if (await repository.has(character.id)) character = { ...character, id: newCharacterId() };

      await repository.create(character);
      set({
        character,
        charactersList: [...get().charactersList, toCharacterPreview(character)],
        activeTab: 'personality',
        viewMode: 'tabs',
      });
      rememberOpen(character.id);
      notify(`Персонаж ${character.name} импортирован`);
      return character.id;
    },

    exportToJSON: async (characterId) => {
      const id = characterId ?? get().character?.id;
      const character = id ? await workspace?.repository.get(id) : undefined;
      if (character) downloadJson(character, `${character.name || 'character'}.json`);
    },

    goToCharacterList: () => {
      rememberOpen(null);
      set({ character: null });
    },

    reloadList: async () => {
      const characters = (await workspace?.repository.list()) ?? [];
      set({ charactersList: characters.map(toCharacterPreview), isLoaded: true });
    },

    attachWorkspace: async (next) => {
      unsubscribeRepository?.();
      unsubscribeRepository = null;
      writeQueue.length = 0;
      workspace = next;
      set({ character: null, charactersList: [], isLoaded: false });
      if (!next) return;

      unsubscribeRepository = next.repository.subscribe((change) => {
        if (change.source !== 'local') void onRepositoryChange(change.ids);
      });
      await get().reloadList();

      const open = readOpen();
      const character = open ? await next.repository.get(open) : undefined;
      if (character && workspace === next) set({ character, viewMode: 'tabs' });
    },
  };
});
