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

  console.log("Analyzing git repository changes...");
  let changedFiles = [];
  try {
    changedFiles = execSync('git diff --name-only HEAD~1 HEAD')
      .toString()
      .trim()
      .split('\n')
      .filter(file => {
        return (file.startsWith('server/src/controllers/') || file.startsWith('server/src/models/')) && file.endsWith('.ts');
      });
  } catch (err) {
    console.log("Could not process git context history. Exiting cleanly.");
    return;
  }

  if (changedFiles.length === 0) {
    console.log("Zero target TypeScript MVC component changes detected in server. Ending step.");
    return;
  }

  console.log(`Detected changes across target source targets: \n${changedFiles.join('\n')}\n`);

  for (const file of changedFiles) {
    const absoluteGitRootPath = path.resolve(__dirname, '../../..', file); 
    console.log(`\nProcessing file: ${file}`);
    const codeContent = fs.readFileSync(absoluteGitRootPath, 'utf8');

    const localizedServerPath = file.replace('server/', '');
    const mirrorPath = localizedServerPath.replace('src/', 'tests/ai-generated/').replace('.ts', '.test.ts');
    const testFolderDepth = mirrorPath.split('/').length - 1; 
    const relativePathToSrc = '../'.repeat(testFolderDepth) + 'src/';

    const initialPrompt = `
      Target TypeScript file layout location: ${localizedServerPath}
      Target Test file will be saved at: ${mirrorPath}
      CRITICAL: Whenever importing from the 'src/' tree, you MUST use this exact prefix string: ${relativePathToSrc}
      
      Review the following TypeScript component code and construct the unit testing configuration matching our architecture specifications:
      \`\`\`typescript
      ${codeContent}
      \`\`\`
    `;

    // 1. Initial Test Generation (with Phase 1 503 Retry Safety Net)
    let initialResponse = await callGeminiWithRetry(ai, initialPrompt, {
      type: "OBJECT",
      properties: {
        testCode: { type: "STRING" },
        criticalityReport: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              issue: { type: "STRING" },
              criticality: { type: "STRING", enum: ["CRITICAL", "MEDIUM", "LOW"] },
              description: { type: "STRING" }
            },
            required: ["issue", "criticality", "description"]
          }
        }
      },
      required: ["testCode", "criticalityReport"]
    });

    if (!initialResponse) continue;

    try {
      const result = JSON.parse(initialResponse.text);
      fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
      fs.writeFileSync(mirrorPath, result.testCode, 'utf8');
      console.log(`Successfully constructed TypeScript test: ${mirrorPath}`);

      if (result.criticalityReport && result.criticalityReport.length > 0) {
        processAlerts(localizedServerPath, result.criticalityReport);
      }

      // 2. Programmatic Jest Execution for Self-Healing Inspection
      console.log(`Running Jest validation for: ${mirrorPath}`);
      try {
        execSync(`npx jest ${mirrorPath} --passWithNoTests`, { stdio: 'pipe' });
        console.log("✅ Test suite passed successfully on the first pass!");
      } catch (jestError) {
        // Capture the exact console logs and failure payload from Jest
        const executionLog = jestError.stdout?.toString() || jestError.stderr?.toString() || jestError.message;
        console.log("❌ Test execution failed. Initializing Phase 2 Self-Healing and Ticket Engine...");

        await handleTestFailure(ai, localizedServerPath, mirrorPath, codeContent, result.testCode, executionLog);
      }

    } catch (parseError) {
      console.error(`Failed processing structured response:`, parseError.message);
    }
  }
}

