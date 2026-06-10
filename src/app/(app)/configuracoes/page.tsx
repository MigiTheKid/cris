import { Plus, Pencil, FileText } from "lucide-react";
import { getDocumentTypes } from "@/lib/data/document-types";
import { toggleDocumentType } from "@/lib/actions/document-types";
import { DocTypeDialog } from "@/components/cris/DocTypeDialog";

export const dynamic = "force-dynamic";

const SCOPE_LABEL: Record<string, string> = {
  vehicle: "Veículo",
  driver: "Motorista",
  company: "Empresa",
};

export default async function ConfiguracoesPage() {
  const types = await getDocumentTypes();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">⚙️ Configurações</div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">Catálogos e ajustes do sistema</p>
        </div>
      </div>

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

      {/* ---------- Demais seções (planejadas) ---------- */}
      <section className="glass max-w-xl rounded-2xl p-6">
        <div className="eyebrow" style={{ color: "var(--brand-teal)" }}>
          Planejado · M1
        </div>
        <ul className="mt-3 list-disc pl-5 leading-8 text-[var(--text-2)]">
          <li>Usuários e permissões (admin / gerente / motorista)</li>
          <li>Empresas (TOP DIESEL e Posto Planeta)</li>
          <li>Auditoria de ações sensíveis</li>
        </ul>
      </section>
    </>
  );
}
