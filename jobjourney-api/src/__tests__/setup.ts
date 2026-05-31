import { prisma } from "../db";

// Safety guard: refuse to run if we're not pointed at a test database.
// This prevents accidental truncation of development or production data.
const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl.includes("test")) {
  throw new Error(
    `Tests must run against a test database.\n` +
    `DATABASE_URL "${dbUrl}" does not contain "test".\n` +
    `Ensure .env.test is present and jest.config.js loads it.`
  );
}

// Silence console.error during tests for expected errors
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});

// Clean up database before each test using transaction
beforeEach(async () => {
  // Use raw SQL with TRUNCATE CASCADE for reliable cleanup
  await prisma.$executeRaw`TRUNCATE TABLE "CalendarEvent", "Message", "ConversationParticipant", "Conversation", "TenantInvite", "JobStatusHistory", "Job", "PasswordResetToken", "MonthlyGoal", "TenantUser", "Tenant", "User" CASCADE`;
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
