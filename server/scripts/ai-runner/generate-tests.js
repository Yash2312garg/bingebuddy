const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTIONS = `
You are an expert QA automation engineer specialized in Express.js and TypeScript.
Your job is to generate highly accurate, pure TypeScript Jest unit tests for the provided MVC target code.
You MUST write complete tests that require ZERO external dependencies or running databases.

CRITICAL RELATIVE IMPORT RULE:
You must use standard relative paths to import modules.
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
// DETECT JEST VERSION
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
// EXTRACT REAL IMPORTS
// ─────────────────────────────────────────────────────────────
function extractImportPaths(fileContent) {
  const importRegex = /(?:import|require)\s*(?:\(?\s*['"`]([^'"`]+)['"`]\s*\)?|[\w\s{},*]+\s+from\s+['"`]([^'"`]+)['"`])/g;
  const paths = new Set();
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    const p = match[1] || match[2];
    if (p) paths.add(p);
  }
  return [...paths].filter(p => p.startsWith('.'));
}

// ─────────────────────────────────────────────────────────────
// FILE ELIGIBILITY
// ─────────────────────────────────────────────────────────────
const SKIP_FILENAME_PATTERNS = [/\.d\.ts$/, /\.config\.(ts|js)$/, /\.types\.(ts)$/, /types\.ts$/, /index\.ts$/, /constants\.ts$/, /enums\.ts$/, /interfaces\.ts$/, /migrations?\//, /seeds?\//, /\.test\.ts$/, /\.spec\.ts$/];
const TESTABLE_FOLDERS = ['src/controllers/', 'src/services/', 'src/models/', 'src/utils/', 'src/middleware/', 'src/dao/', 'src/helpers/'];
const TESTABLE_CODE_PATTERNS = [/export\s+(const|function|class|async function)/, /export\s+default\s+(function|class|async)/, /\.(get|post|put|delete|patch)\s*\(/, /async\s+\w+\s*\(/, /\bif\b|\bswitch\b|\bfor\b|\bwhile\b/, /try\s*\{/];

function shouldSkipFile(filePath, fileContent) {
  const relativePath = filePath.replace(/\\/g, '/');

  for (const pattern of SKIP_FILENAME_PATTERNS) {
    if (pattern.test(relativePath)) return { skip: true, reason: `Filename matches skip pattern: ${pattern}` };
  }

  const inTestableFolder = TESTABLE_FOLDERS.some(folder => relativePath.includes(folder));
  if (!inTestableFolder) return { skip: true, reason: `Not in a testable folder.` };

  const hasTestableLogic = TESTABLE_CODE_PATTERNS.some(pattern => pattern.test(fileContent));
  if (!hasTestableLogic) return { skip: true, reason: 'No testable logic found.' };

  const lineCount = fileContent.split('\n').filter(l => l.trim()).length;
  const typeOnlyLines = fileContent.split('\n').filter(l =>
    l.trim().match(/^(export\s+)?(type|interface|enum)\s+/) ||
    l.trim().match(/^import\s+type\s+/) || l.trim() === '' ||
    l.trim().startsWith('//') || l.trim().startsWith('*') || l.trim().startsWith('/*')
  ).length;

  if (lineCount > 0 && typeOnlyLines / lineCount > 0.85) return { skip: true, reason: `File is mostly type definitions.` };

  const meaningfulLines = fileContent.split('\n').filter(l => {
    const t = l.trim();
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && t !== '{' && t !== '}';
  }).length;

  if (meaningfulLines < 10) return { skip: true, reason: `File too small to warrant unit tests.` };

  return { skip: false };
}

// ─────────────────────────────────────────────────────────────
// AI ELIGIBILITY CHECK
// ─────────────────────────────────────────────────────────────
async function aiShouldGenerateTests(ai, fileContent, filePath) {
  const eligibilityPrompt = `
    You are a senior TypeScript engineer reviewing a file to decide if it needs unit tests.
    File path: ${filePath}
    File content:\n\`\`\`typescript\n${fileContent.substring(0, 3000)}\n\`\`\`
    Respond with: needsTests (boolean) and reason (string).
  `;

  const response = await callGeminiWithRetry(ai, eligibilityPrompt, {
    type: "OBJECT",
    properties: { needsTests: { type: "BOOLEAN" }, reason: { type: "STRING" } },
    required: ["needsTests", "reason"],
  });

  if (!response) return { needsTests: true, reason: "AI eligibility check failed — defaulting to generate" };
  return JSON.parse(response.text);
}

// ─────────────────────────────────────────────────────────────
// FAILURE PARSING & JIRA
// ─────────────────────────────────────────────────────────────
function parseFailuresFromLog(executionLogs) {
  const failures = [];
  const jestFailureBlocks = executionLogs.split(/\n\s*●\s+/).filter(Boolean);

  if (jestFailureBlocks.length > 1) {
    const testBlocks = jestFailureBlocks.slice(1);
    for (const block of testBlocks) {
      const lines = block.trim().split('\n');
      const testName = lines[0].trim();
      const errorLine = lines.find(l => l.trim().match(/^(Error:|TypeError:|ReferenceError:|SyntaxError:|expect\(|Cannot|Failed|Received)/i)) || lines[1] || '';
      const sourceLine = lines.find(l => l.includes('.ts:')) || '';
      failures.push({ summary: `${testName} — ${errorLine.trim().substring(0, 80)}`, fullLog: block.trim(), testName, errorLine: errorLine.trim(), sourceLine: sourceLine.trim() });
    }
    return failures;
  }

  const errorMatches = executionLogs.match(/(error TS\d+:[^\n]+|TypeError:[^\n]+|ReferenceError:[^\n]+|SyntaxError:[^\n]+|Error:[^\n]+|FAIL [^\n]+)/gi);
  if (errorMatches) {
    const seen = new Set();
    for (const match of errorMatches) {
      const trimmed = match.trim();
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        failures.push({ summary: trimmed.substring(0, 120), fullLog: trimmed, testName: trimmed, errorLine: trimmed, sourceLine: '' });
      }
    }
  }
  return failures;
}

const SUITE_LOAD_PATTERNS = [/Test suite failed to run/i, /Option .* was replaced by/i, /Please update your configuration/i, /error TS\d+:/i, /SyntaxError: Cannot use import/i, /Jest: .* is not supported/i, /jest\.config/i, /Could not find a config file/i, /No tests found/i];
function isInfrastructureError(log) {
  const hasSuiteLoadFailure = SUITE_LOAD_PATTERNS.some(p => p.test(log));
  const testsActuallyRan = /at (?:login|getUser|createUser|middleware|handler|controller|service)\s+\(src\//i.test(log) || /console\.(log|error|warn)[\s\S]{0,200}at \w+\s+\(src\//i.test(log);
  return hasSuiteLoadFailure && !testsActuallyRan;
}

async function createSingleJiraTicket(sourceFile, failureLog, failureSummary, failureType, ticketIndex, totalTickets) {
  const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env;
  if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) return null;

  const fileName = path.basename(sourceFile);
  const labelType = failureType.toLowerCase().replace(/_/g, '-');
  const issueSummary = `[AI ${failureType}] ${fileName} — ${failureSummary.substring(0, 100)}`;
  const issueDescription = [`*Automated pipeline detected a failure.*`, `\n*File:* ${sourceFile}`, `\n*Failure log:*\n{code:text}\n${failureLog.substring(0, 4000)}\n{code}`].join('\n');

  try {
    const res = await fetch(`https://${JIRA_DOMAIN}/rest/api/2/issue`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { project: { key: JIRA_PROJECT_KEY }, summary: issueSummary, description: issueDescription, issuetype: { name: "Bug" }, labels: ["ai-generated", labelType] } }),
    });
    if (res.ok) console.log(`🎫 Jira Ticket successfully created.`);
  } catch (err) {
    console.error(`❌ Failed to create Jira ticket:`, err.message);
  }
}

async function createJiraTicketsForFailures(sourceFile, executionLogs, failureType) {
  const failures = parseFailuresFromLog(executionLogs);
  if (failures.length === 0) {
    await createSingleJiraTicket(sourceFile, executionLogs.substring(0, 4000), "Unknown failure", failureType, 1, 1);
    return;
  }
  for (let i = 0; i < failures.length; i++) {
    await createSingleJiraTicket(sourceFile, failures[i].fullLog, failures[i].summary, failureType, i + 1, failures.length);
    if (i < failures.length - 1) await sleep(500);
  }
}

// ─────────────────────────────────────────────────────────────
// GATE A & B
// ─────────────────────────────────────────────────────────────
async function runGateA(absoluteTestPath, repoRoot, jestPathFlag) {
  const tmpCoverageDir = path.join(repoRoot, 'server', 'coverage-tmp');
  try {
    execSync(
      `npx jest "${jestPathFlag}=${absoluteTestPath}" --coverage --coverageReporters=json-summary --coverageDirectory=${tmpCoverageDir} --config=jest.config.ts --forceExit`,
      { stdio: 'pipe', cwd: path.join(repoRoot, 'server') }
    );
    const summaryPath = path.join(tmpCoverageDir, 'coverage-summary.json');
    if (!fs.existsSync(summaryPath)) return { passed: false, reason: "Coverage summary not generated.", log: "", isInfra: false };

    const pct = JSON.parse(fs.readFileSync(summaryPath, 'utf8')).total.statements.pct;
    if (pct < 80) return { passed: false, reason: `Statement coverage ${pct}% is below 80% threshold.`, log: "", isInfra: false };
    return { passed: true, log: "", isInfra: false };
  } catch (err) {
    const log = [err.stdout?.toString() || '', err.stderr?.toString() || '', err.message || ''].filter(Boolean).join('\n');
    const infra = isInfrastructureError(log);
    return { passed: false, reason: "Jest crashed during coverage run.", log, isInfra: infra };
  } finally {
    if (fs.existsSync(tmpCoverageDir)) fs.rmSync(tmpCoverageDir, { recursive: true, force: true });
  }
}

async function runGateB(ai, sourceCode, testCode) {
  const auditorPrompt = `
    You are a QA Auditor. Review this test against the source code.
    Verify the test does not cheat coverage with tautologies or overly aggressive mocks.
    Source Code:\n${sourceCode}\nGenerated Test Code:\n${testCode}
  `;
  const response = await callGeminiWithRetry(ai, auditorPrompt, {
    type: "OBJECT",
    properties: { hasFlaws: { type: "BOOLEAN" }, critique: { type: "STRING" } },
    required: ["hasFlaws", "critique"],
  });
  if (!response) return { passed: false, reason: "Auditor failed to respond." };
  const audit = JSON.parse(response.text);
  return audit.hasFlaws ? { passed: false, reason: audit.critique } : { passed: true };
}

// ─────────────────────────────────────────────────────────────
// SELF-HEALING LOOP
// ─────────────────────────────────────────────────────────────
async function handleHealingLoop(ai, sourcePath, absoluteTestPath, sourceCode, badTestCode, errorLog, failureType, isInfraError, sourceImports, mockPathMapping) {
  const fixPrompt = `
    A generated TypeScript test failed quality validation.
    Failure Type: ${failureType}
    Error Log:\n${errorLog.substring(0, 4000)}

    Source Code:\n${sourceCode}\nFailing Test Code:\n${badTestCode}

    EXACT import paths used by the source file:
    ${sourceImports.map(p => `  - ${p}`).join('\n')}

    You MUST use these exact jest.mock() statements to prevent resolution failures:
    ${mockPathMapping}

    If this is a real bug in the source code (not a test issue or path failure), set isRealBugInSourceCode=true.
    Otherwise rewrite the test completely to satisfy coverage and mocking requirements.
  `;

  const response = await callGeminiWithRetry(ai, fixPrompt, {
    type: "OBJECT",
    properties: { isRealBugInSourceCode: { type: "BOOLEAN" }, fixedTestCode: { type: "STRING" }, jiraTicketSummary: { type: "STRING" } },
    required: ["isRealBugInSourceCode"],
  });

  if (!response) return null;
  const resolution = JSON.parse(response.text);

  if (resolution.isRealBugInSourceCode && !isInfraError) {
    console.log("🚨 Real application bug found during healing!");
    await createJiraTicketsForFailures(sourcePath, `Bug found: ${resolution.jiraTicketSummary}\n\nLog:\n${errorLog}`, "REAL_BUG_DETECTED");
    process.exit(1);
  }

  if (!resolution.fixedTestCode) return null;
  console.log("🔧 Rewriting test with healed version...");
  fs.writeFileSync(absoluteTestPath, resolution.fixedTestCode, 'utf8');
  return resolution.fixedTestCode;
}

// ─────────────────────────────────────────────────────────────
// 🎯 FIX 2: SMART QUOTA RETRY ENGINE
// ─────────────────────────────────────────────────────────────
async function callGeminiWithRetry(ai, prompt, responseSchema) {
  const maxAttempts = 4; // Gave it an extra attempt for quota delays
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

      // 🎯 Read the explicit wait time Google asks for in a 429 Quota Exceeded error
      const match = err.message.match(/Please retry in (\d+(?:\.\d+)?)s/i);
      if (err.message.includes('429') && match) {
         const requestedDelayMs = Math.ceil(parseFloat(match[1]) * 1000);
         console.log(`⏳ Burst Limit Hit: Waiting ${requestedDelayMs / 1000}s as requested by API...`);
         await sleep(requestedDelayMs + 2000); // Wait the exact time plus a 2-second safety buffer
      } else {
         await sleep(delay);
         delay *= 2;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function run() {
  if (!process.env.GEMINI_API_KEY || !process.env.BASE_SHA || !process.env.HEAD_SHA) process.exit(1);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const repoRoot = path.resolve(__dirname, '../../..');
  const serverCwd = path.join(repoRoot, 'server');
  const jestPathFlag = detectJestPathFlag(serverCwd);

  console.log(`\nAnalyzing diff: ${process.env.BASE_SHA} → ${process.env.HEAD_SHA}\n`);
  
  let allChangedFiles = [];
  try {
    allChangedFiles = execSync(`git diff --name-only ${process.env.BASE_SHA} ${process.env.HEAD_SHA}`)
      .toString().trim().split('\n')
      .filter(file => file && file.startsWith('server/src/') && file.endsWith('.ts'));
  } catch (err) {
    return;
  }

  if (allChangedFiles.length === 0) return;

  const eligibleFiles = [];
  for (const file of allChangedFiles) {
    const absoluteFilePath = path.join(repoRoot, file);
    if (!fs.existsSync(absoluteFilePath)) continue;

    const fileContent = fs.readFileSync(absoluteFilePath, 'utf8');
    if (shouldSkipFile(file, fileContent).skip) continue;

    const aiCheck = await aiShouldGenerateTests(ai, fileContent, file);
    if (aiCheck.needsTests) eligibleFiles.push({ file, fileContent });
  }

  if (eligibleFiles.length === 0) return;

  for (const { file, fileContent } of eligibleFiles) {
    console.log(`\nProcessing: ${file}`);
    const localizedServerPath = file.replace('server/', '');
    const mirrorRelativePath = localizedServerPath.replace('src/', 'tests/ai-generated/').replace('.ts', '.test.ts');
    const absoluteTestPath = path.join(repoRoot, 'server', mirrorRelativePath);
    const sourceImports = extractImportPaths(fileContent);

    // ==========================================
    // 🎯 FIX 1: NATIVE PATH RESOLUTION
    // ==========================================
    const mockPathMapping = sourceImports.map(p => {
      // 1. Where does the source file live?
      const sourceDir = path.dirname(path.join(repoRoot, file));
      // 2. Where is the actual imported file on disk?
      const absoluteImportedFile = path.resolve(sourceDir, p);
      // 3. Where is our test file going to live?
      const testDir = path.dirname(absoluteTestPath);
      // 4. Calculate the path from the test directory directly to the imported file
      let relativeMockPath = path.relative(testDir, absoluteImportedFile).replace(/\\/g, '/');
      
      // Ensure it's formatted as a proper relative import
      if (!relativeMockPath.startsWith('.')) relativeMockPath = './' + relativeMockPath;
      return `  jest.mock('${relativeMockPath}')`;
    }).join('\n');

    const initialPrompt = `
      Target TypeScript file location: ${localizedServerPath}
      Test file will be saved at: server/${mirrorRelativePath}

      EXACT imports from the source file:
      ${sourceImports.map(p => `  ${p}`).join('\n')}

      Suggested jest.mock() calls based on exact native paths (use these verbatim):
      ${mockPathMapping || '  (no relative imports detected)'}

      Generate unit tests for:\n\`\`\`typescript\n${fileContent}\n\`\`\`
    `;

    let aiResponse = await callGeminiWithRetry(ai, initialPrompt, { type: "OBJECT", properties: { testCode: { type: "STRING" } }, required: ["testCode"] });
    if (!aiResponse) continue;
    let generatedTestCode = JSON.parse(aiResponse.text).testCode;

    fs.mkdirSync(path.dirname(absoluteTestPath), { recursive: true });
    fs.writeFileSync(absoluteTestPath, generatedTestCode, 'utf8');

    let loopAttempt = 1;
    const maxLoops = 3;
    let passGates = false;

    while (loopAttempt <= maxLoops && !passGates) {
      console.log(`\nQuality Gate Loop [${loopAttempt}/${maxLoops}]`);

      const gateA = await runGateA(absoluteTestPath, repoRoot, jestPathFlag);
      if (!gateA.passed) {
        console.log(`❌ Gate A Failed: ${gateA.reason}`);
        generatedTestCode = await handleHealingLoop(ai, localizedServerPath, absoluteTestPath, fileContent, generatedTestCode, gateA.log, "STRUCTURAL_FAILURE", gateA.isInfra, sourceImports, mockPathMapping);
        if (!generatedTestCode) break;
        loopAttempt++;
        continue;
      }

      const gateB = await runGateB(ai, fileContent, generatedTestCode);
      if (!gateB.passed) {
        console.log(`❌ Gate B Failed: ${gateB.reason}`);
        generatedTestCode = await handleHealingLoop(ai, localizedServerPath, absoluteTestPath, fileContent, generatedTestCode, gateB.reason, "LOGICAL_FAILURE", false, sourceImports, mockPathMapping);
        if (!generatedTestCode) break;
        loopAttempt++;
        continue;
      }
      passGates = true;
    }

    if (!passGates) process.exit(1);

    try {
      execSync(`npx jest "${jestPathFlag}=${absoluteTestPath}" --passWithNoTests --config=jest.config.ts --forceExit`, { stdio: 'pipe', cwd: serverCwd });
      console.log("🎉 Test verified and approved.\n");
    } catch (finalErr) {
      const logOutput = [finalErr.stdout?.toString() || '', finalErr.stderr?.toString() || '', finalErr.message || ''].filter(Boolean).join('\n');
      console.log("\n🚨 Bug detected in final verification run!");
      await createJiraTicketsForFailures(localizedServerPath, logOutput, "FINAL_VERIFICATION_FAILURE");
      process.exit(1);
    }
  }
}

run();