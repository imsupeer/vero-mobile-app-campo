import { http } from "@/api/cliente";

export type UnidadePacking = { id: number; nome: string };
export type MercadoPacking = { id: number; nome: string };
export type ContextoPacking = {
  unidades?: UnidadePacking[];
  mercados?: MercadoPacking[];
  metodos_rastreabilidade?: string[];
};
export type RelogioCarga = {
  cor?: "verde" | "amarelo" | "vermelho" | "sem_dado";
  horas?: number | null;
};
export type CargaPendente = {
  carga_id: number;
  talhao_id?: number | null;
  romaneio?: string | null;
  talhao_nome?: string | null;
  fazenda?: string | null;
  variedade_nome?: string | null;
  peso_kg?: number | null;
  data_carga?: string | null;
  relogio?: RelogioCarga;
};
export type PendenciasPacking = {
  proximo_numero?: string | null;
  cargas?: CargaPendente[];
};
export type Gate = {
  status?: "ok" | "aviso" | "bloqueio" | "sem_dado";
  detalhe?: string | null;
};
export type GatesPacking = {
  carencia?: Gate;
  certificacao?: Gate;
  rastreabilidade?: Gate;
  licenca?: Gate;
  so2?: Gate;
  bloqueia?: boolean;
};
export type RomaneioPacking = {
  numero?: string;
  data?: string;
  talhao_id?: number;
  talhao_nome?: string;
  peso_kg?: number;
  status?: string;
  [campo: string]: unknown;
};
export type ItemRelogioFrio = {
  item_id: number;
  recepcao_numero?: string;
  romaneio?: string | null;
  talhao_nome?: string;
  variedade_nome?: string;
  peso_kg?: number | null;
  colhido_em?: string | null;
  relogio?: {
    cor?: "verde" | "amarelo" | "vermelho" | "sem_dado";
    horas?: number | null;
    restante_so2_h?: number | null;
  };
};
export type LinhaTally = {
  pessoa: string;
  modo: string;
  vinculo?: string;
  caixas: number;
  premio?: number;
};
export type ResultadoBipe = {
  pessoa: string;
  modo: string;
  vinculo?: string;
  caixas_total: number;
  premio_total?: number;
  aviso?: string | null;
};

export const packingApi = {
  contexto: async () =>
    (await http.get<ContextoPacking>("/packing/contexto")).data,
  pendentes: async (unidadeId: number) =>
    (
      await http.get<PendenciasPacking>(
        `/packing/recepcao/pendentes?unidade_id=${encodeURIComponent(unidadeId)}`,
      )
    ).data,
  avaliar: async (payload: Record<string, unknown>) =>
    (await http.post<GatesPacking>("/packing/recepcao/avaliar", payload)).data,
  receber: async (payload: Record<string, unknown>) =>
    (await http.post<Record<string, unknown>>("/packing/recepcao", payload))
      .data,
  tally: async (
    data: string,
    setorId?: number | null,
    talhaoId?: number | null,
  ) => {
    const filtro =
      setorId != null
        ? `&setor_id=${encodeURIComponent(setorId)}`
        : talhaoId != null
          ? `&talhao_id=${encodeURIComponent(talhaoId)}`
          : "";
    return (
      (
        await http.get<{ tally?: LinhaTally[] }>(
          `/packing/apontar/tally?data=${encodeURIComponent(data)}${filtro}`,
        )
      ).data.tally ?? []
    );
  },
  romaneio: async (numero: string) =>
    (
      await http.get<RomaneioPacking>(
        `/packing/romaneio?numero=${encodeURIComponent(numero)}`,
      )
    ).data,
  relogioFrio: async (unidadeId: number) =>
    (
      await http.get<{ janela_so2_h?: number; itens?: ItemRelogioFrio[] }>(
        `/packing/relogio_frio?unidade_id=${encodeURIComponent(unidadeId)}`,
      )
    ).data,
  bipar: async (payload: Record<string, unknown>) =>
    (await http.post<ResultadoBipe>("/packing/apontar/beep", payload)).data,
};
