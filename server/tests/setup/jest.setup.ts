// src/tests/setup/jest.setup.ts

// ✅ Mock Redis globally — no real Redis needed for unit tests
jest.mock("../../src/database/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    decr: jest.fn(),
    multi: jest.fn(() => ({
      setEx: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  },
}));

// ✅ Mock bcrypt — avoid slow hashing in unit tests
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed_otp"),
  compare: jest.fn().mockResolvedValue(true),
}));