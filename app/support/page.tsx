import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
  title: "Support | Audio Studio",
  description:
    "Get help with Audio Studio, including accounts, file processing, projects, billing, and technical issues.",
};

export default function SupportPage() {
  return (
    <ContentPage
      eyebrow="Help Center"
      title="Support"
      description="Need help with Audio Studio? Find answers to common questions or contact our support team."
    >
      <Section title="How Can We Help?">
        <p>
          Our support team can help with questions about using Audio Studio,
          account access, file processing, projects, subscriptions, and
          technical problems.
        </p>
      </Section>

      <Section title="Common Issues">
        <ul>
          <li>
            <strong>File won&apos;t upload:</strong> Check your internet
            connection, supported file format, and file size.
          </li>
          <li>
            <strong>Processing failed:</strong> Try the operation again. If
            the problem continues, contact support and include the tool you
            were using and the error message.
          </li>
          <li>
            <strong>Can&apos;t access your account:</strong> Make sure you are
            signing in with the same authentication method used when creating
            your account.
          </li>
          <li>
            <strong>Project issue:</strong> Confirm that you are signed into
            the correct Audio Studio account and try refreshing the page.
          </li>
          <li>
            <strong>Billing question:</strong> Contact us with the email
            associated with your account. Never send passwords or payment
            card numbers by email.
          </li>
        </ul>
      </Section>

      <Section title="Contact Support">
        <p>
          If you cannot resolve your issue, contact our support team:
        </p>

        <p>
          <strong>Email:</strong>{" "}
          <a
            href="mailto:[SUPPORT EMAIL]"
            className="underline underline-offset-4"
          >
            [SUPPORT EMAIL]
          </a>
        </p>

        <p>
          When contacting support, please include enough information for us to
          understand the problem, such as the affected feature, browser,
          approximate time of the issue, and any relevant error message.
        </p>
      </Section>

      <Section title="Privacy Requests">
        <p>
          If your request concerns your personal information, account
          deletion, or privacy rights, please clearly identify it as a
          privacy request so it can be handled appropriately.
        </p>
      </Section>

      <Section title="Security">
        <p>
          If you believe you have discovered a security vulnerability in
          Audio Studio, please contact us privately rather than publicly
          sharing sensitive technical details.
        </p>
      </Section>

      <Section title="Important">
        <p>
          Never send us your password, authentication codes, payment card
          number, private keys, or other highly sensitive credentials when
          requesting support.
        </p>
      </Section>
    </ContentPage>
  );
}
