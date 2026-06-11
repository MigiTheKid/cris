"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download, X } from "lucide-react";
import { ACTION_OPTIONS, ENTITY_OPTIONS } from "@/lib/audit-labels";

const selectCls =
  "h-10 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)]";

export function AuditFilters({ actors }: { actors: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const entity = params.get("entity") ?? "";
  const action = params.get("action") ?? "";
  const actor = params.get("actor") ?? "";
  const hasFilter = !!(entity || action || actor);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // volta pra primeira página ao filtrar
    router.push(`/configuracoes/auditoria?${next.toString()}`);
  }

  // Mantém os filtros (sem `page`) no link de exportação.
  const exportParams = new URLSearchParams();
  if (entity) exportParams.set("entity", entity);
  if (action) exportParams.set("action", action);
  if (actor) exportParams.set("actor", actor);
  const exportHref = `/api/audit/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <select
        value={entity}
        onChange={(e) => setParam("entity", e.target.value)}
        className={selectCls}
        aria-label="Filtrar por entidade"
      >
        <option value="">Todas as entidades</option>
        {ENTITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={action}
        onChange={(e) => setParam("action", e.target.value)}
        className={selectCls}
        aria-label="Filtrar por ação"
      >
        <option value="">Todas as ações</option>
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={actor}
        onChange={(e) => setParam("actor", e.target.value)}
        className={selectCls}
        aria-label="Filtrar por autor"
      >
        <option value="">Todos os autores</option>
        {actors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {hasFilter && (
        <button
          type="button"
          onClick={() => router.push("/configuracoes/auditoria")}
          className="cbtn ghost"
          style={{ height: 40 }}
        >
          <X size={15} /> Limpar
        </button>
      )}

      <a href={exportHref} className="cbtn ghost ml-auto" style={{ height: 40 }}>
        <Download size={15} /> Exportar CSV
      </a>
    </div>
  );
}
