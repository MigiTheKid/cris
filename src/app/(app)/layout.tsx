import { Sidebar } from "@/components/cris/Sidebar";
import { Topbar } from "@/components/cris/Topbar";

/** Shell do Painel Operacional (admin/manager) — estilo Centro de Comando. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-root">
        <div className="bg-base" />
        <div className="bg-vignette" />
      </div>

      <div className="relative z-[1] grid h-screen w-screen grid-cols-[256px_minmax(0,1fr)] overflow-hidden max-[860px]:grid-cols-1">
        <Sidebar />
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
