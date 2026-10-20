import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import type { Aplicacao, AplicacaoItem, AplicacaoOperador, Colaborador } from '@/api/tipos';
import { dataHoje, dataValida } from '@/caderno/modelo';
import { decimalAplicacao, horaAplicacaoValida, quantidadeRealAplicacao } from '@/mip/aplicacao';
import { lerCache } from '@/db/banco';
import { useSessao } from '@/sessao';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { AssinaturaPad } from '@/ui/AssinaturaPad';
import { Botao, CabecalhoPagina, Campo, CampoData, CampoHora, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

const CEU = [{ valor: '', rotulo: '—' }, { valor: 'noite', rotulo: 'Noite' }, { valor: 'sol', rotulo: 'Sol' }, { valor: 'nublado', rotulo: 'Nublado' }, { valor: 'chuva', rotulo: 'Chuva' }];
const VENTO = [{ valor: '', rotulo: '—' }, { valor: 'brisa', rotulo: 'Brisa' }, { valor: 'moderado', rotulo: 'Moderado' }, { valor: 'forte', rotulo: 'Forte' }];
const LAVAGEM_EPI = [{ valor: '', rotulo: '—' }, { valor: '1', rotulo: 'Sim' }, { valor: '0', rotulo: 'Não' }];
const ROTULO_TIPO: Record<string, string> = {
  pulverizacao: 'Pulverização', fertirrigacao: 'Fertirrigação', indutor_brotacao: 'Indução de brotação', foliar: 'Foliar', tratamento: 'Tratamento', outro: 'Aplicação',
};
type OperadorExecucao = { selecionado: boolean; epiCodigo: string; epiLavagem: '' | '1' | '0'; epiCondicao: string };

function chaveItem(item: AplicacaoItem): string {
  return String(item.item_id ?? item.produto_id ?? '');
}

function estadoOperadores(itens: AplicacaoOperador[] | null | undefined): Record<string, OperadorExecucao> {
  return Object.fromEntries((itens ?? []).map((item) => [String(item.operador_id), {
    selecionado: true,
    epiCodigo: item.epi_codigo ?? '',
    epiLavagem: item.epi_lavagem == null || item.epi_lavagem === '' ? '' : String(item.epi_lavagem) === '1' || item.epi_lavagem === true ? '1' : '0',
    epiCondicao: item.epi_condicao ?? '',
  }]));
}

export default function AplicacaoDetalhe() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pode } = useSessao();
  const podeEditar = pode('mip.aplicacoes_defensivos.editar');
  const { recontar, agora } = useSinc();
  const [aplicacao, setAplicacao] = useState<Aplicacao | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [dataExec, setDataExec] = useState(dataHoje());
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [ceu, setCeu] = useState('');
  const [vento, setVento] = useState('');
  const [ventoKmh, setVentoKmh] = useState('');
  const [pluviosidade, setPluviosidade] = useState('');
  const [destinoSobra, setDestinoSobra] = useState('');
  const [tripliceLavagem, setTripliceLavagem] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [quantidadesReais, setQuantidadesReais] = useState<Record<string, string>>({});
  const [operadores, setOperadores] = useState<Record<string, OperadorExecucao>>({});

  const [operadorNome, setOperadorNome] = useState('');
  const [assinaturaSvg, setAssinaturaSvg] = useState<string | null>(null);
  const [papel, setPapel] = useState<'operador' | 'rt'>('operador');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let ativa = true;
    void (async () => {
      try {
        const [lista, cad] = await Promise.all([lerCache<Aplicacao>('aplicacoes'), lerCache<Colaborador>('colaboradores')]);
        const selecionada = lista.find((a) => String(a.id) === id) ?? null;
        if (!ativa) return;
        setAplicacao(selecionada);
        setQuantidadesReais(Object.fromEntries((selecionada?.itens ?? []).map((item) => [chaveItem(item), formatarQuantidade(item.quantidade_consumida)])));
        setOperadores(estadoOperadores(selecionada?.operadores));
        setColaboradores(cad);
      } catch (e) { if (ativa) setErro(e instanceof Error ? e.message : 'Não foi possível abrir a aplicação.'); }
      finally { if (ativa) setCarregando(false); }
    })();
    return () => { ativa = false; };
  }, [id]));

  /* só `agro_operadores` assinam a DF; o cache prefixa o id ('op-<id>') e guarda
     o id real do operador em `pessoa_id`. Terceirizados não são operadores. */
  const operadoresDisponiveis = useMemo(() => colaboradores.filter((c) => c.origem !== 'terceirizado' && c.pessoa_id != null), [colaboradores]);
  const operadoresSelecionados = useMemo(() => Object.entries(operadores)
    .filter(([, dados]) => dados.selecionado)
    .map(([id, dados]) => ({
      operador_id: Number(id),
      epi_codigo: dados.epiCodigo.trim() || null,
      epi_lavagem: dados.epiLavagem === '' ? null : Number(dados.epiLavagem),
      epi_condicao: dados.epiCondicao.trim() || null,
    })), [operadores]);

  const confirmar = useCallback(async () => {
    if (aplicacao == null) return;
    if (!dataValida(dataExec)) { setErro('Informe a data de execução (AAAA-MM-DD).'); return; }
    if (!horaAplicacaoValida(horaInicio, horaFim)) { setErro('Confira os horários: use HH:MM e informe o término depois do início.'); return; }
    if (operadoresSelecionados.length === 0) { setErro('Selecione ao menos um operador.'); return; }
    if ((aplicacao.itens ?? []).length === 0) { setErro('A ordem não tem produtos detalhados. Sincronize novamente ou corrija a emissão no Web.'); return; }
    const itensReais: { item_id?: number; produto_id: number; quantidade_real: number }[] = [];
    for (const item of aplicacao.itens ?? []) {
      if (item.produto_id == null) { setErro('Há um produto sem identificação na ordem. Sincronize novamente antes de confirmar.'); return; }
      const quantidade = quantidadeRealAplicacao(quantidadesReais[chaveItem(item)] ?? '', item.quantidade_consumida);
      if (quantidade === null) { setErro(`Informe uma quantidade real maior que zero para ${item.produto ?? 'cada produto'}.`); return; }
      itensReais.push({ ...(item.item_id == null ? {} : { item_id: item.item_id }), produto_id: item.produto_id, quantidade_real: quantidade });
    }
    const ventoMedido = decimalAplicacao(ventoKmh);
    if (ventoKmh.trim() !== '' && ventoMedido === null) { setErro('Informe a medição de vento em km/h como número.'); return; }
    const chuvaMedida = decimalAplicacao(pluviosidade);
    if (pluviosidade.trim() !== '' && chuvaMedida === null) { setErro('Informe a pluviosidade em milímetros como número.'); return; }
    setSalvando(true); setErro(null); setMensagem(null);
    try {
      const payload: Record<string, unknown> = {
        data_execucao: dataExec,
        operadores: operadoresSelecionados,
        itens_reais: itensReais,
        triplice_lavagem: tripliceLavagem,
      };
      if (horaInicio) payload.hora_inicio = horaInicio;
      if (horaFim) payload.hora_fim = horaFim;
      if (ceu) payload.ceu = ceu;
      if (vento) payload.vento_class = vento;
      if (ventoMedido !== null) payload.vento_kmh = ventoMedido;
      if (chuvaMedida !== null) payload.pluviosidade_mm = chuvaMedida;
      if (destinoSobra.trim() !== '') payload.destino_sobra = destinoSobra.trim();
      if (observacao.trim() !== '') payload.observacao = observacao.trim();
      await enfileirar({ tipo: 'aplicacao_confirmar', rota: `/aplicacoes/${aplicacao.id}/confirmar`, payload });
      await recontar(); void agora();
      setMensagem('Confirmação guardada na fila de envio.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível confirmar.'); }
    finally { setSalvando(false); }
  }, [agora, aplicacao, ceu, dataExec, destinoSobra, horaFim, horaInicio, observacao, operadoresSelecionados, pluviosidade, quantidadesReais, recontar, tripliceLavagem, vento, ventoKmh]);

  const assinar = useCallback(async () => {
    if (aplicacao == null) return;
    if (operadorNome.trim() === '') { setErro('Informe o nome de quem assina.'); return; }
    if (assinaturaSvg == null) { setErro('Colha a assinatura no quadro.'); return; }
    setSalvando(true); setErro(null); setMensagem(null);
    try {
      await enfileirar({ tipo: 'aplicacao_assinar', rota: `/aplicacoes/${aplicacao.id}/assinar`, payload: { operador_nome: operadorNome.trim(), assinatura_svg: assinaturaSvg, papel } });
      await recontar(); void agora();
      setMensagem(`Assinatura ${papel === 'rt' ? 'do responsável técnico' : 'do operador'} guardada na fila de envio.`);
      setOperadorNome(''); setAssinaturaSvg(null);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível registrar a assinatura.'); }
    finally { setSalvando(false); }
  }, [agora, aplicacao, assinaturaSvg, operadorNome, papel, recontar]);

  if (carregando) return <View style={e.tela}><Carregando /></View>;
  if (aplicacao == null) return <View style={e.tela}><Vazio titulo="Aplicação não encontrada" detalhe="Ela pode ter sido concluída em outra sincronização." /></View>;
  const planejada = aplicacao.status === 'planejada';
  const registrada = aplicacao.status === 'registrada';
  const somenteConsulta = ['rascunho', 'validada', 'cancelada'].includes(aplicacao.status ?? '');
  const status = aplicacao.status === 'validada' ? 'Validada' : aplicacao.status === 'cancelada' ? 'Cancelada' : aplicacao.status === 'rascunho' ? 'Rascunho' : planejada ? 'Planejada' : 'Registrada';

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta={status} titulo={aplicacao.talhao_nome ?? `Aplicação ${aplicacao.id}`} subtitulo={[aplicacao.tipo, aplicacao.data_prevista ?? aplicacao.data].filter(Boolean).join(' · ')} />
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
      {mensagem !== null && <View style={e.faixa}><Faixa texto={mensagem} /></View>}
      {!podeEditar && <View style={e.faixa}><Faixa texto="Acesso somente para consulta. Seu perfil não pode confirmar nem assinar aplicações." /></View>}
      {somenteConsulta && <View style={e.faixa}><Faixa texto="Documento histórico. A consulta não permite alterações nem assinatura." /></View>}

      <View style={e.cartao}>
        <Text style={e.sobreTitulo}>DADOS DA ORDEM</Text>
        <Text style={e.itemDose}>Tipo: {ROTULO_TIPO[aplicacao.tipo ?? 'outro'] ?? 'Aplicação'}</Text>
        {aplicacao.area_aplicada_ha != null && <Text style={e.itemDose}>Área: {formatarNumero(aplicacao.area_aplicada_ha)} ha</Text>}
        {aplicacao.volume_calda_l != null && <Text style={e.itemDose}>Volume da calda: {formatarNumero(aplicacao.volume_calda_l)} L</Text>}
        {aplicacao.volume_calda_ha_l != null && <Text style={e.itemDose}>Volume por hectare: {formatarNumero(aplicacao.volume_calda_ha_l)} L/ha</Text>}
        {aplicacao.condicao_ceu != null && <Text style={e.itemDose}>Condição prevista: {aplicacao.condicao_ceu}</Text>}
        {aplicacao.observacao != null && <Text style={e.itemDose}>Observação da ordem: {aplicacao.observacao}</Text>}
      </View>

      <View style={e.cartao}>
        <Text style={e.sobreTitulo}>PRODUTOS</Text>
        {(aplicacao.itens ?? []).length === 0 ? <Text style={e.nota}>Sem itens detalhados no cache.</Text> : (aplicacao.itens ?? []).map((it, i) => (
          <View key={it.item_id ?? `${it.produto_id ?? 'produto'}-${i}`} style={e.itemLinha}>
            <Text style={e.itemNome} numberOfLines={1}>{it.produto ?? `Produto ${it.produto_id ?? ''}`}</Text>
            <Text style={e.itemDose}>{[
              it.dose_valor != null ? `Dose ${formatarDose(it.dose_valor)} ${it.dose_unidade ?? ''}`.trim() : null,
              it.quantidade_consumida != null ? `Prevista ${formatarNumero(it.quantidade_consumida)} ${it.quantidade_unidade ?? ''}`.trim() : null,
              it.carencia_dias != null ? `carência ${String(it.carencia_dias)}d` : null,
              it.intervalo_reentrada_horas != null ? `reentrada ${String(it.intervalo_reentrada_horas)}h` : null,
            ].filter(Boolean).join(' · ')}</Text>
            {planejada && <Campo
              rotulo="Quantidade real consumida *"
              value={quantidadesReais[chaveItem(it)] ?? formatarQuantidade(it.quantidade_consumida)}
              onChangeText={(valor) => setQuantidadesReais((atual) => ({ ...atual, [chaveItem(it)]: valor }))}
              keyboardType="decimal-pad"
              placeholder={String(it.quantidade_consumida ?? 'Informe a quantidade')}
            />}
          </View>
        ))}
      </View>

      {planejada && podeEditar && (
        <>
          <Text style={e.secao}>Confirmar execução</Text>
          <CampoData rotulo="Data de execução *" value={dataExec} onChangeText={setDataExec} />
          <View style={e.duas}><View style={e.col}><CampoHora rotulo="Início" value={horaInicio} onChangeText={setHoraInicio} /></View><View style={e.col}><CampoHora rotulo="Fim" value={horaFim} onChangeText={setHoraFim} /></View></View>
          <SeletorTexto rotulo="Céu" opcoes={CEU} valor={ceu} aoMudar={setCeu} />
          <SeletorTexto rotulo="Vento" opcoes={VENTO} valor={vento} aoMudar={setVento} />
          <View style={e.duas}><View style={e.col}><Campo rotulo="Vento medido (km/h)" value={ventoKmh} onChangeText={setVentoKmh} keyboardType="decimal-pad" placeholder="Opcional" /></View><View style={e.col}><Campo rotulo="Pluviosidade (mm)" value={pluviosidade} onChangeText={setPluviosidade} keyboardType="decimal-pad" placeholder="Opcional" /></View></View>
          <Campo rotulo="Destino da sobra da calda / água de lavagem" value={destinoSobra} onChangeText={setDestinoSobra} placeholder="Opcional" />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: tripliceLavagem }} onPress={() => setTripliceLavagem((atual) => !atual)} style={[e.chip, tripliceLavagem && e.chipAtivo]}>
            <Text style={[e.chipTexto, tripliceLavagem && e.chipTextoAtivo]}>{tripliceLavagem ? '✓ ' : ''}Tríplice lavagem das embalagens realizada</Text>
          </Pressable>
          <Text style={e.rotulo}>Operadores *</Text>
          {operadoresDisponiveis.length === 0 ? <Text style={e.nota}>Nenhum operador no cache. Sincronize o cadastro.</Text> : (
            <View style={e.chips}>
              {operadoresDisponiveis.map((c) => {
                const pid = String(c.pessoa_id);
                const marcado = operadores[pid]?.selecionado === true;
                return (
                  <Pressable key={pid} onPress={() => setOperadores((atual) => ({
                    ...atual,
                    [pid]: { selecionado: !marcado, epiCodigo: atual[pid]?.epiCodigo ?? '', epiLavagem: atual[pid]?.epiLavagem ?? '', epiCondicao: atual[pid]?.epiCondicao ?? '' },
                  }))} style={[e.chip, marcado && e.chipAtivo]}>
                    <Text style={[e.chipTexto, marcado && e.chipTextoAtivo]}>{c.nome ?? `Operador ${pid}`}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {operadoresDisponiveis.filter((c) => c.pessoa_id != null && operadores[String(c.pessoa_id)]?.selecionado).map((c) => {
            const pid = String(c.pessoa_id);
            const dados = operadores[pid];
            return <View key={`epi-${pid}`} style={e.epiCartao}>
              <Text style={e.itemNome}>EPI · {c.nome ?? `Operador ${pid}`}</Text>
              <Campo rotulo="Código do EPI" value={dados?.epiCodigo ?? ''} onChangeText={(valor) => setOperadores((atual) => ({ ...atual, [pid]: { ...atual[pid]!, epiCodigo: valor } }))} placeholder="Opcional" />
              <SeletorTexto rotulo="EPI lavado" opcoes={LAVAGEM_EPI} valor={dados?.epiLavagem ?? ''} aoMudar={(valor) => setOperadores((atual) => ({ ...atual, [pid]: { ...atual[pid]!, epiLavagem: valor === '1' || valor === '0' ? valor : '' } }))} />
              <Campo rotulo="Condição do EPI" value={dados?.epiCondicao ?? ''} onChangeText={(valor) => setOperadores((atual) => ({ ...atual, [pid]: { ...atual[pid]!, epiCondicao: valor } }))} placeholder="Ex.: bom, desgastado" />
            </View>;
          })}
          <View style={e.observacao}><Campo rotulo="Observação" value={observacao} onChangeText={setObservacao} placeholder="Opcional" /></View>
          <Botao titulo="Confirmar execução" ocupado={salvando} aoTocar={() => void confirmar()} />
          <Text style={e.dica}>A baixa de estoque insuficiente não trava: fica pendente e gera alerta.</Text>
        </>
      )}

      <Text style={e.secao}>Assinatura digital</Text>
      <View style={e.assinado}>
        <Text style={[e.assinadoSelo, (aplicacao.assinado_operador === 1 || aplicacao.assinado_operador === true) ? e.assinadoOk : e.assinadoFalta]}>
          Operador {(aplicacao.assinado_operador === 1 || aplicacao.assinado_operador === true) ? '✓' : 'pendente'}
        </Text>
        <Text style={[e.assinadoSelo, (aplicacao.assinado_rt === 1 || aplicacao.assinado_rt === true) ? e.assinadoOk : e.assinadoFalta]}>
          Resp. técnico {(aplicacao.assinado_rt === 1 || aplicacao.assinado_rt === true) ? '✓' : 'pendente'}
        </Text>
      </View>
      {registrada && podeEditar && <>
        <SeletorTexto rotulo="Quem assina" opcoes={[{ valor: 'operador', rotulo: 'Operador' }, { valor: 'rt', rotulo: 'Responsável técnico' }]} valor={papel} aoMudar={(v) => setPapel(v as 'operador' | 'rt')} />
        <Campo rotulo="Nome de quem assina *" value={operadorNome} onChangeText={setOperadorNome} placeholder="Nome completo" />
        <AssinaturaPad rotulo={`Assinatura do ${papel === 'rt' ? 'responsável técnico' : 'operador'}`} aoMudar={setAssinaturaSvg} />
        <View style={e.salvar}><Botao titulo={`Registrar assinatura ${papel === 'rt' ? 'do RT' : 'do operador'}`} variante="secundario" ocupado={salvando} aoTocar={() => void assinar()} /></View>
      </>}
    </ScrollView>
  );
}

function formatarDose(valor: number | string): string {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toFixed(2) : String(valor);
}

function formatarNumero(valor: number | string): string {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(valor);
}

function formatarQuantidade(valor: number | string | null | undefined): string {
  if (valor == null || String(valor).trim() === '') return '';
  const numero = decimalAplicacao(valor);
  return numero === null ? String(valor) : numero.toFixed(2);
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  faixa: { marginBottom: espaco.sm },
  cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginTop: espaco.sm },
  sobreTitulo: { color: cor.textoDesativado, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, marginBottom: espaco.sm },
  itemLinha: { borderTopWidth: 1, borderTopColor: cor.borda, paddingVertical: espaco.sm },
  itemNome: { color: cor.texto, fontSize: fonte.normal, fontWeight: '700' }, itemDose: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: 2 },
  epiCartao: { backgroundColor: cor.fundoSuave, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, padding: espaco.md, marginTop: espaco.sm },
  secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.lg, marginBottom: espaco.sm },
  duas: { flexDirection: 'row', gap: espaco.sm }, col: { flex: 1 },
  rotulo: { color: cor.textoSuave, fontSize: fonte.pequena, fontWeight: '600', marginTop: espaco.md, marginBottom: espaco.sm },
  nota: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  chip: { minHeight: toque.alvo, justifyContent: 'center', backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md },
  chipAtivo: { backgroundColor: cor.acao, borderColor: cor.acao }, chipTexto: { color: cor.texto, fontSize: fonte.pequena }, chipTextoAtivo: { color: cor.acaoTexto, fontWeight: '700' },
  observacao: { marginTop: espaco.md }, dica: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 20, marginTop: espaco.sm }, salvar: { marginTop: espaco.md },
  assinado: { flexDirection: 'row', gap: espaco.sm, marginTop: espaco.sm },
  assinadoSelo: { overflow: 'hidden', borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 3, fontSize: 12, fontWeight: '800' },
  assinadoOk: { color: cor.ok, backgroundColor: cor.okFundo }, assinadoFalta: { color: cor.textoSuave, backgroundColor: cor.campo },
});
