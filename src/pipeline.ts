import { Config } from "./config";
import { ApolloService } from "./services/apollo";
import { ProspeoService, ContactInfo } from "./services/prospeo";
import { ResendService } from "./services/resend";

export interface EnrichedContact extends ContactInfo {
  verifiedEmail: string;
}

export interface SendResult {
  email: string;
  name: string;
  company: string;
  success: boolean;
  id?: string;
  error?: string;
}

export class OutreachPipeline {
  private config: Config;
  private apollo: ApolloService;
  private prospeo: ProspeoService;
  private resend: ResendService;

  constructor(config: Config) {
    this.config = config;
    this.apollo = new ApolloService(config.apolloApiKey);
    this.prospeo = new ProspeoService(config.prospeoApiKey);
    this.resend = new ResendService(config.resendApiKey, config.senderEmail);
  }

  /**
   * Runs Sourcing & Verification (Stages 1, 2, & 3)
   * 1. Enriches the seed domain.
   * 2. Searches lookalike companies.
   * 3. Surfaces decision makers.
   * 4. Resolves and verifies emails.
   */
  async runSourcingAndVerification(seedDomain: string): Promise<EnrichedContact[]> {
    console.log(`\n\x1b[36m=== Stage 1: Sourcing Lookalike Companies ===\x1b[0m`);
    console.log(`Enriching seed domain: \x1b[1m${seedDomain}\x1b[0m...`);
    
    const seedCompany = await this.apollo.enrichCompany(seedDomain);
    console.log(`Seed Company resolved: \x1b[32m${seedCompany.name}\x1b[0m`);
    console.log(`Industries: ${seedCompany.industries.join(", ") || "None found"}`);
    console.log(`Tags: ${seedCompany.tags.join(", ") || "None found"}`);

    console.log(`\nSearching for up to ${this.config.maxLookalikeCompanies} similar companies...`);
    const lookalikeDomains = await this.apollo.searchSimilarCompanies(
      seedDomain,
      seedCompany.industries,
      seedCompany.tags,
      this.config.maxLookalikeCompanies
    );

    if (lookalikeDomains.length === 0) {
      console.log(`\x1b[33mNo similar companies found. Pipeline cannot proceed.\x1b[0m`);
      return [];
    }

    console.log(`Found lookalike company domains: \x1b[32m${lookalikeDomains.join(", ")}\x1b[0m`);

    console.log(`\n\x1b[36m=== Stages 2 & 3: Finding & Verifying Decision-Makers ===\x1b[0m`);
    console.log(`Searching Prospeo Domain Search API for decision makers (limit: ${this.config.maxContactsPerCompany} per company)...`);

    const enrichedContacts: EnrichedContact[] = [];

    for (const domain of lookalikeDomains) {
      console.log(`\nQuerying domain: \x1b[1m${domain}\x1b[0m...`);
      try {
        const resolved = await this.prospeo.findDecisionMakers(domain, this.config.maxContactsPerCompany);
        for (const contact of resolved) {
          if (contact.email) {
            console.log(`\x1b[32m✔ Decision maker resolved: ${contact.name} (${contact.title}) -> ${contact.email}\x1b[0m`);
            enrichedContacts.push({
              ...contact,
              verifiedEmail: contact.email
            });
          }
        }
        if (resolved.length === 0) {
          console.log(`\x1b[33m✘ No verified decision makers found for ${domain}.\x1b[0m`);
        }
      } catch (error: any) {
        console.error(`\x1b[33m⚠ Error processing domain ${domain}: ${error.message}\x1b[0m`);
      }
      
      // Sleep for 1.5 seconds to respect Prospeo API rate limits (HTTP 429)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log(`\n\x1b[32mResolution complete! Sourced ${enrichedContacts.length} verified decision-maker(s) from Prospeo.\x1b[0m`);
    return enrichedContacts;
  }

  /**
   * Runs Email Outreach (Stage 4)
   * Sends personalized email messages to all approved contacts.
   */
  async runOutreach(contacts: EnrichedContact[]): Promise<SendResult[]> {
    console.log(`\n\x1b[36m=== Stage 4: Sending Cold Outreach ===\x1b[0m`);
    console.log(`Starting email delivery to ${contacts.length} contact(s) via Resend...`);

    const results: SendResult[] = [];

    for (const contact of contacts) {
      // Check if recipient is overridden for testing
      const targetEmail = this.config.recipientOverride || contact.verifiedEmail;
      
      if (this.config.recipientOverride) {
        console.log(`[Override Active] Redirecting outreach for \x1b[1m${contact.name}\x1b[0m (${contact.verifiedEmail}) -> \x1b[33m${targetEmail}\x1b[0m`);
      } else {
        console.log(`Delivering email to \x1b[1m${contact.name}\x1b[0m at \x1b[32m${targetEmail}\x1b[0m...`);
      }

      try {
        const sendRes = await this.resend.sendOutreach(
          targetEmail,
          contact.name,
          contact.title,
          contact.companyName
        );

        if (sendRes.success) {
          console.log(`\x1b[32m✔ Successfully sent! Tracking ID: ${sendRes.id}\x1b[0m`);
          results.push({
            email: contact.verifiedEmail,
            name: contact.name,
            company: contact.companyName,
            success: true,
            id: sendRes.id
          });
        } else {
          console.error(`\x1b[31m✘ Failed to send email: ${sendRes.error}\x1b[0m`);
          results.push({
            email: contact.verifiedEmail,
            name: contact.name,
            company: contact.companyName,
            success: false,
            error: sendRes.error
          });
        }
      } catch (error: any) {
        console.error(`\x1b[33m⚠ Error sending email: ${error.message}. Continuing with rest.\x1b[0m`);
        results.push({
          email: contact.verifiedEmail,
          name: contact.name,
          company: contact.companyName,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`\n\x1b[32mOutreach session completed. Successful sends: ${results.filter(r => r.success).length}/${results.length}\x1b[0m`);
    return results;
  }
}
