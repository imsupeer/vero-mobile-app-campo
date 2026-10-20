import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';

import type { Atividade, Colaborador, Fenologia, FenologiaEstagio, FaseVariedade, Maquina, ParametroMaoDeObra, SafraTalhao, Talhao, TipoAtividade } from '@/api/tipos';
import { dataHoje, dataValida, diasDesdePoda, estimarMaoDeObra, faseVariedadePorDias, numeroPlanejamento, responsavelValido } from '@/caderno/modelo';
import { compativelComCultura } from '@/caderno/culturas';
import { lerCache } from '@/db/banco';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Campo, CampoData, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

type Foto = { uri: string; nome: string; mime: string };
type Opcao = { id: number; nome: string };
const UNIDADES_PLANEJAMENTO = ['planta', 'fila', 'ha', 'cacho', 'caixa', 'kg', 'contentor', 'hora'] as const;

function Seletor({ rotulo, opcoes, valor, aoMudar, permiteVazio = false, rotuloVazio = 'Nenhum' }: { rotulo: string; opcoes: Opcao[]; valor: number | null; aoMudar: (id: number | null) => void; permiteVazio?: boolean; rotuloVazio?: string }) {
  return (
    <View style={e.grupo}>
      <Text style={e.rotulo}>{rotulo}</Text>
      <View style={e.opcoes}>
        {permiteVazio && <Pressable accessibilityRole="button" accessibilityState={{ selected: valor === null }} onPress={() => aoMudar(null)} style={[e.opcao, valor === null && e.opcaoAtiva]}><Text style={[e.opcaoTexto, valor === null && e.opcaoTextoAtivo]}>{rotuloVazio}</Text></Pressable>}
        {opcoes.map((opcao) => <Pressable key={opcao.id} accessibilityRole="button" accessibilityState={{ selected: valor === opcao.id }} onPress={() => aoMudar(opcao.id)} style={[e.opcao, valor === opcao.id && e.opcaoAtiva]}><Text style={[e.opcaoTexto, valor === opcao.id && e.opcaoTextoAtivo]}>{opcao.nome}</Text></Pressable>)}
      </View>
    </View>
  );
}

