import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  UserX,
  KeyRound,
  Power,
  ShieldCheck,
  Activity,
  Link2,
  Unlink,
  Disc,
} from "lucide-react";
import type { AuditEntry } from "@/lib/data/audit";

type ActionMeta = { verb: string; icon: typeof Plus; dot: string };

const ACTION: Record<string, ActionMeta> = {
  create: { verb: "criou", icon: Plus, dot: "ok" },
  update: { verb: "editou", icon: Pencil, dot: "warn" },
  delete: { verb: "removeu", icon: Trash2, dot: "crit" },
  assign: { verb: "atribuiu", icon: UserCog, dot: "ok" },
  unassign: { verb: "liberou", icon: UserX, dot: "idle" },
  couple: { verb: "engatou", icon: Link2, dot: "ok" },
  uncouple: { verb: "desengatou", icon: Unlink, dot: "idle" },
  install: { verb: "instalou", icon: Disc, dot: "ok" },
  remove: { verb: "removeu", icon: Disc, dot: "idle" },
  reset_password: { verb: "redefiniu a senha de", icon: KeyRound, dot: "warn" },
  toggle: { verb: "alterou", icon: Power, dot: "warn" },
  password_change: { verb: "trocou a própria senha", icon: ShieldCheck, dot: "ok" },
};

const ENTITY: Record<string, string> = {
  vehicle: "veículo",
  vehicle_document: "documento de veículo",
  driver_document: "documento de motorista",
  assignment: "motorista do veículo",
  coupling: "reboque do cavalo",
  tire: "pneu",
  document_type: "tipo de documento",
  user: "usuário",
  company: "empresa",
  account: "",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "administrador",
  manager: "gerente",
  driver: "motorista",
};

/** Monta o complemento da frase a partir do `detail` gravado. */
function tail(entry: AuditEntry): string {
  const d = entry.detail ?? {};
  const parts: string[] = [];
  if (typeof d.plate === "string") parts.push(d.plate);
  if (typeof d.name === "string") parts.push(d.name);
  if (typeof d.role === "string" && ROLE_LABEL[d.role]) parts.push(`(${ROLE_LABEL[d.role]})`);
  if (typeof d.legalName === "string") parts.push(d.legalName);
  if (typeof d.label === "string") parts.push(d.label);
  if (typeof d.docType === "string") parts.push(d.docType);
  if (typeof d.fogo === "string") parts.push(`fogo ${d.fogo}`);
  if (typeof d.position === "string") parts.push(`(${d.position})`);
  if (typeof d.destination === "string") parts.push(`→ ${d.destination}`);
  if (entry.action === "toggle" && typeof d.isActive === "boolean")
    parts.push(d.isActive ? "(ativado)" : "(desativado)");
  if (entry.action === "update" && entry.entity === "user" && typeof d.isActive === "boolean")
    parts.push(d.isActive ? "(ativo)" : "(inativo)");
  return parts.join(" ");
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="vd-hist">
        <Activity size={16} /> Nenhuma ação registrada ainda.
      </div>
    );
  }

  return (
    <ol className="audit-list">
      {entries.map((e) => {
        const meta = ACTION[e.action] ?? { verb: e.action, icon: Activity, dot: "idle" };
        const Ico = meta.icon;
        const entityLabel = ENTITY[e.entity] ?? e.entity;
        const complement = tail(e);
        return (
          <li key={e.id} className="audit-row">
            <span className="audit-ico">
              <Ico size={15} />
              <span className={`dot ${meta.dot}`} />
            </span>
            <div className="audit-main">
              <div className="audit-text">
                <strong>{e.actorName ?? "Sistema"}</strong> {meta.verb}
                {entityLabel ? ` ${entityLabel}` : ""}
                {complement ? <span className="audit-obj"> · {complement}</span> : ""}
              </div>
              <time className="audit-time mono">{when(e.createdAt)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
