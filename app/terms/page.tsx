import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
  title: "Terms of Service | Audio Studio",
  description:
    "Read the terms and conditions governing your use of Audio Studio.",
};

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of Service"
      description="These Terms of Service govern your access to and use of Audio Studio."
    >
      <Section title="1. Acceptance of These Terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) form an agreement between you and
          Audio Studio (&quot;Audio Studio&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
        </p>

        <p>
          By accessing or using Audio Studio, you agree to these Terms. If
          you do not agree with these Terms, you should not use the service.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be legally capable of entering into a binding agreement
          under the laws applicable to you in order to use Audio Studio.
        </p>

        <p>
          If you use Audio Studio on behalf of a company or organization, you
          represent that you have authority to bind that organization to
          these Terms.
        </p>
      </Section>

      <Section title="3. Our Services">
        <p>
          Audio Studio provides online tools and services for working with
          audio, video, documents, and related digital content.
        </p>

        <p>
          Features may change over time. We may add, modify, suspend, or
          discontinue features when reasonably necessary to operate and
          improve the service.
        </p>
      </Section>

      <Section title="4. Accounts">
        <p>
          Certain features may require you to create an account. You are
          responsible for maintaining the security of your account and for
          activity performed through your account.
        </p>

        <p>
          You must provide information that is accurate and must not use
          another person&apos;s account without authorization.
        </p>
      </Section>

      <Section title="5. Your Content">
        <p>
          You retain ownership of the content and files that you upload to
          Audio Studio.
        </p>

        <p>
          By uploading or processing content, you grant Audio Studio only the
          permissions reasonably necessary to host, process, transmit, and
          provide the requested service.
        </p>

        <p>
          You are solely responsible for ensuring that you have all rights,
          permissions, licenses, and consents necessary to upload, process,
          modify, store, or distribute your content.
        </p>
      </Section>

      <Section title="6. Prohibited Uses">
        <p>You may not use Audio Studio to:</p>

        <ul>
          <li>Break or violate applicable laws or regulations.</li>
          <li>Infringe copyrights, trademarks, privacy rights, or other third-party rights.</li>
          <li>Upload content that you do not have permission to use.</li>
          <li>Distribute malware, viruses, or other harmful code.</li>
          <li>Attempt to gain unauthorized access to our systems or accounts.</li>
          <li>Interfere with or disrupt the operation of the service.</li>
          <li>Abuse automated systems, APIs, quotas, or infrastructure.</li>
          <li>Use the service to facilitate fraud, abuse, or other unlawful activity.</li>
        </ul>
      </Section>

      <Section title="7. Paid Services and Subscriptions">
        <p>
          Some Audio Studio features may require payment or a subscription.
          Prices, billing intervals, included features, and usage limits will
          be presented before purchase.
        </p>

        <p>
          Payments may be processed by a third-party payment provider. Your
          payment may therefore also be subject to that provider&apos;s terms and
          policies.
        </p>

        <p>
          If you purchase a recurring subscription, it may renew automatically
          until cancelled, subject to the terms shown at the time of purchase.
        </p>
      </Section>

      <Section title="8. Refunds and Cancellation">
        <p>
          Refunds, cancellations, and subscription changes are handled
          according to the applicable refund and cancellation policy presented
          by Audio Studio and, where applicable, the payment provider.
        </p>

        <p>
          Nothing in these Terms limits any mandatory consumer rights that
          cannot legally be excluded.
        </p>
      </Section>

      <Section title="9. Intellectual Property">
        <p>
          Audio Studio and its original software, branding, designs,
          interfaces, text, graphics, and other materials are owned by or
          licensed to the company operating Audio Studio and are protected by
          applicable intellectual-property laws.
        </p>

        <p>
          Except as expressly permitted by these Terms, you may not copy,
          reproduce, modify, distribute, sell, or commercially exploit our
          proprietary materials without permission.
        </p>
      </Section>

      <Section title="10. Availability and Changes">
        <p>
          We aim to provide a reliable service, but we do not guarantee that
          Audio Studio will always be available, uninterrupted, or error-free.
        </p>

        <p>
          Maintenance, security incidents, technical failures, third-party
          outages, or circumstances outside our reasonable control may affect
          availability.
        </p>
      </Section>

      <Section title="11. Disclaimer">
        <p>
          Audio Studio is provided on an &quot;as available&quot; and &quot;as is&quot; basis to
          the extent permitted by applicable law.
        </p>

        <p>
          We do not guarantee that every processing result will be accurate,
          complete, suitable for a particular purpose, or free from errors.
          You are responsible for reviewing generated or processed output
          before relying on it.
        </p>
      </Section>

      <Section title="12. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, Audio Studio and
          its owners, employees, affiliates, and service providers will not
          be liable for indirect, incidental, special, consequential, or
          punitive damages arising from your use of the service.
        </p>

        <p>
          Nothing in these Terms excludes or limits liability where doing so
          would be prohibited by applicable law.
        </p>
      </Section>

      <Section title="13. Suspension and Termination">
        <p>
          We may suspend or terminate access to Audio Studio where reasonably
          necessary, including for violations of these Terms, security risks,
          fraud, abuse, or legal requirements.
        </p>

        <p>
          You may stop using the service at any time. Account deletion may be
          available through your account settings or by contacting support.
        </p>
      </Section>

      <Section title="14. Changes to These Terms">
        <p>
          We may update these Terms when our service, business, or legal
          requirements change.
        </p>

        <p>
          The updated version will be posted on this page with a revised
          &quot;Last updated&quot; date.
        </p>
      </Section>

      <Section title="15. Governing Law">
        <p>
          These Terms are governed by the laws of the jurisdiction in which
          Audio Studio operates, without regard to conflict-of-law
          principles, unless applicable law requires otherwise.
        </p>
      </Section>

      <Section title="16. Contact">
        <p>
          Questions regarding these Terms may be sent to:
        </p>

        <p>
          <strong>Audio Studio</strong>
          <br />
          Email:{" "}
          <a href="mailto:support@audiostudio.com">
            support@audiostudio.com
          </a>
        </p>
      </Section>

      <p className="pt-8 text-sm text-muted-foreground">
        Last updated: September 2, 2026
      </p>
    </ContentPage>
  );
}