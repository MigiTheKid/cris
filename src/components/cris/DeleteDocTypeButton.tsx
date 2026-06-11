"use client";

import { Trash2 } from "lucide-react";
import { DangerDeleteDialog } from "./DangerDeleteDialog";
import { deleteDocumentType } from "@/lib/actions/document-types";

/** Apagar permanentemente um tipo de documento (Configurações). Dupla verificação. */
export function DeleteDocTypeButton({ docKey, label }: { docKey: string; label: string }) {
  return (
    <DangerDeleteDialog
      trigger={
        <button className="d-mini-btn danger" title="Apagar permanentemente">
          <Trash2 size={15} />
        </button>
      }
      title="Apagar tipo de documento"
      description={`Apagar PERMANENTEMENTE o tipo "${label}"? Isto não pode ser desfeito.`}
      confirmWord={label}
      consequences={[
        "Remove o tipo do catálogo de forma permanente (irreversível)",
        "Só conclui se nenhum documento estiver usando este tipo",
        "Para apenas escondê-lo dos formulários, use Desativar (preserva o histórico)",
      ]}
      action={() => deleteDocumentType(docKey)}
    />
  );
}
