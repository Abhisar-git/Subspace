# Subspace: Automated B2B Lead Generation & Outreach Pipeline

Subspace is a high-deliverability lead generation, email verification, and personalized outbound cold outreach pipeline built in **TypeScript**. It connects B2B seed data to multi-stage outreach campaigns by chaining **Apollo.io**, **Prospeo.io**, and **Resend**.

---

## 🚀 How it Works

```
  [ Seed Company ]
         │
         ▼
 1. SOURCING LOOKALIKES  ─── ( Apollo.io Company Search & Enrichment )
         │
         ▼
 2. CONTACT RESOLUTION   ─── ( Prospeo.io Search & Contact Sourcing )
         │
         ▼
 3. EMAIL VERIFICATION   ─── ( Prospeo.io Verification & Enrichment )
         │
         ▼
 4. SAFETY CHECKPOINT    ─── ( Terminal Preview & Confirmation Table )
         │
         ▼
 5. COLD OUTREACH        ─── ( Resend Custom HTML Outreach Emails )
```

---

## ✨ Features

- **Stage 1: Lookalike Sourcing (Apollo.io)**: Automatically resolves the seed company domain, extracts its categorization/industry tags, and identifies similar lookalike organizations.
- **Stage 2 & 3: Sourcing & Email Verification (Prospeo.io)**: Leverages a high-efficiency search-and-enrich pipeline to identify key decision-makers (CEOs, Founders, VPs, Directors) at target lookalikes, pulling their name, job title, LinkedIn profile, and verified unmasked business email.
- **Stage 4: CLI Safety Checkpoint**: Displays a beautifully formatted preview table of all sourced leads before launching any cold outreach, requiring explicit user input (`y/N`) to proceed.
- **Stage 5: High-Deliverability Outreach (Resend)**: Personalizes outbound messages using a responsive, modern HTML email template sent via your verified custom domain.
- **Dual Runtime Support**: Runs in **Mock Mode** (using simulator APIs for local testing without credit consumption) or **Production Mode** (uses real API integrations).

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A verified domain configured on [Resend.com](https://resend.com) (for live sending)

### 2. Install Dependencies
Run the following in the project root:
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

# Recipient Email Override (Optional - redirects all emails to this address during testing)
RECIPIENT_OVERRIDE=your-test-email@gmail.com
```

> [!TIP]
> To run the app in **mock/simulation mode** for developer dry runs, set the API keys prefixed with `mock_` (e.g. `APOLLO_API_KEY=mock_apollo`).

---

## ⚡ Running the Pipeline

To run the pipeline, provide a seed company domain (e.g., `stripe.com` or `intercom.com`) as an argument:

```bash
# Run using ts-node
npm run dev -- stripe.com

# Or build and run the compiled version
npm run build
npm start -- stripe.com
```

---

## 📂 Project Structure

```
├── dist/                # Compiled JavaScript code
├── src/
│   ├── config.ts        # App configuration & validation rules
│   ├── index.ts         # Main CLI Entry runner & safety prompt UI
│   ├── pipeline.ts      # Core lead sourcing & outreach orchestrator
│   └── services/
│       ├── apollo.ts    # Apollo.io wrapper (lookalikes lookup & fallbacks)
│       ├── prospeo.ts   # Prospeo.io search-person & enrich-person wrapper
│       └── resend.ts    # Resend.com HTML template email dispatch service
├── .env.example         # Template for environment variables
├── package.json
└── tsconfig.json
```

---

## 📄 License
This project is licensed under the ISC License.
