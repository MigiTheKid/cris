"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  CreditCard,
  ShieldAlert,
  FlaskConical,
  Stethoscope,
  User,
  Truck,
  RefreshCw,
  Plus,
  Pencil,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { DocumentDialog, type DocTypeOption } from "./DocumentDialog";
import { DeleteDocButton } from "./DeleteDocButton";
import { DriverProfileDialog } from "./DriverProfileDialog";
import { PhotoUpload } from "./PhotoUpload";
import { saveDriverDocument } from "@/lib/actions/driver-documents";
import type { StatusTone } from "@/lib/status";
import type { DriverDetail, DriverDoc } from "@/lib/data/drivers";

const TONE_VAR: Record<StatusTone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  alert: "var(--alert)",
  crit: "var(--crit)",
  idle: "var(--idle)",
};

const DOC_ICON: Record<string, typeof FileText> = {
  cnh: CreditCard,
  mopp: ShieldAlert,
  toxicologico: FlaskConical,
  aso: Stethoscope,
};

function daysText(days: number | null) {
  if (days == null) return "sem data";
  if (days < 0) return `vencido há ${Math.abs(days)}d`;
  if (days === 0) return "vence hoje";
  return `${days}d`;
}

function fmt(d: string | null) {
  // Datas só-data ("YYYY-MM-DD"): formata sem passar por Date pra não escorregar
  // um dia pelo fuso (new Date("YYYY-MM-DD") é UTC meia-noite).
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

export function DriverDetailView({
  driver,
  docTypes,
}: {
  driver: DriverDetail;
  docTypes: DocTypeOption[];
}) {
  const [tab, setTab] = useState<string>("docs");
  const critDocs = driver.docs.filter((d) => d.tone === "crit").length;

  return (
    <div>
      <div className="vd-back cmd-in ci-1">
        <Link href="/motoristas" className="cbtn ghost" style={{ height: 36, padding: "0 13px" }}>
          <ChevronLeft size={16} /> Motoristas
        </Link>
      </div>

      {/* Hero */}
      <div className="vd-hero cmd-in ci-2">
        <div className="vd-photo" style={{ display: "grid", placeItems: "center" }}>
          {driver.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driver.photoUrl} alt={`Foto de ${driver.name}`} className="thumb-img" />
          ) : (
            <div className="thumb" style={{ inset: 0, position: "absolute" }} />
          )}
          {!driver.photoUrl && (
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <Avatar name={driver.name} size={96} hue={206} />
            </div>
          )}
          <div className="vd-photo-top" style={{ justifyContent: "flex-end" }}>
            <PhotoUpload ownerId={driver.id} kind="driver" />
          </div>
        </div>

        <div className="vd-info">
          <div className="vd-info-top">
            <h1 className="vd-info-title">{driver.name}</h1>
            <StatusBadge tone={driver.tone} label={driver.statusLabel} />
          </div>
          <div className="vd-model">
            Motorista{driver.cnhCategory ? ` · CNH ${driver.cnhCategory}` : ""}
          </div>
          <div className="vd-meta">
            <div>
              <div className="k">CPF</div>
              <div className="v mono">{driver.cpf}</div>
            </div>
            <div>
              <div className="k">Admissão</div>
              <div className="v mono">{fmt(driver.hiredAt)}</div>
            </div>
            <div>
              <div className="k">Documentos</div>
              <div className="v">
                {driver.docsOkCount}/{driver.docs.length} em dia
              </div>
            </div>
            <div>
              <div className="k">{driver.trailerPlate ? "Conjunto atual" : "Veículo atual"}</div>
              <div className="v mono">
                {driver.vehiclePlate
                  ? driver.trailerPlate
                    ? `${driver.vehiclePlate} ⫘ ${driver.trailerPlate}`
                    : driver.vehiclePlate
                  : "—"}
              </div>
            </div>
          </div>
          <div className="vd-cta">
            <DocumentDialog
              ownerId={driver.id}
              ownerField="driverId"
              action={saveDriverDocument}
              docTypes={docTypes}
              trigger={
                <button className="cbtn primary">
                  <Plus size={16} /> Adicionar documento
                </button>
              }
            />
            <DriverProfileDialog
              initial={{
                id: driver.id,
                fullName: driver.name,
                phone: driver.phone,
                cnhCategory: driver.cnhCategory,
                birthDate: driver.birthDate,
                hiredAt: driver.hiredAt,
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
        <button
          className={"vd-tab" + (tab === "docs" ? " active" : "")}
          onClick={() => setTab("docs")}
        >
          <FileText size={16} /> Documentos
          {critDocs > 0 && <span className="mini">{critDocs}</span>}
        </button>
        <button className={"vd-tab" + (tab === "id" ? " active" : "")} onClick={() => setTab("id")}>
          <User size={16} /> Identificação
        </button>
        {driver.vehiclePlate && (
          <Link
            href={`/frota`}
            className="vd-tab"
            style={{ textDecoration: "none" }}
            title="Ver na frota"
          >
            <Truck size={16} /> {driver.vehiclePlate}
          </Link>
        )}
      </div>

      <div className="cmd-in ci-4" key={tab}>
        {tab === "docs" && (
          <div className="vd-docs">
            {driver.docs.map((d) => (
              <DriverDocCard key={d.id} doc={d} driverId={driver.id} docTypes={docTypes} />
            ))}
            <DocumentDialog
              ownerId={driver.id}
              ownerField="driverId"
              action={saveDriverDocument}
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
                ["Nome", driver.name, false],
                ["CPF", driver.cpf, true],
                ["Telefone", driver.phone ?? "—", true],
                ["CNH", driver.cnhCategory ?? "—", false],
                ["Nascimento", fmt(driver.birthDate), true],
                ["Admissão", fmt(driver.hiredAt), true],
                ["Veículo atual", driver.vehiclePlate ?? "—", true],
                ["Status", driver.statusLabel, false],
              ] as [string, string, boolean][]
            ).map(([k, val, mono]) => (
              <div key={k} className="vd-idcard">
                <div className="k">{k}</div>
                <div className={"v " + (mono ? "mono" : "")}>{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DriverDocCard({
  doc,
  driverId,
  docTypes,
}: {
  doc: DriverDoc;
  driverId: string;
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
            href={`/api/driver-documents/${doc.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="d-mini-btn"
            title="Ver PDF"
          >
            <FileText size={16} />
          </a>
        )}
        <DocumentDialog
          ownerId={driverId}
          ownerField="driverId"
          action={saveDriverDocument}
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
        <DeleteDocButton docId={doc.id} ownerId={driverId} kind="driver" label={doc.docLabel} />
      </div>
    </div>
  );
}
