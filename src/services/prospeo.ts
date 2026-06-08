export interface ProspeoEmailContact {
  email: string;
  first_name: string | null;
  last_name: string | null;
  type: string | null; // e.g. "professional", "generic"
  verification_status: string | null; // e.g. "verified", "risky", "invalid"
  confidence_score: number | null;
  job_title: string | null;
  linkedin: string | null; // LinkedIn profile URL
}

export interface ContactInfo {
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  companyName: string;
  companyDomain: string;
  linkedinUrl?: string;
  email?: string;
}

export class ProspeoService {
  private apiKey: string;
  private isMock: boolean;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.isMock = apiKey.startsWith("mock_");
  }

  /**
   * Search for decision makers at a specific company domain.
   * Leverages Prospeo's Domain Search API.
   */
  async findDecisionMakers(domain: string, limit: number = 1): Promise<ContactInfo[]> {
    if (this.isMock) {
      console.log(`[Prospeo API] [MOCK] Performing Domain Search for: ${domain}`);
      
      // Seed some realistic mock contacts based on domains
      const mockContactsByDomain: Record<string, ProspeoEmailContact[]> = {
        "adyen.com": [
          {
            email: "pieter@adyen.com",
            first_name: "Pieter",
            last_name: "van der Does",
            type: "professional",
            verification_status: "verified",
            confidence_score: 99,
            job_title: "Co-Founder & CEO",
            linkedin: "https://www.linkedin.com/in/pietervanderdoes"
          }
        ],
        "checkout.com": [
          {
            email: "guillaume@checkout.com",
            first_name: "Guillaume",
            last_name: "Pousaz",
            type: "professional",
            verification_status: "verified",
            confidence_score: 98,
            job_title: "Founder & CEO",
            linkedin: "https://www.linkedin.com/in/gpousaz"
          }
        ],
        "plaid.com": [
          {
            email: "zach@plaid.com",
            first_name: "Zach",
            last_name: "Perret",
            type: "professional",
            verification_status: "verified",
            confidence_score: 97,
            job_title: "Co-Founder & CEO",
            linkedin: "https://www.linkedin.com/in/zperret"
          }
        ],
        "brex.com": [
          {
            email: "henrique@brex.com",
            first_name: "Henrique",
            last_name: "Dubugras",
            type: "professional",
            verification_status: "verified",
            confidence_score: 98,
            job_title: "Co-Founder & Co-CEO",
            linkedin: "https://www.linkedin.com/in/hdubugras"
          }
        ],
        "revolut.com": [
          {
            email: "nikolay@revolut.com",
            first_name: "Nikolay",
            last_name: "Storonsky",
            type: "professional",
            verification_status: "verified",
            confidence_score: 96,
            job_title: "Founder & CEO",
            linkedin: "https://www.linkedin.com/in/nstoronsky"
          }
        ]
      };

      const rawContacts = mockContactsByDomain[domain.toLowerCase()] || [
        {
          email: `contact@${domain}`,
          first_name: "Alex",
          last_name: "Smith",
          type: "professional",
          verification_status: "verified",
          confidence_score: 95,
          job_title: "Founder & Managing Director",
          linkedin: `https://www.linkedin.com/in/alex-smith-${domain.split(".")[0]}`
        }
      ];

      return rawContacts
        .slice(0, limit)
        .map(c => ({
          name: c.first_name && c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name || c.last_name || c.email.split("@")[0],
          firstName: c.first_name || "",
          lastName: c.last_name || "",
          title: c.job_title || "Decision Maker",
          companyName: domain.split(".")[0].toUpperCase(),
          companyDomain: domain,
          linkedinUrl: c.linkedin || undefined,
          email: c.email
        }));
    }

    try {
      const response = await fetch("https://api.prospeo.io/search-person", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KEY": this.apiKey
        },
        body: JSON.stringify({
          filters: {
            person_search: {
              include: [domain]
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const body = (await response.json()) as any;
      const results = body.results || [];
      
      const decisionMakerRegex = /(ceo|founder|co-founder|vp|cto|cfo|coo|president|director|partner|head|manager)/i;
      
      // Filter candidates with valid person and title
      const candidates = results
        .map((r: any) => r.person)
        .filter((p: any) => p && p.person_id && p.current_job_title);

      // Sort candidates so those matching decisionMakerRegex are prioritized
      candidates.sort((a: any, b: any) => {
        const aTitle = decisionMakerRegex.test(a.current_job_title) ? 1 : 0;
        const bTitle = decisionMakerRegex.test(b.current_job_title) ? 1 : 0;
        return bTitle - aTitle;
      });

      const matchedContacts: ContactInfo[] = [];

      for (const candidate of candidates) {
        if (matchedContacts.length >= limit) {
          break;
        }

        // Only process candidates that are decision makers
        if (!decisionMakerRegex.test(candidate.current_job_title)) {
          continue;
        }

        try {
          const enrichResponse = await fetch("https://api.prospeo.io/enrich-person", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-KEY": this.apiKey
            },
            body: JSON.stringify({
              data: {
                person_id: candidate.person_id
              }
            })
          });

          if (!enrichResponse.ok) {
            console.warn(`[Prospeo API] Warn: Failed to enrich person ${candidate.person_id}`);
            continue;
          }

          const enrichBody = (await enrichResponse.json()) as any;
          if (enrichBody.error || !enrichBody.person) {
            continue;
          }

          const person = enrichBody.person;
          const emailInfo = person.email || {};

          // Require verified email address to avoid outreach bounces
          if (emailInfo.status !== "VERIFIED" || !emailInfo.email) {
            continue;
          }

          const fName = person.first_name || "";
          const lName = person.last_name || "";
          const fullName = person.full_name || `${fName} ${lName}`.trim() || emailInfo.email.split("@")[0];

          matchedContacts.push({
            name: fullName,
            firstName: fName,
            lastName: lName,
            title: person.current_job_title || "Decision Maker",
            companyName: domain.split(".")[0].toUpperCase(),
            companyDomain: domain,
            linkedinUrl: person.linkedin_url || undefined,
            email: emailInfo.email
          });

        } catch (enrichError: any) {
          console.warn(`[Prospeo API] Warn: Error enriching person ${candidate.person_id}: ${enrichError.message}`);
        }
      }

      return matchedContacts;

    } catch (error: any) {
      console.error(`[Prospeo API] Error searching domain ${domain}: ${error.message}`);
      return [];
    }
  }
}
