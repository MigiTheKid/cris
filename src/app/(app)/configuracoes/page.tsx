import { PagePlaceholder } from "@/components/cris/PagePlaceholder";

export default function ConfiguracoesPage() {
  return (
    <PagePlaceholder
      eyebrow="⚙️ Configurações"
      title="Configurações"
      sub="Usuários, empresas e catálogos"
      milestone="M1"
      items={[
        "Usuários e permissões (admin / gerente / motorista)",
        "Empresas (TOP DIESEL e Posto Planeta)",
        "Catálogos: tipos de documento, fornecedores",
        "Auditoria de ações sensíveis",
      ]}
    />
  );
}
