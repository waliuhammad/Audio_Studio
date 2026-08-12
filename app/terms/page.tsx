import { LegalDoc } from "@/components/legal/LegalDoc";

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms of Service"
      description="The terms that govern your access to and use of Audio Studio and its tools."
      updated="February 2, 2026"
      contactNote="Questions about these terms? Reach us at"
      sections={[
        {
          id: "acceptance",
          heading: "Acceptance of Terms",
          body: [
            "By accessing or using Audio Studio you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.",
          ],
        },
        {
          id: "services",
          heading: "The Services",
          body: [
            "Audio Studio provides browser-based tools for editing, converting, and refining audio and video files.",
            "The service is provided for personal and business use as described on this site, and is subject to the limits of your selected plan.",
          ],
        },
        {
          id: "accounts",
          heading: "Accounts",
          body: [
            "You are responsible for safeguarding your account credentials and for all activity under your account. You must provide accurate information when registering.",
            "Keep your password confidential. Notify us immediately of any unauthorized access or misuse.",
          ],
        },
        {
          id: "acceptable-use",
          heading: "Acceptable Use",
          body: [
            "You agree not to misuse the service, including uploading unlawful content, attempting to disrupt the service, or using it to infringe the rights of others.",
            "You retain ownership of your content and are responsible for ensuring you have the right to process it.",
          ],
        },
        {
          id: "intellectual-property",
          heading: "Intellectual Property",
          body: [
            "Audio Studio, its software, design, and branding are owned by us and protected by applicable laws. We grant you a limited, non-exclusive license to use the service.",
          ],
        },
        {
          id: "termination",
          heading: "Termination",
          body: [
            "We may suspend or terminate access for violation of these terms, abuse, or as required by law.",
            "You may stop using the service at any time. Deleting your account removes your stored projects as described in our Privacy Policy.",
          ],
        },
        {
          id: "disclaimers-limitation",
          heading: "Disclaimers & Limitation of Liability",
          body: [
            "The service is provided on an 'as is' and 'as available' basis without warranties of any kind.",
            "To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the service.",
          ],
        },
        {
          id: "governing-law",
          heading: "Governing Law",
          body: [
            "These terms are governed by the applicable laws of your region. Any disputes will be resolved in the appropriate courts.",
          ],
        },
      ]}
    />
  );
}