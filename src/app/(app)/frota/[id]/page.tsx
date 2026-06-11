import { notFound } from "next/navigation";
import { getVehicleDetail } from "@/lib/data/vehicle-detail";
import { getDocumentTypes } from "@/lib/data/document-types";
import { getDriverList } from "@/lib/data/drivers";
import { VehicleDetailView } from "@/components/cris/VehicleDetailView";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, docTypes, drivers] = await Promise.all([
    getVehicleDetail(id),
    getDocumentTypes("vehicle", true),
    getDriverList(),
  ]);
  if (!detail) notFound();
  return (
    <VehicleDetailView
      detail={detail}
      docTypes={docTypes.map((t) => ({ key: t.key, label: t.label }))}
      drivers={drivers.map((d) => ({ id: d.id, name: d.name, vehiclePlate: d.vehiclePlate }))}
    />
  );
}
