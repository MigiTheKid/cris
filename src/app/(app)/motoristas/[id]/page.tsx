import { notFound } from "next/navigation";
import { getDriverDetail } from "@/lib/data/drivers";
import { getDocumentTypes } from "@/lib/data/document-types";
import { DriverDetailView } from "@/components/cris/DriverDetailView";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [driver, docTypes] = await Promise.all([
    getDriverDetail(id),
    getDocumentTypes("driver", true),
  ]);
  if (!driver) notFound();
  return (
    <DriverDetailView
      driver={driver}
      docTypes={docTypes.map((t) => ({ key: t.key, label: t.label }))}
    />
  );
}
