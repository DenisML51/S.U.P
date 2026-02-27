-- CreateEnum
CREATE TYPE "LobbyStatus" AS ENUM ('WAITING', 'IN_COMBAT', 'CLOSED');

-- CreateEnum
CREATE TYPE "LobbyRole" AS ENUM ('MASTER', 'PLAYER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ONLINE', 'OFFLINE', 'LEFT');

-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('PLAYERS_ONLY', 'ALL');

-- CreateTable
CREATE TABLE "Lobby" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "LobbyStatus" NOT NULL DEFAULT 'WAITING',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyMember" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "role" "LobbyRole" NOT NULL DEFAULT 'PLAYER',
    "status" "MemberStatus" NOT NULL DEFAULT 'ONLINE',
    "currentAction" TEXT,
    "currentHP" INTEGER,
    "maxHP" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "LobbyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyMessage" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" "LobbyRole" NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" "MessageVisibility" NOT NULL DEFAULT 'PLAYERS_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LobbyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatState" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "activeMemberId" TEXT,
    "turnOrder" JSONB,
    "snapshot" JSONB,
    "isInCombat" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CombatState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_key_key" ON "Lobby"("key");

-- CreateIndex
CREATE INDEX "Lobby_hostId_status_idx" ON "Lobby"("hostId", "status");

-- CreateIndex
CREATE INDEX "Lobby_status_createdAt_idx" ON "Lobby"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyMember_lobbyId_userId_key" ON "LobbyMember"("lobbyId", "userId");

-- CreateIndex
CREATE INDEX "LobbyMember_lobbyId_status_idx" ON "LobbyMember"("lobbyId", "status");

-- CreateIndex
CREATE INDEX "LobbyMember_userId_idx" ON "LobbyMember"("userId");

-- CreateIndex
CREATE INDEX "LobbyMessage_lobbyId_createdAt_idx" ON "LobbyMessage"("lobbyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CombatState_lobbyId_key" ON "CombatState"("lobbyId");

-- CreateIndex
CREATE INDEX "CombatState_activeMemberId_idx" ON "CombatState"("activeMemberId");

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMember" ADD CONSTRAINT "LobbyMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMessage" ADD CONSTRAINT "LobbyMessage_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyMessage" ADD CONSTRAINT "LobbyMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatState" ADD CONSTRAINT "CombatState_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatState" ADD CONSTRAINT "CombatState_activeMemberId_fkey" FOREIGN KEY ("activeMemberId") REFERENCES "LobbyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
