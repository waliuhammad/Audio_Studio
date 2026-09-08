```tsx
import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Audio Studio",
  description:
    "Learn how Audio Studio collects, uses, protects, and handles your information.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="Your privacy matters to us. This Privacy Policy explains what information Audio Studio collects, how we use it, and the choices available to you."
    >
      <Section title="1. Introduction">
        <p>
          This Privacy Policy explains how Audio Studio ("Audio Studio",
          "we", "us", or "our") collects, uses, stores, and protects
          information when you use our website, applications, tools, and
          related services.
        </p>

        <p>
          By using Audio Studio, you acknowledge that you have read and
          understood this Privacy Policy.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>
          Depending on how you use Audio Studio, we may collect the following
          categories of information:
        </p>

        <ul>
          <li>
            <strong>Account information:</strong> such as your name, email
            address, account identifier, and authentication information.
          </li>
          <li>
            <strong>Files and content:</strong> audio, video, documents, or
            other files that you voluntarily upload or process through our
            tools.
          </li>
          <li>
            <strong>Project information:</strong> saved projects, file names,
            preferences, settings, and related workspace information.
          </li>
          <li>
            <strong>Usage information:</strong> information about how you
            interact with our website and tools, such as pages visited,
            features used, and technical events.
          </li>
          <li>
            <strong>Device and technical information:</strong> such as
            browser type, operating system, approximate location derived from
            technical information, IP address, and device information where
            necessary for security and service operation.
          </li>
          <li>
            <strong>Payment information:</strong> if you purchase a paid
            service. Payment details may be handled directly by our payment
            provider rather than being stored by Audio Studio.
          </li>
        </ul>
      </Section>

      <Section title="3. How We Use Information">
        <p>We may use information to:</p>

        <ul>
          <li>Provide, operate, and maintain Audio Studio.</li>
          <li>Create and manage user accounts.</li>
          <li>Process files and provide requested tools and features.</li>
          <li>Save and manage user projects when the service supports it.</li>
          <li>Improve the performance, reliability, and usability of our services.</li>
          <li>Detect, investigate, and prevent fraud, abuse, and security incidents.</li>
          <li>Provide customer support.</li>
          <li>Process subscriptions and payments through authorized payment providers.</li>
          <li>Comply with applicable legal obligations.</li>
        </ul>
      </Section>

      <Section title="4. File Processing and Storage">
        <p>
          Audio Studio provides tools that may require files to be processed
          in your browser, on our servers, or through third-party processing
          services depending on the specific feature.
        </p>

        <p>
          You should only upload content that you have the right and
          permission to process.
        </p>

        <p>
          Where projects or files are stored as part of your account, they
          may remain available until you delete them, the applicable service
          removes them, or your account is deleted.
        </p>

        <p>
          We do not claim ownership of content that you upload or create
          through Audio Studio. You remain responsible for ensuring that your
          content complies with applicable laws and third-party rights.
        </p>
      </Section>

      <Section title="5. Third-Party Services">
        <p>
          Audio Studio may rely on trusted third-party providers for services
          such as authentication, hosting, cloud storage, analytics, payment
          processing, email delivery, security, and file processing.
        </p>

        <p>
          These providers may process information as necessary to provide
          their services to us. Their handling of information may also be
          governed by their own privacy policies and terms.
        </p>
      </Section>

      <Section title="6. Authentication">
        <p>
          If you sign in using an external authentication provider, such as
          Google, GitHub, or another supported provider, we may receive
          information necessary to create and manage your Audio Studio
          account.
        </p>

        <p>
          We do not receive your external provider password through the
          normal OAuth authentication process.
        </p>
      </Section>

      <Section title="7. Cookies and Similar Technologies">
        <p>
          Audio Studio may use cookies, local storage, session technologies,
          and similar mechanisms to keep you signed in, remember preferences,
          maintain security, and understand how our services are used.
        </p>

        <p>
          Some third-party services integrated into Audio Studio may also use
          their own cookies or similar technologies.
        </p>
      </Section>

      <Section title="8. Data Security">
        <p>
          We use reasonable technical and organizational measures designed to
          protect information against unauthorized access, alteration,
          disclosure, or destruction.
        </p>

        <p>
          However, no internet service, transmission method, or storage
          system can be guaranteed to be completely secure.
        </p>
      </Section>

      <Section title="9. Data Retention and Deletion">
        <p>
          We retain information only for as long as reasonably necessary for
          the purposes described in this Privacy Policy, including providing
          the service, maintaining accounts and projects, resolving disputes,
          preventing abuse, and meeting legal obligations.
        </p>

        <p>
          You may request deletion of your account or personal information,
          subject to information that we may be required or permitted to
          retain under applicable law.
        </p>
      </Section>

      <Section title="10. Your Rights and Choices">
        <p>
          Depending on your location and applicable law, you may have rights
          relating to your personal information, including rights to access,
          correct, delete, restrict, or object to certain processing.
        </p>

        <p>
          To make a privacy-related request, contact us using the support
          contact information provided on our website.
        </p>
      </Section>

      <Section title="11. Children's Privacy">
        <p>
          Audio Studio is not intended for children who are below the minimum
          age required to use online services under applicable law.
        </p>

        <p>
          We do not knowingly collect personal information from children in
          violation of applicable privacy laws.
        </p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect
          changes to our services, technology, legal requirements, or
          business practices.
        </p>

        <p>
          When changes are made, we will update the "Last updated" date on
          this page. Continued use of Audio Studio after an update means the
          revised policy will apply to your use of the service, subject to
          applicable law.
        </p>
      </Section>

      <Section title="13. Contact Us">
        <p>
          If you have questions about this Privacy Policy or our handling of
          personal information, please contact:
        </p>

        <p>
          <strong>[COMPANY LEGAL NAME]</strong>
          <br />
          Email: [PRIVACY / SUPPORT EMAIL]
          <br />
          Address: [COMPANY ADDRESS]
        </p>
      </Section>

      <p className="pt-8 text-sm text-muted-foreground">
        Last updated: September 2, 2026
      </p>
    </ContentPage>
  );
}
```
