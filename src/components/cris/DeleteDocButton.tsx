"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteVehicleDocument } from "@/lib/actions/documents";
import { deleteDriverDocument } from "@/lib/actions/driver-documents";

/** Botão de exclusão (soft delete) de um documento, com confirmação. */
export function DeleteDocButton({
  docId,
  ownerId,
  kind,
  label,
}: {
  docId: string;
  ownerId: string;
  kind: "vehicle" | "driver";
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (pending) return;
    const ok = window.confirm(
      `Excluir o documento "${label}"? Ele sai da lista e dos alertas (o histórico de auditoria é preservado).`,
    );
    if (!ok) return;
    startTransition(async () => {
      const res =
        kind === "vehicle"
          ? await deleteVehicleDocument(docId, ownerId)
          : await deleteDriverDocument(docId, ownerId);
      if (res.error) {
        window.alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="d-mini-btn danger"
      title="Excluir documento"
    >
      <Trash2 size={15} />
    </button>
  );
}
