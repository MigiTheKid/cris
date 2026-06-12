"use client";

import { Trash2 } from "lucide-react";
import { DangerDeleteDialog } from "./DangerDeleteDialog";
import { deleteService } from "@/lib/actions/service-catalog";

/** Apagar um serviço do catálogo de manutenção. Dupla verificação. */
export function DeleteServiceButton({ serviceId, name }: { serviceId: string; name: string }) {
  return (
    <DangerDeleteDialog
      trigger={
        <button className="d-mini-btn danger" title="Apagar serviço">
          <Trash2 size={15} />
        </button>
      }
      title="Apagar serviço"
      description={`Apagar o serviço "${name}" do catálogo? Isto não pode ser desfeito.`}
      confirmWord={name}
      consequences={[
        "Remove o serviço da seleção de novas OSs",
        "OSs antigas continuam intactas (guardam o nome e o sistema)",
        "Para apenas escondê-lo das listas, desative na edição",
      ]}
      action={() => deleteService(serviceId)}
    />
  );
}
