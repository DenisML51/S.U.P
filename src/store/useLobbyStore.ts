import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import {
  createLobbyApi,
  getLobbyApi,
  joinLobbyApi,
  leaveLobbyApi,
  sendMasterMessageApi,
  sendMasterNotificationApi
} from '../api/lobbies';
import { LobbySocketClient } from '../api/lobbySocket';
import type {
  CombatFeedEntry,
  CombatEventType,
  CombatState,
  LobbyMember,
  LobbyMessage,
  LobbyRole,
  LobbyStatePayload
} from '../types/lobby';
import { useCharacterStore } from './useCharacterStore';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type LobbyAnchor = { top: number; left: number } | null;

interface LobbyStoreState {
  lobby: LobbyStatePayload['lobby'] | null;
  meRole: LobbyRole | null;
  members: LobbyMember[];
  messages: LobbyMessage[];
  combatFeed: CombatFeedEntry[];
  combatState: CombatState | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  lobbyKeyInput: string;
  selectedCharacterId: string;
  isLobbyModalOpen: boolean;
  lobbyModalAnchor: LobbyAnchor;
  isLobbyPageOpen: boolean;
  socketClient: LobbySocketClient | null;
  setLobbyKeyInput: (value: string) => void;
  setSelectedCharacterId: (value: string) => void;
  openLobbyModal: (anchor?: { top: number; left: number }) => void;
  closeLobbyModal: () => void;
  openLobbyPage: () => void;
  closeLobbyPage: () => void;
  createLobby: () => Promise<void>;
  joinLobbyByKey: (key: string, characterId?: string) => Promise<void>;
  loadLobby: (key: string) => Promise<void>;
  leaveLobby: () => Promise<void>;
  changeLobbyCharacter: (characterId: string) => Promise<void>;
  sendMasterMessage: (text: string) => Promise<void>;
  sendMasterNotification: (text: string, title?: string) => Promise<void>;
  connectSocket: () => void;
  disconnectSocket: () => void;
  sendCombatEvent: (eventType: CombatEventType, payload: Record<string, unknown>) => void;
  addCombatFeedEntry: (entry: Omit<CombatFeedEntry, 'id' | 'createdAt'>) => void;
  applyLobbyState: (payload: LobbyStatePayload | null) => void;
  applyCombatState: (payload: CombatState) => void;
  restoreLobbySession: () => Promise<void>;
}

const normalizeKey = (key: string): string => key.trim().toUpperCase();
const LOBBY_SESSION_STORAGE_KEY = 'itd_lobby_session_v1';

type CachedLobbySession = {
  key: string;
  selectedCharacterId?: string;
};

