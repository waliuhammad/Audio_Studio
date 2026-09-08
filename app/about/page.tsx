```tsx
import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
  title: "About Us | Audio Studio",
  description:
    "Learn more about Audio Studio and our mission to make digital media processing simple and accessible.",
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About Audio Studio"
      title="Making media work simpler"
      description="Audio Studio is a modern online workspace designed to make everyday audio and digital media tasks faster, simpler, and more accessible."
    >
      <Section title="Who We Are">
        <p>
          Audio Studio is a product operated by{" "}
          <strong>[COMPANY LEGAL NAME]</strong>.
        </p>

        <p>
          We build practical online tools that help individuals,
          professionals, creators, and businesses work with their digital
          media without requiring complicated software or technical
          expertise.
        </p>
      </Section>

      <Section title="Our Mission">
        <p>
          Our mission is simple: make powerful media-processing tools easier
          to access and easier to use.
        </p>

        <p>
          We believe common tasks such as converting, editing, compressing,
          enhancing, and managing digital media should be straightforward,
          fast, and available through a clean modern experience.
        </p>
      </Section>

      <Section title="What We Build">
        <p>
          Audio Studio brings multiple media tools together in one workspace.
          Depending on the available features, users may be able to work with
          audio, video, documents, and other supported digital files.
        </p>

        <p>
          We continuously improve the platform and may introduce new tools,
          features, integrations, and subscription options over time.
        </p>
      </Section>

      <Section title="Privacy and Security">
        <p>
          We take the security and privacy of our users seriously. We design
          our services with reasonable safeguards and aim to be transparent
          about how information and uploaded content are handled.
        </p>

        <p>
          For detailed information about data collection, file processing,
          storage, and your privacy choices, please review our Privacy Policy.
        </p>
      </Section>

      <Section title="Built for Real-World Work">
        <p>
          Whether you are preparing content for work, managing personal
          projects, editing media, or handling everyday digital tasks, Audio
          Studio is designed to keep the process simple and focused.
        </p>
      </Section>

      <Section title="Contact Us">
        <p>
          Have a question, suggestion, or business inquiry? We would be happy
          to hear from you.
        </p>

        <p>
          <strong>[COMPANY LEGAL NAME]</strong>
          <br />
          Email: [SUPPORT EMAIL]
          <br />
          Address: [COMPANY ADDRESS]
        </p>
      </Section>
    </ContentPage>
  );
}
```
