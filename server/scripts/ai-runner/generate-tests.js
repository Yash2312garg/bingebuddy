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

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY environment variable.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  console.log("Analyzing PR branch git metrics against target development branch...");
  let changedFiles = [];
  try {
    // Fetches full branch history context to compute the merge base accurately
    execSync('git fetch origin development');
    
    changedFiles = execSync('git diff --name-only origin/development...HEAD')
      .toString()
      .trim()
      .split('\n')
      .filter(file => {
        return (file.startsWith('server/src/controllers/') || file.startsWith('server/src/models/')) && file.endsWith('.ts');
      });
  } catch (err) {
    console.log("Could not compute git difference layer context. Exiting cleanly.");
    return;
  }

  if (changedFiles.length === 0) {
    console.log("Zero target TypeScript changes detected in this Pull Request. Skipping quality checks.");
    return;
  }

  console.log(`Detected PR changes across target files: \n${changedFiles.join('\n')}\n`);

  for (const file of changedFiles) {
    const absoluteGitRootPath = path.resolve(__dirname, '../../..', file); 
    console.log(`\nProcessing file: ${file}`);
    const codeContent = fs.readFileSync(absoluteGitRootPath, 'utf8');

    const localizedServerPath = file.replace('server/', '');
    const mirrorPath = localizedServerPath.replace('src/', 'tests/ai-generated/').replace('.ts', '.test.ts');
    const testFolderDepth = mirrorPath.split('/').length - 1; 
    const relativePathToSrc = '../'.repeat(testFolderDepth) + 'src/';

    let initialPrompt = `
      Target TypeScript file layout location: ${localizedServerPath}
      Target Test file will be saved at: ${mirrorPath}
      CRITICAL: Whenever importing from the 'src/' tree, you MUST use this exact prefix string: ${relativePathToSrc}
      
      Review the following TypeScript component code and construct the unit testing configuration matching our architecture specifications:
      \`\`\`typescript
      ${codeContent}
      \`\`\`
    `;

    // 1. Initial Generation
    let aiResponse = await callGeminiWithRetry(ai, initialPrompt, {
      type: "OBJECT",
      properties: { testCode: { type: "STRING" } },
      required: ["testCode"]
    });

    if (!aiResponse) continue;
    let generatedTestCode = JSON.parse(aiResponse.text).testCode;

    fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
    fs.writeFileSync(mirrorPath, generatedTestCode, 'utf8');

    // --- SELF-HEALING QUALITY LOOPS ---
    let loopAttempt = 1;
    const maxLoops = 2;
    let passGates = false;

    while (loopAttempt <= maxLoops && !passGates) {
      console.log(`Executing Quality Gate Check Loop [Attempt ${loopAttempt}/${maxLoops}]...`);
      
      // Execute Gate A: Structural Coverage Analysis
      const gateA = await runGateA(mirrorPath);
      if (!gateA.passed) {
        console.log(`❌ Gate A Structural Validation Failed: ${gateA.reason}`);
        generatedTestCode = await handleHealingLoop(ai, localizedServerPath, mirrorPath, codeContent, generatedTestCode, gateA.log, "STRUCTURAL_FAILURE");
        if (!generatedTestCode) break;
        loopAttempt++;
        continue;
      }
      console.log("✅ Gate A Structural Validation Passed! Code Coverage is >= 80%.");

      // Execute Gate B: Logical Verification Audit
      const gateB = await runGateB(ai, codeContent, generatedTestCode);
      if (!gateB.passed) {
        console.log(`❌ Gate B Logical Verification Audit Failed: ${gateB.reason}`);
        generatedTestCode = await handleHealingLoop(ai, localizedServerPath, mirrorPath, codeContent, generatedTestCode, gateB.reason, "LOGICAL_FAILURE");
        if (!generatedTestCode) break;
        loopAttempt++;
        continue;
      }
      console.log("✅ Gate B Logical Verification Passed! No test shortcuts detected.");
      passGates = true;
    }

    // 2. Final Verification Checks
    if (!passGates) {
      console.error("❌ Test architecture could not pass quality gates within the healing loops. Pipeline halted.");
      process.exit(1);
    }

    console.log(`Running final confirmation verification run on: ${mirrorPath}`);
    try {
      execSync(`npx jest ${mirrorPath} --passWithNoTests`, { stdio: 'pipe' });
      console.log("🎉 All gates passed! Test file verified and approved.");
    } catch (finalErr) {
      const logOutput = finalErr.stdout?.toString() || finalErr.stderr?.toString() || finalErr.message;
      console.log("🚨 True Application Bug Detected! Forcing Jira Issue synchronization...");
      await createRealJiraTicket(localizedServerPath, logOutput);
      process.exit(1); // Terminates execution, which physically locks the PR merge button!
    }
  }
}

