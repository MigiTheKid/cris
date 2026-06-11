import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

export type AuditInput = {
  action: string; // create | update | delete | assign | unassign | reset_password | toggle | password_change
  entity: string; // vehicle | vehicle_document | driver_document | assignment | document_type | user | company | account
  entityId?: string | null;
  detail?: Record<string, unknown> | null;
};

/**
 * Registra uma ação sensível em `audit_logs`. **Best-effort**: nunca lança —
 * uma falha de log não pode derrubar a operação principal. O ator é o usuário
 * autenticado (auth.uid()); o insert usa o service role porque a tabela não tem
 * policy de INSERT (só leitura para staff).
 */
export async function logAudit({ action, entity, entityId, detail }: AuditInput): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: user?.id ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      detail: (detail ?? null) as Json,
    });
  } catch {
    /* logging é best-effort — silencia */
  }
}
