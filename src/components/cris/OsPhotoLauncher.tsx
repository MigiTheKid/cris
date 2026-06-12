"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Sparkles, Truck } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WorkOrder } from "@/lib/data/maintenance";

export type OsExtractHandoff = {
  vehicle: { id: string; plate: string } | null;
  plateFound: string | null;
  vehicles?: { id: string; plate: string }[];
  order: WorkOrder;
  warnings: string[];
  confidence: number;
  storagePath: string;
};

/** Chave do handoff: a extração viaja por sessionStorage até a página do veículo. */
export const OS_HANDOFF_KEY = "cris-os-handoff";

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-solid)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-amber)]";

/**
 * "OS por foto" de qualquer lugar: a IA lê a nota, identifica a PLACA e
 * leva direto para a aba Manutenções do veículo certo, formulário aberto.
 * Sem placa identificável → seletor amigável de veículo (nunca erro seco).
 */
export function OsPhotoLauncher({ variant = "ghost" }: { variant?: "topbar" | "ghost" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<OsExtractHandoff | null>(null);
  const [pickedId, setPickedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  function goToVehicle(vehicleId: string, data: OsExtractHandoff) {
    sessionStorage.setItem(OS_HANDOFF_KEY, JSON.stringify({ ...data, targetVehicleId: vehicleId }));
    setPending(null);
    router.push(`/frota/${vehicleId}?tab=maint&osfoto=1`);
  }

  async function extract(file: File, advanced: boolean) {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("foto", file);
      if (advanced) formData.append("advanced", "1");
      const res = await fetch("/api/os/extract", { method: "POST", body: formData });
      const json = (await res.json()) as OsExtractHandoff & { error?: string };
      if (!res.ok) throw new Error(json.error || "Erro na leitura da nota.");
      if (json.vehicle) {
        goToVehicle(json.vehicle.id, json);
      } else {
        setPickedId("");
        setPending(json); // placa não identificada → seletor amigável
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setPending({} as OsExtractHandoff); // abre o dialog no modo erro
    } finally {
      setLoading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLastFile(file);
    void extract(file, false);
  }

  const dialogOpen = pending !== null;
  const hasData = !!pending?.order;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={onPick}
        disabled={loading}
      />
      {variant === "topbar" ? (
        <button
          className="driverapp-btn"
          title="Foto ou PDF da nota da oficina — a IA acha o veículo e preenche a OS"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <Loader2 size={16} strokeWidth={1.8} className="animate-spin" />
          ) : (
            <Camera size={16} strokeWidth={1.8} />
          )}
          <span>{loading ? "Lendo a nota…" : "OS por foto"}</span>
          {!loading && <Sparkles size={13} className="text-[var(--brand-amber)]" />}
        </button>
      ) : (
        <button
          className="cbtn ghost"
          style={{ height: 40 }}
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          title="Foto ou PDF da nota da oficina — a IA acha o veículo e preenche a OS"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Lendo a nota…
            </>
          ) : (
            <>
              <Camera size={16} /> OS por foto
              <Sparkles size={13} className="text-[var(--brand-amber)]" />
            </>
          )}
        </button>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hasData ? "Qual é o veículo desta nota?" : "Não consegui ler a nota"}
            </DialogTitle>
            <DialogDescription>
              {hasData
                ? pending?.plateFound
                  ? `A nota indica a placa ${pending.plateFound}, mas ela não está na frota. Escolha o veículo correto.`
                  : "A nota não traz a placa do veículo (acontece bastante). Escolha abaixo e o resto já vai preenchido."
                : (error ?? "Tente uma foto mais nítida e reta, ou a leitura avançada.")}
            </DialogDescription>
          </DialogHeader>

          {hasData ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-2)]">
                <Truck size={13} className="mr-1 inline" />
                Veículo
              </label>
              <select
                value={pickedId}
                onChange={(e) => setPickedId(e.target.value)}
                className={inputCls}
              >
                <option value="">— escolha a placa —</option>
                {(pending?.vehicles ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            lastFile && (
              <button
                type="button"
                className="cbtn ghost"
                disabled={loading}
                onClick={() => {
                  setPending(null);
                  if (lastFile) void extract(lastFile, true);
                }}
              >
                <Sparkles size={15} /> Tentar leitura avançada
              </button>
            )
          )}

          <DialogFooter>
            <DialogClose
              render={
                <button type="button" className="cbtn ghost">
                  Cancelar
                </button>
              }
            />
            {hasData && (
              <button
                type="button"
                className="cbtn primary"
                disabled={!pickedId}
                onClick={() => pending && goToVehicle(pickedId, pending)}
              >
                Continuar
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
