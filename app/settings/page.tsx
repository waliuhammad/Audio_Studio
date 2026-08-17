import { Sidebar, Topbar } from "@/components/dashboard";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CreditCard,
  Gauge,
  HardDrive,
  LogOut,
  Mail,
  Monitor,
  Palette,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: UserRound },
  { id: "dark", label: "Dark", icon: Monitor, active: true },
  { id: "system", label: "System", icon: X },
];

const NOTIFICATIONS = [
  { label: "Project updates", description: "Progress and status changes on your projects.", on: true },
  { label: "Processing alerts", description: "When an export or conversion finishes or fails.", on: true },
  { label: "Storage warnings", description: "Alerts when you are nearing your storage limit.", on: true },
  { label: "Weekly digest", description: "A summary of your studio activity every week.", on: false },
];

/* ===================================================== */
/* SUB-COMPONENTS                                       */
/* ===================================================== */

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ${
        on ? "bg-amber" : "bg-graphite/15 dark:bg-mist/15"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-xl
        border
        border-paper-border
        bg-paper-surface
        dark:border-ink-border
        dark:bg-ink-surface
      "
    >
      <header
        className="
          flex
          items-center
          gap-3
          border-b
          border-paper-border
          px-4
          py-4
          sm:px-6
          dark:border-ink-border
        "
      >
        <span
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-amber/20
            bg-amber/10
            text-amber
          "
        >
          <Icon className="h-4 w-4" strokeWidth={1.7} />
        </span>

        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold tracking-tight text-graphite sm:text-base dark:text-mist">
            {title}
          </h2>
          <p className="text-[11px] text-graphite-muted dark:text-mist-muted">
            {description}
          </p>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  );
}

/* ===================================================== */
/* PAGE                                                 */
/* ===================================================== */

