import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { lerCache } from '@/db/banco';
import { CATALOGO_RELATORIOS, formatarCelula, larguraTabela, podeAcessarRelatorio, valorColuna } from '@/relatorios/catalogo';
import type { ColunaRelatorio } from '@/relatorios/catalogo';
import { useSinc } from '@/sinc/useSinc';
import { useSessao } from '@/sessao';
import { Botao, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { Paginacao } from '@/ui/Paginacao';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

const POR_PAGINA = 5;

export default function RelatorioGenerico() {
  const { id } = useLocalSearchParams<{ id?: string }>(); const { agora, ultima } = useSinc(); const relatorio = CATALOGO_RELATORIOS.find((item) => item.id === id) ?? null;
  const { pode } = useSessao();
  const podeAcessar = relatorio !== null && podeAcessarRelatorio(relatorio, pode);
  const [registros, setRegistros] = useState<Record<string, unknown>[] | null>(null); const [busca, setBusca] = useState(''); const [atualizando, setAtualizando] = useState(false); const [erro, setErro] = useState<string | null>(null); const [pagina, setPagina] = useState(0);
  const carregar = useCallback(async () => { if (relatorio === null || !podeAcessar) return; try { setRegistros(await lerCache<Record<string, unknown>>(relatorio.modulo)); setErro(null); } catch (e) { setRegistros([]); setErro(e instanceof Error ? e.message : 'Não foi possível abrir a consulta.'); } }, [podeAcessar, relatorio]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));
  const atualizar = useCallback(async () => { setAtualizando(true); await agora(); await carregar(); setAtualizando(false); }, [agora, carregar]);
  const visiveis = useMemo(() => { const termo = busca.trim().toLocaleLowerCase('pt-BR'); if (termo === '' || relatorio === null) return registros ?? []; return (registros ?? []).filter((registro) => relatorio.colunas.some((coluna) => formatarCelula(valorColuna(registro, coluna), coluna.tipo).toLocaleLowerCase('pt-BR').includes(termo))); }, [busca, registros, relatorio]);
  useEffect(() => { setPagina(0); }, [busca, id]);
  if (relatorio === null) return <View style={e.tela}><Vazio titulo="Relatório não encontrado" detalhe="Volte ao catálogo e escolha uma consulta disponível." /></View>;
  if (!podeAcessar) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não tem acesso a esta consulta." /></View>;
  if (registros === null) return <View style={e.tela}><Carregando /></View>;
  const largura = larguraTabela(relatorio);
  const listaPagina = visiveis.slice(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA);
  return <View style={e.tela}><View style={e.topo}><Text style={e.titulo}>{relatorio.titulo}</Text><Text style={e.subtitulo}>{relatorio.descricao}</Text><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar nesta consulta" placeholderTextColor={cor.textoSuave} style={e.busca} />{erro !== null && <Faixa texto={erro} tom="erro" />}{ultima?.modulosPulados.includes(relatorio.modulo) && <Faixa texto="Esta consulta não foi atualizada na última sincronização." tom="alerta" />}<Text style={e.contagem}>{visiveis.length} registro(s)</Text></View>{visiveis.length === 0 ? <Vazio titulo="Nenhum registro encontrado" detalhe="Sincronize ou altere o texto da busca." acao={<Botao titulo="Sincronizar agora" ocupado={atualizando} aoTocar={() => void atualizar()} />} /> : <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: largura }}><FlatList style={{ width: largura }} data={listaPagina} keyExtractor={(item, indice) => String(item.id ?? item.client_uuid ?? indice)} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => void atualizar()} tintColor={cor.acao} />} ListHeaderComponent={<LinhaCabecalho colunas={relatorio.colunas} />} renderItem={({ item, index }) => <LinhaTabela item={item} colunas={relatorio.colunas} alternada={index % 2 === 1} />} ListFooterComponent={<View style={{ paddingHorizontal: espaco.md }}><Paginacao pagina={pagina} porPagina={POR_PAGINA} total={visiveis.length} aoTrocar={setPagina} /></View>} /></ScrollView>}</View>;
}

function LinhaCabecalho({ colunas }: { colunas: ColunaRelatorio[] }) { return <View style={e.linhaCabecalho}>{colunas.map((coluna) => <Text key={coluna.campo} style={[e.celulaCabecalho, { width: coluna.largura ?? 140 }]}>{coluna.titulo}</Text>)}</View>; }
function LinhaTabela({ item, colunas, alternada }: { item: Record<string, unknown>; colunas: ColunaRelatorio[]; alternada: boolean }) { return <View style={[e.linha, alternada && e.linhaAlternada]}>{colunas.map((coluna) => <Text key={coluna.campo} numberOfLines={2} style={[e.celula, coluna.tipo === 'numero' || coluna.tipo === 'moeda' ? e.celulaNumero : null, coluna.tipo === 'status' ? e.celulaStatus : null, { width: coluna.largura ?? 140 }]}>{formatarCelula(valorColuna(item, coluna), coluna.tipo)}</Text>)}</View>; }
const e = StyleSheet.create({ tela: { flex: 1, backgroundColor: cor.fundo }, topo: { padding: espaco.md, gap: espaco.sm }, titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: '800' }, subtitulo: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24 }, busca: { minHeight: toque.alvo, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md, color: cor.texto, fontSize: fonte.normal }, contagem: { color: cor.textoSuave, fontSize: fonte.pequena }, linhaCabecalho: { flexDirection: 'row', minHeight: toque.alvo, alignItems: 'center', backgroundColor: cor.cabecalho }, celulaCabecalho: { color: cor.acaoTexto, fontSize: fonte.pequena, fontWeight: '800', paddingHorizontal: espaco.sm }, linha: { flexDirection: 'row', minHeight: 58, alignItems: 'center', backgroundColor: cor.superficie, borderBottomWidth: 1, borderBottomColor: cor.borda }, linhaAlternada: { backgroundColor: cor.fundoSuave }, celula: { color: cor.texto, fontSize: fonte.pequena, lineHeight: 20, paddingHorizontal: espaco.sm }, celulaNumero: { textAlign: 'right', fontWeight: '700' }, celulaStatus: { color: cor.acao, fontWeight: '700', textTransform: 'capitalize' } });
