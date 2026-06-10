"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
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
import Link from "next/link";
import { saveVehicleDocument } from "@/lib/actions/documents";

export type DocTypeOption = { key: string; label: string };

export type DocInitial = {
  id?: string;
  docType?: string;
  docNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Dialog para cadastrar ou renovar um documento de veículo. */
export function DocumentDialog({
  vehicleId,
  trigger,
  initial,
  docTypes,
}: {
  vehicleId: string;
  trigger: ReactElement;
  initial?: DocInitial;
  docTypes: DocTypeOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveVehicleDocument, {});
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (state.ok) {
      // Fecha o dialog e revalida quando a action grava com sucesso.
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
          <DialogTitle>{isEdit ? "Renovar documento" : "Adicionar documento"}</DialogTitle>
          <DialogDescription>
            Informe os dados. A validade acende o status (verde / amarelo / vermelho).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className={field}>
            <div className="flex items-center justify-between">
              <label htmlFor="docType" className={labelCls}>
                Tipo
              </label>
              <Link
                href="/configuracoes"
                className="text-[11px] font-semibold text-[var(--teal-bright)] hover:text-[var(--brand-amber)]"
              >
                Gerenciar tipos
              </Link>
            </div>
            <select
              id="docType"
              name="docType"
              defaultValue={initial?.docType ?? ""}
              className={inputCls}
              disabled={isEdit}
              required
            >
              <option value="" disabled>
                Selecione…
              </option>
              {docTypes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className={field}>
            <label htmlFor="docNumber" className={labelCls}>
              Número (opcional)
            </label>
            <input
              id="docNumber"
              name="docNumber"
              defaultValue={initial?.docNumber ?? ""}
              className={inputCls}
              placeholder="ex.: 2216.2025"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="issuedAt" className={labelCls}>
                Emissão
              </label>
              <input
                id="issuedAt"
                name="issuedAt"
                type="date"
                defaultValue={initial?.issuedAt ?? ""}
                className={inputCls}
              />
            </div>
            <div className={field}>
              <label htmlFor="expiresAt" className={labelCls}>
                Validade
              </label>
              <input
                id="expiresAt"
                name="expiresAt"
                type="date"
                defaultValue={initial?.expiresAt ?? ""}
                className={inputCls}
              />
            </div>
          </div>

          <div className={field}>
            <label htmlFor="file" className={labelCls}>
              PDF do documento {isEdit ? "(opcional — substitui o atual)" : "(opcional)"}
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf"
              className="text-sm text-[var(--text-2)] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--text)]"
            />
            <span className="text-[11px] text-[var(--text-3)]">Somente PDF, até 10 MB.</span>
          </div>

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
