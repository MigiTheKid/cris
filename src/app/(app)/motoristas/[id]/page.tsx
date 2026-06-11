import { notFound } from "next/navigation";
import { getDriverDetail } from "@/lib/data/drivers";
import { getDocumentTypes } from "@/lib/data/document-types";
import { getCurrentProfile } from "@/lib/auth";
import { DriverDetailView } from "@/components/cris/DriverDetailView";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [driver, docTypes, profile] = await Promise.all([
    getDriverDetail(id),
    getDocumentTypes("driver", true),
    getCurrentProfile(),
  ]);
  if (!driver) notFound();
  return (
    <DriverDetailView
      driver={driver}
      docTypes={docTypes.map((t) => ({ key: t.key, label: t.label }))}
      canDelete={profile?.role === "admin"}
    />
  );
}
