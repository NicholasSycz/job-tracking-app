-- AlterTable: configurable interview types on the user
ALTER TABLE "User" ADD COLUMN     "interviewTypes" JSONB;

-- AlterTable: multiple interview rounds on the job
ALTER TABLE "Job" ADD COLUMN     "interviews" JSONB;

-- Backfill: convert each existing single interview into a one-element rounds array
UPDATE "Job"
SET "interviews" = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', '',
    'scheduledAt', to_char("interviewDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'outcome', "interviewOutcome",
    'notes', COALESCE("interviewNotes", '')
  )
)
WHERE "interviewDate" IS NOT NULL;
