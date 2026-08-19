import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { apiFetch } from "@/lib/api/client";
import type { UserProfile } from "@/types";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  // Confirms the token is still good and gives the header a real identity.
  // A failure here means the session lapsed, so apiFetch sends them to /login.
  const user = await apiFetch<UserProfile>("/auth/me", {
    auth: true,
    redirectOnUnauthorized: true,
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
