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

Strict Mocking Matrix Rules (TypeScript Syntax):
1. Native PostgreSQL Pool: Mock your DB pool connection module completely.
2. Redis Cache: Mock the implementation of get/set calls.
3. AWS S3: Mock the '@aws-sdk/client-s3' Send command wrapper.
4. Express: Mock 'Request' and 'Response' types using jest.fn() for res.status, res.json, and res.send.

Do not wrap your output code in markdown code blocks inside the JSON string.
`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────
// FILE ELIGIBILITY — decides if a file needs unit tests at all
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
    - needsTests: true if the file contains testable business logic (controllers, services, data access, utilities with logic, middleware with conditions)
    - needsTests: false if the file is ONLY: type definitions, interfaces, enums, re-exports/barrel files, constants with no logic, configuration objects, empty scaffolding
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
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
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
    await createSingleJiraTicket(
      sourceFile,
      executionLogs.substring(0, 4000),
      "Unknown failure — see log",
      failureType,
      1,
      1
    );
    return;
  }

  console.log(`\n🎫 Creating ${failures.length} Jira ticket(s) for ${failures.length} distinct failure(s)...`);

  for (let i = 0; i < failures.length; i++) {
    await createSingleJiraTicket(
      sourceFile,
      failures[i].fullLog,
      failures[i].summary,
      failureType,
      i + 1,
      failures.length
    );
    if (i < failures.length - 1) await sleep(500);
  }
}

// ─────────────────────────────────────────────────────────────
// FIX 1 + FIX 5 — GATE A: coverage check
// Changes:
//   • Captures stderr in addition to stdout so crash reason is never lost
//   • Logs the full crash output to CI console (visible in GitHub Actions)
//   • Switches from positional path arg to --testPathPattern to avoid
//     Jest silently ignoring absolute paths outside rootDir
// ─────────────────────────────────────────────────────────────

async function runGateA(absoluteTestPath, repoRoot) {
  const tmpCoverageDir = path.join(repoRoot, 'server', 'coverage-tmp');
  try {
    execSync(
      // FIX 5: use --testPathPattern instead of positional path arg
      `npx jest --testPathPattern="${absoluteTestPath}" --coverage --coverageReporters=json-summary --coverageDirectory=${tmpCoverageDir} --config=jest.config.ts`,
      { stdio: 'pipe', cwd: path.join(repoRoot, 'server') }
    );

    const summaryPath = path.join(tmpCoverageDir, 'coverage-summary.json');
    if (!fs.existsSync(summaryPath)) {
      return { passed: false, reason: "Coverage summary not generated.", log: "" };
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const pct = summary.total.statements.pct;

    if (pct < 80) {
      return {
        passed: false,
        reason: `Statement coverage ${pct}% is below 80% threshold.`,
        log: JSON.stringify(summary.total),
      };
    }

    return { passed: true, log: "" };
  } catch (err) {
    // FIX 1: capture stderr too, and surface crash log to CI console
    const log = [
      err.stdout?.toString() || '',
      err.stderr?.toString() || '',
      err.message || '',
    ].filter(Boolean).join('\n');

    // Always print so the GitHub Actions log shows the real Jest error
    console.error("\n━━━ Gate A crash log (full Jest output) ━━━");
    console.error(log.substring(0, 5000));
    console.error("━━━ End Gate A crash log ━━━\n");

    return {
      passed: false,
      reason: "Jest crashed during coverage run.",
      log,   // full combined log passed to healing loop
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
  return audit.hasFlaws
    ? { passed: false, reason: audit.critique }
    : { passed: true };
}

// ─────────────────────────────────────────────────────────────
// SELF-HEALING LOOP
// ─────────────────────────────────────────────────────────────

async function handleHealingLoop(ai, sourcePath, absoluteTestPath, sourceCode, badTestCode, errorLog, failureType) {
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

    Common causes to check first:
    1. Wrong relative import paths — verify the depth of '../' matches the actual folder nesting.
    2. Missing jest.mock() calls for any module that makes real network/DB calls.
    3. TypeScript type errors — make sure mock shapes match the real types.
    4. Modules imported but not mocked at all (session libraries, mailers, OTP libs, etc.).

    If this is a real application bug in the source code (not a test issue),
    set isRealBugInSourceCode to true and write a Jira report summary.
    Otherwise rewrite the test completely to satisfy coverage and mocking requirements.
    Return the COMPLETE fixed test file — no partial snippets.
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

  if (resolution.isRealBugInSourceCode) {
    console.log("🚨 Real application bug found during healing loop!");
    await createJiraTicketsForFailures(
      sourcePath,
      `Bug found during healing: ${resolution.jiraTicketSummary}\n\nOriginal error log:\n${errorLog}`,
      "REAL_BUG_DETECTED"
    );
    process.exit(1);
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
// FIX 2 — correct relative path depth calculation
// Original used split('/').length - 1 which counted the filename
// segment, producing one too many '../' hops.
// Fix: subtract 2 (one for the filename, one for zero-indexing the
// folder count so '../'.repeat(n) reaches server/src correctly).
//
// Example:
//   mirrorRelativePath = "tests/ai-generated/controllers/restaurant/login.test.ts"
//   split('/').length  = 5   →  old depth = 4  →  ../../../../src/  ❌
//                          →  new depth = 3  →  ../../../src/      ✅
// ─────────────────────────────────────────────────────────────

function computeRelativePathToSrc(mirrorRelativePath) {
  // Number of directory levels deep the test file sits (excluding filename)
  const segments = mirrorRelativePath.split('/');
  const folderDepth = segments.length - 2; // -1 for filename, -1 because repeat(n) gives n hops
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

  const repoRoot = path.resolve(__dirname, '../../..');

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

    // FIX 2: use corrected depth calculation (see computeRelativePathToSrc above)
    const relativePathToSrc = computeRelativePathToSrc(mirrorRelativePath);

    console.log(`  Computed relativePathToSrc: ${relativePathToSrc}`);

    const initialPrompt = `
      Target TypeScript file location: ${localizedServerPath}
      Test file will be saved at: server/${mirrorRelativePath}
      CRITICAL: When importing from the src/ tree use this exact prefix: ${relativePathToSrc}

      For example, if the source file imports from 'src/config/db', your test must import it as:
      import { ... } from '${relativePathToSrc}config/db';

      You MUST mock every module that could make real network, database, Redis, S3, or email
      calls. Use jest.mock() at the top of the file for each such module.

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

    // FIX 4: bumped maxLoops from 2 → 3 to give the healer an extra attempt
    let loopAttempt = 1;
    const maxLoops = 3;
    let passGates = false;

    while (loopAttempt <= maxLoops && !passGates) {
      console.log(`\nQuality Gate Loop [${loopAttempt}/${maxLoops}]`);

      const gateA = await runGateA(absoluteTestPath, repoRoot);
      if (!gateA.passed) {
        console.log(`❌ Gate A Failed: ${gateA.reason}`);
        generatedTestCode = await handleHealingLoop(
          ai, localizedServerPath, absoluteTestPath,
          fileContent, generatedTestCode, gateA.log, "STRUCTURAL_FAILURE"
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
          fileContent, generatedTestCode, gateB.reason, "LOGICAL_FAILURE"
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
        // FIX 5 applied here too: --testPathPattern instead of positional arg
        `npx jest --testPathPattern="${absoluteTestPath}" --passWithNoTests --config=jest.config.ts`,
        { stdio: 'pipe', cwd: path.join(repoRoot, 'server') }
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

      await createJiraTicketsForFailures(
        localizedServerPath,
        logOutput,
        "FINAL_VERIFICATION_FAILURE"
      );

      process.exit(1);
    }
  }
}

run();