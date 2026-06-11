"use client";

import { Trash2 } from "lucide-react";
import { DangerDeleteDialog } from "./DangerDeleteDialog";
import { deleteTire } from "@/lib/actions/tires";

/** Apagar permanentemente um pneu do cadastro (Pneus). Dupla verificação. */
export function DeleteTireButton({ tireId, fireNumber }: { tireId: string; fireNumber: string }) {
  return (
    <DangerDeleteDialog
      trigger={
        <button className="d-mini-btn danger" title="Apagar pneu">
          <Trash2 size={15} />
        </button>
      }
      title="Apagar pneu"
      description={`Apagar PERMANENTEMENTE o pneu de fogo ${fireNumber}? Isto não pode ser desfeito.`}
      confirmWord={fireNumber}
      consequences={[
        "Remove o pneu do cadastro de forma permanente (irreversível)",
        "Só conclui se o pneu não tiver histórico (instalação, aferição, eventos)",
        "Use para apagar pneus cadastrados por engano",
      ]}
      action={() => deleteTire(tireId)}
    />
  );
}
