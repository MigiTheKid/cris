import { PagePlaceholder } from "@/components/cris/PagePlaceholder";

export default function FrotaPage() {
  return (
    <PagePlaceholder
      eyebrow="🚛 Frota"
      title="Veículos"
      sub="13 veículos · TOP DIESEL + Posto Planeta"
      milestone="M1"
      items={[
        "Tabela de veículos com placa, modelo, tipo, empresa e motorista",
        "Status documental por veículo (em dia / atenção / crítico)",
        "Detalhe do veículo com documentos e vencimentos",
      ]}
    />
  );
}
