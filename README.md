# Subspace Cold-Outreach Pipeline

An automated, high-deliverability lead sourcing, email verification, and outbound cold outreach pipeline built with **TypeScript**, leveraging **Apollo.io**, **Prospeo.io**, and **Resend**.

---

## 🚀 Overview

This application automates the process of finding lookalike companies, extracting decision-makers, resolving/verifying their email addresses, and sending personalized outreach emails.

```
[Seed Domain] ➔ [Apollo: Lookalike Search] ➔ [Prospeo: Find & Verify Decision Makers]
                                                              │
                                                              ▼
                                                [Resend: Outbound Cold Email]
```

### Key Stages
1. **Stage 1: Sourcing Lookalike Companies**: Resolves the seed domain using Apollo.io, extracts its industry tags, and searches for similar companies.
2. **Stages 2 & 3: Sourcing & Verifying Decision-Makers**: Queries Prospeo's Domain Search API for C-suite / VP-level decision makers at lookalike companies, automatically retrieving their names, titles, LinkedIn URLs, and verified emails in one high-efficiency step.
3. **Stage 4: Cold Outreach (with Safety Checkpoint)**: Displays a preview table of all resolved contacts, prompts for user confirmation via CLI, and initiates outreach via Resend using a responsive HTML template.

---

## 📋 Compliance Checklist

This application is fully compliant with the Subspace & Vocallabs assignment instructions:

| Requirement | Implementation / Status | Action Required by You |
|:---|:---|:---|
| **Domain Setup** | Supported via Resend service configuration. | Verify your purchased Namecheap/Student domain in Resend and update `SENDER_EMAIL` in `.env` |
| **Ocean.io Alternative** | Uses **Apollo.io** (which offers free API credits). | Set up a free account on Apollo.io and copy your API key to `.env` |
| **Eazyreach Alternative** | Uses **Prospeo.io** to retrieve contacts, LinkedIn URLs, and emails. | Set up a free account on Prospeo.io and copy your API key to `.env` |
| **Demo Video** | - | Record a video demonstrating the run using [Explaino](https://explaino.app/) |
| **Submission Portal** | - | Submit the final ZIP file and video link to the [Submission Portal](https://jobapply.site/d09ca246-605e-47ca-a59c-f802dfc6f5cd) |

---

## 🛠️ Setup & Installation

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Install Dependencies
Run the following command in the project root:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (you can copy `.env.example` as a template):
```bash
# Apollo.io API Key (Free tier available)
APOLLO_API_KEY=your_apollo_api_key

# Prospeo API Key (Free tier available)
PROSPEO_API_KEY=your_prospeo_api_key

# Resend API Key (Free tier available)
RESEND_API_KEY=your_resend_api_key

# Sender Email Address (Verified domain sender e.g., hello@yourdomain.com)
SENDER_EMAIL=hello@yourdomain.com

# Recipient Email Override (Optional - for testing)
# Redirects all outbound emails to your own inbox to prevent emailing real leads during testing
RECIPIENT_OVERRIDE=your-test-email@gmail.com
```

> [!IMPORTANT]
> To run the app in **mock/simulation mode** for testing without consuming API credits, leave the API keys prefixed with `mock_` (e.g. `APOLLO_API_KEY=mock_apollo_key`).

---

## ⚡ Running the Application

To run the pipeline, provide a seed company domain (e.g., `stripe.com`) as an argument:

```bash
npm run dev -- stripe.com
```

### Example Run (Mock Mode)

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   SUBSPACE COLD-OUTREACH PIPELINE                      │
│   Automated Lead Sourcing, Verification & Send System   │
│                                                        │
└────────────────────────────────────────────────────────┘

Warning: Using mock/placeholder values for the following keys:
 - APOLLO_API_KEY
 - PROSPEO_API_KEY
 - RESEND_API_KEY

The pipeline will run in MOCK mode. Real API requests will be simulated.

=== Stage 1: Sourcing Lookalike Companies ===
Enriching seed domain: stripe.com...
[Apollo API] [MOCK] Enriching company domain: stripe.com
Seed Company resolved: STRIPE

Searching for up to 5 similar companies...
Found lookalike company domains: adyen.com, checkout.com, plaid.com, brex.com, revolut.com

=== Stages 2 & 3: Finding & Verifying Decision-Makers ===
Searching Prospeo Domain Search API for decision makers (limit: 1 per company)...

Querying domain: adyen.com...
[Prospeo API] [MOCK] Performing Domain Search for: adyen.com
✔ Decision maker resolved: Pieter van der Does (Co-Founder & CEO) -> pieter@adyen.com

Querying domain: checkout.com...
[Prospeo API] [MOCK] Performing Domain Search for: checkout.com
✔ Decision maker resolved: Guillaume Pousaz (Founder & CEO) -> guillaume@checkout.com
...

==================== SAFETY CHECKPOINT ====================
Review the resolved leads below before initiating outbound emails:

┌─────────┬───┬───────────────────────┬───────────────────────┬────────────┬────────────────────────────────────────────────┬──────────────────────────┐
│ (index) │ # │ Name                  │ Title                 │ Company    │ LinkedIn URL                                   │ Verified Email           │
├─────────┼───┼───────────────────────┼───────────────────────┼────────────┼────────────────────────────────────────────────┼──────────────────────────┤
│ 0       │ 1 │ 'Pieter van der Does' │ 'Co-Founder & CEO'    │ 'ADYEN'    │ 'https://www.linkedin.com/in/pietervanderdoes' │ 'pieter@adyen.com'       │
│ 1       │ 2 │ 'Guillaume Pousaz'    │ 'Founder & CEO'       │ 'CHECKOUT' │ 'https://www.linkedin.com/in/gpousaz'          │ 'guillaume@checkout.com' │
└─────────┴───┴───────────────────────┴───────────────────────┴────────────┴────────────────────────────────────────────────┴──────────────────────────┘

Are you sure you want to fire outreach emails to these 5 contact(s)? (y/N): y

✔ Confirmation received. Launching stage 4 outreach...
✔ Successfully sent! Tracking ID: re_mock_mdfx93lda
✔ Successfully sent! Tracking ID: re_mock_mio0uo1lg
...
```

---

## 📦 Packaging for Submission

To create a clean ZIP package for submission (excluding `node_modules` and `dist` build folders), run the following command in PowerShell:

```powershell
Compress-Archive -Path .\src, .\package.json, .\package-lock.json, .\tsconfig.json, .\.env.example, .\README.md -DestinationPath .\subspace-outreach-pipeline.zip -Force
```
