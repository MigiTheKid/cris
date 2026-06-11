import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { getDriverList } from "@/lib/data/drivers";
import { StatusBadge } from "@/components/cris/StatusBadge";
import { Avatar } from "@/components/cris/Avatar";

export const dynamic = "force-dynamic";

export default async function MotoristasPage() {
  const drivers = await getDriverList();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">👤 Motoristas</div>
          <h1 className="page-title">Condutores</h1>
          <p className="page-sub">{drivers.length} motoristas ativos</p>
        </div>
      </div>

      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[var(--text-3)]">
              {["Motorista", "CPF", "CNH", "Veículo atual", "Status documental", ""].map((h, i) => (
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
            {drivers.map((d) => {
              return (
                <tr
                  key={d.id}
                  className="group border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--hover)]"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/motoristas/${d.id}`}
                      className="inline-flex items-center gap-3 font-semibold text-[var(--text)] hover:text-[var(--brand-amber)]"
                    >
                      <Avatar name={d.name} size={30} hue={206} />
                      {d.name}
                    </Link>
                  </td>
                  <td className="mono px-5 py-3.5 text-sm text-[var(--text-2)]">{d.cpf}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-md border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-2)]">
                      {d.cnhCategory ?? "—"}
                    </span>
                  </td>
                  <td className="mono px-5 py-3.5 text-sm text-[var(--text-2)]">
                    {d.vehiclePlate ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge tone={d.tone} label={d.statusLabel} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/motoristas/${d.id}`}
                      className="inline-flex"
                      aria-label={`Abrir ${d.name}`}
                    >
                      <ChevronRight
                        size={18}
                        className="text-[var(--text-3)] transition-colors hover:text-[var(--brand-amber)]"
                      />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-[var(--text-3)]">
                  <Users size={32} className="mx-auto mb-3 opacity-50" />
                  Nenhum motorista cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
