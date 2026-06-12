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
import { saveService } from "@/lib/actions/service-catalog";
import type { MaintSystem } from "@/lib/data/maintenance";

export type ServiceInitial = {
  id: string;
  name: string;
  systemId: number;
  defaultIntervalKm: number | null;
  isActive: boolean;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Cadastra ou edita um serviço do catálogo de manutenção (herda o sistema). */
export function ServiceCatalogDialog({
  systems,
  trigger,
  initial,
}: {
  systems: MaintSystem[];
  trigger: ReactElement;
  initial?: ServiceInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveService, {});
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
          <DialogTitle>{isEdit ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>
            Serviços aparecem na seleção da OS e já carregam o sistema do veículo — é assim que o
            custo por sistema se monta sozinho.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className={field}>
            <label className={labelCls}>Nome do serviço</label>
            <input
              name="name"
              defaultValue={initial?.name ?? ""}
              className={inputCls}
              placeholder="ex.: Troca de cuíca traseira"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label className={labelCls}>Sistema</label>
              <select
                name="systemId"
                defaultValue={initial ? String(initial.systemId) : ""}
                className={inputCls}
                required
              >
                <option value="">— escolha —</option>
                {systems.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label className={labelCls}>Intervalo padrão (km)</label>
              <input
                name="defaultIntervalKm"
                inputMode="numeric"
                defaultValue={
                  initial?.defaultIntervalKm != null ? String(initial.defaultIntervalKm) : ""
                }
                className={inputCls + " mono"}
                placeholder="opcional — ex.: 100000"
              />
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2.5">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initial?.isActive ?? true}
                className="size-4 accent-[var(--brand-amber)]"
              />
              <span className="text-sm font-semibold text-[var(--text)]">Serviço ativo</span>
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
