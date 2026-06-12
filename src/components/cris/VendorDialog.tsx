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
import { saveVendor } from "@/lib/actions/vendors";

export type VendorInitial = {
  id: string;
  name: string;
  kind: string;
  phone: string | null;
  city: string | null;
  notes: string | null;
  isActive: boolean;
};

const KINDS = [
  { value: "troca_oleo", label: "Troca de óleo" },
  { value: "manutencao", label: "Manutenção" },
  { value: "ambos", label: "Ambos" },
];

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Cadastra ou edita uma oficina (fornecedor de troca de óleo / manutenção). */
export function VendorDialog({
  trigger,
  initial,
  defaultName,
}: {
  trigger: ReactElement;
  initial?: VendorInitial;
  /** Pré-preenche o nome ao criar (ex.: oficina lida pela IA na nota). */
  defaultName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveVendor, {});
  const isEdit = !!initial?.id;

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
          <DialogTitle>{isEdit ? "Editar oficina" : "Nova oficina"}</DialogTitle>
          <DialogDescription>
            Oficinas aparecem na seleção da troca de óleo e alimentam o custo por oficina.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className={field}>
            <label className={labelCls}>Nome</label>
            <input
              name="name"
              defaultValue={initial?.name ?? defaultName ?? ""}
              className={inputCls}
              placeholder="ex.: Concessionária Mercedes"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelCls}>Tipo</label>
              <select name="kind" defaultValue={initial?.kind ?? "ambos"} className={inputCls}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label className={labelCls}>Telefone</label>
              <input
                name="phone"
                defaultValue={initial?.phone ?? ""}
                className={inputCls}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className={field}>
            <label className={labelCls}>Cidade</label>
            <input
              name="city"
              defaultValue={initial?.city ?? ""}
              className={inputCls}
              placeholder="ex.: Chapecó"
            />
          </div>

          <div className={field}>
            <label className={labelCls}>Observações (opcional)</label>
            <input name="notes" defaultValue={initial?.notes ?? ""} className={inputCls} />
          </div>

          {isEdit && (
            <label className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2.5">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initial?.isActive ?? true}
                className="size-4 accent-[var(--brand-amber)]"
              />
              <span className="text-sm font-semibold text-[var(--text)]">Oficina ativa</span>
              <span className="text-xs text-[var(--text-3)]">
                desmarque para esconder das listas
              </span>
            </label>
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
