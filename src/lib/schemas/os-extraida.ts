import { z } from "zod";

/** Item extraído da foto da OS: peça ou serviço, já casado com o catálogo. */
export const itemExtraidoSchema = z.object({
  tipo_item: z.enum(["peca", "servico"]),
  descricao: z.string().min(1),
  quantidade: z.number().nullable(),
  unidade: z.enum(["un", "jg", "par", "L", "kg", "h"]).nullable(),
  valor_total: z.number().nullable(),
  /** Nome EXATO de um serviço do catálogo fornecido, ou null se nenhum casar. */
  servico_catalogo: z.string().nullable(),
  /** Nome EXATO de um dos 18 sistemas fornecidos (obrigatório p/ serviços). */
  sistema: z.string().nullable(),
});

export const osExtraidaSchema = z.object({
  oficina_nome: z.string().nullable(),
  numero_os: z.string().nullable(),
  data_emissao: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  placa: z.string().nullable(),
  km: z.number().int().nullable(),
  itens: z.array(itemExtraidoSchema),
  valor_total: z.number().nullable(),
  observacoes: z.string().nullable(),
  /** 0–1: legibilidade geral do documento (abaixo de 0.7 = foto ruim). */
  confianca_geral: z.number().min(0).max(1),
});

export type OsExtraida = z.infer<typeof osExtraidaSchema>;
export type ItemExtraido = z.infer<typeof itemExtraidoSchema>;
