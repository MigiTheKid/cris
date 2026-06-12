import { notFound } from "next/navigation";
import { getVehicleDetail } from "@/lib/data/vehicle-detail";
import { getDocumentTypes } from "@/lib/data/document-types";
import { getDriverList } from "@/lib/data/drivers";
import { getTrailerOptions } from "@/lib/data/vehicles";
import { getVehicleRodado, getStockTires, type VehicleRodado } from "@/lib/data/tires";
import { getVehicleOilChanges } from "@/lib/data/oil-changes";
import { getVehicleMaintenance, getMaintenanceCatalog } from "@/lib/data/maintenance";
import { getVendors } from "@/lib/data/vendors";
import { getTireThresholds } from "@/lib/data/settings";
import { getCurrentProfile } from "@/lib/auth";
import { VehicleDetailView } from "@/components/cris/VehicleDetailView";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const [
    detail,
    docTypes,
    drivers,
    trailers,
    rodado,
    stock,
    thresholds,
    oil,
    maint,
    catalog,
    vendors,
    profile,
  ] = await Promise.all([
    getVehicleDetail(id),
    getDocumentTypes("vehicle", true),
    getDriverList(),
    getTrailerOptions(),
    getVehicleRodado(id),
    getStockTires(),
    getTireThresholds(),
    getVehicleOilChanges(id),
    getVehicleMaintenance(id),
    getMaintenanceCatalog(),
    getVendors(),
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
      oil={oil}
      vendors={vendors}
      maint={maint}
      systems={catalog.systems}
      services={catalog.services}
      initialTab={tab}
      canDelete={profile?.role === "admin"}
    />
  );
}
