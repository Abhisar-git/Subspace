import * as readline from "readline";
import { config, validateConfig } from "./config";
import { OutreachPipeline } from "./pipeline";

// ASCII branding banner for premium CLI presentation
function printBanner() {
  console.log(`
\x1b[36m┌────────────────────────────────────────────────────────┐
│                                                        │
│   \x1b[1m\x1b[35mSUBSPACE COLD-OUTREACH PIPELINE\x1b[0m\x1b[36m                      │
│   Automated Lead Sourcing, Verification & Send System   │
│                                                        │
└────────────────────────────────────────────────────────┘\x1b[0m
  `);
}

// Ask user a question via terminal prompt
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  printBanner();

  // Parse target seed domain from CLI arguments
  const args = process.argv.slice(2);
  const seedDomain = args[0];

  if (!seedDomain) {
    console.error(`\x1b[31mError: Seed domain is required.\x1b[0m`);
    console.log(`\n\x1b[33mUsage:\x1b[0m`);
    console.log(`  npm run dev -- <seed-company-domain>`);
    console.log(`  Example: \x1b[1mnpm run dev -- stripe.com\x1b[0m\n`);
    process.exit(1);
  }

  // Validate environment configuration
  const configValid = validateConfig();
  if (!configValid) {
    process.exit(1);
  }

  try {
    const pipeline = new OutreachPipeline(config);

    // Run Stages 1-3: Sourcing lookalikes, finding contacts, and verifying emails
    const contacts = await pipeline.runSourcingAndVerification(seedDomain);

    if (contacts.length === 0) {
      console.log(`\n\x1b[33mNo contacts resolved with verified emails. Exiting.\x1b[0m\n`);
      process.exit(0);
    }

    // SAFETY CHECKPOINT
    console.log(`\n\x1b[35m==================== SAFETY CHECKPOINT ====================\x1b[0m`);
    console.log(`Review the resolved leads below before initiating outbound emails:\n`);

    // Format table display
    const tableData = contacts.map((c, index) => ({
      "#": index + 1,
      Name: c.name,
      Title: c.title,
      Company: c.companyName,
      Domain: c.companyDomain,
      "LinkedIn URL": c.linkedinUrl || "N/A",
      "Verified Email": c.verifiedEmail,
    }));

    console.table(tableData, ["#", "Name", "Title", "Company", "LinkedIn URL", "Verified Email"]);

    const response = await askQuestion(
      `\nAre you sure you want to fire outreach emails to these ${contacts.length} contact(s)? (y/N): `
    );

    const isConfirmed = response.trim().toLowerCase() === "y" || response.trim().toLowerCase() === "yes";

    if (isConfirmed) {
      console.log(`\n\x1b[32m✔ Confirmation received. Launching stage 4 outreach...\x1b[0m`);
      const results = await pipeline.runOutreach(contacts);

      console.log(`\n\x1b[36m==================== SESSION SUCCESS LOGS ====================\x1b[0m`);
      const logsTable = results.map((r, index) => ({
        "#": index + 1,
        Contact: r.name,
        Email: r.email,
        Company: r.company,
        Status: r.success ? "✔ SENT" : "✘ FAILED",
        "Tracking ID / Details": r.success ? (r.id || "N/A") : (r.error || "Unknown Error"),
      }));
      console.table(logsTable);
      console.log(`\nOutreach pipeline run complete.\n`);
    } else {
      console.log(`\n\x1b[33m✘ Outreach cancelled by user choice. No emails were sent.\x1b[0m\n`);
    }
  } catch (error: any) {
    console.error(`\n\x1b[31mFatal error running the pipeline: ${error.message}\x1b[0m\n`);
    process.exit(1);
  }
}

main();
