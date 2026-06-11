"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
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
import { recapReturn, repairReturn } from "@/lib/actions/tires";

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/**
 * Recebe um pneu de volta da recapadora (nova vida + sulco + custo) ou do
 * conserto (custo/oficina). Botão de linha na página Pneus.
 */
export function TireReturnDialog({
  tireId,
  fireNumber,
  kind,
  currentLife,
}: {
  tireId: string;
  fireNumber: string;
  kind: "recapagem" | "conserto";
  currentLife: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = kind === "recapagem" ? recapReturn : repairReturn;
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
      <DialogTrigger
        render={
          <button className="cbtn primary" style={{ height: 34, padding: "0 12px", fontSize: 13 }}>
            <PackageCheck size={14} /> Receber
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {kind === "recapagem"
              ? `Pneu ${fireNumber} voltou da recapadora`
              : `Pneu ${fireNumber} voltou do conserto`}
          </DialogTitle>
          <DialogDescription>
            {kind === "recapagem"
              ? `Inicia a ${currentLife + 1}ª vida e volta ao estoque.`
              : "Registra o custo e devolve ao estoque."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tireId" value={tireId} />

          {kind === "recapagem" && (
            <div className={field}>
              <label htmlFor="tr-tread" className={labelCls}>
                Sulco da recapagem (mm)
              </label>
              <input
                id="tr-tread"
                name="newTreadMm"
                inputMode="decimal"
                className={inputCls}
                placeholder="ex.: 18"
                autoFocus
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="tr-cost" className={labelCls}>
                Custo (R$)
              </label>
              <input
                id="tr-cost"
                name="cost"
                inputMode="decimal"
                className={inputCls}
                placeholder="ex.: 650"
              />
            </div>
            <div className={field}>
              <label htmlFor="tr-vendor" className={labelCls}>
                {kind === "recapagem" ? "Recapadora" : "Oficina"}
              </label>
              <input id="tr-vendor" name="vendor" className={inputCls} placeholder="opcional" />
            </div>
          </div>

          {kind === "conserto" && (
            <div className={field}>
              <label htmlFor="tr-notes" className={labelCls}>
                O que foi feito (opcional)
              </label>
              <input id="tr-notes" name="notes" className={inputCls} />
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
              {pending ? "Recebendo…" : "Receber no estoque"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
