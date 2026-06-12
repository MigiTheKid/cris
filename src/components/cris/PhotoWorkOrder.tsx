"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles } from "lucide-react";
import { WorkOrderDialog } from "./WorkOrderDialog";
import type { MaintSystem, ServiceOption, WorkOrder } from "@/lib/data/maintenance";
import type { Vendor } from "@/lib/data/vendors";

type ExtractResponse = {
  order: WorkOrder;
  warnings: string[];
  confidence: number;
  storagePath: string;
  model: string;
};

/**
 * "OS por foto": fotografa a nota da oficina, a IA extrai e casa com o
 * catálogo, e o formulário abre pré-preenchido para revisão humana.
 */
export function PhotoWorkOrder({
  vehicleId,
  systems,
  services,
  vendors,
}: {
  vehicleId: string;
  systems: MaintSystem[];
  services: ServiceOption[];
  vendors: Vendor[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  async function extract(file: File, advanced: boolean) {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("foto", file);
      formData.append("vehicleId", vehicleId);
      if (advanced) formData.append("advanced", "1");
      const res = await fetch("/api/os/extract", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro na leitura da foto.");
      setResult(json as ExtractResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-selecionar a mesma foto
    if (!file) return;
    setLastFile(file);
    void extract(file, false);
  }

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
      <button
        type="button"
        className="cbtn ghost"
        style={{ height: 40 }}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        title="Fotografe a OS da oficina — a IA preenche o formulário pra você revisar"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Lendo a OS…
          </>
        ) : (
          <>
            <Camera size={16} /> OS por foto
            <Sparkles size={13} className="text-[var(--brand-amber)]" />
          </>
        )}
      </button>

      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--crit)_30%,transparent)] bg-[color-mix(in_oklab,var(--crit)_12%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--crit)]">
          {error}
          {lastFile && (
            <button
              type="button"
              className="underline"
              onClick={() => lastFile && void extract(lastFile, true)}
            >
              Tentar leitura avançada
            </button>
          )}
        </div>
      )}

      {result && (
        <WorkOrderDialog
          vehicleId={vehicleId}
          systems={systems}
          services={services}
          vendors={vendors}
          initial={result.order}
          forcedOpen
          onForcedOpenChange={(open) => {
            if (!open) setResult(null);
          }}
          photoPath={result.storagePath}
          aiConfidence={result.confidence}
          warnings={result.warnings}
        />
      )}
    </>
  );
}
