import { notFound } from "next/navigation";
import { getVehicleDetail } from "@/lib/data/vehicle-detail";
import { getDocumentTypes } from "@/lib/data/document-types";
import { getDriverList } from "@/lib/data/drivers";
import { getTrailerOptions } from "@/lib/data/vehicles";
import { getVehicleRodado, getStockTires, type VehicleRodado } from "@/lib/data/tires";
import { getTireThresholds } from "@/lib/data/settings";
import { getCurrentProfile } from "@/lib/auth";
import { VehicleDetailView } from "@/components/cris/VehicleDetailView";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, docTypes, drivers, trailers, rodado, stock, thresholds, profile] =
    await Promise.all([
      getVehicleDetail(id),
      getDocumentTypes("vehicle", true),
      getDriverList(),
      getTrailerOptions(),
      getVehicleRodado(id),
      getStockTires(),
      getTireThresholds(),
      getCurrentProfile(),
    ]);
  if (!detail) notFound();

  // Conjunto: cavalo mostra o rodado do reboque engatado junto (e vice-versa não — reboque mostra só o seu).
  const rodados: VehicleRodado[] = rodado ? [rodado] : [];
  if (detail.vehicleType === "cavalo" && detail.coupledTo) {
    const trailerRodado = await getVehicleRodado(detail.coupledTo.id);
    if (trailerRodado) rodados.push(trailerRodado);
  }

  return (
    <VehicleDetailView
      detail={detail}
      docTypes={docTypes.map((t) => ({ key: t.key, label: t.label }))}
      drivers={drivers.map((d) => ({ id: d.id, name: d.name, vehiclePlate: d.vehiclePlate }))}
      trailers={trailers}
      rodados={rodados}
      stock={stock}
      thresholds={thresholds}
      canDelete={profile?.role === "admin"}
    />
  );
}
