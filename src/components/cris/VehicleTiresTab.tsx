"use client";

import { useMemo, useState } from "react";
import { Ruler, ArrowUpFromLine, Settings2, Disc } from "lucide-react";
import { TireDiagram, type DiagramSelection, type DiagramUnit } from "./TireDiagram";
import {
  AxleLayoutDialog,
  InstallTireDialog,
  RemoveTireDialog,
  ReadingDialog,
} from "./TireActionDialogs";
import { StatusBadge } from "./StatusBadge";
import type { VehicleRodado, RodadoPosition, StockTire } from "@/lib/data/tires";

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function fmtMm(v: number | null) {
  return v != null ? `${String(v).replace(".", ",")} mm` : "—";
}

/** Aba Pneus do detalhe do veículo: diagrama do conjunto + painel da posição. */
export function VehicleTiresTab({
  rodados,
  stock,
}: {
  rodados: VehicleRodado[]; // [veículo] ou [cavalo, reboque engatado]
  stock: StockTire[];
}) {
  const [selection, setSelection] = useState<DiagramSelection>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);

  const units = useMemo<DiagramUnit[]>(
    () =>
      rodados.map((r, i) => ({
        plate: r.plate,
        role: rodados.length === 2 ? (i === 0 ? "tractor" : "trailer") : "single",
        axles: r.axles,
      })),
    [rodados],
  );

  const selected: { rodado: VehicleRodado; pos: RodadoPosition } | null = useMemo(() => {
    if (!selection) return null;
    const rodado = rodados[selection.unitIndex];
    const pos = rodado?.axles.flatMap((a) => a.positions).find((p) => p.code === selection.code);
    return rodado && pos ? { rodado, pos } : null;
  }, [selection, rodados]);

  const totalTires = rodados.reduce(
    (n, r) => n + r.axles.reduce((m, a) => m + a.positions.filter((p) => p.tire).length, 0),
    0,
  );
  const totalSlots = rodados.reduce(
    (n, r) => n + r.axles.reduce((m, a) => m + a.positions.length, 0),
    0,
  );
  const critCount = rodados.reduce(
    (n, r) =>
      n +
      r.axles.reduce(
        (m, a) => m + a.positions.filter((p) => p.tire && p.tire.tone === "crit").length,
        0,
      ),
    0,
  );

  return (
    <div className="rodado-wrap">
      {/* coluna do diagrama */}
      <div className="rodado-stage glass">
        {rodados[0] && !rodados[0].configured ? (
          <div className="rodado-empty">
            <Disc size={30} />
            <p>
              Este veículo ainda não tem o layout de eixos definido.
              <br />
              Configure uma vez e o desenho do rodado nasce sozinho.
            </p>
            <AxleLayoutDialog
              vehicleId={rodados[0].vehicleId}
              vehicleType={rodados[0].vehicleType}
              initial={[]}
              trigger={
                <button className="cbtn primary">
                  <Settings2 size={16} /> Configurar eixos
                </button>
              }
            />
          </div>
        ) : (
          <TireDiagram
            units={units}
            selection={selection}
            onSelect={(unitIndex, pos) => setSelection({ unitIndex, code: pos.code })}
          />
        )}
      </div>

      {/* coluna do painel */}
      <div className="rodado-side">
        <div className="rodado-kpis">
          <div className="rk">
            <span className="k">Pneus</span>
            <span className="v mono">
              {totalTires}/{totalSlots}
            </span>
          </div>
          <div className="rk">
            <span className="k">Críticos</span>
            <span className="v mono" style={critCount > 0 ? { color: "var(--crit)" } : undefined}>
              {critCount}
            </span>
          </div>
        </div>

        {selected ? (
          <div className="glass rodado-panel">
            <div className="rp-head">
              <div>
                <div className="rp-pos">{selected.pos.label}</div>
                {selected.pos.tire ? (
                  <div className="rp-fogo mono">Fogo {selected.pos.tire.fireNumber}</div>
                ) : (
                  <div className="rp-fogo">Posição vazia</div>
                )}
              </div>
              {selected.pos.tire && (
                <StatusBadge tone={selected.pos.tire.tone} label={selected.pos.tire.toneLabel} />
              )}
            </div>

            {selected.pos.tire ? (
              <>
                <div className="rp-meta">
                  <div>
                    <span className="k">Pneu</span>
                    <span className="v">
                      {[selected.pos.tire.brand, selected.pos.tire.model]
                        .filter(Boolean)
                        .join(" ") || "Sem marca"}
                    </span>
                  </div>
                  <div>
                    <span className="k">Medida · vida</span>
                    <span className="v mono">
                      {selected.pos.tire.size} · {selected.pos.tire.life}ª
                    </span>
                  </div>
                  <div>
                    <span className="k">Sulco</span>
                    <span className="v mono">
                      {fmtMm(selected.pos.tire.treadMm)}
                      {selected.pos.tire.treadNewMm != null
                        ? ` / ${fmtMm(selected.pos.tire.treadNewMm)}`
                        : ""}
                    </span>
                  </div>
                  <div>
                    <span className="k">Última aferição</span>
                    <span className="v mono">{fmtDate(selected.pos.tire.measuredAt)}</span>
                  </div>
                  <div>
                    <span className="k">Instalado em</span>
                    <span className="v mono">
                      {fmtDate(selected.pos.tire.installedAt)}
                      {selected.pos.tire.installedKm != null
                        ? ` · ${selected.pos.tire.installedKm.toLocaleString("pt-BR")} km`
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="rp-actions">
                  <button className="cbtn primary" onClick={() => setReadingOpen(true)}>
                    <Ruler size={15} /> Aferir
                  </button>
                  <button className="cbtn ghost" onClick={() => setRemoveOpen(true)}>
                    <ArrowUpFromLine size={15} /> Remover
                  </button>
                </div>
              </>
            ) : (
              <div className="rp-actions">
                <button className="cbtn primary" onClick={() => setInstallOpen(true)}>
                  <Disc size={15} /> Instalar pneu
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="glass rodado-panel rp-hint">
            Clique num pneu do desenho — o número dentro é o nº de fogo. Posições tracejadas estão
            vazias.
          </div>
        )}

        <div className="rodado-legend">
          <div>
            <span className="dot ok" /> Sulco ≥ 5 mm
          </div>
          <div>
            <span className="dot warn" /> 3–5 mm · janela de recape
          </div>
          <div>
            <span className="dot crit" /> &lt; 3 mm · retirar
          </div>
          <div>
            <span className="dot idle" /> Sem aferição
          </div>
        </div>

        {rodados.map(
          (r) =>
            r.configured && (
              <AxleLayoutDialog
                key={r.vehicleId}
                vehicleId={r.vehicleId}
                vehicleType={r.vehicleType}
                initial={r.axles.map((a) => ({ kind: a.kind, dual: a.dual }))}
                trigger={
                  <button className="cbtn ghost" style={{ height: 36 }}>
                    <Settings2 size={14} /> Eixos {r.plate}
                  </button>
                }
              />
            ),
        )}
      </div>

      {/* dialogs de ação */}
      {selected && !selected.pos.tire && (
        <InstallTireDialog
          open={installOpen}
          onOpenChange={setInstallOpen}
          vehicleId={selected.rodado.vehicleId}
          positionLabel={`${selected.rodado.plate} · ${selected.pos.label}`}
          axleNumber={selected.pos.axleNumber}
          side={selected.pos.side}
          dualPos={selected.pos.dualPos}
          stock={stock}
        />
      )}
      {selected?.pos.tire && (
        <>
          <RemoveTireDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            installationId={selected.pos.tire.installationId}
            fireNumber={selected.pos.tire.fireNumber}
            positionLabel={`${selected.rodado.plate} · ${selected.pos.label}`}
          />
          <ReadingDialog
            open={readingOpen}
            onOpenChange={setReadingOpen}
            tireId={selected.pos.tire.tireId}
            fireNumber={selected.pos.tire.fireNumber}
          />
        </>
      )}
    </div>
  );
}