export default function SettingsPage() {
  return (
    <main className="relative flex min-h-screen bg-paper dark:bg-ink">
      {/* ================================================= */}
      {/* AMBIENT GLOWS                                     */}
      {/* ================================================= */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-44
          top-[-140px]
          h-96
          w-96
          rounded-full
          bg-amber/[0.04]
          blur-[120px]
        "
      />

      {/* ================================================= */}
      {/* SIDEBAR                                          */}
      {/* ================================================= */}

      <Sidebar active="settings" />

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar title="Settings" subtitle="Audio Studio / Account" />

        <div className="container-studio flex-1 py-8 sm:py-10">
          {/* Header */}
          <div className="max-w-2xl">
            <div
              className="
                mb-3
                flex
                items-center
                gap-2
                font-mono
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-amber
                sm:text-[10px]
              "
            >
              <span className="h-px w-5 bg-amber sm:w-6" />
              Preferences
            </div>

            <h1 className="font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.035em] text-graphite sm:text-4xl lg:text-5xl dark:text-mist">
              Settings
            </h1>

            <p
              className="
                mt-3
                max-w-xl
                text-[13px]
                leading-6
                text-graphite-muted
                sm:text-sm
                dark:text-mist-muted
              "
            >
              Manage your profile, appearance, notifications, and account.
            </p>
          </div>

          {/* ============================================= */}
          {/* SECTIONS                                      */}
          {/* ============================================= */}

          <div className="mt-7 flex flex-col gap-4 sm:mt-9 sm:gap-5">
            {/* =========================================== */}
            {/* PROFILE                                      */}
            {/* =========================================== */}

            <SectionCard icon={UserRound} title="Profile" description="How you appear across Audio Studio.">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* Avatar */}
                <div className="flex shrink-0 items-center gap-3">
                  <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber/15 text-lg font-semibold text-amber">
                    AL

                    <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-paper-border bg-paper-surface text-graphite-muted dark:border-ink-border dark:bg-ink-surface dark:text-mist-muted">
                      <Camera className="h-3 w-3" strokeWidth={1.7} />
                    </span>
                  </span>

                  <button
                    type="button"
                    className="
                      rounded-full
                      border
                      border-paper-border
                      bg-paper
                      px-3.5
                      py-2
                      text-[11px]
                      font-medium
                      text-graphite
                      transition-colors
                      hover:border-amber/50
                      hover:text-amber
                      dark:border-ink-border
                      dark:bg-ink
                      dark:text-mist
                      dark:hover:border-amber/50
                      dark:hover:text-amber
                    "
                  >
                    Change photo
                  </button>
                </div>

                {/* Fields */}
                <div className="grid flex-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-graphite dark:text-mist">
                      Full name
                    </span>
                    <span className="flex h-10 w-full items-center rounded-xl border border-paper-border bg-paper-surface/50 px-3 transition-colors focus-within:border-amber dark:border-ink-border dark:bg-ink-surface/50">
                      <input
                        type="text"
                        defaultValue="Ada Lovelace"
                        className="min-w-0 flex-1 bg-transparent text-sm text-graphite outline-none dark:text-mist"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-graphite dark:text-mist">
                      Email address
                    </span>
                    <span className="flex h-10 w-full items-center rounded-xl border border-paper-border bg-paper-surface/50 px-3 transition-colors focus-within:border-amber dark:border-ink-border dark:bg-ink-surface/50">
                      <Mail className="mr-2.5 h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint" strokeWidth={1.7} />
                      <input
                        type="email"
                        defaultValue="ada@example.com"
                        className="min-w-0 flex-1 bg-transparent text-sm text-graphite outline-none dark:text-mist"
                      />
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-paper-border pt-4 dark:border-ink-border">
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-[11px] font-medium text-graphite-muted transition-colors hover:text-amber dark:text-mist-muted dark:hover:text-amber"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="flex h-10 items-center gap-1.5 rounded-full bg-amber px-5 text-xs font-semibold text-ink shadow-[0_6px_20px_rgba(245,158,11,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(245,158,11,0.30)] active:translate-y-0"
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                  Save changes
                </button>
              </div>
            </SectionCard>

            {/* =========================================== */}
            {/* APPEARANCE                                   */}
            {/* =========================================== */}

            <SectionCard icon={Palette} title="Appearance" description="Choose how Audio Studio looks for you.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={option.active}
                      className={`
                        flex
                        min-w-0
                        items-center
                        gap-3
                        rounded-xl
                        border
                        p-3
                        text-left
                        transition-all
                        duration-200
                        ${
                          option.active
                            ? "border-amber/50 bg-amber/[0.04] dark:bg-amber/[0.03]"
                            : "border-paper-border bg-paper-surface hover:border-amber/30 dark:border-ink-border dark:bg-ink-surface dark:hover:border-amber/30"
                        }
                      `}
                    >
                      <span
                        className={`
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-amber/20
                          ${option.active ? "bg-amber/10 text-amber" : "bg-paper-raised text-graphite-muted dark:bg-ink-raised dark:text-mist-muted"}
                        `}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.7} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-graphite dark:text-mist">
                          {option.label}
                        </span>
                        <span className="block truncate text-[10px] text-graphite-muted dark:text-mist-muted">
                          Default
                        </span>
                      </span>

                      {option.active && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber text-ink">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* =========================================== */}
            {/* NOTIFICATIONS                                */}
            {/* =========================================== */}

            <SectionCard icon={Shield} title="Notifications" description="Control what messages you receive.">
              <div className="flex flex-col">
                {NOTIFICATIONS.map((item, index) => (
                  <div
                    key={item.label}
                    className={`flex min-w-0 items-center justify-between gap-4 py-3 ${
                      index !== NOTIFICATIONS.length - 1
                        ? "border-b border-paper-border dark:border-ink-border"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-graphite dark:text-mist">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
                        {item.description}
                      </p>
                    </div>

                    <Toggle on={item.on} />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* =========================================== */}
            {/* PLAN & STORAGE                               */}
            {/* =========================================== */}

            <SectionCard icon={CreditCard} title="Plan & Storage" description="Your subscription and storage usage.">
              <div className="flex flex-col gap-5">
                {/* Plan row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                      <Gauge className="h-4 w-4" strokeWidth={1.7} />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-graphite dark:text-mist">
                        Free plan
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-amber">
                        Current
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="
                      flex
                      h-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-amber
                      px-5
                      text-xs
                      font-semibold
                      text-ink
                      shadow-[0_6px_20px_rgba(245,158,11,0.18)]
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:shadow-[0_10px_28px_rgba(245,158,11,0.30)]
                      active:translate-y-0
                    "
                  >
                    Upgrade to Pro
                  </button>
                </div>

                {/* Storage usage */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-graphite-muted dark:text-mist-muted">
                      <HardDrive className="h-3.5 w-3.5 text-amber" strokeWidth={1.7} />
                      Storage usage
                    </p>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint">
                      6.2 / 8.0 GB
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-graphite/10 dark:bg-mist/10">
                    <div className="h-full w-[78%] rounded-full bg-amber" />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* =========================================== */}
            {/* DANGER ZONE                                  */}
            {/* =========================================== */}

            <SectionCard icon={AlertTriangle} title="Danger Zone" description="Irreversible actions for your account.">
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  rounded-xl
                  border
                  border-coral/25
                  bg-coral/[0.04]
                  p-4
                  sm:flex-row
                  sm:items-center
                  dark:bg-coral/[0.03]
                "
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-graphite dark:text-mist">
                    Delete account
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-graphite-muted dark:text-mist-muted">
                    Permanently remove your account, projects, and all stored files.
                  </p>
                </div>

                <button
                  type="button"
                  className="
                    flex
                    h-9
                    shrink-0
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-coral/30
                    bg-coral/5
                    px-4
                    text-xs
                    font-semibold
                    text-coral
                    transition-all
                    duration-200
                    hover:bg-coral
                    hover:text-ink
                  "
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Delete
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-paper-border pt-4 dark:border-ink-border">
                <button
                  type="button"
                  className="
                    flex
                    h-10
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-paper-border
                    bg-paper-surface
                    px-4
                    text-xs
                    font-medium
                    text-graphite-muted
                    transition-colors
                    hover:border-amber/40
                    hover:text-amber
                    dark:border-ink-border
                    dark:bg-ink-surface
                    dark:text-mist-muted
                    dark:hover:border-amber/40
                    dark:hover:text-amber
                  "
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.7} />
                  Sign out
                </button>
              </div>
            </SectionCard>
          </div>

          {/* ============================================= */}
          {/* FOOTER NOTE                                   */}
          {/* ============================================= */}

          <p className="mt-8 text-center text-[11px] text-graphite-faint dark:text-mist-faint">
            Design preview — saving, toggles and destructive actions go live after approval.
          </p>
        </div>
      </div>
    </main>
  );
}