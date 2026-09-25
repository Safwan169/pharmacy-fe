import { CounterChrome } from "@/components/layout/counter-chrome";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/current-user";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  // Confirms the token is still good and gives the header a real identity.
  // A failure here means the session lapsed, so apiFetch sends them to /login.
  const user = await getCurrentUser();

  return (
    <CounterChrome sidebar={<Sidebar role={user.role} />} topbar={<Topbar user={user} />}>
      {children}
    </CounterChrome>
  );
}
