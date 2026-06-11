"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Shield,
  Gauge,
  MapPin,
  Truck,
  User,
  RefreshCw,
  Plus,
  Pencil,
  Droplet,
  Disc,
  Wrench,
  Fuel,
  CalendarDays,
  UserX,
  UserCog,
  Link2,
  Trash2,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { DocumentDialog, type DocTypeOption } from "./DocumentDialog";
import { VehicleDialog } from "./VehicleDialog";
import { AssignDriverDialog, type DriverOption } from "./AssignDriverDialog";
import { CouplingDialog, type TrailerOption } from "./CouplingDialog";
import { CompositionStrip } from "./CompositionStrip";
import { DeleteDocButton } from "./DeleteDocButton";
import { DangerDeleteDialog } from "./DangerDeleteDialog";
import { PhotoUpload } from "./PhotoUpload";
import { VehicleTiresTab } from "./VehicleTiresTab";
import { deleteVehicle } from "@/lib/actions/vehicles";
import type { VehicleRodado, StockTire } from "@/lib/data/tires";
import type { TireThresholds } from "@/lib/tires";
import { saveVehicleDocument } from "@/lib/actions/documents";
import type { StatusTone } from "@/lib/status";
import type { VehicleDetail, VehicleDoc } from "@/lib/data/vehicle-detail";

const TONE_VAR: Record<StatusTone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  alert: "var(--alert)",
  crit: "var(--crit)",
  idle: "var(--idle)",
};

// Ícone por chave conhecida; tipos novos do catálogo caem no FileText.
const DOC_ICON: Record<string, typeof FileText> = {
  crlv: FileText,
  cipp: Shield,
  inmetro: Gauge,
  tara: Gauge,
  lac: FileText,
  modal_rodoviario: MapPin,
  cert_regularidade: FileText,
  outro: FileText,
};

const SOON_TABS = [
  { id: "oil", label: "Trocas de óleo", icon: Droplet, soon: "M2" },
  { id: "maint", label: "Manutenções", icon: Wrench, soon: "M3" },
  { id: "fuel", label: "Abastecimentos", icon: Fuel, soon: "M3" },
] as const;

function daysText(days: number | null) {
  if (days == null) return "sem data";
  if (days < 0) return `vencido há ${Math.abs(days)}d`;
  if (days === 0) return "vence hoje";
  return `${days}d`;
}

