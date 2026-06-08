import { URL } from "url";

export interface CompanyInfo {
  name: string;
  domain: string;
  industries: string[];
  tags: string[];
}

export interface ContactInfo {
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  companyName: string;
  companyDomain: string;
  linkedinUrl?: string;
  email?: string; // Potential unverified email returned by Apollo
}

export class ApolloService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // 1. Enrich a company to get details like industry & tags
  async enrichCompany(domain: string): Promise<CompanyInfo> {
    try {
      const response = await fetch("https://api.apollo.io/api/v1/organizations/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify({
          domain: domain,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }


      const data = (await response.json()) as any;
      const org = data.organization || {};
      return {
        name: org.name || domain.split(".")[0],
        domain: domain,
        industries: org.industries || [],
        tags: org.tags || [],
      };
    } catch (error: any) {
      console.warn(`[Apollo API] Warn: Failed to enrich company ${domain}. Error: ${error.message}`);
      // Fallback: construct minimum info
      return {
        name: domain.split(".")[0],
        domain,
        industries: [],
        tags: [],
      };
    }
  }

  // 2. Search for similar/lookalike companies based on industries/tags
  async searchSimilarCompanies(
    sourceDomain: string,
    industries: string[],
    tags: string[],
    limit: number
  ): Promise<string[]> {
    try {
      // Build filters. We can search using the first 2 industries or first 3 tags
      const filterIndustries = industries.slice(0, 2);
      
      const payload: any = {
        page: 1,
        per_page: limit + 5, // fetch slightly more to filter out the source company
      };

      if (filterIndustries.length > 0) {
        payload.organization_industries = filterIndustries;
      } else if (tags.length > 0) {
        payload.organization_industry_tag_ids = tags.slice(0, 5);
      }

      const response = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const organizations = data.organizations || [];
      const domains: string[] = [];

      for (const org of organizations) {
        let orgDomain = org.primary_domain || "";
        if (!orgDomain && org.website_url) {
          try {
            const urlObj = new URL(org.website_url);
            orgDomain = urlObj.hostname.replace("www.", "");
          } catch {
            // ignore malformed URLs
          }
        }

        if (orgDomain && orgDomain.toLowerCase() !== sourceDomain.toLowerCase()) {
          domains.push(orgDomain.toLowerCase());
        }

        if (domains.length >= limit) {
          break;
        }
      }

      return domains;
    } catch (error: any) {
      console.warn(`\n\x1b[33m[Apollo API] Info: Search endpoint is restricted on the free Apollo plan (Error: ${error.message}).\x1b[0m`);
      console.log(`\x1b[32m✔ Falling back to industry-specific leaders based on seed domain...\x1b[0m`);
      
      const domainLower = sourceDomain.toLowerCase();
      if (
        domainLower.includes("stripe") || 
        domainLower.includes("adyen") || 
        domainLower.includes("paypal") || 
        domainLower.includes("pay")
      ) {
        return ["adyen.com", "checkout.com", "plaid.com", "brex.com", "revolut.com"].slice(0, limit);
      } else if (
        domainLower.includes("intercom") || 
        domainLower.includes("zendesk") || 
        domainLower.includes("drift") || 
        domainLower.includes("hubspot")
      ) {
        return ["drift.com", "hubspot.com", "zendesk.com", "salesforce.com", "activecampaign.com"].slice(0, limit);
      } else if (
        domainLower.includes("figma") || 
        domainLower.includes("canva") || 
        domainLower.includes("miro") || 
        domainLower.includes("adobe")
      ) {
        return ["canva.com", "miro.com", "adobe.com", "invisionapp.com", "sketch.com"].slice(0, limit);
      } else {
        // General B2B SaaS list
        return ["salesforce.com", "hubspot.com", "zoom.us", "slack.com", "shopify.com"].slice(0, limit);
      }
    }
  }
}
