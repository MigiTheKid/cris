"use client";

import { Trash2 } from "lucide-react";
import { DangerDeleteDialog } from "./DangerDeleteDialog";
import { deleteUserAccount } from "@/lib/actions/users";

/** Apagar permanentemente um usuário (Configurações → Usuários). Dupla verificação. */
export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  return (
    <DangerDeleteDialog
      trigger={
        <button className="d-mini-btn danger" title="Apagar permanentemente">
          <Trash2 size={15} />
        </button>
      }
      title="Apagar usuário"
      description={`Apagar PERMANENTEMENTE ${userName}? A conta e o login somem de vez — isto não pode ser desfeito.`}
      confirmWord={userName}
      consequences={[
        "Remove a conta e o acesso de forma permanente (irreversível)",
        "Só conclui se a pessoa não tiver histórico (atribuições, documentos, ações)",
        "Para apenas bloquear o acesso sem perder nada, use Desativar (na edição)",
      ]}
      action={() => deleteUserAccount(userId)}
    />
  );
}
