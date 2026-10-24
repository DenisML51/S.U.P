import {
  CharacterMigrationError,
  CharacterSchema,
  createCharacterDocument,
  deepEqual,
  migrateCharacter,
  newCharacterId,
  revertCharacter,
  toCharacterPreview,
  type Character,
  type CharacterDraft,
  type CharacterPreview,
  type HistoryEntryType,
} from '@itd/schema';
import {
  appendHistory,
  applyBuild,
  changeResource,
  createEntityId,
  hitDiceOf,
  longRest,
  performAction as performGameAction,
  rollDie,
  shortRest,
  type HistoryEvent,
  type PerformActionRequest,
  type PerformActionResult,
  type RestKind,
  type RestResult,
  type ShortRestOptions,
} from '@itd/game-logic';
import { toast } from 'react-hot-toast';
import type { z } from 'zod';
import { create } from 'zustand';
import { normalizeCharacter } from '../data/local/characterRepository';
import { loadSettings, saveSettings, type AppSettings } from '../data/settings';
import type { Workspace } from '../data/workspace';
import type { ViewMode } from '../types';
import { showUndoToast } from '../ui/UndoToast';

export type CharacterUpdater = Character | ((previous: Character) => Character);

export interface UpdateOptions {
  /** History entry recorded in the same write as the change. */
  log?: HistoryEvent;
  /**
   * `false` for writes that are not the player's edits (a log line, a rebuild on opening, an undo):
   * they are not put on the undo stack.
   */
  undoable?: boolean;
}

/** How many edits of one character can be undone in a session. */
export const UNDO_LIMIT = 50;

/** One edit that can be taken back: the character as it was before and right after it. */
interface UndoStep {
  /** The id of the log entry the edit wrote, when it wrote one. */
  id: string;
  label: string;
  before: Character;
  after: Character;
}

interface CharacterState {
  character: Character | null;
  charactersList: CharacterPreview[];
  viewMode: ViewMode;
  /** The character list has been read from the device for the signed-in account. */
  isLoaded: boolean;
  settings: AppSettings;
  /** Ids of the open character's edits that can still be undone, oldest first. */
  undoable: string[];
  /**
   * Set while a party's fight goes on and it is not this hero's turn: why the hero cannot act. Using
   * attacks, abilities, spells and resources, resting and editing entries wait for the hero's turn;
   * reactions, reading the sheet, rolls and hit point changes (being hit) do not.
   */
  turnLock: string | null;
  setTurnLock(lock: string | null): void;

  setViewMode(mode: ViewMode): void;
  updateSettings(patch: Partial<AppSettings>): void;

  /**
   * Changes the open character. A function receives the latest stored version, which is the safe
   * form; an object is treated as a patch of the fields that differ from the character on screen.
   */
  updateCharacter(updater: CharacterUpdater, options?: UpdateOptions): void;
  /**
   * Takes back the edit with this id and every later one (the last edit when no id is given). The
   * revert is an ordinary edit that syncs; changes from other devices made since are kept.
   */
  undo(stepId?: string): void;
  logHistory(message: string, type?: HistoryEntryType): void;
  updateResourceCount(resourceId: string, delta: number): void;
  /** Takes a short or long rest; returns what it changed. */
  rest(kind: RestKind, options?: Omit<ShortRestOptions, 'rolls' | 'random'>): RestResult | null;
  /** Uses an attack, ability or spell, paying its costs. Returns why it failed, if it did. */
  performAction(request: PerformActionRequest): PerformActionResult | null;

