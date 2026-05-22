const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const SYSTEM_INSTRUCTIONS = `
You are an expert backend QA automation engineer specialized in Express.js and TypeScript.
Your job is to generate highly accurate, pure TypeScript Jest unit tests for the provided MVC target code.
You MUST write complete tests that require ZERO external dependencies or running databases.

Strict Mocking Matrix Rules (TypeScript Syntax):
1. Native PostgreSQL Pool: Mock your DB pool connection module completely.
   Example: 
   import pool from '../config/db';
   jest.mock('../config/db', () => ({ query: jest.fn() }));
2. Redis Cache: Mock the implementation of get/set calls.
   Example: jest.mock('../config/redis', () => ({ get: jest.fn(), set: jest.fn() }));
3. AWS S3: Mock the '@aws-sdk/client-s3' Send command wrapper. Do not call real AWS.
4. Express: Mock 'Request' and 'Response' types using jest.fn() for res.status, res.json, and res.send.

Ensure all file relative paths back to the source 'src/' are exact, type-safe, and calculated according to the target file placement.
Do not wrap your output code in markdown code blocks inside the JSON string.
`;

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY environment variable.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  console.log("Analyzing git repository changes...");
  let changedFiles = [];
  try {
    // 1. Trace changes specifically inside server/src/
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
    // Go up 3 levels to reach the true monorepo root (ai-runner -> scripts -> server -> root)
    const absoluteGitRootPath = path.resolve(__dirname, '../../..', file);
    console.log(`Processing file: ${file}`);
    const codeContent = fs.readFileSync(absoluteGitRootPath, 'utf8');

    // Strip 'server/' prefix for localized path generation
    const localizedServerPath = file.replace('server/', '');

    // Calculate structural relative path jumps dynamically for TypeScript imports
    const depth = localizedServerPath.split('/').length - 1;
    const relativePathPrefix = '../'.repeat(depth) + 'src/';

    const prompt = `
      Target TypeScript file layout location: ${localizedServerPath}
      Relative access path back to root src is: ${relativePathPrefix}
      
      Review the following TypeScript component code and construct the unit testing configuration matching our architecture specifications:
      \`\`\`typescript
      ${codeContent}
      \`\`\`
    `;

    try {
      // 2. Query Gemini utilizing strict structured JSON constraints
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              testCode: { 
                type: "STRING", 
                description: "Executable, complete TypeScript Jest test code including all mocks." 
              },
              criticalityReport: {
                type: "ARRAY",
                description: "List of found code problems and vulnerabilities mapped by structural severity.",
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

      const result = JSON.parse(response.text);

      // 3. Mirror paths cleanly within server/tests/ai-generated/ using .test.ts extension
      const mirrorPath = localizedServerPath.replace('src/', 'tests/ai-generated/').replace('.ts', '.test.ts');
      
      fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
      fs.writeFileSync(mirrorPath, result.testCode, 'utf8');
      console.log(`Successfully constructed TypeScript test: ${mirrorPath}`);

      if (result.criticalityReport && result.criticalityReport.length > 0) {
        processAlerts(localizedServerPath, result.criticalityReport);
      }

    } catch (apiError) {
      console.error(`Failed executing inference block context for ${file}:`, apiError.message);
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