export function VehicleDetailView({
  detail,
  docTypes,
  drivers,
  trailers,
  rodados,
  stock,
  thresholds,
}: {
  detail: VehicleDetail;
  docTypes: DocTypeOption[];
  drivers: DriverOption[];
  trailers: TrailerOption[];
  rodados: VehicleRodado[];
  stock: StockTire[];
  thresholds: TireThresholds;
}) {
  const [tab, setTab] = useState<string>("docs");
  const critDocs = detail.docs.filter((d) => d.tone === "crit").length;
  const isTractor = detail.vehicleType === "cavalo";
  const isTrailerUnit = detail.vehicleType === "semi_reboque" || detail.vehicleType === "reboque";
  const isComposable = isTractor || isTrailerUnit;

  return (
    <div>
      <div className="vd-back cmd-in ci-1">
        <Link href="/frota" className="cbtn ghost" style={{ height: 36, padding: "0 13px" }}>
          <ChevronLeft size={16} /> Frota
        </Link>
      </div>

      {/* Hero */}
      <div className="vd-hero cmd-in ci-2">
        <div className="vd-photo">
          <div className="thumb">
            {detail.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.photoUrl} alt={`Foto do ${detail.plate}`} className="thumb-img" />
            ) : (
              <div className="thumb-ph">
                <Truck size={36} />
                <span className="mono">foto do veículo</span>
              </div>
            )}
            <div className="cine-photo-over" />
          </div>
          <div className="vd-photo-top">
            <span className="vd-comp">{detail.companyLabel}</span>
            <PhotoUpload ownerId={detail.id} kind="vehicle" />
          </div>
          <div className="vd-plate-over">
            <div className="p">{detail.plate}</div>
          </div>
        </div>

        <div className="vd-info">
          <div className="vd-info-top">
            <h1 className="vd-info-title">{detail.model ?? detail.plate}</h1>
            <StatusBadge tone={detail.tone} label={detail.statusLabel} />
          </div>
          <div className="vd-model">
            {detail.typeLabel} · {detail.companyLabel}
          </div>
          <div className="vd-meta">
            <div>
              <div className="k">Ano</div>
              <div className="v mono">{detail.year ?? "—"}</div>
            </div>
            <div>
              <div className="k">Capacidade</div>
              <div className="v mono">{detail.capacity ?? "—"}</div>
            </div>
            <div>
              <div className="k">Documentos</div>
              <div className="v">
                {detail.docsOkCount}/{detail.docs.length} em dia
              </div>
            </div>
            <div>
              <div className="k">Motorista</div>
              <div className="v">
                {detail.effectiveDriverName ?? "—"}
                {detail.driverViaPlate && (
                  <span className="mono ml-1 text-[11px] text-[var(--text-3)]">
                    (cavalo {detail.driverViaPlate})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="vd-cta">
            <DocumentDialog
              ownerId={detail.id}
              ownerField="vehicleId"
              action={saveVehicleDocument}
              docTypes={docTypes}
              trigger={
                <button className="cbtn primary">
                  <Plus size={16} /> Adicionar documento
                </button>
              }
            />
            <VehicleDialog
              initial={{
                id: detail.id,
                plate: detail.plate,
                model: detail.model,
                year: detail.year,
                vehicleType: detail.vehicleType,
                capacity: detail.capacity,
                companyKind: detail.companyKind,
                status: detail.vehicleStatus,
              }}
              trigger={
                <button className="cbtn ghost">
                  <Pencil size={16} /> Editar dados
                </button>
              }
            />
            <DangerDeleteDialog
              trigger={
                <button className="cbtn ghost" style={{ color: "var(--crit)" }}>
                  <Trash2 size={16} /> Excluir
                </button>
              }
              title="Excluir veículo"
              description={`Excluir o veículo ${detail.plate} da frota? Ele sai das listas e dos alertas; o histórico (auditoria, atribuições, pneus) é preservado e pode ser restaurado.`}
              confirmWord={detail.plate}
              consequences={[
                "Some da Frota, do Painel e dos alertas documentais",
                "Libera o motorista atribuído e desfaz engates ativos",
                "Reversível: a exclusão é um arquivamento (não apaga o histórico)",
              ]}
              action={() => deleteVehicle(detail.id)}
              redirectTo="/frota"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="vd-tabs cmd-in ci-3">
        <button className={"vd-tab" + (tab === "id" ? " active" : "")} onClick={() => setTab("id")}>
          <Truck size={16} /> Identificação
        </button>
        <button
          className={"vd-tab" + (tab === "docs" ? " active" : "")}
          onClick={() => setTab("docs")}
        >
          <FileText size={16} /> Documentos
          {critDocs > 0 && <span className="mini">{critDocs}</span>}
        </button>
        <button
          className={"vd-tab" + (tab === "driver" ? " active" : "")}
          onClick={() => setTab("driver")}
        >
          <User size={16} /> Motorista
        </button>
        {isComposable && (
          <button
            className={"vd-tab" + (tab === "comp" ? " active" : "")}
            onClick={() => setTab("comp")}
          >
            <Link2 size={16} /> Composição
            {detail.coupledTo && <span className="mini mono">{detail.coupledTo.plate}</span>}
          </button>
        )}
        <button
          className={"vd-tab" + (tab === "tires" ? " active" : "")}
          onClick={() => setTab("tires")}
        >
          <Disc size={16} /> Pneus
        </button>
        {SOON_TABS.map((t) => (
          <button
            key={t.id}
            className={"vd-tab" + (tab === t.id ? " active" : "")}
            data-soon="1"
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} /> {t.label}
            <span className="soon">{t.soon}</span>
          </button>
        ))}
      </div>

      <div className="cmd-in ci-4" key={tab}>
        {tab === "docs" && (
          <div className="vd-docs">
            {detail.docs.map((d) => (
              <DocCard key={d.id} doc={d} vehicleId={detail.id} docTypes={docTypes} />
            ))}
            <DocumentDialog
              ownerId={detail.id}
              ownerField="vehicleId"
              action={saveVehicleDocument}
              docTypes={docTypes}
              trigger={
                <button className="vd-doc-add">
                  <Plus size={18} /> Adicionar documento
                </button>
              }
            />
          </div>
        )}

        {tab === "id" && (
          <div className="vd-idgrid">
            {(
              [
                ["Placa", detail.plate, true],
                ["Modelo", detail.model ?? "—", false],
                ["Tipo", detail.typeLabel, false],
                ["Ano", detail.year ?? "—", true],
                ["Capacidade", detail.capacity ?? "—", true],
                ["Empresa proprietária", detail.companyLabel, false],
                ["Status", detail.statusLabel, false],
              ] as [string, string | number, boolean][]
            ).map(([k, val, mono]) => (
              <div key={k} className="vd-idcard">
                <div className="k">{k}</div>
                <div className={"v " + (mono ? "mono" : "")}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "driver" && isTrailerUnit && (
          <div>
            <div className="vd-driver-head">
              {detail.coupledTo?.driverId ? (
                <Link
                  href={`/motoristas/${detail.coupledTo.driverId}`}
                  className="vd-driver-card link"
                >
                  <Avatar name={detail.coupledTo.driverName ?? "?"} size={54} hue={206} />
                  <div className="dc-main">
                    <div className="dc-name">{detail.coupledTo.driverName}</div>
                    <div className="dc-sub">
                      Motorista do cavalo <span className="mono">{detail.coupledTo.plate}</span> ·
                      ver ficha
                    </div>
                  </div>
                </Link>
              ) : detail.coupledTo ? (
                <div className="vd-driver-card empty">
                  <span className="dc-empty-ico">
                    <UserX size={26} />
                  </span>
                  <div className="dc-main">
                    <div className="dc-name">Sem motorista</div>
                    <div className="dc-sub">
                      O cavalo <span className="mono">{detail.coupledTo.plate}</span> não tem
                      condutor atribuído
                    </div>
                  </div>
                </div>
              ) : (
                <div className="vd-driver-card empty">
                  <span className="dc-empty-ico">
                    <Link2 size={26} />
                  </span>
                  <div className="dc-main">
                    <div className="dc-name">Reboque livre</div>
                    <div className="dc-sub">
                      Engate a um cavalo (aba Composição) para herdar o motorista
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-[var(--text-3)]">
              Reboques não recebem motorista direto — o condutor do conjunto é o do cavalo engatado.
            </p>
          </div>
        )}

        {tab === "driver" && !isTrailerUnit && (
          <div>
            <div className="vd-driver-head">
              {detail.driverId ? (
                <Link href={`/motoristas/${detail.driverId}`} className="vd-driver-card link">
                  <Avatar name={detail.driverName ?? "?"} size={54} hue={206} />
                  <div className="dc-main">
                    <div className="dc-name">{detail.driverName}</div>
                    <div className="dc-sub">Motorista atribuído · ver ficha</div>
                  </div>
                </Link>
              ) : (
                <div className="vd-driver-card empty">
                  <span className="dc-empty-ico">
                    <UserX size={26} />
                  </span>
                  <div className="dc-main">
                    <div className="dc-name">Sem motorista</div>
                    <div className="dc-sub">Nenhum condutor atribuído</div>
                  </div>
                </div>
              )}
              <AssignDriverDialog
                vehicleId={detail.id}
                plate={detail.plate}
                currentDriverId={detail.driverId}
                drivers={drivers}
                trigger={
                  <button className="cbtn primary" style={{ height: 40 }}>
                    <UserCog size={16} /> {detail.driverId ? "Trocar" : "Atribuir"}
                  </button>
                }
              />
            </div>

            <div className="eyebrow" style={{ margin: "26px 0 12px" }}>
              Histórico de atribuições
            </div>
            {detail.history.length > 0 ? (
              detail.history.map((h, i) => (
                <div key={i} className="vd-hist">
                  <CalendarDays size={16} /> {h.driverName} — desde{" "}
                  {new Date(h.assignedAt).toLocaleDateString("pt-BR")}
                  {h.unassignedAt
                    ? ` até ${new Date(h.unassignedAt).toLocaleDateString("pt-BR")}`
                    : " (atual)"}
                </div>
              ))
            ) : (
              <div className="vd-hist">Nenhuma atribuição registrada.</div>
            )}
          </div>
        )}

        {tab === "comp" && isComposable && (
          <div>
            <div className="comp-head">
              <CompositionStrip
                tractor={
                  isTractor
                    ? {
                        id: null,
                        plate: detail.plate,
                        model: detail.model,
                        tone: detail.tone,
                        statusLabel: detail.statusLabel,
                      }
                    : detail.coupledTo && {
                        id: detail.coupledTo.id,
                        plate: detail.coupledTo.plate,
                        model: detail.coupledTo.model,
                        tone: detail.coupledTo.tone,
                        statusLabel: detail.coupledTo.statusLabel,
                      }
                }
                trailer={
                  isTractor
                    ? detail.coupledTo && {
                        id: detail.coupledTo.id,
                        plate: detail.coupledTo.plate,
                        model: detail.coupledTo.model,
                        tone: detail.coupledTo.tone,
                        statusLabel: detail.coupledTo.statusLabel,
                      }
                    : {
                        id: null,
                        plate: detail.plate,
                        model: detail.model,
                        tone: detail.tone,
                        statusLabel: detail.statusLabel,
                      }
                }
                driverName={isTractor ? detail.driverName : (detail.coupledTo?.driverName ?? null)}
              />
              {isTractor && (
                <CouplingDialog
                  tractorId={detail.id}
                  plate={detail.plate}
                  currentTrailerId={detail.coupledTo?.id ?? null}
                  trailers={trailers}
                  trigger={
                    <button className="cbtn primary" style={{ height: 40 }}>
                      <Link2 size={16} /> {detail.coupledTo ? "Trocar reboque" : "Engatar"}
                    </button>
                  }
                />
              )}
            </div>
            {isTrailerUnit && (
              <p className="mt-3 text-xs text-[var(--text-3)]">
                O engate é feito pela página do cavalo.
              </p>
            )}

            <div className="eyebrow" style={{ margin: "26px 0 12px" }}>
              Histórico de engates
            </div>
            {detail.couplingHistory.length > 0 ? (
              detail.couplingHistory.map((h, i) => (
                <div key={i} className="vd-hist">
                  <Link2 size={16} /> <span className="mono">{h.plate}</span> — desde{" "}
                  {new Date(h.coupledAt).toLocaleDateString("pt-BR")}
                  {h.uncoupledAt
                    ? ` até ${new Date(h.uncoupledAt).toLocaleDateString("pt-BR")}`
                    : " (atual)"}
                </div>
              ))
            ) : (
              <div className="vd-hist">Nenhum engate registrado.</div>
            )}
          </div>
        )}

        {tab === "tires" && (
          <VehicleTiresTab rodados={rodados} stock={stock} thresholds={thresholds} />
        )}

        {SOON_TABS.some((t) => t.id === tab) &&
          (() => {
            const t = SOON_TABS.find((x) => x.id === tab)!;
            return (
              <div className="vd-empty">
                <div className="te-ico">
                  <t.icon size={28} />
                </div>
                <h4>{t.label}</h4>
                <p>
                  Esta área entra na milestone {t.soon}.
                  <br />A estrutura visual já está pronta para receber os dados.
                </p>
                <span className="soon-tag">Planejado · {t.soon}</span>
              </div>
            );
          })()}
      </div>
    </div>
  );
}

function DocCard({
  doc,
  vehicleId,
  docTypes,
}: {
  doc: VehicleDoc;
  vehicleId: string;
  docTypes: DocTypeOption[];
}) {
  const Ico = DOC_ICON[doc.docType] ?? FileText;
  return (
    <div className="vd-doc" data-st={doc.tone}>
      <span className="d-ico">
        <Ico size={20} />
        <span className="d-dot" style={{ background: TONE_VAR[doc.tone] }} />
      </span>
      <div className="d-main">
        <div className="d-name">{doc.docLabel}</div>
        <div className="d-desc">{doc.docDescription}</div>
        <div className="d-foot">
          <span className={`days-pill ${doc.tone}`}>{daysText(doc.days)}</span>
        </div>
      </div>
      <div className="d-actions">
        {doc.filePath && (
          <a
            href={`/api/documents/${doc.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="d-mini-btn"
            title="Ver PDF"
          >
            <FileText size={16} />
          </a>
        )}
        <DocumentDialog
          ownerId={vehicleId}
          ownerField="vehicleId"
          action={saveVehicleDocument}
          docTypes={docTypes}
          initial={{
            id: doc.id,
            docType: doc.docType,
            docNumber: doc.docNumber,
            issuedAt: doc.issuedAt,
            expiresAt: doc.expiresAt,
          }}
          trigger={
            <button className="d-mini-btn" title="Renovar / editar">
              <RefreshCw size={16} />
            </button>
          }
        />
        <DeleteDocButton docId={doc.id} ownerId={vehicleId} kind="vehicle" label={doc.docLabel} />
      </div>
    </div>
  );
}
