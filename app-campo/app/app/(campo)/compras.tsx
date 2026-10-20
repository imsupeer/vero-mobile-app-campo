import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { CentroCusto, ComprasAprovacaoPendente, ComprasPedido, ComprasPedidoItem, ComprasSolicitacao, SafraTalhao } from '@/api/tipos';
import type { ItemSincronizado } from '@/api/tipos';
import { dataHoje, dataValida } from '@/caderno/modelo';
import { lerCache } from '@/db/banco';
import { enfileirar } from '@/sinc/fila';
import { useSessao } from '@/sessao';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Campo, CampoData, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { Seletor, SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

type Produto = ItemSincronizado & { id: number; codigo?: string | null; nome?: string | null; unidade?: string | null; controla_validade?: number | boolean | null };
type ItemSolicitacao = { produto_id: number | null; descricao: string; quantidade: string };

const brl = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'; };
const num = (s: string) => { const n = Number(s.replace(',', '.')); return Number.isFinite(n) ? n : NaN; };

export default function Compras() {
  const { pode } = useSessao();
  const { recontar, agora } = useSinc();
  const podeAprovar = pode('compras.aprovacoes.editar');
  const podeReceber = pode('compras.recebimentos.editar');
  const podeSolicitar = pode('compras.solicitacoes_compra.editar');
  const podeEntrada = pode('estoque.entradas.editar');
  const podeConsultarPedidos = pode('compras.ver') || pode('compras.pedidos_compra.ver');
  const podeConsultarSolicitacoes = pode('compras.ver') || pode('compras.solicitacoes_compra.ver');
  const podeConsultar = podeConsultarPedidos || podeConsultarSolicitacoes;

  const modos = useMemo(() => {
    const lista: Array<{ valor: string; rotulo: string }> = [];
    if (podeAprovar) lista.push({ valor: 'aprovacoes', rotulo: 'Aprovações' });
    if (podeReceber) lista.push({ valor: 'receber', rotulo: 'Receber pedido' });
    if (podeSolicitar) lista.push({ valor: 'solicitar', rotulo: 'Solicitar' });
    if (podeEntrada) lista.push({ valor: 'recebimento', rotulo: 'Entrada rápida' });
    if (podeConsultar) lista.push({ valor: 'historico', rotulo: 'Histórico' });
    return lista;
  }, [podeAprovar, podeReceber, podeSolicitar, podeEntrada, podeConsultar]);
  const [modo, setModo] = useState('');
  useEffect(() => { if (modo === '' && modos[0] != null) setModo(modos[0].valor); }, [modo, modos]);

  const [aprovacoes, setAprovacoes] = useState<ComprasAprovacaoPendente[]>([]);
  const [pedidos, setPedidos] = useState<ComprasPedido[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<ComprasSolicitacao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [safrasTalhoes, setSafrasTalhoes] = useState<SafraTalhao[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [periodoHistorico, setPeriodoHistorico] = useState<'todos' | '30' | '90' | '365'>('todos');

  const carregar = useCallback(async () => {
    try {
      const [ap, ped, sols, prod, saf, cc] = await Promise.all([lerCache<ComprasAprovacaoPendente>('compras_aprovacoes_pendentes'), lerCache<ComprasPedido>('compras_pedidos'), lerCache<ComprasSolicitacao>('compras_solicitacoes').catch(() => []), lerCache<Produto>('estoque'), lerCache<SafraTalhao>('safras_talhoes').catch(() => []), lerCache<CentroCusto>('centros_custo').catch(() => [])]);
      setAprovacoes(ap); setPedidos(ped); setSolicitacoes(sols); setProdutos(prod); setSafrasTalhoes(saf); setCentrosCusto(cc);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar as compras.'); }
    finally { setCarregando(false); }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  const opcoesProduto = useMemo(() => produtos.map((p) => ({ id: p.id, nome: p.nome ?? p.codigo ?? `Produto ${p.id}` })).sort((a, b) => a.nome.localeCompare(b.nome)), [produtos]);

  /* ── aprovações ── */
  const [obsAprovacao, setObsAprovacao] = useState('');
  const decidir = useCallback(async (pedidoId: number, decisao: 'aprovar' | 'rejeitar') => {
    setErro(null); setMensagem(null);
    try {
      const payload: Record<string, unknown> = {};
      if (obsAprovacao.trim() !== '') payload.observacao = obsAprovacao.trim();
      await enfileirar({ tipo: 'compra_aprovacao', rota: `/compras/pedidos/${pedidoId}/${decisao}`, payload });
      setAprovacoes((atual) => atual.filter((a) => a.id !== pedidoId));
      setObsAprovacao('');
      await recontar(); void agora();
      setMensagem(decisao === 'aprovar' ? 'Aprovação guardada na fila.' : 'Rejeição guardada na fila.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível registrar a decisão.'); }
  }, [agora, obsAprovacao, recontar]);

  /* ── receber pedido ── */
  const recebiveis = useMemo(() => pedidos.filter((p) => p.status === 'aprovado' || p.status === 'recebido_parcial'), [pedidos]);
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const pedidoSel = useMemo(() => recebiveis.find((p) => p.id === pedidoId) ?? null, [recebiveis, pedidoId]);
  const [recebido, setRecebido] = useState<Record<number, { qtd: string; validade: string }>>({});
  const [dataReceb, setDataReceb] = useState(dataHoje());

  const pendenteItem = (it: ComprasPedidoItem) => Math.max(0, Number(it.quantidade ?? 0) - Number(it.quantidade_recebida ?? 0));
  const escolherPedido = (id: number) => {
    setPedidoId(id);
    const p = recebiveis.find((x) => x.id === id);
    const mapa: Record<number, { qtd: string; validade: string }> = {};
    (p?.itens ?? []).forEach((it) => { mapa[it.pedido_item_id] = { qtd: String(pendenteItem(it) || ''), validade: '' }; });
    setRecebido(mapa);
  };
  const receber = useCallback(async () => {
    if (pedidoSel == null) { setErro('Escolha um pedido.'); return; }
    if (!dataValida(dataReceb)) { setErro('Data no formato AAAA-MM-DD.'); return; }
    const itens = (pedidoSel.itens ?? []).map((it) => {
      const entrada = recebido[it.pedido_item_id];
      const q = num(entrada?.qtd ?? '');
      if (!Number.isFinite(q) || q <= 0) return null;
      const item: Record<string, unknown> = { pedido_item_id: it.pedido_item_id, quantidade: q };
      if (entrada?.validade && /^\d{4}-\d{2}-\d{2}$/.test(entrada.validade)) item.validade = entrada.validade;
      return item;
    }).filter((x): x is Record<string, unknown> => x !== null);
    if (itens.length === 0) { setErro('Informe a quantidade recebida de ao menos um item.'); return; }
    setErro(null); setMensagem(null);
    try {
      await enfileirar({ tipo: 'compra_recebimento', rota: `/compras/pedidos/${pedidoSel.id}/receber`, payload: { data: dataReceb, itens } });
      setPedidoId(null); setRecebido({});
      await recontar(); void agora();
      setMensagem('Recebimento guardado na fila de envio.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível registrar o recebimento.'); }
  }, [agora, dataReceb, pedidoSel, recebido, recontar]);

  /* ── solicitar ── */
  const [itensSC, setItensSC] = useState<ItemSolicitacao[]>([]);
  const [prodSC, setProdSC] = useState<number | null>(null);
  const [descSC, setDescSC] = useState('');
  const [qtdSC, setQtdSC] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [dataSC, setDataSC] = useState(dataHoje());
  const [safraTIdSC, setSafraTIdSC] = useState<number | null>(null);
  const [centroCustoIdSC, setCentroCustoIdSC] = useState<number | null>(null);
  const adicionarItemSC = () => {
    const q = num(qtdSC);
    if (!Number.isFinite(q) || q <= 0) { setErro('Informe a quantidade do item.'); return; }
    if (prodSC === null && descSC.trim() === '') { setErro('Escolha um produto ou descreva o item.'); return; }
    setErro(null);
    setItensSC((atual) => [...atual, { produto_id: prodSC, descricao: descSC.trim(), quantidade: qtdSC }]);
    setProdSC(null); setDescSC(''); setQtdSC('');
  };
  const solicitar = useCallback(async () => {
    if (itensSC.length === 0) { setErro('Adicione ao menos um item.'); return; }
    if (!dataValida(dataSC)) { setErro('Informe uma data de solicitação válida.'); return; }
    setErro(null); setMensagem(null);
    try {
      const itens = itensSC.map((i) => { const item: Record<string, unknown> = { quantidade: num(i.quantidade) }; if (i.produto_id !== null) item.produto_id = i.produto_id; if (i.descricao !== '') item.descricao = i.descricao; return item; });
      const payload: Record<string, unknown> = { itens, data: dataSC };
      if (safraTIdSC !== null) payload.safra_talhao_id = safraTIdSC;
      if (centroCustoIdSC !== null) payload.centro_custo_id = centroCustoIdSC;
      if (justificativa.trim() !== '') payload.justificativa = justificativa.trim();
      await enfileirar({ tipo: 'compra_solicitacao', rota: '/compras/solicitacoes', payload });
      setItensSC([]); setJustificativa(''); setDataSC(dataHoje()); setSafraTIdSC(null); setCentroCustoIdSC(null);
      await recontar(); void agora();
      setMensagem('Solicitação guardada na fila de envio.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível registrar a solicitação.'); }
  }, [agora, centroCustoIdSC, dataSC, itensSC, justificativa, recontar, safraTIdSC]);

  /* ── entrada rápida ── */
  const [prodEnt, setProdEnt] = useState<number | null>(null);
  const [qtdEnt, setQtdEnt] = useState('');
  const [validadeEnt, setValidadeEnt] = useState('');
  const [loteEnt, setLoteEnt] = useState('');
  const [nfEnt, setNfEnt] = useState('');
  const [divergencia, setDivergencia] = useState(false);
  const entrada = useCallback(async () => {
    if (prodEnt === null) { setErro('Escolha o produto.'); return; }
    const q = num(qtdEnt);
    if (!Number.isFinite(q) || q <= 0) { setErro('Informe a quantidade.'); return; }
    if (validadeEnt !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(validadeEnt)) { setErro('Validade no formato AAAA-MM-DD.'); return; }
    setErro(null); setMensagem(null);
    try {
      const payload: Record<string, unknown> = { produto_id: prodEnt, quantidade: q, divergencia };
      if (validadeEnt) payload.validade = validadeEnt;
      if (loteEnt.trim()) payload.lote = loteEnt.trim();
      if (nfEnt.trim()) payload.nf_numero = nfEnt.trim();
      await enfileirar({ tipo: 'recebimento', rota: '/recebimentos/confirmar', payload });
      setProdEnt(null); setQtdEnt(''); setValidadeEnt(''); setLoteEnt(''); setNfEnt(''); setDivergencia(false);
      await recontar(); void agora();
      setMensagem('Entrada guardada na fila de envio.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível registrar a entrada.'); }
  }, [agora, divergencia, loteEnt, nfEnt, prodEnt, qtdEnt, recontar, validadeEnt]);

  if (carregando) return <View style={e.tela}><Carregando /></View>;
  if (modos.length === 0) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não opera o módulo de compras." /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta="Compras e estoque" titulo="Compras" subtitulo="Aprovar pedidos, receber mercadoria, solicitar e dar entrada rápida." />
      {modos.length > 1 && <SeletorTexto rotulo="Ação" opcoes={modos} valor={modo} aoMudar={(v) => { setModo(v); setErro(null); setMensagem(null); }} />}
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
      {mensagem !== null && <View style={e.faixa}><Faixa texto={mensagem} /></View>}

      {modo === 'aprovacoes' && (
        aprovacoes.length === 0 ? <View style={e.faixa}><Faixa texto="Nenhuma aprovação pendente." tom="alerta" /></View> : (
          <>
            <Campo rotulo="Observação (opcional, vale para a próxima decisão)" value={obsAprovacao} onChangeText={setObsAprovacao} placeholder="Motivo" />
            {aprovacoes.map((a) => (
              <View key={a.id} style={e.cartao}>
                <View style={e.topo}><Text style={e.titulo}>Pedido {a.numero ?? a.id}</Text>{(a.acima_orcamento === 1 || a.acima_orcamento === true) && <Text style={e.seloAlerta}>Acima do orçamento</Text>}</View>
                <Text style={e.detalhe}>{[a.fornecedor, brl(a.valor_total), `${String(a.itens_qtd ?? 0)} item(ns)`, a.data_pedido].filter(Boolean).join(' · ')}</Text>
                <View style={e.acoes}>
                  <Pressable onPress={() => void decidir(a.id, 'aprovar')} style={[e.acao, e.acaoOk]}><Text style={e.acaoOkTexto}>Aprovar</Text></Pressable>
                  <Pressable onPress={() => void decidir(a.id, 'rejeitar')} style={[e.acao, e.acaoNao]}><Text style={e.acaoNaoTexto}>Rejeitar</Text></Pressable>
                </View>
              </View>
            ))}
          </>
        )
      )}

      {modo === 'historico' && (
        <>
          {podeConsultarPedidos && <>
          <Text style={e.secao}>Pedidos de compra</Text>
          <Campo rotulo="Buscar pedido ou fornecedor" value={buscaHistorico} onChangeText={setBuscaHistorico} placeholder="Número, fornecedor ou situação" />
          <Text style={e.rotuloPeriodo}>Período</Text>
          <View style={e.abas}>
            {([{ valor: 'todos', rotulo: 'Todos' }, { valor: '30', rotulo: '30 dias' }, { valor: '90', rotulo: '90 dias' }, { valor: '365', rotulo: '12 meses' }] as const).map((item) => (
              <Pressable key={item.valor} accessibilityRole="button" accessibilityState={{ selected: periodoHistorico === item.valor }} onPress={() => setPeriodoHistorico(item.valor)} style={[e.aba, periodoHistorico === item.valor && e.abaAtiva]}><Text style={[e.abaTexto, periodoHistorico === item.valor && e.abaTextoAtivo]}>{item.rotulo}</Text></Pressable>
            ))}
          </View>
          {pedidos
            .filter((p) => {
              const termo = `${p.numero ?? ''} ${p.fornecedor ?? ''} ${p.status ?? ''}`.toLocaleLowerCase('pt-BR').includes(buscaHistorico.trim().toLocaleLowerCase('pt-BR'));
              if (!termo || periodoHistorico === 'todos' || !p.data_pedido) return termo;
              const limite = new Date(); limite.setDate(limite.getDate() - Number(periodoHistorico));
              return String(p.data_pedido).slice(0, 10) >= `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, '0')}-${String(limite.getDate()).padStart(2, '0')}`;
            })
            .sort((a, b) => String(b.data_pedido ?? '').localeCompare(String(a.data_pedido ?? '')))
            .map((p) => (
              <View key={p.id} style={e.cartao}>
                <View style={e.topo}><Text style={e.titulo}>Pedido {p.numero ?? p.id}</Text><Text style={e.selo}>{String(p.status ?? 'Sem situação').replace(/_/g, ' ')}</Text></View>
                <Text style={e.detalhe}>{[p.fornecedor, p.data_pedido, brl(p.valor_total)].filter(Boolean).join(' · ')}</Text>
                {(p.itens ?? []).map((it) => <Text key={it.pedido_item_id} style={e.detalhe}>{it.produto ?? it.descricao ?? `Produto ${it.produto_id ?? ''}`} · {String(it.quantidade_recebida ?? 0)}/{String(it.quantidade ?? 0)}</Text>)}
              </View>
            ))}
          {pedidos.length === 0 && <Vazio titulo="Sem pedidos no aparelho" detalhe="Atualize a sincronização para carregar o histórico disponível no ERP." />}
          </>}
          {podeConsultarSolicitacoes && <>
          <Text style={e.secao}>Solicitações de compra</Text>
          {solicitacoes
            .slice()
            .sort((a, b) => String(b.data_solicitacao ?? '').localeCompare(String(a.data_solicitacao ?? '')))
            .map((s) => (
              <View key={s.id} style={e.cartao}>
                <View style={e.topo}><Text style={e.titulo}>Solicitação {s.numero ?? s.id}</Text><Text style={e.selo}>{String(s.status ?? 'aberta').replace(/_/g, ' ')}</Text></View>
                <Text style={e.detalhe}>{[s.data_solicitacao, s.justificativa].filter(Boolean).join(' · ')}</Text>
                {(s.itens ?? []).map((it, idx) => <Text key={`${s.id}-${idx}`} style={e.detalhe}>{it.produto ?? it.descricao ?? `Produto ${it.produto_id ?? ''}`} · {String(it.quantidade ?? '—')}</Text>)}
              </View>
            ))}
          {solicitacoes.length === 0 && <Text style={e.detalhe}>Nenhuma solicitação sincronizada.</Text>}
          </>}
        </>
      )}

      {modo === 'receber' && (
        recebiveis.length === 0 ? <View style={e.faixa}><Faixa texto="Nenhum pedido aprovado aguardando recebimento." tom="alerta" /></View> : (
          <>
            <Seletor rotulo="Pedido *" opcoes={recebiveis.map((p) => ({ id: p.id, nome: `${p.numero ?? p.id}${p.fornecedor ? ` · ${p.fornecedor}` : ''}` }))} valor={pedidoId} aoMudar={(id) => id !== null && escolherPedido(id)} />
            {pedidoSel != null && (
              <>
                <Text style={e.secao}>Itens a receber</Text>
                {(pedidoSel.itens ?? []).map((it) => {
                  const pend = pendenteItem(it);
                  const entradaItem = recebido[it.pedido_item_id];
                  return (
                    <View key={it.pedido_item_id} style={e.cartao}>
                      <Text style={e.itemNome}>{it.produto ?? it.descricao ?? `Item ${it.pedido_item_id}`}</Text>
                      <Text style={e.detalhe}>Pendente: {pend}</Text>
                      <Campo rotulo="Quantidade recebida" value={entradaItem?.qtd ?? ''} onChangeText={(v) => setRecebido((atual) => ({ ...atual, [it.pedido_item_id]: { qtd: v, validade: atual[it.pedido_item_id]?.validade ?? '' } }))} keyboardType="decimal-pad" placeholder="0" />
                      {(it.controla_validade === 1 || it.controla_validade === true) && <CampoData rotulo="Validade (opcional)" value={entradaItem?.validade ?? ''} onChangeText={(v) => setRecebido((atual) => ({ ...atual, [it.pedido_item_id]: { qtd: atual[it.pedido_item_id]?.qtd ?? '', validade: v } }))} />}
                    </View>
                  );
                })}
                <CampoData rotulo="Data *" value={dataReceb} onChangeText={setDataReceb} />
                <View style={e.salvar}><Botao titulo="Registrar recebimento" ocupado={false} aoTocar={() => void receber()} /></View>
              </>
            )}
          </>
        )
      )}

      {modo === 'solicitar' && (
        <>
          <CampoData rotulo="Data da solicitação *" value={dataSC} onChangeText={setDataSC} />
          {safrasTalhoes.length > 0 && <Seletor rotulo="Safra · válvula (vínculo de custo)" opcoes={safrasTalhoes.map((item) => ({ id: item.id, nome: `${item.safra ?? `Safra ${item.safra_id ?? item.id}`} · ${item.talhao_id ?? 'válvula'}` }))} valor={safraTIdSC} aoMudar={setSafraTIdSC} permiteVazio rotuloVazio="Sem vínculo" />}
          {centrosCusto.length > 0 && <Seletor rotulo="Centro de custo" opcoes={centrosCusto.map((item) => ({ id: item.id, nome: `${item.codigo ? `${item.codigo} — ` : ''}${item.nome ?? `Centro ${item.id}`}` }))} valor={centroCustoIdSC} aoMudar={setCentroCustoIdSC} permiteVazio rotuloVazio="Nenhum" />}
          <Seletor rotulo="Produto do estoque" opcoes={opcoesProduto} valor={prodSC} aoMudar={setProdSC} permiteVazio rotuloVazio="Descrever" />
          {prodSC === null && <Campo rotulo="Descrição do item" value={descSC} onChangeText={setDescSC} placeholder="Item fora do cadastro" />}
          <Campo rotulo="Quantidade" value={qtdSC} onChangeText={setQtdSC} keyboardType="decimal-pad" placeholder="0" />
          <Botao titulo="Adicionar item" variante="secundario" aoTocar={adicionarItemSC} />
          {itensSC.length > 0 && (
            <View style={e.lista}>
              {itensSC.map((i, idx) => (
                <View key={idx} style={e.itemSC}>
                  <Text style={e.itemNome}>{i.produto_id !== null ? (opcoesProduto.find((o) => o.id === i.produto_id)?.nome ?? `Produto ${i.produto_id}`) : i.descricao}</Text>
                  <Text style={e.detalhe}>Qtd: {i.quantidade}</Text>
                  <Pressable onPress={() => setItensSC((atual) => atual.filter((_, k) => k !== idx))} hitSlop={8}><Text style={e.remover}>Remover</Text></Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={e.observacao}><Campo rotulo="Justificativa" value={justificativa} onChangeText={setJustificativa} placeholder="Opcional" /></View>
          <View style={e.salvar}><Botao titulo="Enviar solicitação" ocupado={false} aoTocar={() => void solicitar()} /></View>
        </>
      )}

      {modo === 'recebimento' && (
        <>
          <Seletor rotulo="Produto *" opcoes={opcoesProduto} valor={prodEnt} aoMudar={setProdEnt} />
          <Campo rotulo="Quantidade *" value={qtdEnt} onChangeText={setQtdEnt} keyboardType="decimal-pad" placeholder="0" />
          <CampoData rotulo="Validade (opcional)" value={validadeEnt} onChangeText={setValidadeEnt} />
          <View style={e.duas}><View style={e.col}><Campo rotulo="Lote" value={loteEnt} onChangeText={setLoteEnt} placeholder="Opcional" /></View><View style={e.col}><Campo rotulo="Nota fiscal" value={nfEnt} onChangeText={setNfEnt} placeholder="Opcional" /></View></View>
          <Pressable onPress={() => setDivergencia((v) => !v)} style={e.check}><View style={[e.caixa, divergencia && e.caixaAtiva]} /><Text style={e.checkTexto}>Recebido com divergência</Text></Pressable>
          <View style={e.salvar}><Botao titulo="Registrar entrada" ocupado={false} aoTocar={() => void entrada()} /></View>
        </>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  faixa: { marginTop: espaco.sm }, secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.lg, marginBottom: espaco.sm },
  cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginTop: espaco.sm },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm }, titulo: { flex: 1, color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' },
  seloAlerta: { overflow: 'hidden', color: cor.erro, backgroundColor: cor.erroFundo, borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 2, fontSize: 11, fontWeight: '800' },
  selo: { overflow: 'hidden', color: cor.acao, backgroundColor: cor.okFundo, borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 4, fontSize: fonte.pequena, fontWeight: '800', textTransform: 'capitalize' },
  detalhe: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  itemNome: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '700' },
  acoes: { flexDirection: 'row', gap: espaco.sm, marginTop: espaco.md },
  rotuloPeriodo: { color: cor.texto, fontSize: fonte.pequena, fontWeight: '700', marginBottom: espaco.xs },
  abas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.xs, marginBottom: espaco.sm },
  aba: { minHeight: toque.alvoPequeno, justifyContent: 'center', borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.sm, backgroundColor: cor.superficie },
  abaAtiva: { backgroundColor: cor.acao, borderColor: cor.acao },
  abaTexto: { color: cor.texto, fontSize: fonte.pequena, fontWeight: '700' }, abaTextoAtivo: { color: cor.acaoTexto },
  acao: { flex: 1, minHeight: toque.alvo, alignItems: 'center', justifyContent: 'center', borderRadius: raio.md, borderWidth: 1 },
  acaoOk: { backgroundColor: cor.acao, borderColor: cor.acao }, acaoOkTexto: { color: cor.acaoTexto, fontWeight: '700' },
  acaoNao: { backgroundColor: cor.superficie, borderColor: cor.erro }, acaoNaoTexto: { color: cor.erro, fontWeight: '700' },
  lista: { marginTop: espaco.md, gap: espaco.sm },
  itemSC: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, padding: espaco.md },
  remover: { color: cor.erro, fontSize: fonte.pequena, fontWeight: '700', marginTop: espaco.xs },
  duas: { flexDirection: 'row', gap: espaco.sm }, col: { flex: 1 }, observacao: { marginTop: espaco.md }, salvar: { marginTop: espaco.lg },
  check: { flexDirection: 'row', alignItems: 'center', minHeight: toque.alvo, marginTop: espaco.sm },
  caixa: { width: 24, height: 24, borderWidth: 2, borderColor: cor.bordaForte, borderRadius: raio.sm, marginRight: espaco.sm },
  caixaAtiva: { backgroundColor: cor.acao, borderColor: cor.acao }, checkTexto: { color: cor.texto, fontSize: fonte.normal },
});
