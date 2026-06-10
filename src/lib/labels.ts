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

// Labels de tipos de documento agora vêm do catálogo `document_types` (banco),
// gerenciável em Configurações. Ver src/lib/data/document-types.ts.
