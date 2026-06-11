import { createClient } from "@/lib/supabase/server";

export type AuditEntry = {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
  actorName: string | null;
};

export type AuditFilters = {
  entity?: string;
  action?: string;
  actorId?: string;
};

type AuditRow = {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: unknown;
  created_at: string;
  actor: { full_name: string } | null;
};

function toEntry(r: AuditRow): AuditEntry {
  return {
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    detail: (r.detail as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at,
    actorName: r.actor?.full_name ?? null,
  };
}

const SELECT = "id, action, entity, entity_id, detail, created_at, actor:profiles(full_name)";

/** Eventos de auditoria mais recentes (staff lê via RLS). */
export async function getAuditLog(limit = 50): Promise<AuditEntry[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("audit_logs")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`getAuditLog: ${error.message}`);
  return (data ?? []).map((r) => toEntry(r as AuditRow));
}

/** Página de auditoria com filtros + total (para paginação). */
export async function getAuditPage(
  filters: AuditFilters,
  limit: number,
  offset: number,
): Promise<{ entries: AuditEntry[]; total: number }> {
  const db = await createClient();
  let q = db.from("audit_logs").select(SELECT, { count: "exact" });
  if (filters.entity) q = q.eq("entity", filters.entity);
  if (filters.action) q = q.eq("action", filters.action);
  if (filters.actorId) q = q.eq("actor_id", filters.actorId);
  const { data, count, error } = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`getAuditPage: ${error.message}`);
  return { entries: (data ?? []).map((r) => toEntry(r as AuditRow)), total: count ?? 0 };
}

/** Todos os eventos que casam o filtro (para exportação CSV). Teto de segurança. */
export async function getAuditForExport(filters: AuditFilters, cap = 5000): Promise<AuditEntry[]> {
  const db = await createClient();
  let q = db.from("audit_logs").select(SELECT);
  if (filters.entity) q = q.eq("entity", filters.entity);
  if (filters.action) q = q.eq("action", filters.action);
  if (filters.actorId) q = q.eq("actor_id", filters.actorId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(cap);
  if (error) throw new Error(`getAuditForExport: ${error.message}`);
  return (data ?? []).map((r) => toEntry(r as AuditRow));
}

/** Atores que aparecem na auditoria (para o filtro). Lista os perfis existentes. */
export async function getAuditActors(): Promise<{ id: string; name: string }[]> {
  const db = await createClient();
  const { data, error } = await db.from("profiles").select("id, full_name").order("full_name");
  if (error) throw new Error(`getAuditActors: ${error.message}`);
  return (data ?? []).map((p) => ({ id: p.id, name: p.full_name }));
}