  /** Opens a character, on its sheet unless another view is asked for (a party's fight opens combat). */
  loadCharacter(characterId: string, view?: ViewMode): Promise<void>;
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

/** Undo stacks by character id: for this session only, never in the document. */
const undoStacks = new Map<string, UndoStep[]>();
const undoIds = (characterId: string): string[] => (undoStacks.get(characterId) ?? []).map((step) => step.id);

export const useCharacterStore = create<CharacterState>((set, get) => {
  const notify = (message: string, kind: 'success' | 'error' = 'success') => {
    if (get().settings.notifications) toast[kind](message);
  };

  /**
   * A preset hero picks up improvements of the preset content (damage that grows, saves) the moment
   * it is opened; the rebuild keeps uses, damage taken and preparation.
   */
  const refreshPreset = (character: Character) => {
    if (!character.build) return;
    const rebuilt = applyBuild(character, character.build).character;
    if (!deepEqual(rebuilt, character)) get().updateCharacter(() => rebuilt);
  };

  /** The entry a request uses is a reaction (an attack, ability or spell taken with the reaction). */
  const isReaction = (character: Character, request: PerformActionRequest): boolean => {
    const entries = request.kind === 'attack' ? character.attacks : request.kind === 'ability' ? character.abilities : character.spells;
    return entries.find((entry) => entry.id === request.id)?.actionType === 'reaction';
  };

  /** Refuses an action out of the hero's turn in a party's fight, saying why. */
  const refuseOffTurn = (): boolean => {
    const lock = get().turnLock;
    if (lock) toast.error(lock, { id: 'turn-lock' });
    return lock !== null;
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
      set({ character: null, undoable: [] });
      toast('Персонаж был удалён на другом устройстве', { icon: '🗑️' });
    } else if (get().character?.id === latest.id) {
      set({ character: latest });
    }
  };

  return {
    character: null,
    charactersList: [],
    viewMode: readViewMode(),
    isLoaded: false,
    settings: loadSettings(),
    undoable: [],
    turnLock: null,

    setTurnLock: (turnLock) => {
      if (get().turnLock !== turnLock) set({ turnLock });
    },

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

      // The edit runs on screen and again on the stored copy: its log entry is the same in both.
      const logId = log ? createEntityId('log') : undefined;
      const now = Date.now();
      const patch = typeof updater === 'function' ? null : changedFields(current, updater);
      const change = (doc: Character): Character => {
        const next = patch ? { ...doc, ...patch } : (updater as (previous: Character) => Character)(doc);
        return log ? appendHistory(next, log, now, logId) : next;
      };

      const parsed = CharacterSchema.safeParse(change(current));
      if (!parsed.success) {
        toast.error(`Изменение не сохранено — ${describeIssue(parsed.error.issues[0])}`);
        return;
      }

      set({ character: parsed.data, charactersList: replacePreview(parsed.data) });
      enqueueWrite(current.id, change);

      if (options?.undoable === false || deepEqual(current, parsed.data)) return;
      const step = { id: logId ?? createEntityId('edit'), label: log?.message ?? 'Правка листа', before: current, after: parsed.data };
      const stack = [...(undoStacks.get(current.id) ?? []), step].slice(-UNDO_LIMIT);
      undoStacks.set(current.id, stack);
      set({ undoable: stack.map((s) => s.id) });
      if (log && get().settings.notifications) showUndoToast(log.message, () => get().undo(step.id));
    },

    undo: (stepId) => {
      const current = get().character;
      const stack = current ? (undoStacks.get(current.id) ?? []) : [];
      const index = stepId === undefined ? stack.length - 1 : stack.findIndex((s) => s.id === stepId);
      if (!current || index < 0) return;

      const undone = stack.slice(index);
      const remaining = stack.slice(0, index);
      undoStacks.set(current.id, remaining);
      set({ undoable: remaining.map((s) => s.id) });

      const before = undone[0]!.before;
      const after = undone[undone.length - 1]!.after;
      const logIds = new Set(undone.map((s) => s.id));
      get().updateCharacter((doc) => revertCharacter(before, after, doc, logIds), { undoable: false });
      if (get().settings.notifications) {
        toast.success(undone.length > 1 ? `Отменено изменений: ${undone.length}` : `Отменено: ${undone[0]!.label}`);
      }
    },

    logHistory: (message, type = 'other') => {
      get().updateCharacter((doc) => doc, { log: { message, type }, undoable: false });
    },

    updateResourceCount: (resourceId, delta) => {
      if (refuseOffTurn()) return;
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
    },

    rest: (kind, options = {}) => {
      if (refuseOffTurn()) return null;
      const current = get().character;
      if (!current) return null;
      // Dice are rolled once here: the edit runs again on the stored copy and must heal the same.
      const hitDie = hitDiceOf(current)?.hitDie;
      const rolls =
        kind === 'short' && options.method !== 'average' && hitDie
          ? Array.from({ length: Math.max(0, options.hitDice ?? 0) }, () => rollDie(hitDie))
          : undefined;
      const apply = (doc: Character): RestResult => (kind === 'short' ? shortRest(doc, { ...options, rolls }) : longRest(doc));

      const result = apply(current);
      get().updateCharacter((doc) => apply(doc).character, { log: { message: result.message, type: 'resource' } });
      return result;
    },

    performAction: (request) => {
      const current = get().character;
      if (!current) return null;
      // A reaction answers someone else's turn: it is the one thing a hero may do out of their own.
      if (!isReaction(current, request) && refuseOffTurn()) return null;
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

    loadCharacter: async (characterId, view = 'tabs') => {
      const character = await workspace?.repository.get(characterId);
      if (!character) {
        toast.error('Персонаж не найден');
        return;
      }
      set({ character, viewMode: view, undoable: undoIds(character.id) });
      rememberOpen(character.id);
      refreshPreset(character);
    },

    createCharacter: async (draft) => {
      const repository = workspace?.repository;
      if (!repository) throw new Error('Нет активного аккаунта');
      const character = normalizeCharacter(createCharacterDocument(draft));
      await repository.create(character);
      set({
        character,
        charactersList: [...get().charactersList, toCharacterPreview(character)],
        viewMode: 'tabs',
        undoable: [],
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
        character = normalizeCharacter(migrateCharacter(JSON.parse(await file.text())));
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
        viewMode: 'tabs',
        undoable: [],
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
      set({ character: null, undoable: [] });
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
      undoStacks.clear();
      set({ character: null, charactersList: [], isLoaded: false, undoable: [] });
      if (!next) return;

      unsubscribeRepository = next.repository.subscribe((change) => {
        if (change.source !== 'local') void onRepositoryChange(change.ids);
      });
      await get().reloadList();

      const open = readOpen();
      const character = open ? await next.repository.get(open) : undefined;
      if (character && workspace === next) {
        set({ character, viewMode: 'tabs', undoable: [] });
        refreshPreset(character);
      }
    },
  };
});
