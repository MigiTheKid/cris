import { redirect } from "next/navigation";
import { Sidebar } from "@/components/cris/Sidebar";
import { Topbar } from "@/components/cris/Topbar";
import { RouteMesh } from "@/components/cris/RouteMesh";
import { getCurrentProfile } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  driver: "Motorista",
};

/** Shell do Painel Operacional (admin/manager) — protegido por sessão e cargo. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.mustChangePassword) redirect("/trocar-senha");
  if (profile.role === "driver") redirect("/motorista");

  const user = { name: profile.fullName, roleLabel: ROLE_LABEL[profile.role] ?? profile.role };

  return (
    <>
      <div className="bg-root">
        <div className="bg-base" />
        <RouteMesh />
        <div className="bg-vignette" />
      </div>

      <div className="relative z-[1] grid h-screen w-screen grid-cols-[256px_minmax(0,1fr)] overflow-hidden max-[860px]:grid-cols-1">
        <Sidebar user={user} />
        <div className="flex h-screen min-w-0 flex-col">
          <Topbar />
          <div className="flex-1 overflow-x-hidden overflow-y-auto px-[clamp(20px,3vw,40px)] pb-16">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
