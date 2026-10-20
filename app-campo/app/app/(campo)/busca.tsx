/**
 * Busca global — o equivalente de campo do lançador "Buscar /" do VERO web.
 *
 * Procura no que o aparelho já tem em cache (funciona sem sinal): válvulas,
 * produtos, aplicações, alertas, análises, cargas, pedidos e as próprias telas
 * do app. Cada acerto leva direto ao lugar certo.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';

import type { Alerta, AnaliseNutricional, Aplicacao, ApontamentoHistorico, ComprasPedido, Produtividade, Talhao } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { relatoriosDisponiveis } from '@/relatorios/catalogo';
import { useSessao } from '@/sessao';
import { useSinc } from '@/sinc/useSinc';
import { cor, espaco, familia, fonte, raio, sombra, toque } from '@/ui/tema';

type NomeIcone = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Acerto = { grupo: string; icone: NomeIcone; titulo: string; sub?: string; rota: string; params?: Record<string, string>; termos: string };
type Carga = { id?: number | string; romaneio?: string | null; talhao?: string | null; fazenda?: string | null };
type Produto = { id: number; nome?: string | null; codigo?: string | null; grupo?: string | null };

const limpar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MAX_POR_GRUPO = 6;

/** Telas do app, indexadas como no lançador do site. */
function telas(pode: (p: string) => boolean): Acerto[] {
  const base: Array<{ titulo: string; rota: string; perm?: string; permissoes?: string[]; icone: NomeIcone }> = [
    { titulo: 'Início', rota: '/inicio', icone: 'view-dashboard-outline' },
    { titulo: 'Mapa da fazenda', rota: '/mapa', perm: 'mapa.ver', icone: 'map-outline' },
    { titulo: 'Caderno de campo', rota: '/caderno', perm: 'caderno.ver', icone: 'notebook-outline' },
    { titulo: 'Operações', rota: '/operacoes', permissoes: ['mip.monitoramentos.editar', 'mip.ver', 'mip.aplicacoes_defensivos.editar', 'irrigacao.apontamentos_irrigacao.editar', 'agro.colheita.editar', 'agro.romaneios_colheita.editar', 'agro.apontamentos_campo.editar', 'maquinas.horimetro.editar', 'maquinas.abastecimentos.editar', 'compras.aprovacoes.editar', 'compras.recebimentos.editar', 'compras.solicitacoes_compra.editar', 'estoque.entradas.editar'], icone: 'clipboard-check-outline' },
    { titulo: 'Consultas', rota: '/consultas', icone: 'view-dashboard-variant-outline' },
    { titulo: 'Painel operacional', rota: '/painel', icone: 'chart-box-outline' },
    { titulo: 'Estoque', rota: '/estoque', permissoes: ['estoque.ver', 'estoque.produtos_insumos.ver', 'estoque.historico_movimentacoes.ver'], icone: 'warehouse' },
    { titulo: 'Produtividade', rota: '/produtividade', perm: 'agro.produtividade.ver', icone: 'chart-line' },
    { titulo: 'Irrigação', rota: '/irrigacao-consulta', permissoes: ['irrigacao.ver', 'irrigacao.planejado_realizado.ver', 'irrigacao.planejamento_irrigacao.ver', 'irrigacao.consumo_agua.ver', 'irrigacao.consumo_energia.ver', 'irrigacao.custo_irrigacao.ver'], icone: 'water-percent' },
    { titulo: 'Nutrição', rota: '/nutricao', permissoes: ['nutricao.analise_solo.ver', 'nutricao.analise_foliar.ver'], icone: 'leaf' },
    { titulo: 'Monitoramento MIP', rota: '/mip-monitorar', perm: 'mip.monitoramentos.editar', icone: 'bug-outline' },
    { titulo: 'Aplicações (DF/IF)', rota: '/aplicacoes', permissoes: ['mip.ver', 'mip.aplicacoes_defensivos.editar'], icone: 'spray' },
    { titulo: 'Colheita', rota: '/colheita', permissoes: ['agro.colheita.editar', 'agro.romaneios_colheita.editar', 'agro.romaneios_colheita.ver'], icone: 'basket-outline' },
    { titulo: 'Máquinas', rota: '/maquinas', permissoes: ['maquinas.horimetro.ver', 'maquinas.horimetro.editar', 'maquinas.abastecimentos.ver', 'maquinas.abastecimentos.editar'], icone: 'tractor-variant' },
    { titulo: 'Compras', rota: '/compras', permissoes: ['compras.aprovacoes.editar', 'compras.recebimentos.editar', 'compras.solicitacoes_compra.editar', 'estoque.entradas.editar', 'compras.ver', 'compras.pedidos_compra.ver'], icone: 'cart-outline' },
    { titulo: 'Relógio de frio', rota: '/relogio-frio', perm: 'packing.recepcao.ver', icone: 'clock-alert-outline' },
    { titulo: 'Financeiro', rota: '/financeiro', permissoes: ['financeiro.ver', 'financeiro.contas_pagar.ver', 'financeiro.contas_receber.ver'], icone: 'cash-multiple' },
    { titulo: 'Relatórios', rota: '/relatorios', permissoes: ['relatorios.relatorios_operacionais.ver', 'caderno.ver', 'agro.apontamentos_campo.ver', 'agro.planejamento_atividades.ver', 'relatorios.relatorios_estoque.ver', 'estoque.ver', 'estoque.produtos_insumos.ver', 'estoque.historico_movimentacoes.ver', 'relatorios.relatorios_compras.ver', 'compras.ver', 'compras.pedidos_compra.ver', 'relatorios.relatorios_colheita.ver', 'agro.romaneios_colheita.ver', 'agro.romaneios_colheita.editar'], icone: 'chart-box-outline' },
  ];
  return base
    .filter((t) => t.perm == null || pode(t.perm))
    .filter((t) => t.permissoes == null || t.permissoes.some(pode))
    .filter((t) => t.titulo !== 'Relatórios' || relatoriosDisponiveis(pode).length > 0)
    .map((t) => ({ grupo: 'Telas', icone: t.icone, titulo: t.titulo, rota: t.rota, termos: limpar(t.titulo) }));
}

