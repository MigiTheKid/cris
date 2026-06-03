import { Sidebar } from "@/components/sidebar";

/** Shell do Painel Operacional (admin/manager). App do motorista terá shell próprio. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
