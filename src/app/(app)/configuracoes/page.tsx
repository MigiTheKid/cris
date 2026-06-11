import { Plus, Pencil, FileText, Users, Building2, History, ArrowRight, Disc } from "lucide-react";
import Link from "next/link";
import { getDocumentTypes } from "@/lib/data/document-types";
import { toggleDocumentType } from "@/lib/actions/document-types";
import { getUserList } from "@/lib/data/users";
import { getCompanies } from "@/lib/data/companies";
import { getAuditLog } from "@/lib/data/audit";
import { getTireThresholds } from "@/lib/data/settings";
import { getCurrentProfile } from "@/lib/auth";
import { DocTypeDialog } from "@/components/cris/DocTypeDialog";
import { UserDialog } from "@/components/cris/UserDialog";
import { CompanyDialog } from "@/components/cris/CompanyDialog";
import { ResetPasswordButton } from "@/components/cris/ResetPasswordButton";
import { AuditTimeline } from "@/components/cris/AuditTimeline";
import { TireThresholdsForm } from "@/components/cris/TireThresholdsForm";

export const dynamic = "force-dynamic";

const SCOPE_LABEL: Record<string, string> = {
  vehicle: "Veículo",
  driver: "Motorista",
  company: "Empresa",
};

const ROLE_DOT: Record<string, string> = {
  admin: "crit",
  manager: "warn",
  driver: "ok",
};

