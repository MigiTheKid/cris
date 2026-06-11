"use client";

import { useActionState, useEffect, type ReactElement, useState } from "react";
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
import { saveVehicle } from "@/lib/actions/vehicles";
import { vehicleTypeLabel } from "@/lib/labels";
import type { Database } from "@/lib/database.types";

type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type CompanyKind = Database["public"]["Enums"]["company_kind"];

const VEHICLE_TYPES: VehicleType[] = [
  "cavalo",
  "truck",
  "toco",
  "bitruck",
  "leve",
  "semi_reboque",
  "reboque",
];

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "em_manutencao", label: "Em manutenção" },
  { value: "inativo", label: "Inativo" },
];

const COMPANY_OPTIONS: { value: CompanyKind; label: string }[] = [
  { value: "top_diesel", label: "TOP DIESEL" },
  { value: "posto_planeta", label: "Posto Planeta" },
];

export type VehicleInitial = {
  id?: string;
  plate?: string;
  model?: string | null;
  year?: number | null;
  vehicleType?: VehicleType;
  capacity?: string | null;
  companyKind?: CompanyKind;
  status?: VehicleStatus;
  maintenancePlan?: string | null;
};

const field = "flex flex-col gap-1.5";
const labelCls = "text-xs font-bold text-[var(--text-2)]";
const inputCls =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--brand-amber)_18%,transparent)]";

/** Dialog para cadastrar ou editar um veículo da frota. */
export function VehicleDialog({
  trigger,
  initial,
}: {
  trigger: ReactElement;
  initial?: VehicleInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveVehicle, {});
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (state.ok) {
      // Fecha e revalida; em criação, navega pro detalhe novo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      if (!isEdit && state.id) router.push(`/frota/${state.id}`);
      else router.refresh();
    }
  }, [state.ok, state.id, isEdit, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Altere os dados do veículo. A placa identifica o veículo na frota."
              : "Cadastre uma nova placa na frota. Documentos podem ser adicionados depois."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="v-plate" className={labelCls}>
                Placa
              </label>
              <input
                id="v-plate"
                name="plate"
                defaultValue={initial?.plate ?? ""}
                className={`${inputCls} mono uppercase`}
                placeholder="ABC-1D23"
                maxLength={8}
                required
              />
            </div>
            <div className={field}>
              <label htmlFor="v-type" className={labelCls}>
                Tipo
              </label>
              <select
                id="v-type"
                name="vehicleType"
                defaultValue={initial?.vehicleType ?? ""}
                className={inputCls}
                required
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {vehicleTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={field}>
            <label htmlFor="v-model" className={labelCls}>
              Modelo
            </label>
            <input
              id="v-model"
              name="model"
              defaultValue={initial?.model ?? ""}
              className={inputCls}
              placeholder="ex.: Mercedes-Benz Atego 3030"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="v-year" className={labelCls}>
                Ano
              </label>
              <input
                id="v-year"
                name="year"
                type="number"
                min={1950}
                max={2100}
                defaultValue={initial?.year ?? ""}
                className={inputCls}
                placeholder="2024"
              />
            </div>
            <div className={field}>
              <label htmlFor="v-capacity" className={labelCls}>
                Capacidade
              </label>
              <input
                id="v-capacity"
                name="capacity"
                defaultValue={initial?.capacity ?? ""}
                className={inputCls}
                placeholder="ex.: 30.000 L"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={field}>
              <label htmlFor="v-company" className={labelCls}>
                Empresa proprietária
              </label>
              <select
                id="v-company"
                name="companyKind"
                defaultValue={initial?.companyKind ?? "top_diesel"}
                className={inputCls}
                required
              >
                {COMPANY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <label htmlFor="v-status" className={labelCls}>
                Situação
              </label>
              <select
                id="v-status"
                name="status"
                defaultValue={initial?.status ?? "ativo"}
                className={inputCls}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={field}>
            <label htmlFor="v-plan" className={labelCls}>
              Plano de manutenção (informativo)
            </label>
            <input
              id="v-plan"
              name="maintenancePlan"
              defaultValue={initial?.maintenancePlan ?? ""}
              className={inputCls}
              placeholder="ex.: Plano BEST Mercedes — troca com 135.000 km"
            />
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
