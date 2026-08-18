export { Sidebar } from "./Sidebar";
export type { SidebarActive } from "./Sidebar";
export { Topbar } from "./Topbar";
export { AccountMenu } from "./AccountMenu";

/**
 * ProtectedShell is deliberately NOT exported here.
 *
 * This barrel is imported by client pages for Sidebar/Topbar. Re-exporting a
 * server component from it drags firebase-admin into the browser bundle, which
 * the "server-only" import in the firestore layer turns into a build error.
 * Import it directly from "@/components/dashboard/ProtectedShell" instead.
 */