export default async function ConfiguracoesPage() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  const types = await getDocumentTypes();
  const thresholds = await getTireThresholds();
  const [users, companies, audit] = isAdmin
    ? await Promise.all([getUserList(), getCompanies(), getAuditLog(8)])
    : [[], [], []];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">⚙️ Configurações</div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">Catálogos e ajustes do sistema</p>
        </div>
      </div>

      {/* ---------- Usuários (admin) ---------- */}
      {isAdmin && (
        <section className="mb-10">
          <div className="cmd-section-head">
            <span className="cmd-section-ico">
              <Users size={20} />
            </span>
            <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
              Usuários
            </h2>
            <span className="cmd-section-count">{users.length}</span>
            <span className="cmd-section-rule" />
            <UserDialog
              trigger={
                <button className="cbtn primary" style={{ height: 40 }}>
                  <Plus size={16} /> Novo usuário
                </button>
              }
            />
          </div>

          <div className="glass overflow-hidden rounded-3xl">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[var(--text-3)]">
                  {["Nome", "CPF", "Cargo", "Telefone", "Situação", ""].map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-[var(--border)] px-5 py-3.5 text-[11px] font-bold tracking-[0.12em] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--border)] last:border-0"
                    style={{ opacity: u.isActive ? 1 : 0.5 }}
                  >
                    <td className="px-5 py-3 font-semibold text-[var(--text)]">
                      {u.name}
                      {u.id === profile?.id && (
                        <span className="ml-2 text-[11px] font-bold text-[var(--text-3)]">
                          você
                        </span>
                      )}
                    </td>
                    <td className="mono px-5 py-3 text-sm text-[var(--text-2)]">{u.cpf}</td>
                    <td className="px-5 py-3">
                      <span className="status-badge">
                        <span className={`dot ${ROLE_DOT[u.role]}`} />
                        {u.roleLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[var(--text-2)]">{u.phone ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="status-badge">
                        <span className={`dot ${u.isActive ? "ok" : "idle"}`} />
                        {u.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <ResetPasswordButton userId={u.id} userName={u.name} />
                        <UserDialog
                          initial={{
                            id: u.id,
                            cpf: u.cpf,
                            fullName: u.name,
                            role: u.role,
                            phone: u.phone,
                            isActive: u.isActive,
                          }}
                          trigger={
                            <button className="d-mini-btn" title="Editar">
                              <Pencil size={15} />
                            </button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[var(--text-3)]">
            Novos usuários acessam com a senha provisória{" "}
            <span className="mono font-bold">mudar123</span> e trocam no 1º acesso. A chave 🔑
            redefine a senha; desativar bloqueia o acesso sem apagar o histórico.
          </p>
        </section>
      )}

      {/* ---------- Tipos de documento ---------- */}
      <section className="mb-10">
        <div className="cmd-section-head">
          <span className="cmd-section-ico">
            <FileText size={20} />
          </span>
          <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
            Tipos de documento
          </h2>
          <span className="cmd-section-count">{types.length}</span>
          <span className="cmd-section-rule" />
          <DocTypeDialog
            trigger={
              <button className="cbtn primary" style={{ height: 40 }}>
                <Plus size={16} /> Novo tipo
              </button>
            }
          />
        </div>

        <div className="glass overflow-hidden rounded-3xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[var(--text-3)]">
                {["Nome", "Descrição", "Aplica-se a", "Ordem", "Situação", ""].map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-[var(--border)] px-5 py-3.5 text-[11px] font-bold tracking-[0.12em] uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr
                  key={t.key}
                  className="border-b border-[var(--border)] last:border-0"
                  style={{ opacity: t.isActive ? 1 : 0.5 }}
                >
                  <td className="px-5 py-3 font-semibold text-[var(--text)]">{t.label}</td>
                  <td className="px-5 py-3 text-sm text-[var(--text-2)]">{t.description ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-md border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-2)]">
                      {SCOPE_LABEL[t.scope]}
                    </span>
                  </td>
                  <td className="mono px-5 py-3 text-sm text-[var(--text-3)]">{t.sort}</td>
                  <td className="px-5 py-3">
                    <form
                      action={async () => {
                        "use server";
                        await toggleDocumentType(t.key, !t.isActive);
                      }}
                    >
                      <button
                        type="submit"
                        className="status-badge"
                        title={t.isActive ? "Clique para desativar" : "Clique para ativar"}
                      >
                        <span className={`dot ${t.isActive ? "ok" : "idle"}`} />
                        {t.isActive ? "Ativo" : "Inativo"}
                      </button>
                    </form>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DocTypeDialog
                      initial={{
                        key: t.key,
                        label: t.label,
                        description: t.description,
                        scope: t.scope,
                        sort: t.sort,
                      }}
                      trigger={
                        <button className="d-mini-btn" title="Editar">
                          <Pencil size={15} />
                        </button>
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--text-3)]">
          Desativar um tipo o remove dos formulários, mas preserva os documentos já lançados.
        </p>
      </section>

      {/* ---------- Pneus: limiares de sulco (admin) ---------- */}
      {isAdmin && (
        <section className="mb-10">
          <div className="cmd-section-head">
            <span className="cmd-section-ico">
              <Disc size={20} />
            </span>
            <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
              Pneus — limiares de sulco
            </h2>
            <span className="cmd-section-rule" />
          </div>
          <div className="glass max-w-xl rounded-2xl p-6">
            <TireThresholdsForm initial={thresholds} />
          </div>
          <p className="mt-3 text-xs text-[var(--text-3)]">
            Define quando o pneu acende verde, âmbar (janela de recapagem) e vermelho no desenho do
            rodado e na página Pneus. O mínimo legal (CONTRAN) é 1,6 mm.
          </p>
        </section>
      )}

      {/* ---------- Empresas (admin) ---------- */}
      {isAdmin && (
        <section className="mb-10">
          <div className="cmd-section-head">
            <span className="cmd-section-ico">
              <Building2 size={20} />
            </span>
            <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
              Empresas
            </h2>
            <span className="cmd-section-count">{companies.length}</span>
            <span className="cmd-section-rule" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {companies.map((c) => (
              <div key={c.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="eyebrow" style={{ color: "var(--brand-teal)" }}>
                      {c.kindLabel}
                    </div>
                    <div className="mt-1 font-bold text-[var(--text)]">{c.legalName}</div>
                  </div>
                  <CompanyDialog
                    initial={{
                      id: c.id,
                      kindLabel: c.kindLabel,
                      legalName: c.legalName,
                      cnpj: c.cnpj,
                      address: c.address,
                    }}
                    trigger={
                      <button className="d-mini-btn" title="Editar">
                        <Pencil size={15} />
                      </button>
                    }
                  />
                </div>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-3)]">CNPJ</dt>
                    <dd className="mono text-[var(--text-2)]">{c.cnpj ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-3)]">Endereço</dt>
                    <dd className="text-right text-[var(--text-2)]">{c.address ?? "—"}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Auditoria (admin) ---------- */}
      {isAdmin && (
        <section className="mb-10">
          <div className="cmd-section-head">
            <span className="cmd-section-ico">
              <History size={20} />
            </span>
            <h2 className="cmd-section-title" style={{ fontSize: 22 }}>
              Auditoria
            </h2>
            <span className="cmd-section-rule" />
            <Link href="/configuracoes/auditoria" className="cbtn primary" style={{ height: 40 }}>
              Ver tudo <ArrowRight size={15} />
            </Link>
          </div>
          <div className="glass rounded-3xl p-2 sm:p-4">
            <AuditTimeline entries={audit} />
          </div>
          <p className="mt-3 text-xs text-[var(--text-3)]">
            Registro das ações sensíveis (quem fez, o quê e quando). Mostrando os eventos mais
            recentes — abra <strong>Ver tudo</strong> para filtrar e exportar.
          </p>
        </section>
      )}

      {/* ---------- Planejado ---------- */}
      <section className="glass max-w-xl rounded-2xl p-6">
        <div className="eyebrow" style={{ color: "var(--brand-teal)" }}>
          Planejado
        </div>
        <ul className="mt-3 list-disc pl-5 leading-8 text-[var(--text-2)]">
          <li>Convite por link em vez de senha provisória</li>
          <li>Filtros e exportação da auditoria</li>
        </ul>
      </section>
    </>
  );
}
