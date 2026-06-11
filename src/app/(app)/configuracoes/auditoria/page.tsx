import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { getAuditPage, getAuditActors, type AuditFilters } from "@/lib/data/audit";
import { AuditFilters as AuditFiltersBar } from "@/components/cris/AuditFilters";
import { AuditTimeline } from "@/components/cris/AuditTimeline";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = Promise<{ entity?: string; action?: string; actor?: string; page?: string }>;

export default async function AuditoriaPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/configuracoes");

  const sp = await searchParams;
  const filters: AuditFilters = {
    entity: sp.entity || undefined,
    action: sp.action || undefined,
    actorId: sp.actor || undefined,
  };
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ entries, total }, actors] = await Promise.all([
    getAuditPage(filters, PAGE_SIZE, offset),
    getAuditActors(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  const qs = (p: number) => {
    const next = new URLSearchParams();
    if (filters.entity) next.set("entity", filters.entity);
    if (filters.action) next.set("action", filters.action);
    if (filters.actorId) next.set("actor", filters.actorId);
    if (p > 1) next.set("page", String(p));
    const s = next.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">⚙️ Configurações</div>
          <h1 className="page-title">Auditoria</h1>
          <p className="page-sub">Registro completo das ações sensíveis</p>
        </div>
        <Link href="/configuracoes" className="cbtn ghost" style={{ height: 40 }}>
          <ChevronLeft size={16} /> Configurações
        </Link>
      </div>

      <AuditFiltersBar actors={actors} />

      <div className="glass rounded-3xl p-2 sm:p-4">
        <AuditTimeline entries={entries} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-3)]">
        <span>
          {total === 0 ? (
            "Nenhum evento encontrado"
          ) : (
            <>
              <History size={14} className="mr-1 inline" />
              {from}–{to} de {total}
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={`/configuracoes/auditoria${qs(page - 1)}`}
              className="cbtn ghost"
              style={{ height: 36 }}
            >
              <ChevronLeft size={15} /> Anterior
            </Link>
          ) : (
            <span className="cbtn ghost pointer-events-none opacity-40" style={{ height: 36 }}>
              <ChevronLeft size={15} /> Anterior
            </span>
          )}
          <span className="mono">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/configuracoes/auditoria${qs(page + 1)}`}
              className="cbtn ghost"
              style={{ height: 36 }}
            >
              Próxima <ChevronRight size={15} />
            </Link>
          ) : (
            <span className="cbtn ghost pointer-events-none opacity-40" style={{ height: 36 }}>
              Próxima <ChevronRight size={15} />
            </span>
          )}
        </div>
      </div>
    </>
  );
}