const saveLobbySession = (session: CachedLobbySession) => {
  try {
    localStorage.setItem(LOBBY_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore storage failures (private mode / quota)
  }
};

const readLobbySession = (): CachedLobbySession | null => {
  try {
    const raw = localStorage.getItem(LOBBY_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<CachedLobbySession>;
    if (!parsed.key || typeof parsed.key !== 'string') {
      return null;
    }
    return {
      key: normalizeKey(parsed.key),
      selectedCharacterId:
        typeof parsed.selectedCharacterId === 'string' ? parsed.selectedCharacterId : undefined
    };
  } catch {
    return null;
  }
};

const clearLobbySession = () => {
  try {
    localStorage.removeItem(LOBBY_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

const getCharacterContext = (): { characterId?: string } => {
  const character = useCharacterStore.getState().character;
  return character?.id ? { characterId: character.id } : {};
};

const makeFeedEntry = (
  source: CombatFeedEntry['source'],
  text: string
): CombatFeedEntry => ({
  id: `feed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  source,
  text,
  createdAt: new Date().toISOString()
});

const fromMasterMessage = (message: LobbyMessage): CombatFeedEntry => ({
  id: `master_${message.id}`,
  source: 'master',
  text: message.content,
  createdAt: message.createdAt
});

export const useLobbyStore = create<LobbyStoreState>((set, get) => ({
  lobby: null,
  meRole: null,
  members: [],
  messages: [],
  combatFeed: [],
  combatState: null,
  connectionStatus: 'idle',
  error: null,
  lobbyKeyInput: '',
  selectedCharacterId: '',
  isLobbyModalOpen: false,
  lobbyModalAnchor: null,
  isLobbyPageOpen: false,
  socketClient: null,

  setLobbyKeyInput: (value) => set({ lobbyKeyInput: value }),
  setSelectedCharacterId: (value) => set({ selectedCharacterId: value }),
  openLobbyModal: (anchor) => set({ isLobbyModalOpen: true, lobbyModalAnchor: anchor ?? null }),
  closeLobbyModal: () => set({ isLobbyModalOpen: false, lobbyModalAnchor: null }),
  openLobbyPage: () => set({ isLobbyPageOpen: true, isLobbyModalOpen: false, lobbyModalAnchor: null }),
  closeLobbyPage: () => set({ isLobbyPageOpen: false }),

  createLobby: async () => {
    const { selectedCharacterId } = get();
    const payload = await createLobbyApi({
      ...(selectedCharacterId ? { characterId: selectedCharacterId } : getCharacterContext())
    });
    get().applyLobbyState(payload);
    get().connectSocket();
    get().openLobbyPage();
  },

  joinLobbyByKey: async (key, characterId) => {
    const { selectedCharacterId } = get();
    const resolvedCharacterId =
      characterId ?? (selectedCharacterId || getCharacterContext().characterId);
    const payload = await joinLobbyApi(normalizeKey(key), resolvedCharacterId);
    get().applyLobbyState(payload);
    get().connectSocket();
    get().openLobbyPage();
  },

  loadLobby: async (key) => {
    const payload = await getLobbyApi(normalizeKey(key));
    get().applyLobbyState(payload);
  },

  leaveLobby: async () => {
    const { lobby } = get();
    if (!lobby) {
      return;
    }
    await leaveLobbyApi(lobby.key);
    get().disconnectSocket();
    set({
      lobby: null,
      meRole: null,
      members: [],
      messages: [],
      combatFeed: [],
      combatState: null,
      connectionStatus: 'idle',
      error: null,
      isLobbyPageOpen: false
    });
    clearLobbySession();
  },

  changeLobbyCharacter: async (characterId) => {
    const { lobby } = get();
    if (!lobby) return;
    set({ selectedCharacterId: characterId });
    const payload = await joinLobbyApi(lobby.key, characterId);
    get().applyLobbyState(payload);
  },

  sendMasterMessage: async (text) => {
    const { lobby, socketClient } = get();
    if (!lobby) {
      throw new Error('Lobby is not active');
    }
    if (socketClient) {
      socketClient.sendMasterMessage(text);
      return;
    }
    const response = await sendMasterMessageApi(lobby.key, text);
    set((state) => ({ messages: [...state.messages, response.message] }));
  },

  sendMasterNotification: async (text, title) => {
    const { lobby, meRole } = get();
    if (!lobby || meRole !== 'MASTER') {
      throw new Error('Only master can send notifications');
    }
    await sendMasterNotificationApi(lobby.key, text, title);
    toast.success('Уведомление отправлено');
  },

  connectSocket: () => {
    const { lobby, socketClient } = get();
    if (!lobby) {
      return;
    }
    socketClient?.disconnect();
    set({ connectionStatus: 'connecting' });

    const client = new LobbySocketClient({
      lobbyKey: lobby.key,
      onOpen: () => {
        set({ connectionStatus: 'connected', error: null });
      },
      onClose: () => {
        set((state) => ({
          connectionStatus: state.lobby ? 'reconnecting' : 'idle'
        }));
      },
      onError: (message) => {
        set({ connectionStatus: 'error', error: message });
      },
      onEvent: (event) => {
        if (event.type === 'lobby.state') {
          get().applyLobbyState(event.payload);
        } else if (event.type === 'master.message') {
          set((state) => ({
            messages: [...state.messages, event.payload],
            combatFeed: [
              ...state.combatFeed,
              fromMasterMessage(event.payload)
            ]
          }));
        } else if (event.type === 'combat.state') {
          get().applyCombatState(event.payload);
        } else if (event.type === 'error') {
          toast.error(event.payload.message);
        }
      }
    });

    set({ socketClient: client });
    client.connect();
  },

  disconnectSocket: () => {
    const { socketClient } = get();
    socketClient?.disconnect();
    set({ socketClient: null, connectionStatus: 'idle' });
  },

  sendCombatEvent: (eventType, payload) => {
    const { socketClient, lobby } = get();
    if (!lobby) {
      return;
    }
    if (!socketClient) {
      toast.error('Lobby socket is not connected');
      return;
    }
    socketClient.sendCombatEvent(eventType, payload);
  },

  addCombatFeedEntry: (entry) => {
    set((state) => ({
      combatFeed: [...state.combatFeed, makeFeedEntry(entry.source, entry.text)].slice(-120)
    }));
  },

  applyLobbyState: (payload) => {
    if (!payload) {
      return;
    }
    const selectedCharacterId = get().selectedCharacterId;
    set(() => ({
      lobby: payload.lobby,
      meRole: payload.meRole,
      members: payload.members,
      messages: payload.messages,
      combatState: payload.combatState,
      combatFeed: payload.messages.map((message) => fromMasterMessage(message)).slice(-120),
      selectedCharacterId
    }));
    saveLobbySession({
      key: payload.lobby.key,
      selectedCharacterId: selectedCharacterId || undefined
    });
  },

  applyCombatState: (payload) => {
    set((state) => ({
      combatState: payload,
      members: state.members.map((member) => {
        const combatMember = payload.membersCombat.find((item) => item.memberId === member.id);
        if (!combatMember) {
          return member;
        }
        return {
          ...member,
          avatar: combatMember.avatar ?? member.avatar,
          characterId: combatMember.characterId ?? member.characterId,
          currentAction: combatMember.currentAction,
          currentHP: combatMember.currentHP,
          maxHP: combatMember.maxHP
        };
      })
    }));
  },

  restoreLobbySession: async () => {
    const { lobby } = get();
    if (lobby) {
      return;
    }
    const cached = readLobbySession();
    if (!cached) {
      return;
    }
    try {
      const payload = await getLobbyApi(cached.key);
      get().applyLobbyState(payload);
      set({
        selectedCharacterId: cached.selectedCharacterId ?? '',
        isLobbyPageOpen: true
      });
      get().connectSocket();
    } catch {
      clearLobbySession();
    }
  }
}));
