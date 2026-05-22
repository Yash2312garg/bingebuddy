const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTIONS = `
You are an expert backend QA automation engineer specialized in Express.js and TypeScript.
Your job is to generate highly accurate, pure TypeScript Jest unit tests for the provided MVC target code.
You MUST write complete tests that require ZERO external dependencies or running databases.

CRITICAL RELATIVE IMPORT RULE:
You must use standard relative paths to import modules. 
To help you, the prompt provides an exact string called 'RELATIVE_PATH_TO_SRC'. You MUST use this exact prefix whenever you import any file from the root 'src/' tree.

For example, if RELATIVE_PATH_TO_SRC is '../../../../src/', then:
- To import the controller under test: import { getRestaurantInformation } from '../../../../src/controllers/user/user.controller';
- To import a model: import { getRestaurantinfo } from '../../../../src/models/auth/auth.model';
- To import a DAO: import { RestaurantDao } from '../../../../src/dao/restaurant.dao';

Strict Mocking Matrix Rules (TypeScript Syntax):
1. Native PostgreSQL Pool: Mock your DB pool connection module completely.
2. Redis Cache: Mock the implementation of get/set calls.
3. AWS S3: Mock the '@aws-sdk/client-s3' Send command wrapper.
4. Express: Mock 'Request' and 'Response' types using jest.fn() for res.status, res.json, and res.send.

Do not wrap your output code in markdown code blocks inside the JSON string.
`;

// Helper function to force the script to pause
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
    console.log(`Processing file: ${file}`);
    const codeContent = fs.readFileSync(absoluteGitRootPath, 'utf8');

    const localizedServerPath = file.replace('server/', '');
    const mirrorPath = localizedServerPath.replace('src/', 'tests/ai-generated/').replace('.ts', '.test.ts');
    const testFolderDepth = mirrorPath.split('/').length - 1; 
    const relativePathToSrc = '../'.repeat(testFolderDepth) + 'src/';

    const prompt = `
      Target TypeScript file layout location: ${localizedServerPath}
      Target Test file will be saved at: ${mirrorPath}
      
      CRITICAL: Whenever importing from the 'src/' tree, you MUST use this exact prefix string: ${relativePathToSrc}
      
      Review the following TypeScript component code and construct the unit testing configuration matching our architecture specifications:
      \`\`\`typescript
      ${codeContent}
      \`\`\`
    `;

    // --- Dynamic Retry Loop Configuration ---
    let response = null;
    const maxAttempts = 3;
    let currentDelay = 3000; // Start with a 3-second delay if it fails

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTIONS,
            responseMimeType: "application/json",
            responseSchema: {
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
            }
          }
        });
        
        // If we reach this point, the API call succeeded! Break out of the retry loop.
        break; 
      } catch (apiError) {
        console.warn(`⚠️ Attempt ${attempt} failed due to API limitations or high load.`);
        
        if (attempt === maxAttempts) {
          console.error(`❌ Definitively failed executing inference block after ${maxAttempts} attempts.`);
          continue; // Move on to the next file if everything fails
        }
        
        console.log(`Pausing for ${currentDelay / 1000} seconds before retrying...`);
        await sleep(currentDelay);
        currentDelay *= 2; // Double the wait time for the next try (Exponential Backoff)
      }
    }

    // If all retries failed and we have no response, skip processing for this file
    if (!response) continue;

    try {
      const result = JSON.parse(response.text);
      
      fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
      fs.writeFileSync(mirrorPath, result.testCode, 'utf8');
      console.log(`Successfully constructed TypeScript test: ${mirrorPath}`);

      if (result.criticalityReport && result.criticalityReport.length > 0) {
        processAlerts(localizedServerPath, result.criticalityReport);
      }
    } catch (parseError) {
      console.error(`Failed parsing structured JSON output for ${file}:`, parseError.message);
    }
  }
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
    console.log(`🚨 Critical flaws isolated within ${filename}. Deploying automated issue generation...`);
    try {
      const issueTitle = `[AI Alert] Critical Vulnerability Identified in ${filename}`;
      const issueBody = `The AI unit test orchestration engine detected severe operational patterns inside \`${filename}\` during deployment processing.\n\n${summaryMarkdown}`;
      
      execSync(`gh issue create --title "${issueTitle}" --body "${issueBody.replace(/"/g, '\\"')}" --label "bug"`, {
        env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN }
      });
    } catch (cliErr) {
      console.error("Failed to programmatically publish GitHub Issue notification layer:", cliErr.message);
    }
  }
}

run();