export interface OutreachResult {
  success: boolean;
  id?: string;
  error?: string;
}

export class ResendService {
  private apiKey: string;
  private senderEmail: string;
  constructor(apiKey: string, senderEmail: string = "onboarding@resend.dev") {
    this.apiKey = apiKey;
    this.senderEmail = senderEmail;
  }

  // Generate a premium HTML email template for outreach
  private getEmailTemplate(contactName: string, title: string, companyName: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 24px;">
          <span style="font-weight: 700; font-size: 18px; color: #18181b; letter-spacing: -0.025em;">Subspace Outreach</span>
        </div>
        <h2 style="color: #09090b; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.025em;">Exploring synergies with ${companyName}</h2>
        <p style="color: #3f3f46; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">Hi ${contactName},</p>
        <p style="color: #3f3f46; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">
          I hope this message finds you well. I've been following the progress of <strong>${companyName}</strong> and have been highly impressed by your team's accomplishments in your industry.
        </p>
        <p style="color: #3f3f46; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
          Given your role as <strong>${title}</strong>, I wanted to reach out directly to explore if there is potential alignment for a collaboration that could accelerate your initiatives.
        </p>
        <p style="color: #3f3f46; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Would you be open to a brief, 10-minute introductory call next Tuesday or Thursday to share what we are working on and see if a partnership makes sense?
        </p>
        <div style="border-top: 1px solid #f4f4f5; padding-top: 16px; margin-top: 24px;">
          <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin: 0;">
            Best regards,<br>
            <strong style="color: #27272a;">Partnerships Lead</strong><br>
            Subspace Inc.
          </p>
        </div>
      </div>
    `;
  }

  // Send the cold-outreach email
  async sendOutreach(
    toEmail: string,
    contactName: string,
    title: string,
    companyName: string
  ): Promise<OutreachResult> {
    const subject = `Outreach: Connecting with ${companyName}`;
    const htmlBody = this.getEmailTemplate(contactName, title, companyName);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: this.senderEmail,
          to: [toEmail],
          subject: subject,
          html: htmlBody
        })
      });

      const body = (await response.json()) as any;

      if (!response.ok) {
        throw new Error(body.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        id: body.id
      };
    } catch (error: any) {
      console.error(`[Resend API] Error sending email to ${toEmail}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
