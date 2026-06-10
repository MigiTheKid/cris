import Link from "next/link";
import { FileText, Plus, ChevronRight, Truck } from "lucide-react";
import { getVehicleList } from "@/lib/data/vehicles";
import { vehicleTypeLabel, companyLabel } from "@/lib/labels";
import { statusTone } from "@/lib/status";
import { StatusBadge } from "@/components/cris/StatusBadge";
import { Avatar } from "@/components/cris/Avatar";
import { VehicleDialog } from "@/components/cris/VehicleDialog";

// Lê dados ao vivo do banco a cada request (não prerender estático).
export const dynamic = "force-dynamic";

export default async function FrotaPage() {
  const vehicles = await getVehicleList();

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">🚛 Frota</div>
          <h1 className="page-title">Veículos</h1>
          <p className="page-sub">{vehicles.length} veículos · TOP DIESEL + Posto Planeta</p>
        </div>
        <div className="page-actions">
          <button className="cbtn ghost">
            <FileText size={16} strokeWidth={1.9} />
            Documentos
          </button>
          <VehicleDialog
            trigger={
              <button className="cbtn primary">
                <Plus size={16} strokeWidth={2.2} />
                Novo veículo
              </button>
            }
          />
        </div>
      </div>

      <div className="glass overflow-hidden rounded-3xl">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="text-[var(--text-3)]">
              {["Placa", "Modelo", "Tipo", "Empresa", "Motorista", "Status documental", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className="border-b border-[var(--border)] px-5 py-3.5 text-[11px] font-bold tracking-[0.12em] uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const { tone, label } = statusTone(v.status);
              return (
                <tr
                  key={v.id}
                  className="group border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--hover)]"
                >
                  <td className="px-5 py-3.5">
                    <Link href={`/frota/${v.id}`} className="plate-chip">
                      {v.plate}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[var(--text)]">
                    <Link href={`/frota/${v.id}`} className="hover:text-[var(--brand-amber)]">
                      {v.model ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--text-2)]">
                    {vehicleTypeLabel(v.vehicleType)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-md border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--text-2)]">
                      {companyLabel(v.companyKind)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {v.driverName ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={v.driverName} size={28} />
                        <span className="text-[var(--text)]">{v.driverName}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--text-3)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge tone={tone} label={label} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/frota/${v.id}`}
                      className="inline-flex"
                      aria-label={`Abrir ${v.plate}`}
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
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-[var(--text-3)]">
                  <Truck size={32} className="mx-auto mb-3 opacity-50" />
                  Nenhum veículo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
