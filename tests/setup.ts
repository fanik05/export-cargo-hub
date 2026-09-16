import "dotenv/config";

// Integration tests use a dedicated database. Point the prisma singleton at it.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
}
