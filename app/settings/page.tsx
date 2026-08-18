"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import { Sidebar, Topbar } from "@/components/dashboard";
import {
  AlertTriangle,
  Camera,
  Check,
  CreditCard,
  Gauge,
  HardDrive,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAccount } from "@/components/providers/SessionProvider";
import { updateAccountName } from "@/lib/dashboard/api";
import { signOut } from "@/lib/firebase/auth-client";
import { formatSize } from "@/lib/dashboard/types";

/* ===================================================== */
/* DATA                                                  */
/* ===================================================== */

const THEME_OPTIONS: {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
    { id: "light", label: "Light", hint: "Always bright", icon: Sun },
    { id: "dark", label: "Dark", hint: "Always dim", icon: Moon },
    { id: "system", label: "System", hint: "Match your OS", icon: Monitor },
  ];

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  on: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: "project-updates",
    label: "Project updates",
    description: "Progress and status changes on your projects.",
    on: true,
  },
  {
    id: "processing-alerts",
    label: "Processing alerts",
    description: "When an export or conversion finishes or fails.",
    on: true,
  },
  {
    id: "storage-warnings",
    label: "Storage warnings",
    description: "Alerts when you are nearing your storage limit.",
    on: true,
  },
  {
    id: "weekly-digest",
    label: "Weekly digest",
    description: "A summary of your studio activity every week.",
    on: false,
  },
];

