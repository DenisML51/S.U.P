import type { PartyMessageDto } from '@itd/schema';
import { toast } from 'react-hot-toast';
import { create } from 'zustand';
import { ApiError, NetworkError, api } from '../data/api/client';
import type { Workspace } from '../data/workspace';

interface Chat {
  /** Oldest first. */
  items: PartyMessageDto[];
  hasMore: boolean;
}

/**
 * Talk at the party tables. Messages arrive over the socket the moment they are written (only to
 * those who may read them) and are appended here; history is fetched page by page.
 */
interface ChatState {
  chats: Record<string, Chat>;
  /** Messages from others not yet seen, by party. */
  unread: Record<string, number>;
  /** The party whose chat is on screen: its messages count as read on arrival. */
  reading: string | null;

  load(partyId: string): Promise<void>;
  loadOlder(partyId: string): Promise<void>;
  send(partyId: string, body: string, recipientId: string | null): Promise<boolean>;
  setReading(partyId: string | null): void;
  attach(workspace: Workspace | null): void;
}

/** Appends messages not yet held, keeping the order by time. */
const merge = (items: PartyMessageDto[], incoming: PartyMessageDto[]): PartyMessageDto[] => {
  const known = new Set(items.map((m) => m.id));
  const fresh = incoming.filter((m) => !known.has(m.id));
  return fresh.length === 0 ? items : [...items, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

let detach: (() => void) | null = null;
let me: string | null = null;

export const useChatStore = create<ChatState>((set, get) => {
  const put = (partyId: string, chat: Chat) => set({ chats: { ...get().chats, [partyId]: chat } });

  const receive = (partyId: string, message: PartyMessageDto) => {
    const chat = get().chats[partyId];
    if (chat) put(partyId, { ...chat, items: merge(chat.items, [message]) });
    if (message.authorId === me) return;
    if (get().reading !== partyId) set({ unread: { ...get().unread, [partyId]: (get().unread[partyId] ?? 0) + 1 } });
    // A private word reaches its reader wherever they are in the app.
    if (message.recipientId === me && get().reading !== partyId) {
      toast(`${message.authorName} — вам лично: ${message.body.length > 140 ? `${message.body.slice(0, 140)}…` : message.body}`, {
        icon: '✉️',
        duration: 8000,
      });
    }
  };

  return {
    chats: {},
    unread: {},
    reading: null,

    load: async (partyId) => {
      try {
        const page = await api.messages.list(partyId);
        const chat = get().chats[partyId];
        put(partyId, { items: merge(chat?.items ?? [], page.items), hasMore: chat ? chat.hasMore : page.hasMore });
      } catch {
        // Offline: what was loaded stays; a reconnect loads again.
      }
    },

    loadOlder: async (partyId) => {
      const chat = get().chats[partyId];
      const oldest = chat?.items[0];
      if (!chat?.hasMore || !oldest) return;
      try {
        const page = await api.messages.list(partyId, oldest.id);
        put(partyId, { items: merge(chat.items, page.items), hasMore: page.hasMore });
      } catch {
        // Try again on the next scroll to the top.
      }
    },

    send: async (partyId, body, recipientId) => {
      try {
        receive(partyId, await api.messages.send(partyId, body, recipientId));
        return true;
      } catch (error) {
        toast.error(
          error instanceof NetworkError ? 'Нет связи с сервером' : error instanceof ApiError ? error.message : 'Сообщение не отправлено',
        );
        return false;
      }
    },

    setReading: (partyId) => {
      set({ reading: partyId });
      if (partyId && get().unread[partyId]) {
        const { [partyId]: _, ...unread } = get().unread;
        set({ unread });
      }
    },

    attach: (workspace) => {
      detach?.();
      detach = null;
      me = workspace?.userId ?? null;
      set({ chats: {}, unread: {}, reading: null });
      if (!workspace) return;
      detach = workspace.onPartyEvent((event) => {
        if (event.type === 'message') receive(event.partyId, event.message);
        // Back online: messages written meanwhile are fetched for the chats being kept.
        else if (event.partyId === null) for (const partyId of Object.keys(get().chats)) void get().load(partyId);
      });
    },
  };
});
