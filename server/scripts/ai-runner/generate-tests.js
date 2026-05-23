// server/scripts/ai-runner/generate-tests.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTIONS = `
You are an expert QA automation engineer specialized in Express.js and TypeScript.
Your job is to generate highly accurate, pure TypeScript Jest unit tests for the provided MVC target code.
You MUST write complete tests that require ZERO external dependencies or running databases.

CRITICAL RELATIVE IMPORT RULE:
You must use standard relative paths to import modules. Use the 'RELATIVE_PATH_TO_SRC' prefix provided in the prompt when importing files from the root 'src/' tree.
You will be given the EXACT list of modules the source file imports. You MUST use those exact module paths — do not guess, invent, or alter any module name.

Strict Mocking Matrix Rules (TypeScript Syntax):
1. Native PostgreSQL Pool: Mock your DB pool connection module completely.
2. Redis Cache: Mock the implementation of get/set calls.
3. AWS S3: Mock the '@aws-sdk/client-s3' Send command wrapper.
4. Express: Mock 'Request' and 'Response' types using jest.fn() for res.status, res.json, and res.send.

Do not wrap your output code in markdown code blocks inside the JSON string.
`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────
// DETECT JEST VERSION → correct path flag
// Jest ≥ 30 renamed --testPathPattern (singular) to
// --testPathPatterns (plural).
// ─────────────────────────────────────────────────────────────

function detectJestPathFlag(serverCwd) {
  try {
    const versionOutput = execSync('npx jest --version', {
      stdio: 'pipe',
      cwd: serverCwd,
    }).toString().trim();
    const major = parseInt(versionOutput.split('.')[0], 10);
    return major >= 30 ? '--testPathPatterns' : '--testPathPattern';
  } catch {
    return '--testPathPattern';
  }
}

// ─────────────────────────────────────────────────────────────
// EXTRACT REAL IMPORTS from the source file.
// Gemini hallucinates module names when it only sees source code.
// We parse the actual import statements and hand the exact paths
// back so the generated test mocks use the right filenames.
// ─────────────────────────────────────────────────────────────

function extractImportPaths(fileContent) {
  const importRegex = /(?:import|require)\s*(?:\(?\s*['"`]([^'"`]+)['"`]\s*\)?|[\w\s{},*]+\s+from\s+['"`]([^'"`]+)['"`])/g;
  const paths = new Set();
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    const p = match[1] || match[2];
    if (p) paths.add(p);
  }
  // Only return relative imports (the ones Gemini could get wrong)
  return [...paths].filter(p => p.startsWith('.'));
}

// ─────────────────────────────────────────────────────────────
// FILE ELIGIBILITY
// ─────────────────────────────────────────────────────────────

