export type LobbyRole = 'MASTER' | 'PLAYER';
export type LobbyStatus = 'WAITING' | 'IN_COMBAT' | 'CLOSED';
export type MemberStatus = 'ONLINE' | 'OFFLINE' | 'LEFT';
export type MessageVisibility = 'PLAYERS_ONLY' | 'ALL';

export type LobbyMember = {
  id: string;
  userId: string;
  userName: string;
  characterName: string | null;
  avatar: string | null;
  role: LobbyRole;
  status: MemberStatus;
  currentAction: string | null;
  currentHP: number | null;
  maxHP: number | null;
  characterId: string | null;
};

export type LobbyMessage = {
  id: string;
  senderId: string;
  senderRole: LobbyRole;
  content: string;
  visibility: MessageVisibility;
  createdAt: string;
};

export type CombatMemberState = {
  memberId: string;
  userId: string;
  name: string;
  role: LobbyRole;
  avatar: string | null;
  characterId: string | null;
  initiative: number | null;
  currentHP: number;
  maxHP: number;
  currentAction: string | null;
  actionLimits: { action: number; bonus: number; reaction: number };
  spentActions: { action: number; bonus: number; reaction: number };
};

export type CombatState = {
  isInCombat: boolean;
  round: number;
  activeMemberId: string | null;
  turnOrder: string[];
  serverSequence: number;
  membersCombat: CombatMemberState[];
};

export type LobbyStatePayload = {
  lobby: {
    id: string;
    key: string;
    hostId: string;
    status: LobbyStatus;
    createdAt: string;
  };
  meRole: LobbyRole | null;
  members: LobbyMember[];
  messages: LobbyMessage[];
  combatState: CombatState | null;
};

export type CombatEventType =
  | 'combat.start'
  | 'combat.nextTurn'
  | 'combat.updateActor'
  | 'combat.actionUsed'
  | 'combat.hpChanged'
  | 'combat.end';

export type CombatFeedEntry = {
  id: string;
  source: 'master' | 'system';
  text: string;
  createdAt: string;
};