// Gate A Implementation: Core Coverage Summaries
async function runGateA(testPath) {
  const tmpCoverageDir = 'coverage-tmp';
  try {
    execSync(`npx jest ${testPath} --coverage --coverageReporters=json-summary --coverageDirectory=${tmpCoverageDir}`, { stdio: 'pipe' });
    
    const summaryPath = path.resolve(tmpCoverageDir, 'coverage-summary.json');
    if (!fs.existsSync(summaryPath)) {
      return { passed: false, reason: "Coverage output matrix failed to render summary profiles.", log: "" };
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const statementCoverage = summary.total.statements.pct;

    if (statementCoverage < 80) {
      return { passed: false, reason: `Insufficient statement coverage score: ${statementCoverage}%. Required >= 80%.`, log: JSON.stringify(summary.total) };
    }
    return { passed: true };
  } catch (err) {
    return { passed: false, reason: "Jest runtime crash occurred during structural isolation tests.", log: err.stdout?.toString() || err.message };
  } finally {
    if (fs.existsSync(tmpCoverageDir)) fs.rmSync(tmpCoverageDir, { recursive: true, force: true });
  }
}

// Gate B Implementation: Code Logical Integrity Review
async function runGateB(ai, sourceCode, testCode) {
  const auditorPrompt = `
    You are a Senior Software Engineer acting as a strict QA Auditor. Review this generated unit test against the target source controller code.
    Verify that the test does not cheat coverage with useless statements, tautologies, or overly aggressive mocks that bypass business logic.

    Target Source Code:
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
      critique: { type: "STRING", description: "Detailed description of logical flaws or confirmation of high quality code." }
    },
    required: ["hasFlaws", "critique"]
  });

  if (!response) return { passed: false, reason: "Auditor could not complete verification matrix checks." };
  
  const audit = JSON.parse(response.text);
  if (audit.hasFlaws) {
    return { passed: false, reason: audit.critique };
  }
  return { passed: true };
}

async function handleHealingLoop(ai, sourcePath, testPath, sourceCode, badTestCode, errorLog, failureType) {
  const fixPrompt = `
    You are a code resilience agent. A generated test failed quality validation during pipeline ingestion.
    Failure Type Classification: ${failureType}
    Diagnostic Log Metric payload: ${errorLog}

    Source Code:
    \`\`\`typescript
    ${sourceCode}
    \`\`\`

    Failing Test Code:
    \`\`\`typescript
    ${badTestCode}
    \`\`\`

    If this is an application bug rather than a test flaw, set isRealBugInSourceCode to true and write a Jira report summary.
    Otherwise, rewrite the test script completely to satisfy both code logic coverage metrics and mocking structure parameters.
  `;

  const response = await callGeminiWithRetry(ai, fixPrompt, {
    type: "OBJECT",
    properties: {
      isRealBugInSourceCode: { type: "BOOLEAN" },
      fixedTestCode: { type: "STRING" },
      jiraTicketSummary: { type: "STRING" }
    },
    required: ["isRealBugInSourceCode"]
  });

  if (!response) return null;
  const resolution = JSON.parse(response.text);

  if (resolution.isRealBugInSourceCode) {
    console.log("🚨 True Application Bug isolated within healing validation checks!");
    await createRealJiraTicket(sourcePath, `Healing assessment isolated logic failure: ${resolution.jiraTicketSummary}\n\nLogs:\n${errorLog}`);
    process.exit(1);
  }

  console.log("🔧 Rewriting test file with self-healed optimizations...");
  fs.writeFileSync(testPath, resolution.fixedTestCode, 'utf8');
  return resolution.fixedTestCode;
}

async function createRealJiraTicket(sourceFile, executionLogs) {
  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!domain || !email || !token || !projectKey) {
    console.warn("⚠️ Jira connection configuration variables missing. Ticket fallback skipped.");
    return;
  }

  const issueSummary = `[AI Alert] Application Defect Exposed in ${path.basename(sourceFile)}`;
  const issueDescription = `The automated testing pipeline detected a functional logic defect during the verification matrix execution run.\n\nTarget File Layout Location:\n* ${sourceFile}\n\nExecution Stack Trace Logs:\n{code:text}\n${executionLogs.substring(0, 4000)}\n{code}`;

  const jiraPayload = {
    fields: {
      project: { key: projectKey },
      summary: issueSummary,
      description: issueDescription,
      issuetype: { name: "Bug" }
    }
  };

  const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;

  try {
    const res = await fetch(`https://${domain}/rest/api/2/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jiraPayload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Atlassian Server rejected request payload: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    console.log(`🚀 Real Jira Issue Successfully Created on Board! Ticket Reference Key: ${data.key}`);
  } catch (apiError) {
    console.error("❌ Failed programmatically dispatching issue parameters to Jira REST API Endpoint:", apiError.message);
  }
}

async function callGeminiWithRetry(ai, prompt, responseSchema) {
  const maxAttempts = 3;
  let currentDelay = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });
      return response;
    } catch (apiError) {
      console.warn(`⚠️ API attempt ${attempt} failed: ${apiError.message}`);
      if (attempt === maxAttempts) return null;
      await sleep(currentDelay);
      currentDelay *= 2;
    }
  }
  return null;
}

run();