const SKIP_FILENAME_PATTERNS = [
  /\.d\.ts$/,
  /\.config\.(ts|js)$/,
  /\.types\.(ts)$/,
  /types\.ts$/,
  /index\.ts$/,
  /constants\.ts$/,
  /enums\.ts$/,
  /interfaces\.ts$/,
  /migrations?\//,
  /seeds?\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

const TESTABLE_FOLDERS = [
  'src/controllers/',
  'src/services/',
  'src/models/',
  'src/utils/',
  'src/middleware/',
  'src/dao/',
  'src/helpers/',
];

const TESTABLE_CODE_PATTERNS = [
  /export\s+(const|function|class|async function)/,
  /export\s+default\s+(function|class|async)/,
  /\.(get|post|put|delete|patch)\s*\(/,
  /async\s+\w+\s*\(/,
  /\bif\b|\bswitch\b|\bfor\b|\bwhile\b/,
  /try\s*\{/,
];

function shouldSkipFile(filePath, fileContent) {
  const relativePath = filePath.replace(/\\/g, '/');

  for (const pattern of SKIP_FILENAME_PATTERNS) {
    if (pattern.test(relativePath)) {
      return { skip: true, reason: `Filename matches skip pattern: ${pattern}` };
    }
  }

  const inTestableFolder = TESTABLE_FOLDERS.some(folder => relativePath.includes(folder));
  if (!inTestableFolder) {
    return {
      skip: true,
      reason: `Not in a testable folder. Testable folders: ${TESTABLE_FOLDERS.join(', ')}`,
    };
  }

  const hasTestableLogic = TESTABLE_CODE_PATTERNS.some(pattern => pattern.test(fileContent));
  if (!hasTestableLogic) {
    return {
      skip: true,
      reason: 'No testable logic found (no exported functions, classes, or business logic)',
    };
  }

  const lineCount = fileContent.split('\n').filter(l => l.trim()).length;
  const typeOnlyLines = fileContent.split('\n').filter(l =>
    l.trim().match(/^(export\s+)?(type|interface|enum)\s+/) ||
    l.trim().match(/^import\s+type\s+/) ||
    l.trim() === '' ||
    l.trim().startsWith('//') ||
    l.trim().startsWith('*') ||
    l.trim().startsWith('/*')
  ).length;

  if (lineCount > 0 && typeOnlyLines / lineCount > 0.85) {
    return {
      skip: true,
      reason: `File is ${Math.round(typeOnlyLines / lineCount * 100)}% type/interface definitions — no logic to test`,
    };
  }

  const meaningfulLines = fileContent
    .split('\n')
    .filter(l => {
      const t = l.trim();
      return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && t !== '{' && t !== '}';
    }).length;

  if (meaningfulLines < 10) {
    return {
      skip: true,
      reason: `File has only ${meaningfulLines} meaningful lines — too small to warrant unit tests`,
    };
  }

  return { skip: false };
}

// ─────────────────────────────────────────────────────────────
// AI ELIGIBILITY CHECK
// ─────────────────────────────────────────────────────────────

async function aiShouldGenerateTests(ai, fileContent, filePath) {
  const eligibilityPrompt = `
    You are a senior TypeScript engineer reviewing a file to decide if it needs unit tests.
    File path: ${filePath}
    File content:
    \`\`\`typescript
    ${fileContent.substring(0, 3000)}
    \`\`\`
    Respond with:
    - needsTests: true if the file contains testable business logic
    - needsTests: false if the file is ONLY: type definitions, interfaces, enums, re-exports, constants, configuration objects, empty scaffolding
    - reason: one sentence explaining why
  `;

  const response = await callGeminiWithRetry(ai, eligibilityPrompt, {
    type: "OBJECT",
    properties: {
      needsTests: { type: "BOOLEAN" },
      reason: { type: "STRING" },
    },
    required: ["needsTests", "reason"],
  });

  if (!response) {
    return { needsTests: true, reason: "AI eligibility check failed — defaulting to generate" };
  }

  return JSON.parse(response.text);
}

// ─────────────────────────────────────────────────────────────
// FAILURE PARSING
// ─────────────────────────────────────────────────────────────

function parseFailuresFromLog(executionLogs) {
  const failures = [];
  const jestFailureBlocks = executionLogs.split(/\n\s*●\s+/).filter(Boolean);

  if (jestFailureBlocks.length > 1) {
    const testBlocks = jestFailureBlocks.slice(1);
    for (const block of testBlocks) {
      const lines = block.trim().split('\n');
      const testName = lines[0].trim();
      const errorLine = lines.find(l =>
        l.trim().match(/^(Error:|TypeError:|ReferenceError:|SyntaxError:|expect\(|Cannot|Failed|Received)/i)
      ) || lines[1] || '';
      const sourceLine = lines.find(l => l.includes('.ts:')) || '';
      failures.push({
        summary: `${testName} — ${errorLine.trim().substring(0, 80)}`,
        fullLog: block.trim(),
        testName,
        errorLine: errorLine.trim(),
        sourceLine: sourceLine.trim(),
      });
    }
    return failures;
  }

  const errorMatches = executionLogs.match(
    /(error TS\d+:[^\n]+|TypeError:[^\n]+|ReferenceError:[^\n]+|SyntaxError:[^\n]+|Error:[^\n]+|FAIL [^\n]+)/gi
  );

  if (errorMatches) {
    const seen = new Set();
    for (const match of errorMatches) {
      const trimmed = match.trim();
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        failures.push({
          summary: trimmed.substring(0, 120),
          fullLog: trimmed,
          testName: trimmed,
          errorLine: trimmed,
          sourceLine: '',
        });
      }
    }
  }

  return failures;
}

// ─────────────────────────────────────────────────────────────
// INFRASTRUCTURE ERROR CLASSIFICATION
//
// Critical distinction from the previous version:
//   "Cannot find module" is only an INFRA error when it appears
//   as a suite-load failure (before any test executes).
//   When tests are running and a mock throws or a module resolves
//   incorrectly at runtime, that is a TEST LOGIC error and Gemini
//   should be allowed to fix the test — not be overridden.
//
// We detect suite-load failures by checking whether the error
// appears alongside "Test suite failed to run" (Jest's phrasing
// for compile-time / resolution errors before execution begins).
// ─────────────────────────────────────────────────────────────

const SUITE_LOAD_PATTERNS = [
  /Test suite failed to run/i,
  /Option .* was replaced by/i,
  /Please update your configuration/i,
  /error TS\d+:/i,
  /SyntaxError: Cannot use import/i,
  /Jest: .* is not supported/i,
  /jest\.config/i,
  /Could not find a config file/i,
  /No tests found/i,
];

function isInfrastructureError(log) {
  // Only classify as infra if it's a suite-level load failure,
  // NOT a runtime mock/assertion failure that happens during test execution.
  const hasSuiteLoadFailure = SUITE_LOAD_PATTERNS.some(p => p.test(log));

  // If tests actually ran (console output from source code appears),
  // this is a test logic error even if "Cannot find module" appears.
  const testsActuallyRan = /at (?:login|getUser|createUser|middleware|handler|controller|service)\s+\(src\//i.test(log)
    || /console\.(log|error|warn)[\s\S]{0,200}at \w+\s+\(src\//i.test(log);

  return hasSuiteLoadFailure && !testsActuallyRan;
}

// ─────────────────────────────────────────────────────────────
// JIRA
// ─────────────────────────────────────────────────────────────

async function createSingleJiraTicket(sourceFile, failureLog, failureSummary, failureType, ticketIndex, totalTickets) {
  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!domain || !email || !token || !projectKey) {
    console.warn(`⚠️  Jira env vars missing. Skipping ticket ${ticketIndex}/${totalTickets}.`);
    return null;
  }

  const fileName = path.basename(sourceFile);
  const labelType = failureType.toLowerCase().replace(/_/g, '-');
  const issueSummary = `[AI ${failureType}] ${fileName} — ${failureSummary.substring(0, 100)}`;

  const issueDescription = [
    `*Automated pipeline detected a failure during CI quality gate execution.*`,
    ``,
    `*Ticket ${ticketIndex} of ${totalTickets}*`,
    ``,
    `*File:* ${sourceFile}`,
    `*Failure type:* ${failureType}`,
    `*Failure summary:* ${failureSummary}`,
    ``,
    `*Failure log:*`,
    `{code:text}`,
    failureLog.substring(0, 4000),
    `{code}`,
  ].join('\n');

  const payload = {
    fields: {
      project: { key: projectKey },
      summary: issueSummary,
      description: issueDescription,
      issuetype: { name: "Bug" },
      labels: ["ai-generated", "ci-pipeline", labelType],
    },
  };

  const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;

  try {
    const res = await fetch(`https://${domain}/rest/api/2/issue`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Jira API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    console.log(`🎫 Ticket ${ticketIndex}/${totalTickets} created: ${data.key} — ${failureSummary.substring(0, 60)}`);
    return data.key;
  } catch (err) {
    console.error(`❌ Failed to create Jira ticket ${ticketIndex}/${totalTickets}:`, err.message);
    return null;
  }
}

async function createJiraTicketsForFailures(sourceFile, executionLogs, failureType) {
  const failures = parseFailuresFromLog(executionLogs);

  if (failures.length === 0) {
    console.warn("⚠️  Could not parse individual failures. Creating one generic ticket.");
    await createSingleJiraTicket(sourceFile, executionLogs.substring(0, 4000), "Unknown failure — see log", failureType, 1, 1);
    return;
  }

  console.log(`\n🎫 Creating ${failures.length} Jira ticket(s) for ${failures.length} distinct failure(s)...`);
  for (let i = 0; i < failures.length; i++) {
    await createSingleJiraTicket(sourceFile, failures[i].fullLog, failures[i].summary, failureType, i + 1, failures.length);
    if (i < failures.length - 1) await sleep(500);
  }
}

// ─────────────────────────────────────────────────────────────
// GATE A — coverage check
// Added --forceExit so Jest doesn't hang after async tests
// complete, which previously blocked the coverage JSON write.
// ─────────────────────────────────────────────────────────────

async function runGateA(absoluteTestPath, repoRoot, jestPathFlag) {
  const tmpCoverageDir = path.join(repoRoot, 'server', 'coverage-tmp');
  try {
    execSync(
      `npx jest "${jestPathFlag}=${absoluteTestPath}" --coverage --coverageReporters=json-summary --coverageDirectory=${tmpCoverageDir} --config=jest.config.ts --forceExit`,
      { stdio: 'pipe', cwd: path.join(repoRoot, 'server') }
    );

    const summaryPath = path.join(tmpCoverageDir, 'coverage-summary.json');
    if (!fs.existsSync(summaryPath)) {
      return { passed: false, reason: "Coverage summary not generated.", log: "", isInfra: false };
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const pct = summary.total.statements.pct;

    if (pct < 80) {
      return {
        passed: false,
        reason: `Statement coverage ${pct}% is below 80% threshold.`,
        log: JSON.stringify(summary.total),
        isInfra: false,
      };
    }

    return { passed: true, log: "", isInfra: false };
  } catch (err) {
    const log = [
      err.stdout?.toString() || '',
      err.stderr?.toString() || '',
      err.message || '',
    ].filter(Boolean).join('\n');

    console.error("\n━━━ Gate A crash log (full Jest output) ━━━");
    console.error(log.substring(0, 5000));
    console.error("━━━ End Gate A crash log ━━━\n");

    const infra = isInfrastructureError(log);
    if (infra) {
      console.log("ℹ️  Classified as infrastructure/suite-load error (tests did not run).");
    } else {
      console.log("ℹ️  Classified as test logic error (tests ran but failed or coverage insufficient).");
    }

    return {
      passed: false,
      reason: "Jest crashed during coverage run.",
      log,
      isInfra: infra,
    };
  } finally {
    if (fs.existsSync(tmpCoverageDir)) {
      fs.rmSync(tmpCoverageDir, { recursive: true, force: true });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// GATE B — logical integrity audit via Gemini
// ─────────────────────────────────────────────────────────────

async function runGateB(ai, sourceCode, testCode) {
  const auditorPrompt = `
    You are a Senior QA Auditor. Review this generated unit test against the source code.
    Verify the test does not cheat coverage with tautologies, always-true assertions,
    or overly aggressive mocks that bypass actual business logic.

    Source Code:
    \`\`\`typescript
    ${sourceCode}
    \`\`\`

    Generated Test Code:
    \`\`\`typescript
    ${testCode}
    \`\`\`
  `;

  const response = await callGeminiWithRetry(ai, auditorPrompt, {
    type: "OBJECT",
    properties: {
      hasFlaws: { type: "BOOLEAN" },
      critique: { type: "STRING" },
    },
    required: ["hasFlaws", "critique"],
  });

  if (!response) return { passed: false, reason: "Auditor failed to respond." };
  const audit = JSON.parse(response.text);
  return audit.hasFlaws ? { passed: false, reason: audit.critique } : { passed: true };
}

// ─────────────────────────────────────────────────────────────
// SELF-HEALING LOOP
// isInfraError only blocks the "real bug" path for genuine
// suite-load failures. Test logic errors (mocks, assertions,
// coverage gaps) flow through Gemini normally.
// ─────────────────────────────────────────────────────────────

async function handleHealingLoop(ai, sourcePath, absoluteTestPath, sourceCode, badTestCode, errorLog, failureType, isInfraError, sourceImports, relativePathToSrc) {
  const fixPrompt = `
    A generated TypeScript Jest test failed quality validation.
    Failure Type: ${failureType}

    Full Error Log (read carefully — this is the real Jest/TypeScript output):
    ${errorLog.substring(0, 4000)}

    Source Code being tested:
    \`\`\`typescript
    ${sourceCode}
    \`\`\`

    Failing Test Code:
    \`\`\`typescript
    ${badTestCode}
    \`\`\`

    EXACT import paths used by the source file (use ONLY these — do not invent module names):
    ${sourceImports.map(p => `  - ${p}  →  mock as: '${relativePathToSrc}${p.replace(/^\.\//, '').replace(/^\.\.\//, '')}'`).join('\n')}

    When building jest.mock() paths, derive them by replacing the source file's relative
    import with the correct path from the TEST file's location using prefix: ${relativePathToSrc}

    IMPORTANT RULES:
    - NEVER invent or guess module file names. Use only the exact imports listed above.
    - Infrastructure errors (Jest CLI/config errors, suite failed to run before any test executed)
      are NEVER real application bugs. Set isRealBugInSourceCode=false for these.
    - Only set isRealBugInSourceCode=true if the source code itself has an obvious logical defect
      that cannot be worked around in the test (e.g. a function that always throws regardless of
      input, or a clear null-dereference in the production code path).
    - Common fixes to try:
        1. Ensure jest.mock() paths exactly match the source's import paths, prefixed with ${relativePathToSrc}
        2. Ensure mock return values match the shape the source code expects.
        3. Ensure async mocks use jest.fn().mockResolvedValue() / mockRejectedValue().
        4. If coverage is below 80%, add test cases for uncovered branches.
    - Return the COMPLETE fixed test file — no partial snippets.
  `;

  const response = await callGeminiWithRetry(ai, fixPrompt, {
    type: "OBJECT",
    properties: {
      isRealBugInSourceCode: { type: "BOOLEAN" },
      fixedTestCode: { type: "STRING" },
      jiraTicketSummary: { type: "STRING" },
    },
    required: ["isRealBugInSourceCode"],
  });

  if (!response) return null;

  const resolution = JSON.parse(response.text);

  if (resolution.isRealBugInSourceCode && !isInfraError) {
    console.log("🚨 Real application bug found during healing loop!");
    await createJiraTicketsForFailures(
      sourcePath,
      `Bug found during healing: ${resolution.jiraTicketSummary}\n\nOriginal error log:\n${errorLog}`,
      "REAL_BUG_DETECTED"
    );
    process.exit(1);
  }

  if (resolution.isRealBugInSourceCode && isInfraError) {
    console.warn("⚠️  Gemini flagged a real bug but error is infrastructure/suite-load — overriding and rewriting test.");
  }

  if (!resolution.fixedTestCode) {
    console.error("❌ Healer returned no fixed test code.");
    return null;
  }

  console.log("🔧 Rewriting test with healed version...");
  fs.writeFileSync(absoluteTestPath, resolution.fixedTestCode, 'utf8');
  return resolution.fixedTestCode;
}

// ─────────────────────────────────────────────────────────────
// GEMINI API — with retry + exponential backoff
// ─────────────────────────────────────────────────────────────

async function callGeminiWithRetry(ai, prompt, responseSchema) {
  const maxAttempts = 3;
  let delay = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      return response;
    } catch (err) {
      console.warn(`⚠️  Gemini attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
      if (attempt === maxAttempts) return null;
      await sleep(delay);
      delay *= 2;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Correct relative path depth calculation.
// split('/').length counts segments including the filename.
// Subtract 2: one for the filename, one because repeat(n) gives
// exactly n directory hops.
//
// Example:
//   "tests/ai-generated/controllers/restaurant/login.test.ts"
//   segments = 5  →  depth = 3  →  "../../../src/"  ✅
// ─────────────────────────────────────────────────────────────

function computeRelativePathToSrc(mirrorRelativePath) {
  const segments = mirrorRelativePath.split('/');
  const folderDepth = segments.length - 2;
  return '../'.repeat(folderDepth) + 'src/';
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY environment variable.");
    process.exit(1);
  }

  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA;

  if (!baseSha || !headSha) {
    console.error("Missing BASE_SHA or HEAD_SHA environment variables.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const repoRoot = path.resolve(__dirname, '../../..');
  const serverCwd = path.join(repoRoot, 'server');

  const jestPathFlag = detectJestPathFlag(serverCwd);
  console.log(`\nUsing Jest path flag: ${jestPathFlag}`);
  console.log(`\nAnalyzing diff: ${baseSha} → ${headSha}\n`);

  let allChangedFiles = [];
  try {
    allChangedFiles = execSync(`git diff --name-only ${baseSha} ${headSha}`)
      .toString()
      .trim()
      .split('\n')
      .filter(file => file && file.startsWith('server/src/') && file.endsWith('.ts'));
  } catch (err) {
    console.log("Could not compute git diff. Exiting cleanly.");
    console.error(err.message);
    return;
  }

  if (allChangedFiles.length === 0) {
    console.log("No TypeScript changes detected. Skipping quality gates.");
    return;
  }

  console.log(`Changed .ts files in this PR:\n${allChangedFiles.map(f => `  ${f}`).join('\n')}\n`);
  console.log("Running eligibility checks...\n");

  const eligibleFiles = [];
  const skippedFiles = [];

  for (const file of allChangedFiles) {
    const absoluteFilePath = path.join(repoRoot, file);

    if (!fs.existsSync(absoluteFilePath)) {
      skippedFiles.push({ file, reason: "File not found on disk (deleted in this PR)" });
      continue;
    }

    const fileContent = fs.readFileSync(absoluteFilePath, 'utf8');

    const staticCheck = shouldSkipFile(file, fileContent);
    if (staticCheck.skip) {
      skippedFiles.push({ file, reason: `[Static] ${staticCheck.reason}` });
      continue;
    }

    const aiCheck = await aiShouldGenerateTests(ai, fileContent, file);
    if (!aiCheck.needsTests) {
      skippedFiles.push({ file, reason: `[AI] ${aiCheck.reason}` });
      continue;
    }

    eligibleFiles.push({ file, fileContent, aiReason: aiCheck.reason });
  }

  if (skippedFiles.length > 0) {
    console.log("⏭️  Skipped files (no tests needed):");
    skippedFiles.forEach(({ file, reason }) => {
      console.log(`  ✗ ${file}`);
      console.log(`    → ${reason}`);
    });
    console.log();
  }

  if (eligibleFiles.length === 0) {
    console.log("✅ No files require unit tests in this PR. Pipeline complete.");
    return;
  }

  console.log(`🎯 Files selected for test generation (${eligibleFiles.length}):`);
  eligibleFiles.forEach(({ file, aiReason }) => {
    console.log(`  ✓ ${file}`);
    console.log(`    → ${aiReason}`);
  });
  console.log();

  for (const { file, fileContent } of eligibleFiles) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Processing: ${file}`);
    console.log(`${'─'.repeat(60)}`);

    const localizedServerPath = file.replace('server/', '');

    const mirrorRelativePath = localizedServerPath
      .replace('src/', 'tests/ai-generated/')
      .replace('.ts', '.test.ts');

    const absoluteTestPath = path.join(repoRoot, 'server', mirrorRelativePath);
    const relativePathToSrc = computeRelativePathToSrc(mirrorRelativePath);

    // Extract exact imports so Gemini can't hallucinate module names
    const sourceImports = extractImportPaths(fileContent);

    console.log(`  Computed relativePathToSrc: ${relativePathToSrc}`);
    console.log(`  Source imports detected: ${sourceImports.join(', ') || '(none)'}`);

    // Build a concrete mock path mapping for the prompt
    const mockPathMapping = sourceImports
      .map(p => {
        // Resolve the mock path relative to the test file
        // e.g. source imports '../utils/errorResponse' from src/controllers/restaurant/login.ts
        // test is at tests/ai-generated/controllers/restaurant/login.test.ts
        // correct mock path = '../../../src/utils/errorResponse'
        const normalized = p
          .replace(/^\.\.\//, '')   // strip leading ../
          .replace(/^\.\//, '');    // strip leading ./
        return `  jest.mock('${relativePathToSrc}${normalized}')`;
      })
      .join('\n');

    const initialPrompt = `
      Target TypeScript file location: ${localizedServerPath}
      Test file will be saved at: server/${mirrorRelativePath}
      CRITICAL: When importing from the src/ tree use this exact prefix: ${relativePathToSrc}

      EXACT imports from the source file (you MUST use ONLY these module paths — never guess):
      ${sourceImports.map(p => `  ${p}`).join('\n')}

      Suggested jest.mock() calls based on exact paths (use these verbatim):
      ${mockPathMapping || '  (no relative imports detected)'}

      You MUST mock every module that could make real network, database, Redis, S3, session,
      or email calls. Use jest.mock() at the top of the file for each such module.

      Generate unit tests for the following TypeScript source file:
      \`\`\`typescript
      ${fileContent}
      \`\`\`
    `;

    let aiResponse = await callGeminiWithRetry(ai, initialPrompt, {
      type: "OBJECT",
      properties: { testCode: { type: "STRING" } },
      required: ["testCode"],
    });

    if (!aiResponse) {
      console.error(`AI generation failed for ${file}. Skipping.`);
      continue;
    }

    let generatedTestCode = JSON.parse(aiResponse.text).testCode;

    fs.mkdirSync(path.dirname(absoluteTestPath), { recursive: true });
    fs.writeFileSync(absoluteTestPath, generatedTestCode, 'utf8');
    console.log(`\n✍️  Test written to: ${absoluteTestPath}`);

    let loopAttempt = 1;
    const maxLoops = 3;
    let passGates = false;

    while (loopAttempt <= maxLoops && !passGates) {
      console.log(`\nQuality Gate Loop [${loopAttempt}/${maxLoops}]`);

      const gateA = await runGateA(absoluteTestPath, repoRoot, jestPathFlag);
      if (!gateA.passed) {
        console.log(`❌ Gate A Failed: ${gateA.reason}`);
        generatedTestCode = await handleHealingLoop(
          ai, localizedServerPath, absoluteTestPath,
          fileContent, generatedTestCode, gateA.log,
          "STRUCTURAL_FAILURE", gateA.isInfra,
          sourceImports, relativePathToSrc
        );
        if (!generatedTestCode) break;
        loopAttempt++;
        continue;
      }
      console.log("✅ Gate A Passed — coverage >= 80%");

      const gateB = await runGateB(ai, fileContent, generatedTestCode);
      if (!gateB.passed) {
        console.log(`❌ Gate B Failed: ${gateB.reason}`);
        generatedTestCode = await handleHealingLoop(
          ai, localizedServerPath, absoluteTestPath,
          fileContent, generatedTestCode, gateB.reason,
          "LOGICAL_FAILURE", false,
          sourceImports, relativePathToSrc
        );
        if (!generatedTestCode) break;
        loopAttempt++;
        continue;
      }
      console.log("✅ Gate B Passed — no test shortcuts detected");

      passGates = true;
    }

    if (!passGates) {
      console.error("\n❌ Could not pass quality gates within healing loops. Pipeline halted.");
      process.exit(1);
    }

    // ── Final verification run ──────────────────────────────
    console.log(`\nRunning final verification: ${absoluteTestPath}`);
    try {
      execSync(
        `npx jest "${jestPathFlag}=${absoluteTestPath}" --passWithNoTests --config=jest.config.ts --forceExit`,
        { stdio: 'pipe', cwd: serverCwd }
      );
      console.log("🎉 All gates passed! Test verified and approved.\n");
    } catch (finalErr) {
      const logOutput = [
        finalErr.stdout?.toString() || '',
        finalErr.stderr?.toString() || '',
        finalErr.message || '',
      ].filter(Boolean).join('\n');

      console.log("\n🚨 Bug detected in final verification run!");
      console.error("\n━━━ Final verification crash log ━━━");
      console.error(logOutput.substring(0, 5000));
      console.error("━━━ End final verification crash log ━━━\n");

      await createJiraTicketsForFailures(localizedServerPath, logOutput, "FINAL_VERIFICATION_FAILURE");
      process.exit(1);
    }
  }
}

run();