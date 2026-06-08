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
  private isMock: boolean;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.isMock = apiKey.startsWith("mock_");
  }

  // 1. Enrich a company to get details like industry & tags
  async enrichCompany(domain: string): Promise<CompanyInfo> {
    if (this.isMock) {
      console.log(`[Apollo API] [MOCK] Enriching company domain: ${domain}`);
      return {
        name: domain.split(".")[0].toUpperCase(),
        domain,
        industries: ["Software", "Technology", "Financial Services"],
        tags: ["saas", "payment-processing", "developer-tools", "fintech"],
      };
    }
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
    if (this.isMock) {
      console.log(`[Apollo API] [MOCK] Searching lookalike companies for ${sourceDomain} (limit: ${limit})`);
      const lookalikes = ["adyen.com", "checkout.com", "plaid.com", "brex.com", "revolut.com"];
      return lookalikes.slice(0, limit);
    }

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

  // 3. Search for decision makers at lookalike companies
  async searchDecisionMakers(
    domains: string[],
    limitPerCompany: number
  ): Promise<ContactInfo[]> {
    if (this.isMock) {
      console.log(`[Apollo API] [MOCK] Searching decision makers for domains: ${domains.join(", ")}`);
      const mockContacts: Record<string, ContactInfo> = {
        "adyen.com": {
          name: "Pieter van der Does",
          firstName: "Pieter",
          lastName: "van der Does",
          title: "Co-Founder & CEO",
          companyName: "Adyen",
          companyDomain: "adyen.com",
          linkedinUrl: "https://www.linkedin.com/in/pietervanderdoes",
          email: "pieter@adyen.com"
        },
        "checkout.com": {
          name: "Guillaume Pousaz",
          firstName: "Guillaume",
          lastName: "Pousaz",
          title: "Founder & CEO",
          companyName: "Checkout.com",
          companyDomain: "checkout.com",
          linkedinUrl: "https://www.linkedin.com/in/gpousaz",
          email: "guillaume@checkout.com"
        },
        "plaid.com": {
          name: "Zach Perret",
          firstName: "Zach",
          lastName: "Perret",
          title: "Co-Founder & CEO",
          companyName: "Plaid",
          companyDomain: "plaid.com",
          linkedinUrl: "https://www.linkedin.com/in/zperret",
          email: "zach@plaid.com"
        },
        "brex.com": {
          name: "Henrique Dubugras",
          firstName: "Henrique",
          lastName: "Dubugras",
          title: "Co-Founder & Co-CEO",
          companyName: "Brex",
          companyDomain: "brex.com",
          linkedinUrl: "https://www.linkedin.com/in/hdubugras",
          email: "henrique@brex.com"
        },
        "revolut.com": {
          name: "Nikolay Storonsky",
          firstName: "Nikolay",
          lastName: "Storonsky",
          title: "Founder & CEO",
          companyName: "Revolut",
          companyDomain: "revolut.com",
          linkedinUrl: "https://www.linkedin.com/in/nstoronsky",
          email: "nikolay@revolut.com"
        }
      };

      return domains
        .map(dom => mockContacts[dom])
        .filter(contact => contact !== undefined);
    }

    if (domains.length === 0) return [];
    try {
      const payload = {
        q_organization_domains_list: domains,
        // C-Suite and VP-Level decision makers
        person_seniorities: ["owner", "founder", "c_level", "vp"],
        person_titles: [
          "CEO", "Founder", "Co-Founder", "President", "VP", "Vice President", 
          "CTO", "Chief Technology Officer", "CFO", "COO", "Chief Executive Officer"
        ],
        page: 1,
        per_page: 100 // Grab enough to group and filter
      };

      const response = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
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
      const people = data.people || [];

      // Group by company domain and limit results per company
      const contactsByDomain: Record<string, ContactInfo[]> = {};
      
      for (const person of people) {
        const org = person.organization || {};
        let orgDomain = org.primary_domain || "";
        if (!orgDomain && org.website_url) {
          try {
            orgDomain = new URL(org.website_url).hostname.replace("www.", "");
          } catch {
            // ignore
          }
        }
        orgDomain = orgDomain.toLowerCase();

        if (!orgDomain) continue;

        if (!contactsByDomain[orgDomain]) {
          contactsByDomain[orgDomain] = [];
        }

        if (contactsByDomain[orgDomain].length < limitPerCompany) {
          contactsByDomain[orgDomain].push({
            name: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim(),
            firstName: person.first_name || "",
            lastName: person.last_name || "",
            title: person.title || "Decision Maker",
            companyName: org.name || orgDomain.split(".")[0],
            companyDomain: orgDomain,
            linkedinUrl: person.linkedin_url || undefined,
            email: person.email || undefined
          });
        }
      }

      // Flatten the grouped object
      const result: ContactInfo[] = [];
      for (const dom of domains) {
        if (contactsByDomain[dom]) {
          result.push(...contactsByDomain[dom]);
        }
      }

      return result;
    } catch (error: any) {
      console.error(`[Apollo API] Error searching decision makers: ${error.message}`);
      return [];
    }
  }
}
