import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
  title: "Cookie Policy | Audio Studio",
  description:
    "Learn how Audio Studio uses cookies and similar technologies, and how you can control them.",
};

export default function CookiePolicyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Cookie Policy"
      description="This Cookie Policy explains what cookies and similar technologies Audio Studio uses, why we use them, and how you can control your preferences."
    >
      <Section title="1. What Are Cookies">
        <p>
          Cookies are small text files placed on your device when you visit a
          website. They allow the site to recognize your browser, remember
          information about your visit, and function correctly. We also use
          similar technologies such as local storage and session storage,
          which this policy refers to collectively as &quot;cookies&quot;.
        </p>
      </Section>

      <Section title="2. How We Use Cookies">
        <p>
          Audio Studio uses cookies to keep you signed in, remember your
          preferences, understand how our tools are used, maintain security,
          and improve the performance and reliability of our services.
        </p>
      </Section>

      <Section title="3. Types of Cookies We Use">
        <ul>
          <li>
            <strong>Essential cookies:</strong> required for core
            functionality, such as keeping you signed in and maintaining
            session security. The service will not work correctly without
            these.
          </li>
          <li>
            <strong>Preference cookies:</strong> remember choices you make,
            such as display or tool settings, so you do not have to set them
            again on each visit.
          </li>
          <li>
            <strong>Analytics cookies:</strong> help us understand how
            visitors use Audio Studio, such as which pages and tools are
            visited, so we can improve the service.
          </li>
          <li>
            <strong>Third-party cookies:</strong> may be set by services we
            rely on, such as authentication, hosting, or payment providers,
            to support their part of the service.
          </li>
        </ul>
      </Section>

      <Section title="4. Local Storage and Similar Technologies">
        <p>
          Some tools may use local storage or session storage in your browser
          to temporarily hold data needed to perform the task you request,
          such as project settings or in-progress work. This data stays on
          your device unless a feature explicitly saves it to your account.
        </p>
      </Section>

      <Section title="5. Third-Party Cookies">
        <p>
          Certain third-party providers integrated into Audio Studio, such as
          authentication, analytics, or payment services, may set their own
          cookies when you use related features. Their use of cookies is
          governed by their own privacy and cookie policies, not this one.
        </p>
      </Section>

      <Section title="6. Managing Your Cookie Preferences">
        <p>
          Most browsers let you view, manage, and delete cookies through
          their settings, and you can usually choose to block cookies
          entirely or be notified when a cookie is set.
        </p>

        <p>
          Please note that blocking or deleting essential cookies may prevent
          parts of Audio Studio, such as signing in or saving your work, from
          functioning correctly.
        </p>
      </Section>

      <Section title="7. Changes to This Cookie Policy">
        <p>
          We may update this Cookie Policy from time to time to reflect
          changes to our services or applicable law. When changes are made,
          we will update the &quot;Last updated&quot; date on this page.
        </p>
      </Section>

      <Section title="8. Contact Us">
        <p>
          If you have questions about this Cookie Policy, please contact:
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
        Last updated: September 8, 2026
      </p>
    </ContentPage>
  );
}