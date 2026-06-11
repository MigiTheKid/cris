"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck, Unlink, Container } from "lucide-react";
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
import { saveCoupling } from "@/lib/actions/couplings";

export type TrailerOption = {
  id: string;
  plate: string;
  model: string | null;
  tractorPlate: string | null;
};

const rowSel =
  "flex items-center gap-3 rounded-xl border border-[var(--brand-amber)] bg-[color-mix(in_oklab,var(--brand-amber)_10%,transparent)] px-3 py-2.5 text-left";
const rowIdle =
  "flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-left hover:bg-[var(--hover)]";

/** Dialog para engatar, trocar ou desengatar o reboque de um cavalo. */
export function CouplingDialog({
  tractorId,
  plate,
  currentTrailerId,
  trailers,
  trigger,
}: {
  tractorId: string;
  plate: string;
  currentTrailerId: string | null;
  trailers: TrailerOption[];
  trigger: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(currentTrailerId ?? "");
  const [state, formAction, pending] = useActionState(saveCoupling, {});

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(currentTrailerId ?? "");
    }
  }, [open, currentTrailerId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{currentTrailerId ? "Trocar reboque" : "Engatar reboque"}</DialogTitle>
          <DialogDescription>
            Cavalo <span className="mono font-semibold">{plate}</span>. O reboque escolhido sai
            automaticamente de qualquer outro cavalo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tractorId" value={tractorId} />
          <input type="hidden" name="trailerId" value={selected} />

          <div className="flex max-h-[46vh] flex-col gap-1.5 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setSelected("")}
              className={selected === "" ? rowSel : rowIdle}
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--panel-solid)] text-[var(--text-3)]">
                <Unlink size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[var(--text)]">Sem reboque</span>
                <span className="block text-xs text-[var(--text-3)]">Rodar só o cavalo</span>
              </span>
              {selected === "" && <Check size={18} className="text-[var(--brand-amber)]" />}
            </button>

            {trailers.map((t) => {
              const isSel = selected === t.id;
              const elsewhere = t.tractorPlate && t.tractorPlate !== plate;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={isSel ? rowSel : rowIdle}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-[var(--panel-solid)] text-[var(--text-2)]">
                    <Container size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="mono block text-sm font-semibold text-[var(--text)]">
                      {t.plate}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                      {elsewhere ? (
                        <>
                          <Truck size={12} /> em <span className="mono">{t.tractorPlate}</span> —
                          será movido
                        </>
                      ) : t.tractorPlate === plate ? (
                        "neste cavalo"
                      ) : (
                        (t.model ?? "livre")
                      )}
                    </span>
                  </span>
                  {isSel && <Check size={18} className="text-[var(--brand-amber)]" />}
                </button>
              );
            })}

            {trailers.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-3)]">
                Nenhum semirreboque cadastrado. Cadastre em Frota → Novo veículo.
              </div>
            )}
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
