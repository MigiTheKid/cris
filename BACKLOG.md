# BACKLOG — CRIS

Ideias e tarefas pousam aqui durante o trabalho. Priorizado de cima pra baixo.

## Próximo (M1 → fechar)

- [ ] **Auth real (Supabase)**: login CPF+senha → email sintético, sessão por cookie,
      middleware de refresh, troca forçada no 1º acesso + aceite de termo. Trocar o
      cliente admin temporário pelo cliente de sessão nas leituras (RLS de verdade).
- [ ] **Detalhe do veículo** (`/frota/[id]`): abas Identificação · Documentos ·
      Motorista. Cadastro/edição/renovação de documentos com upload de PDF (Storage).
- [ ] **Detalhe do motorista** (`/motoristas/[id]`): documentos pessoais (CNH, MOPP,
      toxicológico, ASO).
- [ ] **Configurações**: usuários/permissões, empresas, catálogos, auditoria.
- [ ] Substituir dados de **amostra** por reais (Gabriel preenche datas/CPFs/empresa).

## App do Motorista (mobile)

- [ ] Meu Veículo · Meus Documentos · Checklist · Abrir Ocorrência.

## Polish de design

- [ ] **Coverflow 3D** (frota/motoristas) com arrasto — hoje é scroll horizontal.
- [ ] **Fundo animado** "malha de rotas" em canvas (e grade de pontos do login já feita).
- [ ] Foto real de veículo/motorista (upload) no lugar do placeholder listrado.

## Infra / processo

- [ ] Criar repo GitHub privado + push (precisa `gh` instalado) e CI (Actions).
- [ ] Ativar o SessionStart hook de auto `pnpm dev` quando abrir o Claude Code em C:\dev\cris.
- [ ] Reabrir o Claude Code com `C:\dev\cris` como pasta raiz (settings/hooks valem lá).

## M2 / M3 (futuro, conforme conceito)

- [ ] Checklists recorrentes, trocas de óleo por KM, extintores, pneus, ocorrências c/ áudio (Whisper).
- [ ] Manutenção e abastecimento por placa, custo/km, MDF, indicadores.