export default function Busca() {
  const { pode } = useSessao();
  const { ultima } = useSinc();
  const [termo, setTermo] = useState('');
  const [indice, setIndice] = useState<Acerto[]>([]);

  useFocusEffect(useCallback(() => {
    let ativo = true;
    void (async () => {
      const [talhoes, produtos, apont, aplic, alertas, cargas, pedidos, solo, foliar, prod] = await Promise.all([
        lerCache<Talhao>('talhoes').catch(() => []),
        lerCache<Produto>('estoque').catch(() => []),
        lerCache<ApontamentoHistorico>('apontamentos').catch(() => []),
        lerCache<Aplicacao>('aplicacoes').catch(() => []),
        lerCache<Alerta>('alertas').catch(() => []),
        lerCache<Carga>('cargas_colheita').catch(() => []),
        lerCache<ComprasPedido>('compras_pedidos').catch(() => []),
        lerCache<AnaliseNutricional>('analise_solo').catch(() => []),
        lerCache<AnaliseNutricional>('analise_foliar').catch(() => []),
        lerCache<Produtividade>('produtividade').catch(() => []),
      ]);
      const setorPorTalhaoId = new Map<string, number>();
      talhoes.forEach((t) => { setorPorTalhaoId.set(String(t.talhao_id ?? t.id), t.id); });
      const podeAlgum = (...permissoes: string[]) => permissoes.some(pode);
      const podeValvulas = podeAlgum(
        'mapa.ver', 'caderno.ver', 'mip.monitoramentos.editar', 'mip.ver',
        'mip.aplicacoes_defensivos.editar', 'irrigacao.apontamentos_irrigacao.editar',
        'agro.colheita.editar', 'agro.romaneios_colheita.editar',
        'agro.apontamentos_campo.editar',
      );
      const podeMIP = podeAlgum('mip.ver', 'mip.aplicacoes_defensivos.editar');
      const podeCompras = podeAlgum('compras.ver', 'compras.pedidos_compra.ver', 'compras.aprovacoes.editar', 'compras.recebimentos.editar', 'compras.solicitacoes_compra.editar', 'estoque.entradas.editar');
      const podeCargas = podeAlgum('agro.romaneios_colheita.ver', 'agro.romaneios_colheita.editar');
      const podeApontamentos = pode('caderno.ver');

      const itens: Acerto[] = [
        ...telas(pode),
        ...(podeValvulas ? talhoes : []).map((t): Acerto => ({ grupo: 'Válvulas', icone: 'map-marker-outline', titulo: t.codigo ?? t.nome ?? `Válvula ${t.id}`, sub: [t.variedade ?? t.cultura, t.fazenda].filter(Boolean).join(' · '), rota: '/talhao', params: { id: String(t.id) }, termos: limpar([t.codigo, t.nome, t.variedade, t.cultura, t.fazenda].filter(Boolean).join(' ')) })),
        ...(podeAlgum('estoque.ver', 'estoque.produtos_insumos.ver') ? produtos : []).map((p): Acerto => ({ grupo: 'Estoque', icone: 'package-variant', titulo: p.nome ?? p.codigo ?? `Produto ${p.id}`, sub: p.grupo ?? undefined, rota: '/estoque', termos: limpar([p.nome, p.codigo, p.grupo].filter(Boolean).join(' ')) })),
        ...(podeMIP ? aplic : []).map((a): Acerto => ({ grupo: 'Aplicações', icone: 'spray', titulo: `${a.tipo ?? 'Aplicação'} · ${a.talhao_nome ?? ''}`.trim(), sub: a.status ?? undefined, rota: '/aplicacao', params: { id: String(a.id) }, termos: limpar([a.tipo, a.talhao_nome, a.status].filter(Boolean).join(' ')) })),
        ...(podeValvulas ? alertas.filter((a) => a.status == null || a.status === 'aberto') : []).map((a): Acerto => {
          const setor = setorPorTalhaoId.get(String(a.talhao_id));
          return { grupo: 'Alertas', icone: 'alert-outline', titulo: a.titulo ?? 'Alerta', sub: a.categoria ?? undefined, rota: setor != null ? '/talhao' : '/painel', params: setor != null ? { id: String(setor) } : undefined, termos: limpar([a.titulo, a.mensagem, a.categoria].filter(Boolean).join(' ')) };
        }),
        ...(podeCargas ? cargas : []).map((c, i): Acerto => ({ grupo: 'Cargas', icone: 'truck-outline', titulo: c.romaneio ?? `Carga ${c.id ?? i}`, sub: [c.talhao, c.fazenda].filter(Boolean).join(' · '), rota: '/relatorio', params: { id: 'cargas' }, termos: limpar([c.romaneio, c.talhao, c.fazenda].filter(Boolean).join(' ')) })),
        ...(podeCompras ? pedidos : []).map((p): Acerto => ({ grupo: 'Compras', icone: 'cart-outline', titulo: p.numero ?? `Pedido ${p.id}`, sub: p.fornecedor ?? undefined, rota: '/compras', termos: limpar([p.numero, p.fornecedor, p.status].filter(Boolean).join(' ')) })),
        ...(pode('nutricao.analise_solo.ver') ? solo : []).map((a): Acerto => ({ grupo: 'Nutrição', icone: 'leaf', titulo: `Análise · ${a.valvula ?? a.talhao ?? a.id}`, sub: [a.fazenda, a.data_amostra].filter(Boolean).join(' · '), rota: '/nutricao', termos: limpar([a.valvula, a.talhao, a.fazenda].filter(Boolean).join(' ')) })),
        ...(pode('nutricao.analise_foliar.ver') ? foliar : []).map((a): Acerto => ({ grupo: 'Nutrição', icone: 'leaf', titulo: `Análise · ${a.valvula ?? a.talhao ?? a.id}`, sub: [a.fazenda, a.data_amostra].filter(Boolean).join(' · '), rota: '/nutricao', termos: limpar([a.valvula, a.talhao, a.fazenda].filter(Boolean).join(' ')) })),
        ...(pode('agro.produtividade.ver') ? prod : []).map((p): Acerto => ({ grupo: 'Produtividade', icone: 'chart-line', titulo: `${p.valvula ?? p.id} · ${p.variedade ?? ''}`.trim(), sub: p.fazenda ?? undefined, rota: '/produtividade', termos: limpar([p.valvula, p.variedade, p.fazenda].filter(Boolean).join(' ')) })),
        ...(podeApontamentos ? apont.slice(0, 200) : []).map((a): Acerto => ({ grupo: 'Apontamentos', icone: 'notebook-outline', titulo: a.atividade ?? a.tipo ?? 'Apontamento', sub: [a.valvula ?? a.talhao_nome, a.data].filter(Boolean).join(' · '), rota: '/caderno', termos: limpar([a.atividade, a.tipo, a.valvula, a.talhao_nome, a.responsavel].filter(Boolean).join(' ')) })),
      ];
      if (ativo) setIndice(itens);
    })();
    return () => { ativo = false; };
  }, [pode, ultima]));

  const grupos = useMemo(() => {
    const q = limpar(termo.trim());
    if (q === '') return [] as Array<{ grupo: string; itens: Acerto[] }>;
    const partes = q.split(/\s+/);
    const casa = indice.filter((a) => partes.every((p) => a.termos.includes(p)));
    const porGrupo = new Map<string, Acerto[]>();
    for (const a of casa) {
      const lista = porGrupo.get(a.grupo) ?? [];
      if (lista.length < MAX_POR_GRUPO) { lista.push(a); porGrupo.set(a.grupo, lista); }
    }
    /* Telas primeiro, depois o resto por tamanho */
    return [...porGrupo.entries()].map(([grupo, itens]) => ({ grupo, itens })).sort((x, y) => (x.grupo === 'Telas' ? -1 : y.grupo === 'Telas' ? 1 : y.itens.length - x.itens.length));
  }, [termo, indice]);

  const total = grupos.reduce((s, g) => s + g.itens.length, 0);
  const abrir = useCallback((a: Acerto) => { router.push(a.params != null ? { pathname: a.rota as never, params: a.params } : (a.rota as never)); }, []);

  return (
    <View style={e.tela}>
      <View style={e.topo}>
        <View style={e.campoLinha}>
          <MaterialCommunityIcons name="magnify" size={22} color={cor.textoSuave} />
          <TextInput
            value={termo}
            onChangeText={setTermo}
            placeholder="Buscar válvula, produto, alerta, tela…"
            placeholderTextColor={cor.textoSuave}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            style={e.campo}
            returnKeyType="search"
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
        {termo.trim() === '' ? (
          <Text style={e.dica}>Digite para procurar em tudo que está no aparelho — e nas telas do app.</Text>
        ) : total === 0 ? (
          <Text style={e.dica}>Nada encontrado para “{termo.trim()}”.</Text>
        ) : grupos.map((g) => (
          <View key={g.grupo}>
            <Text style={e.grupo}>{g.grupo.toUpperCase()}</Text>
            {g.itens.map((a, i) => (
              <Pressable key={`${g.grupo}-${i}`} accessibilityRole="button" onPress={() => abrir(a)} style={({ pressed }) => [e.item, pressed && e.itemPressionado]}>
                <View style={e.icone}><MaterialCommunityIcons name={a.icone} size={20} color={cor.acao} /></View>
                <View style={e.textoFlex}>
                  <Text style={e.itemTitulo} numberOfLines={1}>{a.titulo}</Text>
                  {a.sub != null && a.sub !== '' && <Text style={e.itemSub} numberOfLines={1}>{a.sub}</Text>}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={cor.textoDesativado} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  topo: { padding: espaco.md, paddingBottom: espaco.sm },
  campoLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md, minHeight: toque.alvo },
  campo: { flex: 1, color: cor.texto, fontSize: fonte.normal, fontFamily: familia.corpo },
  conteudo: { paddingHorizontal: espaco.md, paddingBottom: espaco.xl },
  dica: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24, marginTop: espaco.lg },
  grupo: { color: cor.textoDesativado, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, marginTop: espaco.lg, marginBottom: espaco.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md, minHeight: 60, marginBottom: espaco.xs, ...sombra.cartao },
  itemPressionado: { borderColor: cor.acaoApoio, backgroundColor: cor.fundoSuave },
  icone: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: cor.okFundo, borderRadius: raio.sm },
  textoFlex: { flex: 1 },
  itemTitulo: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '700' },
  itemSub: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: 2 },
});
