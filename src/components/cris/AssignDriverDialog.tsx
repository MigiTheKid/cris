"use client";

import { useActionState, useEffect, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck, UserX } from "lucide-react";
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
import { Avatar } from "./Avatar";
import { saveAssignment } from "@/lib/actions/assignments";

export type DriverOption = {
  id: string;
  name: string;
  vehiclePlate: string | null;
};

/** Dialog para atribuir, trocar ou remover o motorista de um veículo. */
export function AssignDriverDialog({
  vehicleId,
  plate,
  currentDriverId,
  drivers,
  trigger,
}: {
  vehicleId: string;
  plate: string;
  currentDriverId: string | null;
  drivers: DriverOption[];
  trigger: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(currentDriverId ?? "");
  const [state, formAction, pending] = useActionState(saveAssignment, {});

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  // Reabre com a seleção atual sempre que o dialog volta a abrir.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(currentDriverId ?? "");
    }
  }, [open, currentDriverId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{currentDriverId ? "Trocar motorista" : "Atribuir motorista"}</DialogTitle>
          <DialogDescription>
            Veículo <span className="mono font-semibold">{plate}</span>. O motorista escolhido sai
            automaticamente de qualquer outro veículo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <input type="hidden" name="driverId" value={selected} />

          <div className="flex max-h-[46vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {/* Opção: sem motorista */}
            <button
              type="button"
              onClick={() => setSelected("")}
              className={
                selected === ""
                  ? "flex items-center gap-3 rounded-xl border border-[var(--brand-amber)] bg-[color-mix(in_oklab,var(--brand-amber)_10%,transparent)] px-3 py-2.5 text-left"
                  : "flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-left hover:bg-[var(--hover)]"
              }
            >
              <span className="grid size-9 place-items-center rounded-full bg-[var(--panel-solid)] text-[var(--text-3)]">
                <UserX size={18} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-[var(--text)]">
                  Sem motorista
                </span>
                <span className="block text-xs text-[var(--text-3)]">Deixar o veículo livre</span>
              </span>
              {selected === "" && <Check size={18} className="text-[var(--brand-amber)]" />}
            </button>

            {drivers.map((d) => {
              const isSel = selected === d.id;
              const elsewhere = d.vehiclePlate && d.vehiclePlate !== plate;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelected(d.id)}
                  className={
                    isSel
                      ? "flex items-center gap-3 rounded-xl border border-[var(--brand-amber)] bg-[color-mix(in_oklab,var(--brand-amber)_10%,transparent)] px-3 py-2.5 text-left"
                      : "flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-left hover:bg-[var(--hover)]"
                  }
                >
                  <Avatar name={d.name} size={36} hue={206} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-[var(--text)]">{d.name}</span>
                    <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                      {elsewhere ? (
                        <>
                          <Truck size={12} /> em <span className="mono">{d.vehiclePlate}</span> —
                          será movido
                        </>
                      ) : d.vehiclePlate === plate ? (
                        "neste veículo"
                      ) : (
                        "livre"
                      )}
                    </span>
                  </span>
                  {isSel && <Check size={18} className="text-[var(--brand-amber)]" />}
                </button>
              );
            })}
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
