import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import type { ApontamentoAberto, Colaborador, PlanejamentoMaoDeObra, Talhao } from '@/api/tipos';
import { lerCarga, rotuloEstado, rotuloTipo } from '@/caderno/modelo';
import { lerCache } from '@/db/banco';
import { enfileirar, todos } from '@/sinc/fila';
import type { ItemFila } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, Campo, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

type Producao = { colaborador: Colaborador; quantidade: string; selecionado: boolean; modalidade: 'producao' | 'diaria' };

export default function Apontamento() {
  const { origem, chave } = useLocalSearchParams<{ origem?: string; chave?: string }>();
  const { recontar, agora } = useSinc();
  const [servidor, setServidor] = useState<ApontamentoAberto | null>(null);
  const [local, setLocal] = useState<ItemFila | null>(null);
  const [talhao, setTalhao] = useState<string>('Válvula não informada');
  const [producao, setProducao] = useState<Producao[]>([]);
  const [observacao, setObservacao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<'caixa' | 'kg' | 'plantas'>('caixa');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [abertos, fila, colaboradores, talhoes] = await Promise.all([lerCache<ApontamentoAberto>('apontamentos_abertos'), todos(), lerCache<Colaborador>('colaboradores'), lerCache<Talhao>('talhoes')]);
        if (origem === 'servidor') {
          const item = abertos.find((registro) => String(registro.id) === chave) ?? null;
          setServidor(item); setObservacao(item?.observacao ?? '');
          const nomeTalhao = item?.talhao_nome ?? talhoes.find((t) => t.id === item?.talhao_id)?.nome;
          if (nomeTalhao != null) setTalhao(nomeTalhao);
        } else {
          const item = fila.find((registro) => registro.clientUuid === chave) ?? null;
          setLocal(item);
          const carga = item == null ? null : lerCarga(item);
          setObservacao(carga?.observacao ?? '');
          const nomeTalhao = talhoes.find((t) => t.id === carga?.talhao_id)?.nome;
          if (nomeTalhao != null) setTalhao(nomeTalhao);
        }
        setProducao(colaboradores.map((colaborador) => ({ colaborador, quantidade: '', selecionado: false, modalidade: colaborador.modalidade_padrao ?? 'producao' })));
      } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível abrir o apontamento.'); }
      finally { setCarregando(false); }
    })();
  }, [chave, origem]);

  const cargaLocal = useMemo(() => local == null ? null : lerCarga(local), [local]);
  const apontamentoId = servidor?.id;
  const planejamento = useMemo<PlanejamentoMaoDeObra | null>(() => {
    const salvo = servidor?.planejamento_mo ?? cargaLocal?.planejamento_mo ?? null;
    if (typeof salvo !== 'string') return salvo;
    try { return JSON.parse(salvo) as PlanejamentoMaoDeObra; } catch { return null; }
  }, [cargaLocal?.planejamento_mo, servidor?.planejamento_mo]);

  const colaboradoresPayload = useCallback(() => producao.filter((item) => item.selecionado).map((item) => {
    const id = item.colaborador.pessoa_id ?? item.colaborador.id;
    const base: Record<string, unknown> = item.colaborador.origem === 'terceirizado'
      ? { origem: 'terceirizado', terceirizado_id: id, modalidade: item.modalidade }
      : { colaborador_id: id };
    const numero = Number(item.quantidade.replace(',', '.'));
    base.quantidade = Number.isFinite(numero) && numero > 0 ? numero : 0;
    return base;
  }), [producao]);

  const salvarProducao = useCallback(async () => {
    if (apontamentoId == null) return;
    const colaboradores = colaboradoresPayload();
    if (colaboradores.length === 0) { setErro('Selecione pelo menos uma pessoa.'); return; }
    setSalvando(true); setErro(null);
    try {
      await enfileirar({ tipo: 'producao_apontamento', rota: `/apontamentos/${apontamentoId}/producao`, payload: { colaboradores } });
      await recontar(); void agora(); setMensagem('Produção guardada na fila de envio.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível guardar a produção.'); }
    finally { setSalvando(false); }
  }, [agora, apontamentoId, colaboradoresPayload, recontar]);

  const concluir = useCallback(async () => {
    if (apontamentoId == null) return;
    const numero = Number(quantidade.replace(',', '.'));
    setSalvando(true); setErro(null);
    try {
      const payload: Record<string, unknown> = { observacao: observacao.trim() };
      if (Number.isFinite(numero) && numero > 0) { payload.quantidade = numero; payload.quantidade_unidade = unidade; }
      const colaboradores = colaboradoresPayload();
      if (colaboradores.length > 0) payload.colaboradores = colaboradores;
      await enfileirar({ tipo: 'conclusao_apontamento', rota: `/apontamentos/${apontamentoId}/concluir`, payload });
      await recontar(); void agora(); setMensagem('Conclusão guardada na fila de envio.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível guardar a conclusão.'); }
    finally { setSalvando(false); }
  }, [agora, apontamentoId, colaboradoresPayload, observacao, quantidade, recontar, unidade]);

  const alterarPessoa = (indice: number, mudanca: Partial<Producao>) => setProducao((atual) => atual.map((item, i) => i === indice ? { ...item, ...mudanca } : item));

  if (carregando) return <View style={e.tela}><Carregando /></View>;
  if (servidor === null && local === null) return <View style={e.tela}><Vazio titulo="Apontamento não encontrado" detalhe="Ele pode ter sido concluído em outra sincronização." /></View>;
  const tipo = servidor?.tipo ?? cargaLocal?.tipo;
  const data = servidor?.data_apontamento ?? servidor?.iniciado_em?.slice(0, 10) ?? cargaLocal?.data ?? local?.criadoEm.slice(0, 10);

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <View style={e.cartaoResumo}>
        <Text style={e.titulo}>{rotuloTipo(tipo)}</Text><Text style={e.talhao}>{talhao}</Text><Text style={e.data}>{data}</Text>
        {local !== null && <Text style={[e.estado, local.estado === 'falha' ? e.estadoErro : e.estadoPendente]}>{rotuloEstado(local.estado)}</Text>}
      </View>
      {planejamento !== null && <View style={e.planejamento}>
        <Text style={e.pessoaNome}>Planejamento estimado</Text>
        <Text style={e.pessoaFuncao}>{[planejamento.total ? `Total ${planejamento.total} ${planejamento.unidade ?? ''}` : null, planejamento.meta ? `Meta ${planejamento.meta}/pessoa/dia` : null, planejamento.media ? `Média ${planejamento.media}/pessoa/dia` : null, planejamento.dias ? `${planejamento.dias} dia(s)` : null, planejamento.pessoas ? `${planejamento.pessoas} pessoa(s)` : null].filter(Boolean).join(' · ') || 'Sem parâmetros adicionais.'}</Text>
        <Text style={e.pessoaFuncao}>Estimativa informativa; o realizado é registrado na conclusão.</Text>
      </View>}
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
      {mensagem !== null && <View style={e.faixa}><Faixa texto={mensagem} /></View>}
      {local !== null ? <Text style={e.aviso}>Este apontamento precisa chegar ao servidor antes de receber produção ou ser concluído.</Text> : (
        <>
          <Text style={e.secao}>Pessoas e produção</Text>
          {producao.length === 0 ? <Text style={e.aviso}>Nenhum colaborador disponível no cache. Sincronize para atualizar o cadastro.</Text> : producao.map((item, indice) => (
            <View key={String(item.colaborador.id)} style={e.pessoa}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.selecionado }} onPress={() => alterarPessoa(indice, { selecionado: !item.selecionado })} style={e.pessoaCabecalho}><View style={[e.caixa, item.selecionado && e.caixaAtiva]} /><View style={e.pessoaTexto}><Text style={e.pessoaNome}>{item.colaborador.nome ?? `Pessoa ${item.colaborador.id}`}</Text>{item.colaborador.funcao != null && <Text style={e.pessoaFuncao}>{item.colaborador.funcao}</Text>}</View></Pressable>
              {item.selecionado && <Campo rotulo="Quantidade produzida" value={item.quantidade} onChangeText={(valor) => alterarPessoa(indice, { quantidade: valor })} keyboardType="decimal-pad" placeholder="Opcional" />}
              {item.selecionado && item.colaborador.origem === 'terceirizado' && <View style={e.modalidades}>{(['producao', 'diaria'] as const).map((modalidade) => <Pressable key={modalidade} onPress={() => alterarPessoa(indice, { modalidade })} style={[e.chip, item.modalidade === modalidade && e.chipAtivo]}><Text style={[e.chipTexto, item.modalidade === modalidade && e.chipTextoAtivo]}>{modalidade === 'producao' ? 'Produção' : 'Diária'}</Text></Pressable>)}</View>}
            </View>
          ))}
          <Botao titulo="Guardar produção" variante="secundario" ocupado={salvando} aoTocar={() => void salvarProducao()} />
          <Text style={e.secao}>Conclusão</Text>
          <Campo rotulo="Observação" value={observacao} onChangeText={setObservacao} multiline numberOfLines={4} textAlignVertical="top" placeholder="Descreva o resultado do trabalho (opcional)" />
          <Campo rotulo="Quantidade total" value={quantidade} onChangeText={setQuantidade} keyboardType="decimal-pad" placeholder="Opcional; informe quantidades por pessoa acima" />
          <Text style={e.rotulo}>Unidade</Text><View style={e.modalidades}>{(['caixa', 'kg', 'plantas'] as const).map((item) => <Pressable key={item} onPress={() => setUnidade(item)} style={[e.chip, unidade === item && e.chipAtivo]}><Text style={[e.chipTexto, unidade === item && e.chipTextoAtivo]}>{item}</Text></Pressable>)}</View>
          <View style={e.concluir}><Botao titulo="Concluir apontamento" ocupado={salvando} aoTocar={() => void concluir()} /></View>
          <Text style={e.aviso}>A conclusão no app envia o registro para Pendente. A validação administrativa e o fechamento da OS/custeio continuam no Web.</Text>
        </>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl }, cartaoResumo: { backgroundColor: cor.superficie, borderColor: cor.borda, borderWidth: 1, borderRadius: raio.lg, padding: espaco.md }, planejamento: { backgroundColor: cor.superficie, borderColor: cor.borda, borderWidth: 1, borderRadius: raio.lg, padding: espaco.md, marginTop: espaco.md }, titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: '800' }, talhao: { color: cor.texto, fontSize: fonte.media, marginTop: espaco.sm }, data: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs }, estado: { alignSelf: 'flex-start', overflow: 'hidden', marginTop: espaco.md, borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: espaco.xs, fontSize: fonte.pequena, fontWeight: '700' }, estadoPendente: { color: cor.alerta, backgroundColor: cor.alertaFundo }, estadoErro: { color: cor.erro, backgroundColor: cor.erroFundo }, faixa: { marginTop: espaco.md }, aviso: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24, marginTop: espaco.lg }, secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.xl, marginBottom: espaco.sm }, pessoa: { backgroundColor: cor.superficie, borderColor: cor.borda, borderWidth: 1, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm }, pessoaCabecalho: { minHeight: toque.alvo, flexDirection: 'row', alignItems: 'center' }, caixa: { width: 26, height: 26, borderWidth: 2, borderColor: cor.bordaForte, borderRadius: raio.sm, marginRight: espaco.md }, caixaAtiva: { backgroundColor: cor.acao, borderColor: cor.acao }, pessoaTexto: { flex: 1 }, pessoaNome: { color: cor.texto, fontSize: fonte.normal, fontWeight: '700' }, pessoaFuncao: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs }, modalidades: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, marginBottom: espaco.md }, chip: { minHeight: toque.alvo, justifyContent: 'center', backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md }, chipAtivo: { backgroundColor: cor.acao, borderColor: cor.acao }, chipTexto: { color: cor.texto, fontSize: fonte.pequena, textTransform: 'capitalize' }, chipTextoAtivo: { color: cor.acaoTexto, fontWeight: '700' }, rotulo: { color: cor.textoSuave, fontSize: fonte.pequena, marginBottom: espaco.sm }, concluir: { marginTop: espaco.sm },
});