// 3. The Self-Healing & Jira Ticket Determination Engine
async function handleTestFailure(ai, sourcePath, testPath, sourceCode, generatedTestCode, jestErrorLog) {
  const healingPrompt = `
    You are an automated code resilience supervisor. A generated unit test has failed a Jest execution run.
    
    Source Component Code:
    \`\`\`typescript
    ${sourceCode}
    \`\`\`

    Your Previously Generated Test Code (at ${testPath}):
    \`\`\`typescript
    ${generatedTestCode}
    \`\`\`

    Exact Jest Failure Log Output:
    \`\`\`text
    ${jestErrorLog}
    \`\`\`

    Analyze the mistake:
    1. Is this a 'Test-Level Defect'? (e.g., you hallucinated an import path, wrote invalid TypeScript syntax, or incorrectly structured a Jest spy/mock). If so, set isRealBugInSourceCode to false and provide the fixedTestCode.
    2. Is this a 'True Application Bug'? (e.g., the code failed because the controller lacks error catching, handles a missing payload element improperly, or mismanages a null boundary condition). If so, set isRealBugInSourceCode to true and write a detailed Jira Bug Ticket in jiraTicketMarkdown matching the requested schema.
  `;

  const healingResponse = await callGeminiWithRetry(ai, healingPrompt, {
    type: "OBJECT",
    properties: {
      isRealBugInSourceCode: { type: "BOOLEAN" },
      fixedTestCode: { type: "STRING", description: "The complete corrected test script. Populate ONLY if isRealBugInSourceCode is false." },
      jiraTicketMarkdown: { type: "STRING", description: "A detailed Jira ticket text written in clean Markdown notation. Populate ONLY if isRealBugInSourceCode is true." }
    },
    required: ["isRealBugInSourceCode"]
  });

  if (!healingResponse) return;

  try {
    const assessment = JSON.parse(healingResponse.text);

    if (assessment.isRealBugInSourceCode === false && assessment.fixedTestCode) {
      console.log("🔧 AI diagnosed a Test-Level Defect. Overwriting with Self-Healed test script...");
      fs.writeFileSync(testPath, assessment.fixedTestCode, 'utf8');

      // Verify the healed test code one final time
      try {
        execSync(`npx jest ${testPath} --passWithNoTests`, { stdio: 'pipe' });
        console.log("🎉 Self-Healing Successful! The test code is corrected and now passes cleanly.");
      } catch (retryError) {
        console.log("⚠️ Self-healed test still fails structural checks. Forcing automated ticket fallback.");
        generateJiraTicketFile(sourcePath, retryError.stdout?.toString() || retryError.message, "AI self-healing loop failed to resolve test structure assertions.");
      }
    } else if (assessment.isRealBugInSourceCode === true && assessment.jiraTicketMarkdown) {
      console.log("🚨 AI diagnosed a TRUE application bug! Compiling Jira Ticket report...");
      generateJiraTicketFile(sourcePath, jestErrorLog, assessment.jiraTicketMarkdown);
    }
  } catch (err) {
    console.error("Failed to execute healing loop logic parsing:", err.message);
  }
}

// 4. Jira Ticket File Custom Builder
function generateJiraTicketFile(sourcePath, rawLogs, ticketMarkdown) {
  const ticketDir = path.resolve('tests/tickets');
  fs.mkdirSync(ticketDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ticketPath = path.join(ticketDir, `BUG-${timestamp}.md`);

  let completeTicketFile = `${ticketMarkdown}\n\n## 📋 Raw Test Pipeline Logs\n\`\`\`text\n${rawLogs}\n\`\`\``;

  fs.writeFileSync(ticketPath, completeTicketFile, 'utf8');
  console.log(`💾 Jira ticket log file compiled and saved to: server/tests/tickets/BUG-${timestamp}.md`);
}

// 5. Shared Core Call Utility with Exponential Backoff Retries
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
      console.warn(`⚠️ API attempt ${attempt} failed.`);
      if (attempt === maxAttempts) {
        console.error(`❌ Definitively failed calling Gemini API after ${maxAttempts} runs.`);
        return null;
      }
      console.log(`Pausing for ${currentDelay / 1000} seconds before retrying...`);
      await sleep(currentDelay);
      currentDelay *= 2;
    }
  }
  return null;
}

function processAlerts(filename, reports) {
  let hasCritical = false;
  let summaryMarkdown = `### 🤖 AI TypeScript Code Quality Audit for \`${filename}\`\n\n| Severity | Issue | Insight |\n| --- | --- | --- |\n`;

  reports.forEach(report => {
    let emoji = "ℹ️";
    if (report.criticality === "CRITICAL") {
      emoji = "🚨";
      hasCritical = true;
    } else if (report.criticality === "MEDIUM") {
      emoji = "⚠️";
    }
    summaryMarkdown += `| ${emoji} **${report.criticality}** | ${report.issue} | ${report.description} |\n`;
  });

  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY || './summary.md', summaryMarkdown + '\n');

  if (hasCritical) {
    try {
      const issueTitle = `[AI Alert] Critical Vulnerability Identified in ${filename}`;
      const issueBody = `The AI unit test orchestration engine detected severe operational patterns inside \`${filename}\` during deployment processing.\n\n${summaryMarkdown}`;
      
      execSync(`gh issue create --title "${issueTitle}" --body "${issueBody.replace(/"/g, '\\"')}" --label "bug"`, {
        env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN }
      });
    } catch (cliErr) {
      console.error("Failed to publish GitHub Issue notification layer:", cliErr.message);
    }
  }
}

run();