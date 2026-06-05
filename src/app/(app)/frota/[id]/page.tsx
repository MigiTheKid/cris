import { notFound } from "next/navigation";
import { getVehicleDetail } from "@/lib/data/vehicle-detail";
import { VehicleDetailView } from "@/components/cris/VehicleDetailView";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getVehicleDetail(id);
  if (!detail) notFound();
  return <VehicleDetailView detail={detail} />;
}
