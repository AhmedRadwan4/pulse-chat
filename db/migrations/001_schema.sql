-- PulseChat - full schema (PostgreSQL 18+)
-- Run this on a fresh database to initialize all tables.
--
-- The database MUST be created with UTF8 encoding before running this migration.
-- Use db/create_db.sql to create the database correctly:
--   psql -U postgres -f db/create_db.sql
--   psql -U postgres -d pulse_chat -f db/migrations/001_schema.sql

-- Guard: abort immediately if the database was created with the wrong encoding.
-- This prevents silent data corruption with emoji and non-ASCII content on Windows.
DO $$
BEGIN
  IF current_setting('server_encoding') <> 'UTF8' THEN
    RAISE EXCEPTION
      'Database encoding is %. pulse_chat must be created with UTF8 encoding. '
      'Run db/create_db.sql first.',
      current_setting('server_encoding');
  END IF;
END;
$$;

-- -- Enums -----------------------------------------------------------------------

CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT');
CREATE TYPE "ChannelMode" AS ENUM ('MONITORED', 'E2E_ENCRYPTED');
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO');
CREATE TYPE "NotificationType" AS ENUM ('MENTION', 'DIRECT_MESSAGE', 'THREAD_REPLY');

-- -- Auth tables (Better Auth compatible) ---------------------------------------

CREATE TABLE "user" (
  "id"            UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT        NOT NULL,
  "email"         TEXT        NOT NULL UNIQUE,
  "emailVerified" BOOLEAN     NOT NULL DEFAULT FALSE,
  "image"         TEXT,
  "role"          TEXT,
  "banned"        BOOLEAN     NOT NULL DEFAULT FALSE,
  "banReason"     TEXT,
  "banExpires"    TIMESTAMPTZ,
  "username"      TEXT        UNIQUE,
  "bio"           TEXT,
  "discoverable"  BOOLEAN     NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "session" (
  "id"             UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "expiresAt"      TIMESTAMPTZ NOT NULL,
  "token"          TEXT        NOT NULL UNIQUE,
  "ipAddress"      TEXT,
  "userAgent"      TEXT,
  "userId"         UUID        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "impersonatedBy" TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "account" (
  "id"                    UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId"             TEXT        NOT NULL,
  "providerId"            TEXT        NOT NULL,
  "userId"                UUID        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "verification" (
  "id"         UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" TEXT        NOT NULL,
  "value"      TEXT        NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "authenticator" (
  "credentialID"         TEXT    NOT NULL PRIMARY KEY,
  "userId"               UUID    NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "providerAccountId"    TEXT    NOT NULL,
  "credentialPublicKey"  TEXT    NOT NULL,
  "counter"              INTEGER NOT NULL,
  "credentialDeviceType" TEXT    NOT NULL,
  "credentialBackedUp"   BOOLEAN NOT NULL,
  "transports"           TEXT,
  UNIQUE ("userId", "credentialID")
);

-- -- Channels -------------------------------------------------------------------

CREATE TABLE "channel" (
  "id"            UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          TEXT,
  "description"   TEXT,
  "type"          "ChannelType" NOT NULL DEFAULT 'PUBLIC',
  "createdById"   UUID          NOT NULL REFERENCES "user"("id"),
  "mode"          "ChannelMode" NOT NULL DEFAULT 'MONITORED',
  "modeChangedAt" TIMESTAMPTZ,
  "modeChangedBy" UUID,
  "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE "channel_member" (
  "id"        UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "channelId" UUID         NOT NULL REFERENCES "channel"("id") ON DELETE CASCADE,
  "userId"    UUID         NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role"      "MemberRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("channelId", "userId")
);

-- -- Messages -------------------------------------------------------------------

CREATE TABLE "message" (
  "id"        UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "channelId" UUID        NOT NULL REFERENCES "channel"("id") ON DELETE CASCADE,
  "senderId"  UUID        NOT NULL REFERENCES "user"("id"),
  "content"   TEXT,
  "threadId"  UUID,
  "editedAt"  TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- Threads --------------------------------------------------------------------

CREATE TABLE "thread" (
  "id"              UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "parentMessageId" UUID        NOT NULL UNIQUE REFERENCES "message"("id"),
  "channelId"       UUID        NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "message" ADD CONSTRAINT "message_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "thread"("id") ON DELETE SET NULL;

-- -- Attachments ----------------------------------------------------------------

CREATE TABLE "attachment" (
  "id"        UUID             NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" UUID             NOT NULL REFERENCES "message"("id") ON DELETE CASCADE,
  "url"       TEXT             NOT NULL,
  "type"      "AttachmentType" NOT NULL,
  "name"      TEXT             NOT NULL,
  "size"      INTEGER          NOT NULL,
  "createdAt" TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- -- Reactions ------------------------------------------------------------------

CREATE TABLE "reaction" (
  "id"        UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" UUID        NOT NULL REFERENCES "message"("id") ON DELETE CASCADE,
  "userId"    UUID        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "emoji"     TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("messageId", "userId", "emoji")
);

-- -- Read Receipts --------------------------------------------------------------

CREATE TABLE "read_receipt" (
  "id"        UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" UUID        NOT NULL REFERENCES "message"("id") ON DELETE CASCADE,
  "userId"    UUID        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "readAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("messageId", "userId")
);

-- -- Notifications --------------------------------------------------------------

CREATE TABLE "notification" (
  "id"        UUID               NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    UUID               NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type"      "NotificationType" NOT NULL,
  "read"      BOOLEAN            NOT NULL DEFAULT FALSE,
  "actorId"   UUID               NOT NULL REFERENCES "user"("id"),
  "messageId" UUID,
  "channelId" UUID,
  "body"      TEXT,
  "createdAt" TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- -- Webhook Events -------------------------------------------------------------

CREATE TABLE "webhook_event" (
  "id"              UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider"        TEXT        NOT NULL,
  "providerEventId" TEXT        NOT NULL,
  "type"            TEXT        NOT NULL,
  "payload"         JSONB       NOT NULL,
  "processedAt"     TIMESTAMPTZ,
  "error"           TEXT,
  "retryCount"      INTEGER     NOT NULL DEFAULT 0,
  "failedAt"        TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("provider", "providerEventId")
);

-- -- Indexes --------------------------------------------------------------------

CREATE INDEX "user_email_idx" ON "user"("email");
CREATE INDEX "channel_type_idx" ON "channel"("type");
CREATE INDEX "channel_member_userId_idx" ON "channel_member"("userId");
CREATE INDEX "message_channelId_createdAt_idx" ON "message"("channelId", "createdAt");
CREATE INDEX "message_senderId_idx" ON "message"("senderId");
CREATE INDEX "read_receipt_userId_idx" ON "read_receipt"("userId");
CREATE INDEX "notification_userId_read_idx" ON "notification"("userId", "read");
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");
CREATE INDEX "webhook_event_provider_type_processedAt_idx" ON "webhook_event"("provider", "type", "processedAt");

-- Set DIRECT channels to E2E_ENCRYPTED (run after insert)
-- UPDATE "channel" SET "mode" = 'E2E_ENCRYPTED' WHERE "type" = 'DIRECT';
