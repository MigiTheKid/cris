import { PagePlaceholder } from "@/components/cris/PagePlaceholder";

export default function MotoristasPage() {
  return (
    <PagePlaceholder
      eyebrow="👤 Motoristas"
      title="Condutores"
      sub="9 motoristas"
      milestone="M1"
      items={[
        "Lista de motoristas com CPF, CNH e veículo atual",
        "Documentos pessoais (CNH, MOPP, toxicológico, ASO) com vencimento",
      ]}
    />
  );
}
