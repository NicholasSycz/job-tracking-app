import { prisma } from "../db";

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
  await prisma.$executeRaw`TRUNCATE TABLE "Message", "ConversationParticipant", "Conversation", "TenantInvite", "JobStatusHistory", "Job", "PasswordResetToken", "MonthlyGoal", "TenantUser", "Tenant", "User" CASCADE`;
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
