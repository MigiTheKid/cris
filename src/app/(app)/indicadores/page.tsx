import { PagePlaceholder } from "@/components/cris/PagePlaceholder";

export default function IndicadoresPage() {
  return (
    <PagePlaceholder
      eyebrow="📊 Indicadores"
      title="Indicadores"
      sub="Visão executiva da frota"
      milestone="M3"
      items={[
        "Conformidade documental (% da frota em dia)",
        "Custo por km rodado por veículo",
        "Manutenção por placa (frequência e valor)",
        "Ciclo de vida dos pneus",
      ]}
    />
  );
}
