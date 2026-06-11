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
} from "lucide-react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { DocumentDialog, type DocTypeOption } from "./DocumentDialog";
import { VehicleDialog } from "./VehicleDialog";
import { AssignDriverDialog, type DriverOption } from "./AssignDriverDialog";
import { DeleteDocButton } from "./DeleteDocButton";
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
  { id: "tires", label: "Pneus", icon: Disc, soon: "M2" },
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
}: {
  detail: VehicleDetail;
  docTypes: DocTypeOption[];
  drivers: DriverOption[];
}) {
  const [tab, setTab] = useState<string>("docs");
  const critDocs = detail.docs.filter((d) => d.tone === "crit").length;

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
            <div className="thumb-ph">
              <Truck size={36} />
              <span className="mono">foto do veículo</span>
            </div>
            <div className="cine-photo-over" />
          </div>
          <div className="vd-photo-top">
            <span className="vd-comp">{detail.companyLabel}</span>
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
              <div className="v">{detail.driverName ?? "—"}</div>
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

        {tab === "driver" && (
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
