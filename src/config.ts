import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env in the project root
dotenv.config();

export interface Config {
  apolloApiKey: string;
  prospeoApiKey: string;
  resendApiKey: string;
  senderEmail: string;
  recipientOverride: string;
  maxLookalikeCompanies: number;
  maxContactsPerCompany: number;
}

export const config: Config = {
  apolloApiKey: process.env.APOLLO_API_KEY || "",
  prospeoApiKey: process.env.PROSPEO_API_KEY || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  senderEmail: process.env.SENDER_EMAIL || "onboarding@resend.dev",
  recipientOverride: process.env.RECIPIENT_OVERRIDE || "",
  
  // strict pagination / search limits to stay within free tier quotas
  maxLookalikeCompanies: 5,
  maxContactsPerCompany: 1,
};

// Validates the configuration and prints helpful troubleshooting tips if keys are default/missing
export function validateConfig(quiet: boolean = false): boolean {
  const missingKeys: string[] = [];

  if (!config.apolloApiKey) missingKeys.push("APOLLO_API_KEY");
  if (!config.prospeoApiKey) missingKeys.push("PROSPEO_API_KEY");
  if (!config.resendApiKey) missingKeys.push("RESEND_API_KEY");

  if (quiet) {
    return missingKeys.length === 0;
  }

  if (missingKeys.length > 0) {
    console.error("\x1b[31mError: Missing required environment variables:\x1b[0m");
    missingKeys.forEach(key => console.error(` - ${key}`));
    console.error("\nPlease update your .env file with your valid API keys.\n");
    return false;
  }

  return true;
}
