import { SidebarInset, SidebarProvider, Toaster } from "@erp/ui";
import { AppSidebar } from "@/components/app-sidebar";
import AppHeader from "@/components/app-header";
import { requireAuth } from "@erp/auth";
import { ensureRbacBootstrapped } from "@/lib/rbac-bootstrap";
import { ensureCoreBootstrapped } from "@/lib/core-bootstrap";
import { jelzesApi } from "@erp/jelzes";
import { getFeladatJelzes } from "@/lib/teendo-feed";
import { buildModuleNav } from "@/lib/navigation/modules";
import { alapMenu, menuBejegyzesek } from "@/lib/navigation/menu-kereses";
import { PushSzinkron } from "./_components/push-szinkron";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureRbacBootstrapped();
  ensureCoreBootstrapped();
  const sessionUser = await requireAuth();
  const [feladatJelzes, jelzesOlvasatlan] = await Promise.all([
    getFeladatJelzes(sessionUser.id),
    jelzesApi.olvasatlanDb(sessionUser.id).catch(() => 0),
  ]);

  const has = (key: string) => sessionUser.permissions.includes(key);
  const alap = alapMenu(has);
  const menu = menuBejegyzesek([alap[0]!, ...buildModuleNav(has), ...alap.slice(1)]);

  return (
    <SidebarProvider className="h-[calc(100*var(--dvh))] max-h-[calc(100*var(--dvh))] w-full max-w-full overflow-hidden">
      <AppSidebar
        feladatJelzes={feladatJelzes}
        jelzesOlvasatlan={jelzesOlvasatlan}
        serverUser={{
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          permissions: sessionUser.permissions,
        }}
      />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppHeader jelzesOlvasatlan={jelzesOlvasatlan} menu={menu} />
        <main className="min-h-0 flex-1 overflow-y-auto pb-4">{children}</main>
      </SidebarInset>
      <Toaster position="bottom-right" />
      <PushSzinkron />
    </SidebarProvider>
  );
}