/* ===================================================== */
/* SUB-COMPONENTS                                       */
/* ===================================================== */

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 ${on ? "bg-amber" : "bg-graphite/15 dark:bg-mist/15"
        }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${on ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const account = useAccount();

  // Profile form
  const [name, setName] = useState(account.name);
  const [savedName, setSavedName] = useState(account.name);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = name.trim() !== savedName;

  // Notifications
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  // Danger zone
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const storagePercent = useMemo(
    () =>
      account.storageLimitBytes > 0
        ? Math.round(
          (account.storageUsedBytes / account.storageLimitBytes) * 100
        )
        : 0,
    [account.storageLimitBytes, account.storageUsedBytes]
  );

  /**
   * Saves the display name to Firebase Auth AND Firestore — the route keeps
   * the two in step. Email is deliberately not editable here: changing it
   * requires re-authentication and re-verification, which is a flow of its
   * own rather than a field on this form.
   */
  const handleSave = async () => {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setSaveError("Enter a name with at least 2 characters.");
      return;
    }

    setIsSaving(true);
    setSavedAt(null);
    setSaveError(null);

    try {
      const updated = await updateAccountName(trimmed);

      setName(updated);
      setSavedName(updated);
      setSavedAt("Saved.");

      // The name lives in the session token that the server components read,
      // so refresh to update the topbar initials without a manual reload.
      router.refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save your changes."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(savedName);
    setSavedAt(null);
    setSaveError(null);
  };

  const handleSignOut = async () => {
    await signOut();

    router.replace("/sign-in");
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    if (!canDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        throw new Error(data.error ?? "Could not delete your account.");
      }

      // The Firebase user is gone; clear the client SDK's copy too so the
      // browser is not left holding a token for a deleted account.
      await signOut();

      router.replace("/");
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete your account."
      );
      setIsDeleting(false);
    }
  };

  const toggleNotification = (id: string) => {
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, on: !item.on } : item
      )
    );
  };

  const canDelete = deleteConfirmation.trim().toUpperCase() === "DELETE";

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

            <SectionCard
              icon={UserRound}
              title="Profile"
              description="How you appear across Audio Studio."
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {/* Avatar */}
                <div className="flex shrink-0 items-center gap-3">
                  <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber/15 text-lg font-semibold text-amber">
                    {account.initials}

                    <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-paper-border bg-paper-surface text-graphite-muted dark:border-ink-border dark:bg-ink-surface dark:text-mist-muted">
                      <Camera className="h-3 w-3" strokeWidth={1.7} />
                    </span>
                  </span>

                  <button
                    type="button"
                    disabled
                    title="Photo upload arrives with the account backend"
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
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                      disabled:hover:border-paper-border
                      disabled:hover:text-graphite
                      dark:border-ink-border
                      dark:bg-ink
                      dark:text-mist
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
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          setSavedAt(null);
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm text-graphite outline-none dark:text-mist"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-graphite dark:text-mist">
                      Email address
                    </span>
                    <span className="flex h-10 w-full items-center rounded-xl border border-paper-border bg-paper-surface/50 px-3 transition-colors focus-within:border-amber dark:border-ink-border dark:bg-ink-surface/50">
                      <Mail
                        className="mr-2.5 h-4 w-4 shrink-0 text-graphite-faint dark:text-mist-faint"
                        strokeWidth={1.7}
                      />
                      <input
                        type="email"
                        value={account.email}
                        readOnly
                        aria-describedby="settings-email-note"
                        title="Email is tied to your sign-in method and cannot be changed here."
                        className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm text-graphite-muted outline-none dark:text-mist-muted"
                      />
                    </span>

                    <span
                      id="settings-email-note"
                      className="mt-1.5 block text-[11px] text-graphite-faint dark:text-mist-faint"
                    >
                      Tied to your sign-in method — contact support to change it.
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-paper-border pt-4 dark:border-ink-border">
                {saveError && (
                  <p className="mr-auto text-[11px] text-coral">{saveError}</p>
                )}

                {savedAt && !saveError && (
                  <p className="mr-auto flex items-center gap-1.5 text-[11px] text-teal">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {savedAt}
                  </p>
                )}

                {isDirty && !savedAt && !saveError && (
                  <p className="mr-auto font-mono text-[9px] uppercase tracking-[0.14em] text-amber">
                    Unsaved changes
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!isDirty || isSaving}
                  className="
                    rounded-full
                    px-4
                    py-2
                    text-[11px]
                    font-medium
                    text-graphite-muted
                    transition-colors
                    hover:text-amber
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    disabled:hover:text-graphite-muted
                    dark:text-mist-muted
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="
                    flex
                    h-10
                    items-center
                    gap-1.5
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    disabled:hover:translate-y-0
                  "
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Check className="h-4 w-4" strokeWidth={2} />
                  )}
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </SectionCard>

            {/* =========================================== */}
            {/* APPEARANCE                                   */}
            {/* =========================================== */}

            <SectionCard
              icon={Palette}
              title="Appearance"
              description="Choose how Audio Studio looks for you."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = mounted && theme === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id)}
                      aria-pressed={active}
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
                        ${active
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
                          ${active
                            ? "bg-amber/10 text-amber"
                            : "bg-paper-raised text-graphite-muted dark:bg-ink-raised dark:text-mist-muted"
                          }
                        `}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.7} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-graphite dark:text-mist">
                          {option.label}
                        </span>
                        <span className="block truncate text-[10px] text-graphite-muted dark:text-mist-muted">
                          {option.hint}
                        </span>
                      </span>

                      {active && (
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

            <SectionCard
              icon={Shield}
              title="Notifications"
              description="Control what messages you receive."
            >
              <div className="flex flex-col">
                {notifications.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex min-w-0 items-center justify-between gap-4 py-3 ${index !== notifications.length - 1
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

                    <Toggle
                      on={item.on}
                      label={item.label}
                      onChange={() => toggleNotification(item.id)}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* =========================================== */}
            {/* PLAN & STORAGE                               */}
            {/* =========================================== */}

            <SectionCard
              icon={CreditCard}
              title="Plan & Storage"
              description="Your subscription and storage usage."
            >
              <div className="flex flex-col gap-5">
                {/* Plan row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                      <Gauge className="h-4 w-4" strokeWidth={1.7} />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-graphite dark:text-mist">
                        {account.plan} plan
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-amber">
                        Current
                      </p>
                    </div>
                  </div>

                  <a
                    href="/#pricing"
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
                  </a>
                </div>

                {/* Storage usage */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-graphite-muted dark:text-mist-muted">
                      <HardDrive
                        className="h-3.5 w-3.5 text-amber"
                        strokeWidth={1.7}
                      />
                      Storage usage
                    </p>
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint">
                      {formatSize(account.storageUsedBytes)} /{" "}
                      {formatSize(account.storageLimitBytes)}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-graphite/10 dark:bg-mist/10">
                    <div
                      className="h-full rounded-full bg-amber transition-all duration-500"
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* =========================================== */}
            {/* DANGER ZONE                                  */}
            {/* =========================================== */}

            <SectionCard
              icon={AlertTriangle}
              title="Danger Zone"
              description="Irreversible actions for your account."
            >
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
                    Permanently remove your account, projects, and all stored
                    files.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeleteOpen((previous) => !previous)}
                  aria-expanded={isDeleteOpen}
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

              {isDeleteOpen && (
                <div className="mt-4 rounded-xl border border-coral/30 bg-coral/[0.04] p-4">
                  <p className="text-[12px] leading-5 text-graphite dark:text-mist">
                    Type <span className="font-mono font-semibold">DELETE</span>{" "}
                    to confirm. This removes everything and cannot be undone.
                  </p>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                      placeholder="DELETE"
                      aria-label="Type DELETE to confirm"
                      className="
                        h-10
                        flex-1
                        rounded-xl
                        border
                        border-paper-border
                        bg-paper-surface
                        px-3
                        font-mono
                        text-sm
                        text-graphite
                        outline-none
                        transition-colors
                        placeholder:text-graphite-faint
                        focus:border-coral
                        dark:border-ink-border
                        dark:bg-ink-surface
                        dark:text-mist
                        dark:placeholder:text-mist-faint
                      "
                    />

                    <button
                      type="button"
                      onClick={() => void handleDeleteAccount()}
                      disabled={!canDelete || isDeleting}
                      className="
                        h-10
                        shrink-0
                        rounded-full
                        bg-coral
                        px-5
                        text-xs
                        font-semibold
                        text-ink
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        active:translate-y-0
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                        disabled:hover:translate-y-0
                      "
                    >
                      {isDeleting ? "Deleting…" : "Delete my account"}
                    </button>
                  </div>

                  {deleteError && (
                    <p className="mt-3 text-[11px] text-coral">{deleteError}</p>
                  )}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-paper-border pt-4 dark:border-ink-border">
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
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
        </div>
      </div>
    </main>
  );
}