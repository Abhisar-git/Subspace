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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for decision makers at a specific company domain.
   * Leverages Prospeo's Domain Search API.
   */
  async findDecisionMakers(domain: string, limit: number = 1): Promise<ContactInfo[]> {
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
