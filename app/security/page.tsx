import { LegalDoc } from "@/components/legal/LegalDoc";

/**
 * Built on LegalDoc, the same component behind Privacy and Terms, so the three
 * read as one set rather than three separately-designed pages.
 *
 * The claims here are deliberately modest and describe what the service
 * actually does — session cookies the browser cannot read from script, media
 * handled in the browser where a tool allows it, deletion on request. Nothing
 * asserts a certification or an audit we do not hold, because a security page
 * that oversells is worse than none.
 */
export default function SecurityPage() {
  return (
    <LegalDoc
      eyebrow="Trust"
      title="Security"
      description="How Audio Studio protects your account, your files, and the work you do here."
      updated="September 8, 2026"
      contactNote="To report a vulnerability or ask how something works, write to us at"
      sections={[
        {
          id: "accounts-and-sessions",
          heading: "Accounts & Sessions",
          body: [
            "Sign-in is handled by Firebase Authentication, so your password is never stored on our own servers. It is verified against Google infrastructure and we never see it.",
            "Your session is held in a cookie that scripts running in the page cannot read, which limits what a cross-site scripting bug could do with it. The cookie is signed, and its signature is verified on the server for every request to a signed-in screen — a forged or edited cookie gets no further than that check.",
            "Sessions expire on their own after two weeks. Signing out clears the cookie on the server first and the browser session second, so a stale tab cannot be used to walk back in.",
          ],
        },
        {
          id: "your-files",
          heading: "Your Files",
          body: [
            "Several tools run entirely in your browser. When a task can be done locally, your media never leaves your device at all.",
            "Where a tool does need a server — the heavier audio and video conversions — the file is uploaded, processed, and returned. Uploads are scoped to your account, so one account cannot address another account's files.",
            "Anything you choose to save is stored against your account and stays there until you delete it. Deleting a file removes it from your storage; emptying the trash removes it for good.",
          ],
        },
        {
          id: "in-transit",
          heading: "Data In Transit",
          body: [
            "The whole site is served over HTTPS, including every API route and file upload or download. Traffic between your browser and our servers is encrypted in transit.",
          ],
        },
        {
          id: "access",
          heading: "Access & Separation",
          body: [
            "Every request to a signed-in screen resolves your identity on the server before any of your data is read, rather than trusting anything the browser claims about who you are.",
            "Stored files and records are namespaced per account, so the path to your data is derived from your verified user id and not from anything you can type into a URL.",
          ],
        },
        {
          id: "third-parties",
          heading: "Third Parties",
          body: [
            "We rely on established providers for authentication, storage, and hosting. They receive only what they need to perform their function.",
            "We do not sell your personal information, and we do not hand your files to anyone for advertising or model training.",
          ],
        },
        {
          id: "reporting",
          heading: "Reporting a Problem",
          body: [
            "If you believe you have found a vulnerability, please tell us before telling anyone else, and give us a reasonable window to fix it.",
            "Include what you did, what you expected, and what happened instead. We will confirm we received your report and let you know when it is resolved.",
          ],
        },
        {
          id: "your-part",
          heading: "What You Can Do",
          body: [
            "Use a password you do not use anywhere else, and sign out on machines you share.",
            "We will never email you asking for your password. If a message claims to be from us and asks for one, it is not from us.",
          ],
        },
      ]}
    />
  );
}
