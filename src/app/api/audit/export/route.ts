import { type NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAuditForExport, type AuditFilters } from "@/lib/data/audit";
import { ACTION_LABEL, ENTITY_LABEL } from "@/lib/audit-labels";

/** Exporta a auditoria (filtrada) em CSV. Admin-only. */
export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (profile.role !== "admin")
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const filters: AuditFilters = {
    entity: sp.get("entity") || undefined,
    action: sp.get("action") || undefined,
    actorId: sp.get("actor") || undefined,
  };

  const entries = await getAuditForExport(filters);

  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ["Data/hora", "Autor", "Ação", "Entidade", "Referência", "Detalhe"];
  const rows = entries.map((e) =>
    [
      new Date(e.createdAt).toLocaleString("pt-BR"),
      e.actorName ?? "Sistema",
      ACTION_LABEL[e.action] ?? e.action,
      ENTITY_LABEL[e.entity] ?? e.entity,
      e.entityId ?? "",
      e.detail ? JSON.stringify(e.detail) : "",
    ]
      .map(cell)
      .join(";"),
  );

  // BOM p/ o Excel pt-BR reconhecer UTF-8; separador ";".
  const csv = "﻿" + [header.map(cell).join(";"), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-cris-${stamp}.csv"`,
    },
  });
}