export default function NovoApontamento() {
  const { recontar, agora } = useSinc();
  const [talhoes, setTalhoes] = useState<Talhao[] | null>(null);
  const [safrasTalhoes, setSafrasTalhoes] = useState<SafraTalhao[]>([]);
  const [atividades, setAtividades] = useState<Opcao[]>([]);
  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [parametrosMaoObra, setParametrosMaoObra] = useState<ParametroMaoDeObra[]>([]);
  const [fenologiaEstagios, setFenologiaEstagios] = useState<FenologiaEstagio[]>([]);
  const [fasesVariedade, setFasesVariedade] = useState<FaseVariedade[]>([]);
  const [responsaveis, setResponsaveis] = useState<Opcao[]>([]);
  const [maquinas, setMaquinas] = useState<Opcao[]>([]);
  const [talhaoId, setTalhaoId] = useState<number | null>(null);
  const [safraTalhaoId, setSafraTalhaoId] = useState<number | null>(null);
  const [faseRefManual, setFaseRefManual] = useState<string | null>(null);
  const [atividadeId, setAtividadeId] = useState<number | null>(null);
  const [maquinaId, setMaquinaId] = useState<number | null>(null);
  const [tipoAtividadeId, setTipoAtividadeId] = useState<number | null>(null);
  const [responsavelId, setResponsavelId] = useState<number | null>(null);
  const [data, setData] = useState(dataHoje());
  const [observacao, setObservacao] = useState('');
  const [hectares, setHectares] = useState('');
  const [totalPlanejado, setTotalPlanejado] = useState('');
  const [unidadePlanejada, setUnidadePlanejada] = useState<string | null>(null);
  const [metaPlanejada, setMetaPlanejada] = useState('');
  const [mediaPlanejada, setMediaPlanejada] = useState('');
  const [premioPlanejado, setPremioPlanejado] = useState('');
  const [basePlanejamento, setBasePlanejamento] = useState<'prazo' | 'pessoas'>('prazo');
  const [diasPlanejados, setDiasPlanejados] = useState('');
  const [pessoasPlanejadas, setPessoasPlanejadas] = useState('');
  const [fenologias, setFenologias] = useState<Fenologia[]>([]);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useFocusEffect(useCallback(() => {
    setTalhaoId(null);
    setSafraTalhaoId(null);
    setFaseRefManual(null);
    setAtividadeId(null);
    setMaquinaId(null);
    setTipoAtividadeId(null);
    setResponsavelId(null);
    setData(dataHoje());
    setObservacao('');
    setHectares('');
    setTotalPlanejado(''); setUnidadePlanejada(null); setMetaPlanejada('');
    setMediaPlanejada(''); setPremioPlanejado(''); setBasePlanejamento('prazo');
    setDiasPlanejados(''); setPessoasPlanejadas('');
    setFoto(null);
    setErro(null);
    setSalvando(false);
  }, []));

  useEffect(() => {
    void (async () => {
      try {
        const [cadTalhoes, cadAtividades, cadMaquinas, cadFenologias, cadTipos, cadColaboradores, cadSafrasTalhoes, cadEstagios, cadFasesVariedade, cadParametrosMO] = await Promise.all([
          lerCache<Talhao>('talhoes'),
          lerCache<Atividade>('atividades'),
          lerCache<Maquina>('maquinas'),
          lerCache<Fenologia>('fenologia').catch(() => []),
          lerCache<TipoAtividade>('tipos_atividade').catch(() => []),
          lerCache<Colaborador>('colaboradores').catch(() => []),
          lerCache<SafraTalhao>('safras_talhoes').catch(() => []),
          lerCache<FenologiaEstagio>('fenologia_estagios').catch(() => []),
          lerCache<FaseVariedade>('variedade_fases').catch(() => []),
          lerCache<ParametroMaoDeObra>('calc_parametros').catch(() => []),
        ]);
        const ordenar = (a: Opcao, b: Opcao) => a.nome.localeCompare(b.nome);
        setTalhoes(cadTalhoes);
        setSafrasTalhoes(cadSafrasTalhoes);
        setFenologiaEstagios(cadEstagios);
        setFasesVariedade(cadFasesVariedade);
        setAtividades(cadAtividades.map((item) => ({ id: item.id, nome: item.descricao ?? item.nome ?? `Atividade ${item.id}` })).sort(ordenar));
        setTiposAtividade(cadTipos.filter((item) => !['irrigacao', 'packing', 'aplicacao'].includes(item.categoria ?? '')));
        setParametrosMaoObra(cadParametrosMO);
        setResponsaveis(cadColaboradores.filter((item) => item.origem !== 'terceirizado' && Number(item.pessoa_id ?? item.id) > 0).map((item) => ({ id: Number(item.pessoa_id ?? item.id), nome: item.nome ?? `Pessoa ${item.id}` })).sort(ordenar));
        setMaquinas(cadMaquinas.map((item) => ({ id: item.id, nome: item.nome ?? item.descricao ?? item.codigo ?? item.placa ?? `Máquina ${item.id}` })).sort(ordenar));
        setFenologias(cadFenologias);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar o formulário.');
      }
    })();
  }, []);

  const guardarFoto = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    setFoto({ uri: asset.uri, nome: asset.fileName ?? `apontamento-${Date.now()}.jpg`, mime: asset.mimeType ?? 'image/jpeg' });
  }, []);

  const fotografar = useCallback(async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) { setErro('Autorize o uso da câmera para registrar a foto.'); return; }
    const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (!resultado.canceled && resultado.assets[0] != null) guardarFoto(resultado.assets[0]);
  }, [guardarFoto]);

  const escolherFoto = useCallback(async () => {
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (!resultado.canceled && resultado.assets[0] != null) guardarFoto(resultado.assets[0]);
  }, [guardarFoto]);

  const mudarTalhao = useCallback((id: number | null) => {
    setTalhaoId(id);
    setTipoAtividadeId(null);
    setFaseRefManual(null);
    setTotalPlanejado(''); setUnidadePlanejada(null); setMetaPlanejada(''); setMediaPlanejada(''); setPremioPlanejado('');
    setBasePlanejamento('prazo'); setDiasPlanejados(''); setPessoasPlanejadas('');
    const selecionado = talhoes?.find((item) => item.id === id);
    const valvulaId = selecionado?.talhao_id ?? id;
    const vinculos = safrasTalhoes.filter((item) => Number(item.talhao_id) === Number(valvulaId));
    setSafraTalhaoId(vinculos[0]?.id ?? null);
  }, [safrasTalhoes, talhoes]);

  const mudarSafra = useCallback((id: number | null) => {
    setSafraTalhaoId(id);
    setTipoAtividadeId(null);
    setFaseRefManual(null);
    setTotalPlanejado(''); setUnidadePlanejada(null); setMetaPlanejada(''); setMediaPlanejada(''); setPremioPlanejado('');
    setBasePlanejamento('prazo'); setDiasPlanejados(''); setPessoasPlanejadas('');
  }, []);

  const mudarData = useCallback((valor: string) => {
    setData(valor);
    setFaseRefManual(null);
  }, []);

  const mudarTipoAtividade = useCallback((id: number | null) => {
    setTipoAtividadeId(id);
    setTotalPlanejado(''); setMetaPlanejada(''); setMediaPlanejada(''); setPremioPlanejado('');
    const parametro = parametrosMaoObra.find((item) => item.id === id);
    const tipo = tiposAtividade.find((item) => item.id === id);
    setUnidadePlanejada(parametro?.unidade_padrao || tipo?.unidade_padrao || null);
    setMetaPlanejada(parametro?.premio_meta != null && Number(parametro.premio_meta) > 0 ? String(parametro.premio_meta) : '');
    setPremioPlanejado(parametro?.premio_valor != null && Number(parametro.premio_valor) > 0 ? String(parametro.premio_valor) : '');
  }, [parametrosMaoObra, tiposAtividade]);

  const valvulaSelecionada = talhoes?.find((item) => item.id === talhaoId);
  const vinculoSafra = safrasTalhoes.find((item) => item.id === safraTalhaoId);
  const fasesDaVariedade = fasesVariedade.filter((fase) => Number(fase.variedade_id) === Number(valvulaSelecionada?.variedade_id));
  const fasesDisponiveis: Opcao[] = fasesDaVariedade.length > 0
    ? fasesDaVariedade.map((fase) => ({ id: -fase.id, nome: fase.nome ?? `Fase ${fase.id}` }))
    : fenologiaEstagios
      .filter((fase) => vinculoSafra?.cultura_id == null || Number(fase.cultura_id) === Number(vinculoSafra.cultura_id))
      .map((fase) => ({ id: fase.id, nome: `${fase.codigo ? `${fase.codigo} — ` : ''}${fase.nome ?? `Fase ${fase.id}`}${fase.escala ? ` (${fase.escala})` : ''}` }));
  const diasPoda = diasDesdePoda(vinculoSafra?.data_poda, data);
  const faseAutomaticaId = faseVariedadePorDias(diasPoda, fasesDaVariedade);
  const faseAutomaticaRef = faseAutomaticaId === null ? null : `v:${faseAutomaticaId}`;
  const faseSelecionadaRef = faseRefManual ?? faseAutomaticaRef;
  const faseSelecionadaId = faseSelecionadaRef === null ? null
    : faseSelecionadaRef.startsWith('v:') ? -Number(faseSelecionadaRef.slice(2))
      : Number(faseSelecionadaRef.slice(2));
  const culturaId = vinculoSafra?.cultura_id == null ? null : Number(vinculoSafra.cultura_id);
  const tiposVisiveis = tiposAtividade.filter((tipo) => {
    if (['irrigacao', 'packing', 'aplicacao'].includes(tipo.categoria ?? '')) return false;
    return compativelComCultura(tipo.culturas, culturaId);
  });
  const parametroMO = parametrosMaoObra.find((item) => item.id === tipoAtividadeId);
  const unidadeAtual = unidadePlanejada ?? parametroMO?.unidade_padrao ?? tiposAtividade.find((item) => item.id === tipoAtividadeId)?.unidade_padrao ?? '';
  const indiceUnidade = UNIDADES_PLANEJAMENTO.indexOf(unidadeAtual as (typeof UNIDADES_PLANEJAMENTO)[number]);
  const trabalhoAutomatico = unidadeAtual === 'planta' && valvulaSelecionada?.num_plantas != null
    ? Number(valvulaSelecionada.num_plantas)
    : unidadeAtual === 'ha'
      ? Number(vinculoSafra?.area_plantada_ha ?? valvulaSelecionada?.area_ha ?? 0)
      : 0;
  const totalMO = totalPlanejado.trim() === '' ? trabalhoAutomatico : numeroPlanejamento(totalPlanejado);
  const estimativaMO = estimarMaoDeObra({
    total: totalMO,
    rendimento: numeroPlanejamento(parametroMO?.rendimento),
    rendimentoObservado: numeroPlanejamento(parametroMO?.rend_observado),
    fator: numeroPlanejamento(parametroMO?.fator),
    meta: numeroPlanejamento(metaPlanejada), media: numeroPlanejamento(mediaPlanejada),
    premioMeta: numeroPlanejamento(parametroMO?.premio_meta), premioValor: numeroPlanejamento(premioPlanejado),
    custoPropria: numeroPlanejamento(parametroMO?.custo_propria),
    custoTerceirizada: numeroPlanejamento(parametroMO?.custo_terceirizada),
    modo: basePlanejamento, prazo: numeroPlanejamento(diasPlanejados),
    pessoasInformadas: numeroPlanejamento(pessoasPlanejadas),
  });

  const salvar = useCallback(async () => {
    if (talhaoId === null) { setErro('Escolha a válvula.'); return; }
    if (tipoAtividadeId === null || !tiposVisiveis.some((item) => item.id === tipoAtividadeId)) { setErro('Escolha um tipo de atividade disponível para a cultura da safra selecionada.'); return; }
    if (!responsavelValido(responsavelId, responsaveis.map((item) => item.id))) {
      setErro(responsaveis.length === 0
        ? 'Nenhum operador ativo disponível. Sincronize o cadastro de colaboradores antes de criar o apontamento.'
        : 'Selecione o responsável pela frente.');
      return;
    }
    if (!dataValida(data)) { setErro('Informe a data no formato AAAA-MM-DD.'); return; }
    setSalvando(true); setErro(null);
    try {
      const talhaoSelecionado = talhoes?.find((item) => item.id === talhaoId);
      const tipoSelecionado = tiposAtividade.find((item) => item.id === tipoAtividadeId);
      const hectaresNum = hectares.trim() === '' ? null : Number(hectares.replace(',', '.'));
      if (hectaresNum !== null && (!Number.isFinite(hectaresNum) || hectaresNum < 0)) {
        setErro('A área em hectares não pode ser negativa.');
        setSalvando(false);
        return;
      }
      const categoria = tipoSelecionado?.categoria;
      const tipo = categoria === 'colheita' ? 'colheita' : categoria === 'aplicacao' ? 'aplicacao' : categoria === 'outro' ? 'outro' : 'tratos_culturais';
      const payload: Record<string, unknown> = { tipo, tipo_atividade_id: tipoAtividadeId, talhao_id: talhaoSelecionado?.talhao_id ?? talhaoId, data, estagio: 'iniciado', safra_manual: true, safra_talhao_id: safraTalhaoId, fase_ref: faseRefManual ?? '' };
      const planejamentoMO = {
        total: totalPlanejado.trim() || (trabalhoAutomatico > 0 ? String(trabalhoAutomatico) : ''),
        unidade: unidadeAtual, base: basePlanejamento,
        dias: diasPlanejados.trim(), pessoas: pessoasPlanejadas.trim(),
        meta: metaPlanejada.trim(), media: mediaPlanejada.trim(), premio: premioPlanejado.trim(),
      };
      if (Object.entries(planejamentoMO).some(([chave, valor]) => chave !== 'base' && valor !== '')) payload.planejamento_mo = planejamentoMO;
      payload.responsavel_id = responsavelId;
      if (hectaresNum !== null) payload.hectares = hectaresNum;
      if (atividadeId !== null) payload.atividade_id = atividadeId;
      if (maquinaId !== null) payload.maquina_id = maquinaId;
      if (observacao.trim() !== '') payload.observacao = observacao.trim();
      const uuid = await enfileirar({ tipo: 'apontamento', rota: '/apontamentos', payload });
      if (foto !== null) {
        await enfileirar({ tipo: 'anexo', rota: '/anexos', paiUuid: uuid, payload: { uri: foto.uri, nome: foto.nome, mime: foto.mime, origem_uuid: uuid, origem_tipo: 'apontamento', descricao: 'Foto do apontamento' } });
      }
      await recontar();
      void agora();
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível guardar o apontamento.');
    } finally { setSalvando(false); }
  }, [atividadeId, agora, basePlanejamento, data, diasPlanejados, faseRefManual, foto, hectares, maquinaId, mediaPlanejada, metaPlanejada, observacao, pessoasPlanejadas, premioPlanejado, recontar, responsavelId, safraTalhaoId, talhaoId, talhoes, tipoAtividadeId, tiposVisiveis, totalPlanejado, trabalhoAutomatico, unidadeAtual]);

  if (talhoes === null && erro === null) return <View style={e.tela}><Carregando /></View>;
  if (talhoes?.length === 0) return <View style={e.tela}><Vazio titulo="Nenhuma válvula disponível" detalhe="Faça uma sincronização antes de criar o primeiro apontamento." /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta="Registro offline" titulo="Novo apontamento" subtitulo="Preencha agora e continue trabalhando. O envio acontece quando houver rede." />
      {erro !== null && <View style={e.erro}><Faixa texto={erro} tom="erro" /></View>}
      <CampoData rotulo="Data *" value={data} onChangeText={mudarData} />
      <Seletor rotulo="Válvula *" opcoes={(talhoes ?? []).map((item) => ({ id: item.id, nome: item.nome ?? item.codigo ?? `Válvula ${item.id}` })).sort((a, b) => a.nome.localeCompare(b.nome))} valor={talhaoId} aoMudar={mudarTalhao} />
      {talhaoId !== null && <Seletor rotulo="Safra (vínculo da válvula)" opcoes={safrasTalhoes.filter((item) => Number(item.talhao_id) === Number(valvulaSelecionada?.talhao_id ?? talhaoId)).map((item) => ({ id: item.id, nome: item.safra ?? `Safra ${item.safra_id ?? item.id}` }))} valor={safraTalhaoId} aoMudar={mudarSafra} permiteVazio rotuloVazio="Sem safra" />}
      {talhaoId !== null && <Seletor rotulo="Fase fenológica" opcoes={fasesDisponiveis} valor={faseSelecionadaId} aoMudar={(id) => setFaseRefManual(id === null ? null : id < 0 ? `v:${Math.abs(id)}` : `c:${id}`)} permiteVazio rotuloVazio="Automática pela data" />}
      <Seletor rotulo="Tipo de atividade *" opcoes={tiposVisiveis.map((item) => ({ id: item.id, nome: item.nome ?? `Atividade ${item.id}` })).sort((a, b) => a.nome.localeCompare(b.nome))} valor={tipoAtividadeId} aoMudar={mudarTipoAtividade} />
      <Text style={e.nota}>Aplicações de defensivos devem ser emitidas no fluxo DF/IF do sistema Web.</Text>
      <Seletor rotulo="Responsável pela frente *" opcoes={responsaveis} valor={responsavelId} aoMudar={setResponsavelId} />
      {responsaveis.length === 0 && <Text style={e.nota}>Sincronize o cadastro de colaboradores para carregar os operadores ativos.</Text>}
      <Campo rotulo="Hectares trabalhados" value={hectares} onChangeText={setHectares} keyboardType="decimal-pad" placeholder="Opcional" />
      <Campo rotulo="Observação" value={observacao} onChangeText={setObservacao} placeholder="O que precisa ficar registrado?" multiline numberOfLines={4} maxLength={255} textAlignVertical="top" style={e.observacao} />
      {talhaoId !== null && (() => {
        const valvula = talhoes?.find((item) => item.id === talhaoId);
        const fenologia = fenologias.find((item) => Number(item.talhao_id) === Number(valvula?.talhao_id ?? talhaoId));
        const contexto = [
          valvula?.num_plantas != null ? `${valvula.num_plantas.toLocaleString('pt-BR')} plantas` : null,
          valvula?.variedade,
          valvula?.porta_enxerto ? `Porta-enxerto ${valvula.porta_enxerto}` : null,
          vinculoSafra?.safra ? `Safra ${vinculoSafra.safra}` : fenologia?.safra ? `Safra ${fenologia.safra}` : null,
          faseSelecionadaRef?.startsWith('v:')
            ? (fasesDaVariedade.find((fase) => fase.id === Number(faseSelecionadaRef.slice(2)))?.nome ?? null)
            : faseSelecionadaRef?.startsWith('c:')
              ? (fenologiaEstagios.find((fase) => fase.id === Number(faseSelecionadaRef.slice(2)))?.nome ?? null)
              : fenologia?.fase_nome,
        ].filter(Boolean);
        return contexto.length > 0 ? <View style={e.contexto}><Text style={e.contextoTitulo}>Contexto da válvula</Text><Text style={e.contextoTexto}>{contexto.join(' · ')}</Text><Text style={e.contextoNota}>Safra e fase são resolvidas pelo ERP conforme a data do apontamento.</Text></View> : null;
      })()}
      <View style={e.planejamento}>
        <Text style={e.contextoTitulo}>Planejamento de mão de obra</Text>
        <Text style={e.contextoNota}>Estimativa do Web; não altera o realizado nem gera custo.</Text>
        <Campo rotulo="Total a fazer" value={totalPlanejado || (trabalhoAutomatico > 0 ? String(trabalhoAutomatico) : '')} onChangeText={setTotalPlanejado} keyboardType="decimal-pad" placeholder="Informe o total" />
        <Seletor rotulo="Unidade" opcoes={['unid.', ...UNIDADES_PLANEJAMENTO].map((item, indice) => ({ id: indice, nome: item }))} valor={unidadeAtual === '' || unidadeAtual === 'unid.' || indiceUnidade < 0 ? 0 : indiceUnidade + 1} aoMudar={(id) => setUnidadePlanejada(id === 0 || id === null ? '' : UNIDADES_PLANEJAMENTO[id - 1] ?? '')} />
        <Campo rotulo="Meta por pessoa/dia" value={metaPlanejada} onChangeText={setMetaPlanejada} keyboardType="decimal-pad" placeholder={parametroMO?.premio_meta ? String(parametroMO.premio_meta) : '—'} />
        <Campo rotulo="Média de produtividade por pessoa/dia" value={mediaPlanejada} onChangeText={setMediaPlanejada} keyboardType="decimal-pad" placeholder="Opcional" />
        <Campo rotulo="Premiação (R$/un. acima da meta)" value={premioPlanejado} onChangeText={setPremioPlanejado} keyboardType="decimal-pad" placeholder={parametroMO?.premio_valor ? String(parametroMO.premio_valor) : 'Opcional'} />
        <Seletor rotulo="Base do cálculo" opcoes={[{ id: 1, nome: 'Dias → nº de pessoas' }, { id: 2, nome: 'Pessoas → nº de dias' }]} valor={basePlanejamento === 'prazo' ? 1 : 2} aoMudar={(id) => setBasePlanejamento(id === 2 ? 'pessoas' : 'prazo')} />
        {basePlanejamento === 'prazo'
          ? <Campo rotulo="Dias para executar a atividade" value={diasPlanejados} onChangeText={setDiasPlanejados} keyboardType="numeric" placeholder="Informe os dias" />
          : <Campo rotulo="Pessoas na equipe" value={pessoasPlanejadas} onChangeText={setPessoasPlanejadas} keyboardType="numeric" placeholder="Informe o tamanho da equipe" />}
        <View style={e.resultadoPlanejamento}>
          <Text style={e.contextoTitulo}>Resultado (estimativa)</Text>
          {estimativaMO.estado === 'sem_parametro'
            ? <Text style={e.contextoNota}>Sem rendimento configurado para este tipo de atividade. A estimativa será calculada pelo ERP quando houver parâmetro.</Text>
            : estimativaMO.estado === 'sem_trabalho'
              ? <Text style={e.contextoNota}>Informe o total a fazer para estimar a equipe.</Text>
              : <Text style={e.contextoTexto}>{estimativaMO.pessoas != null ? `${estimativaMO.pessoas} pessoa(s)` : 'Informe dias ou pessoas'} · {estimativaMO.diarias?.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} diária(s){estimativaMO.dias != null ? ` · ${estimativaMO.dias} dia(s)` : ''}{estimativaMO.custoPropria != null ? ` · própria R$ ${estimativaMO.custoPropria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}{estimativaMO.custoTerceirizada != null ? ` · terceirizada R$ ${estimativaMO.custoTerceirizada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}{estimativaMO.premio != null && estimativaMO.premio > 0 ? ` · premiação R$ ${estimativaMO.premio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}</Text>}
        </View>
      </View>
      <Seletor rotulo="Ordem de serviço vinculada (opcional)" opcoes={atividades} valor={atividadeId} aoMudar={setAtividadeId} permiteVazio />
      <Seletor rotulo="Máquina" opcoes={maquinas} valor={maquinaId} aoMudar={setMaquinaId} permiteVazio />
      <Text style={e.rotulo}>Foto</Text>
      {foto !== null && <Image source={{ uri: foto.uri }} style={e.foto} accessibilityLabel="Foto selecionada" />}
      <View style={e.acoesFoto}><View style={e.acaoFoto}><Botao titulo="Tirar foto" variante="secundario" aoTocar={() => void fotografar()} /></View><View style={e.acaoFoto}><Botao titulo="Galeria" variante="secundario" aoTocar={() => void escolherFoto()} /></View></View>
      {foto !== null && <Pressable accessibilityRole="button" onPress={() => setFoto(null)} style={e.remover}><Text style={e.removerTexto}>Remover foto</Text></Pressable>}
      <View style={e.salvar}><Botao titulo="Guardar apontamento" ocupado={salvando} aoTocar={() => void salvar()} /></View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: '800' }, subtitulo: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24, marginTop: espaco.xs, marginBottom: espaco.md },
  nota: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.sm },
  erro: { marginBottom: espaco.sm }, grupo: { marginTop: espaco.md }, rotulo: { color: cor.textoSuave, fontSize: fonte.pequena, fontWeight: '600', marginTop: espaco.md, marginBottom: espaco.sm }, opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: { minHeight: toque.alvo, justifyContent: 'center', backgroundColor: cor.superficie, borderColor: cor.borda, borderWidth: 1, borderRadius: raio.md, paddingHorizontal: espaco.md }, opcaoAtiva: { backgroundColor: cor.acao, borderColor: cor.acao }, opcaoTexto: { color: cor.texto, fontSize: fonte.pequena }, opcaoTextoAtivo: { color: cor.acaoTexto, fontWeight: '700' },
  observacao: { minHeight: 112, paddingVertical: espaco.md }, foto: { width: '100%', height: 220, borderRadius: raio.lg, backgroundColor: cor.campo }, acoesFoto: { flexDirection: 'row', gap: espaco.sm, marginTop: espaco.sm }, acaoFoto: { flex: 1 }, remover: { minHeight: toque.alvo, alignItems: 'center', justifyContent: 'center' }, removerTexto: { color: cor.erro, fontSize: fonte.pequena, fontWeight: '600' }, salvar: { marginTop: espaco.lg },
  contexto: { marginTop: espaco.md, padding: espaco.md, backgroundColor: cor.fundoSuave, borderRadius: raio.md }, contextoTitulo: { color: cor.textoForte, fontSize: fonte.pequena, fontWeight: '800' }, contextoTexto: { color: cor.texto, fontSize: fonte.pequena, marginTop: espaco.xs }, contextoNota: { color: cor.textoSuave, fontSize: 12, marginTop: espaco.xs },
  planejamento: { marginTop: espaco.lg, padding: espaco.md, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg }, resultadoPlanejamento: { marginTop: espaco.sm, padding: espaco.md, backgroundColor: cor.fundoSuave, borderRadius: raio.md },
});
