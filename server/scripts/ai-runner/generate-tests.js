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
// FAILURE PARSING — splits Jest output into individual failures
// ─────────────────────────────────────────────────────────────

function parseFailuresFromLog(executionLogs) {
  const failures = [];

  // Jest formats each failing test block starting with ● bullet
  // e.g:  ● AuthService › verifyOtp › should throw on expired OTP
  const jestFailureBlocks = executionLogs.split(/\n\s*●\s+/).filter(Boolean);

  if (jestFailureBlocks.length > 1) {
    // First element is preamble (FAIL src/...) — skip it
    const testBlocks = jestFailureBlocks.slice(1);

    for (const block of testBlocks) {
      const lines = block.trim().split('\n');

      // First line = full test name e.g. "AuthService › verifyOtp › should throw"
      const testName = lines[0].trim();

      // Find the error line
      const errorLine = lines.find(l =>
        l.trim().match(/^(Error:|TypeError:|ReferenceError:|SyntaxError:|expect\(|Cannot|Failed|Received)/i)
      ) || lines[1] || '';

      // Find the source file reference line
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

  // Fallback: TypeScript compile errors or non-standard output
  // Split on common error patterns
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
// JIRA — one ticket per distinct failure
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
    const failure = failures[i];
    await createSingleJiraTicket(
      sourceFile,
      failure.fullLog,
      failure.summary,
      failureType,
      i + 1,
      failures.length
    );
    // Small delay between Jira API calls to avoid rate limiting
    if (i < failures.length - 1) await sleep(500);
  }
}

// ─────────────────────────────────────────────────────────────
// GATE A — coverage check
// ─────────────────────────────────────────────────────────────

async function runGateA(absoluteTestPath, repoRoot) {
  const tmpCoverageDir = path.join(repoRoot, 'server', 'coverage-tmp');
  try {
    execSync(
      `npx jest ${absoluteTestPath} --coverage --coverageReporters=json-summary --coverageDirectory=${tmpCoverageDir} --config=jest.config.ts`,
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
    return {
      passed: false,
      reason: "Jest crashed during coverage run.",
      log: err.stdout?.toString() || err.message,
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
    A generated test failed quality validation.
    Failure Type: ${failureType}
    Error Log: ${errorLog}

    Source Code:
    \`\`\`typescript
    ${sourceCode}
    \`\`\`

    Failing Test Code:
    \`\`\`typescript
    ${badTestCode}
    \`\`\`

    If this is a real application bug in the source code (not a test issue),
    set isRealBugInSourceCode to true and write a Jira report summary.
    Otherwise rewrite the test completely to satisfy coverage and mocking requirements.
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

  // ── Detect changed files ──────────────────────────────────
  let changedFiles = [];
  try {
    changedFiles = execSync(`git diff --name-only ${baseSha} ${headSha}`)
      .toString()
      .trim()
      .split('\n')
      .filter(file =>
        file &&
        (
          file.startsWith('server/src/controllers/') ||
          file.startsWith('server/src/models/')
        ) &&
        file.endsWith('.ts')
      );
  } catch (err) {
    console.log("Could not compute git diff. Exiting cleanly.");
    console.error(err.message);
    return;
  }

  if (changedFiles.length === 0) {
    console.log("No target TypeScript changes detected. Skipping quality gates.");
    return;
  }

  console.log(`Detected changed files:\n${changedFiles.join('\n')}\n`);

  // __dirname = server/scripts/ai-runner/
  // repoRoot  = three levels up
  const repoRoot = path.resolve(__dirname, '../../..');

  // ── Process each changed file ─────────────────────────────
  for (const file of changedFiles) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Processing: ${file}`);
    console.log(`${'─'.repeat(60)}`);

    const absoluteFilePath = path.join(repoRoot, file);

    if (!fs.existsSync(absoluteFilePath)) {
      console.warn(`File not found: ${absoluteFilePath} — skipping.`);
      continue;
    }

    const codeContent = fs.readFileSync(absoluteFilePath, 'utf8');

    // "server/src/controllers/auth.controller.ts" → "src/controllers/auth.controller.ts"
    const localizedServerPath = file.replace('server/', '');

    // "src/controllers/auth.controller.ts" → "tests/ai-generated/controllers/auth.controller.test.ts"
    const mirrorRelativePath = localizedServerPath
      .replace('src/', 'tests/ai-generated/')
      .replace('.ts', '.test.ts');

    // Absolute path where test file will be written
    const absoluteTestPath = path.join(repoRoot, 'server', mirrorRelativePath);

    // How deep is the test file? Used to build relative import path back to src/
    // tests/ai-generated/controllers/ = depth 3 → '../../../src/'
    const testFolderDepth = mirrorRelativePath.split('/').length - 1;
    const relativePathToSrc = '../'.repeat(testFolderDepth) + 'src/';

    // ── Initial generation ────────────────────────────────
    const initialPrompt = `
      Target TypeScript file location: ${localizedServerPath}
      Test file will be saved at: server/${mirrorRelativePath}
      CRITICAL: When importing from the src/ tree use this exact prefix: ${relativePathToSrc}

      Generate unit tests for the following TypeScript source file:
      \`\`\`typescript
      ${codeContent}
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

    // ── Self-healing quality gate loops ───────────────────
    let loopAttempt = 1;
    const maxLoops = 2;
    let passGates = false;

    while (loopAttempt <= maxLoops && !passGates) {
      console.log(`\nQuality Gate Loop [${loopAttempt}/${maxLoops}]`);

      // Gate A — coverage
      const gateA = await runGateA(absoluteTestPath, repoRoot);
      if (!gateA.passed) {
        console.log(`❌ Gate A Failed: ${gateA.reason}`);
        generatedTestCode = await handleHealingLoop(
          ai,
          localizedServerPath,
          absoluteTestPath,
          codeContent,
          generatedTestCode,
          gateA.log,
          "STRUCTURAL_FAILURE"
        );
        if (!generatedTestCode) break;
        loopAttempt++;
        continue;
      }
      console.log("✅ Gate A Passed — coverage >= 80%");

      // Gate B — logical audit
      const gateB = await runGateB(ai, codeContent, generatedTestCode);
      if (!gateB.passed) {
        console.log(`❌ Gate B Failed: ${gateB.reason}`);
        generatedTestCode = await handleHealingLoop(
          ai,
          localizedServerPath,
          absoluteTestPath,
          codeContent,
          generatedTestCode,
          gateB.reason,
          "LOGICAL_FAILURE"
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

    // ── Final verification run ────────────────────────────
    console.log(`\nRunning final verification: ${absoluteTestPath}`);
    try {
      execSync(
        `npx jest ${absoluteTestPath} --passWithNoTests --config=jest.config.ts`,
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
      console.log("Creating Jira tickets for each failing test...\n");

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