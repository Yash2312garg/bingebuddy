const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// Global architectural mocking instructions given to the AI engine
const SYSTEM_INSTRUCTIONS = `
You are an expert backend QA automation engineer specialized in Express.js.
Your job is to generate highly accurate, pure Jest unit tests for the provided MVC target code.
You MUST write complete tests that require ZERO external dependencies.

Strict Mocking Matrix Rules:
1. Native PostgreSQL: Mock your DB pool connection module completely.
   Example: jest.mock('../config/db', () => ({ query: jest.fn() }));
2. Redis Cache: Mock the implementation of get/set calls.
   Example: jest.mock('../config/redis', () => ({ get: jest.fn(), set: jest.fn() }));
3. AWS S3: Mock the '@aws-sdk/client-s3' Send command wrapper. Do not call AWS.
4. Express: Mock 'req' and 'res' using jest.fn() for res.status, res.json, and res.send.

Ensure all file relative paths back to the source 'src/' are exact and calculated according to the target file placement.
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
    // 1. Get diff from the root of the monorepo
    changedFiles = execSync('git diff --name-only HEAD~1 HEAD')
      .toString()
      .trim()
      .split('\n')
      .filter(file => {
        // Adjust this if your backend folder has a different name!
        return (file.startsWith('backend/src/controllers/') || file.startsWith('backend/src/models/')) && file.endsWith('.js');
      });
  } catch (err) {
    console.log("Could not process git context history. Exiting cleanly.");
    return;
  }

  if (changedFiles.length === 0) {
    console.log("Zero target Express MVC component changes detected in backend. Ending step.");
    return;
  }

  console.log(`Detected changes across target source targets: \n${changedFiles.join('\n')}\n`);

  for (const file of changedFiles) {
    // Read the file relative to the monorepo root
    const absoluteGitRootPath = path.resolve(__dirname, '../..', file); // adjusts for scripts/ai-runner depth
    console.log(`Processing file: ${file}`);
    const codeContent = fs.readFileSync(absoluteGitRootPath, 'utf8');

    // Remove the 'backend/' prefix for internal script processing
    const localizedBackendPath = file.replace('backend/', '');

    // Calculate structural relative path jumps dynamically for the AI
    const depth = localizedBackendPath.split('/').length - 1;
    const relativePathPrefix = '../'.repeat(depth) + 'src/';

    const prompt = `
      Target file layout location: ${localizedBackendPath}
      Relative access path back to root src is: ${relativePathPrefix}
      
      Review the following component code and construct the unit testing configuration matching our architecture specifications:
      \`\`\`javascript
      ${codeContent}
      \`\`\`
    `;

    try {
      const response = await ai.models.generateContent({
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

      const result = JSON.parse(response.text);

      // 2. Mirror paths cleanly within backend/tests/ai-generated/
      const mirrorPath = localizedBackendPath.replace('src/', 'tests/ai-generated/').replace('.js', '.test.js');
      
      fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
      fs.writeFileSync(mirrorPath, result.testCode, 'utf8');
      console.log(`Successfully constructed: ${mirrorPath}`);

      if (result.criticalityReport && result.criticalityReport.length > 0) {
        processAlerts(localizedBackendPath, result.criticalityReport);
      }

    } catch (apiError) {
      console.error(`Failed executing inference block context for ${file}:`, apiError.message);
    }
  }
}
// 5. Build native GitHub Markdown notifications and open issues dynamically
function processAlerts(filename, reports) {
  let hasCritical = false;
  let summaryMarkdown = `### 🤖 AI Code Quality Audit for \`${filename}\`\n\n| Severity | Issue | Insight |\n| --- | --- | --- |\n`;

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

  // Append data directly onto the Step Summary of the GitHub Action execution view
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY || './summary.md', summaryMarkdown + '\n');

  // If flagged critical, dynamically generate an open tracking Issue on the Repo
  if (hasCritical) {
    console.log(`🚨 Critical flaws isolated within ${filename}. Deploying automated issue generation...`);
    try {
      const issueTitle = `[AI Alert] Critical Vulnerability Identified in ${filename}`;
      const issueBody = `The AI unit test orchestration engine detected severe operational patterns inside \`${filename}\` during deployment processing.\n\n${summaryMarkdown}`;
      
      // Execute via built-in GitHub CLI present inside GitHub Action runner
      execSync(`gh issue create --title "${issueTitle}" --body "${issueBody.replace(/"/g, '\\"')}" --label "bug"`, {
        env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN }
      });
    } catch (cliErr) {
      console.error("Failed to programmatically publish GitHub Issue notification layer:", cliErr.message);
    }
  }
}

run();
