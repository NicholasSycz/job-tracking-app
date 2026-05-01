-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('owner', 'member');

-- AlterTable: convert TenantUser.role from text to TenantRole enum.
-- Existing values are 'owner' and 'member', which match the enum literals 1:1.
ALTER TABLE "TenantUser"
  ALTER COLUMN "role" TYPE "TenantRole" USING "role"::"TenantRole";

-- AlterTable: add role column to TenantInvite, defaulting new and existing rows to 'member'.
ALTER TABLE "TenantInvite"
  ADD COLUMN "role" "TenantRole" NOT NULL DEFAULT 'member';
