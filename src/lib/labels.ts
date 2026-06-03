import type { Database } from "@/lib/database.types";

type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type CompanyKind = Database["public"]["Enums"]["company_kind"];

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  cavalo: "Cavalo Mecânico",
  truck: "Caminhão Truck",
  toco: "Caminhão Toco",
  bitruck: "Caminhão Bitruck",
  leve: "Veículo Leve",
  semi_reboque: "Semirreboque",
  reboque: "Reboque",
};

const COMPANY_LABELS: Record<CompanyKind, string> = {
  top_diesel: "TOP DIESEL",
  posto_planeta: "Planeta",
};

export function vehicleTypeLabel(t: VehicleType): string {
  return VEHICLE_TYPE_LABELS[t] ?? t;
}

export function companyLabel(k: CompanyKind): string {
  return COMPANY_LABELS[k] ?? k;
}

type VehicleDocType = Database["public"]["Enums"]["vehicle_doc_type"];

const VEHICLE_DOC_LABELS: Record<VehicleDocType, string> = {
  crlv: "CRLV",
  cipp: "CIPP",
  inmetro: "INMETRO",
  tara: "TARA",
  lac: "LAC",
  modal_rodoviario: "Modal Rodoviário",
  cert_regularidade: "Cert. de Regularidade",
  outro: "Outro",
};

export function vehicleDocLabel(t: VehicleDocType): string {
  return VEHICLE_DOC_LABELS[t] ?? t;
}
