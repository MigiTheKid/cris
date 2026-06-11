"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createUser, updateUser } from "@/lib/actions/users";

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "manager", label: "Gerente" },
  { value: "driver", label: "Motorista" },
];

export type UserInitial = {
  id: string;
  cpf: string;
  fullName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Dialog para criar ou editar um usuário (admin-only — a action revalida o cargo). */
export function UserDialog({ trigger, initial }: { trigger: ReactElement; initial?: UserInitial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!initial?.id;
  const action = isEdit ? updateUser : createUser;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados ou o cargo. O CPF (login) não muda."
              : "A conta nasce com a senha provisória e troca obrigatória no 1º acesso."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className={field}>
            <label htmlFor="u-name" className={labelCls}>
              Nome completo
            </label>
            <input
              id="u-name"
              name="fullName"
              defaultValue={initial?.fullName ?? ""}
              className={inputCls}
              placeholder="ex.: João da Silva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="u-cpf" className={labelCls}>
                CPF {isEdit ? "(login)" : ""}
              </label>
              <input
                id="u-cpf"
                name="cpf"
                defaultValue={initial?.cpf ?? ""}
                className={inputCls + (isEdit ? " opacity-60" : "")}
                placeholder="000.000.000-00"
                disabled={isEdit}
                required={!isEdit}
              />
            </div>
            <div className={field}>
              <label htmlFor="u-phone" className={labelCls}>
                Telefone (opcional)
              </label>
              <input
                id="u-phone"
                name="phone"
                defaultValue={initial?.phone ?? ""}
                className={inputCls}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className={field}>
            <label htmlFor="u-role" className={labelCls}>
              Cargo
            </label>
            <select
              id="u-role"
              name="role"
              defaultValue={initial?.role ?? "driver"}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2.5">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initial?.isActive ?? true}
                className="size-4 accent-[var(--brand-amber)]"
              />
              <span className="text-sm font-semibold text-[var(--text)]">Usuário ativo</span>
              <span className="text-xs text-[var(--text-3)]">desmarque para bloquear o acesso</span>
            </label>
          )}

          {!isEdit && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 py-2.5 text-xs text-[var(--text-2)]">
              <KeyRound size={15} className="text-[var(--brand-amber)]" />
              Senha provisória: <span className="mono font-bold">mudar123</span>
            </div>
          )}

          {state.error && (
            <div className="rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--crit)]">
              {state.error}
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            <button type="submit" className="cbtn primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
