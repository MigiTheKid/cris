/** Rótulos (substantivos) de ação e entidade — usados nos filtros e no export. */

export const ACTION_LABEL: Record<string, string> = {
  create: "Criação",
  update: "Edição",
  delete: "Exclusão",
  assign: "Atribuição",
  unassign: "Liberação",
  couple: "Engate",
  uncouple: "Desengate",
  install: "Instalação de pneu",
  remove: "Remoção de pneu",
  reset_password: "Reset de senha",
  toggle: "Ativar/Desativar",
  password_change: "Troca de senha",
};

export const ENTITY_LABEL: Record<string, string> = {
  vehicle: "Veículo",
  vehicle_document: "Documento de veículo",
  driver_document: "Documento de motorista",
  assignment: "Atribuição",
  coupling: "Engate de reboque",
  tire: "Pneu",
  settings: "Parâmetros",
  document_type: "Tipo de documento",
  user: "Usuário",
  company: "Empresa",
  account: "Conta",
};

export const ACTION_OPTIONS = Object.entries(ACTION_LABEL).map(([value, label]) => ({
  value,
  label,
}));
export const ENTITY_OPTIONS = Object.entries(ENTITY_LABEL).map(([value, label]) => ({
  value,
  label,
}));
