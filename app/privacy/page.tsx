import { LegalDoc } from "@/components/legal/LegalDoc";

export default function PrivacyPolicyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy Policy"
      description="How Audio Studio collects, uses, and protects your information when you use our tools."
      updated="February 2, 2026"
      contactNote="If you have any questions about this policy or your data, contact us at"
      sections={[
        {
          id: "information-we-collect",
          heading: "Information We Collect",
          body: [
            "We collect information you provide directly, such as your name and email address when you create an account, plus technical data like browser type, device, and usage patterns that help us operate and improve the service.",
            "Files you process may be handled temporarily to perform the task you request. Where possible, processing happens on your device so your media stays under your control.",
          ],
        },
        {
          id: "how-we-use",
          heading: "How We Use Your Information",
          body: [
            "We use your information to provide and maintain the service, personalize your experience, process your requests, and send you important updates.",
            "We do not sell your personal information. Your data is used only for the purposes described in this policy.",
          ],
        },
        {
          id: "storage-security",
          heading: "Storage & Security",
          body: [
            "We apply industry-standard safeguards to protect your data in transit and at rest.",
            "Retention periods are kept to the minimum necessary to deliver the service, and you can request deletion of your data at any time.",
          ],
        },
        {
          id: "cookies",
          heading: "Cookies & Local Storage",
          body: [
            "We use cookies and similar technologies to keep you signed in, remember your preferences, and understand how the service is used.",
            "You can control cookies through your browser settings, though some features may not work as intended if disabled.",
          ],
        },
        {
          id: "third-parties",
          heading: "Third-Party Services",
          body: [
            "We may rely on trusted service providers for hosting, analytics, and payment processing. These providers only have access to the information needed to perform their function and are bound by confidentiality obligations.",
          ],
        },
        {
          id: "your-rights",
          heading: "Your Rights",
          body: [
            "Depending on where you live, you may have the right to access, correct, or delete your personal data, and to object to certain processing.",
            "To exercise any of these rights, contact us using the details below and we will respond promptly.",
          ],
        },
      ]}
    />
  );
}