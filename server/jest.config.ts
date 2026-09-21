import type { Config } from "jest";
import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

const config: Config = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg
  },
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/integration/**/*.test.ts",
    "<rootDir>/tests/api/**/*.test.ts",
    "<rootDir>/tests/ai-generated/**/*.test.ts" // 🎉 Added this line to include your AI tests
  ],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
  ],
  // setupFilesAfterEnv: [
  //   "<rootDir>/tests/setup/jest.setup.ts"
  // ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // collectCoverageFrom: [
  //   "src/**/*.ts",
  //   "!src/**/*.test.ts",       // exclude test files
  //   "!src/tests/**",           // exclude setup files
  //   "!src/index.ts",           // exclude entry point
  //   "!src/database/**",        // exclude db connection files
  // ],

  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80,
  //   },
  // },
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // ✅ Show individual test names in output
  verbose: true,
}

export default config;