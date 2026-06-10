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
import { saveDocumentType } from "@/lib/actions/document-types";

const SCOPES = [
  { value: "vehicle", label: "Veículo" },
  { value: "driver", label: "Motorista" },
  { value: "company", label: "Empresa" },
];

export type DocTypeInitial = {
  key?: string;
  label?: string;
  description?: string | null;
  scope?: string;
  sort?: number;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Dialog para criar ou editar um tipo de documento do catálogo. */
export function DocTypeDialog({
  trigger,
  initial,
}: {
  trigger: ReactElement;
  initial?: DocTypeInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveDocumentType, {});
  const isEdit = !!initial?.key;

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
          <DialogTitle>
            {isEdit ? "Editar tipo de documento" : "Novo tipo de documento"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere o nome ou a descrição. Documentos já lançados acompanham a mudança."
              : "O novo tipo aparece na hora no formulário de documentos."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {initial?.key && <input type="hidden" name="key" value={initial.key} />}

          <div className={field}>
            <label htmlFor="dt-label" className={labelCls}>
              Nome
            </label>
            <input
              id="dt-label"
              name="label"
              defaultValue={initial?.label ?? ""}
              className={inputCls}
              placeholder="ex.: Laudo de Fumaça"
              required
            />
          </div>

          <div className={field}>
            <label htmlFor="dt-desc" className={labelCls}>
              Descrição (opcional)
            </label>
            <input
              id="dt-desc"
              name="description"
              defaultValue={initial?.description ?? ""}
              className={inputCls}
              placeholder="aparece no card do documento"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="dt-scope" className={labelCls}>
                Aplica-se a
              </label>
              <select
                id="dt-scope"
                name="scope"
                defaultValue={initial?.scope ?? "vehicle"}
                className={inputCls}
                disabled={isEdit}
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="dt-sort" className={labelCls}>
                Ordem
              </label>
              <input
                id="dt-sort"
                name="sort"
                type="number"
                min={0}
                defaultValue={initial?.sort ?? 100}
                className={inputCls}
              />
            </div>
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
