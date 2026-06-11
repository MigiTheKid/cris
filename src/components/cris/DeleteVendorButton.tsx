"use client";

import { Trash2 } from "lucide-react";
import { DangerDeleteDialog } from "./DangerDeleteDialog";
import { deleteVendor } from "@/lib/actions/vendors";

/** Apagar permanentemente uma oficina (Configurações / T.M.A.). Dupla verificação. */
export function DeleteVendorButton({ vendorId, name }: { vendorId: string; name: string }) {
  return (
    <DangerDeleteDialog
      trigger={
        <button className="d-mini-btn danger" title="Apagar oficina">
          <Trash2 size={15} />
        </button>
      }
      title="Apagar oficina"
      description={`Apagar a oficina "${name}"? Isto não pode ser desfeito.`}
      confirmWord={name}
      consequences={[
        "Remove a oficina do cadastro de forma permanente",
        "Só conclui se ela não estiver em nenhum registro de troca",
        "Para apenas escondê-la das listas, desative na edição",
      ]}
      action={() => deleteVendor(vendorId)}
    />
  );
}
