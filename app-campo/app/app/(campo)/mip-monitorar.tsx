import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import type { MipPonto, MipReferencia, SafraTalhao, Talhao } from '@/api/tipos';
import { dataHoje, dataValida } from '@/caderno/modelo';
import { espacoAmostral, faixaPressao, indiceCalculado, pressaoCalculada, validarAlvosMonitorados } from '@/mip/modelo';
import { lerCache } from '@/db/banco';
import { useFazenda } from '@/fazenda/contexto';
import { useSessao } from '@/sessao';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Campo, CampoData, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { Seletor, SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

type EscolhaAlvo = { chave: string; alvoId: number | null; quantidade: string; local: string; severidade: string };

const METODOLOGIAS = [
  { valor: 'planta', rotulo: 'Por planta' },
  { valor: 'severidade', rotulo: 'Severidade' },
];
const UNIDADES_INDICE = [
  { valor: '%', rotulo: 'Porcentagem (%)' },
  { valor: 'un', rotulo: 'Quantidade (un)' },
];
const LOCAIS = [
  { valor: '', rotulo: '—' },
  { valor: 'folha', rotulo: 'Folha' },
  { valor: 'ramo', rotulo: 'Ramo' },
  { valor: 'cacho', rotulo: 'Cacho' },
  { valor: 'ponteiros', rotulo: 'Ponteiros' },
  { valor: 'casca', rotulo: 'Casca' },
  { valor: 'mato', rotulo: 'Mato' },
];
const SEVERIDADES = [
  { valor: '', rotulo: '—' },
  { valor: 'baixa', rotulo: 'Baixa' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'alta', rotulo: 'Alta' },
];

export default function MipMonitorar() {
  const { recontar, agora } = useSinc();
  const { pode } = useSessao();
  const { selecionada } = useFazenda();
  const [talhoes, setTalhoes] = useState<Talhao[] | null>(null);
  const [alvos, setAlvos] = useState<MipReferencia[]>([]);
  const [pontos, setPontos] = useState<MipPonto[]>([]);
  const [safras, setSafras] = useState<SafraTalhao[]>([]);
  const [talhaoId, setTalhaoId] = useState<number | null>(null);
  const [metodologia, setMetodologia] = useState('planta');
  const [plantas, setPlantas] = useState('');
  const [unidade, setUnidade] = useState<'%' | 'un'>('%');
  const [pontoId, setPontoId] = useState<number | null>(null);
  const [safraVinculoId, setSafraVinculoId] = useState<number | null>(null);
  const [data, setData] = useState(dataHoje());
  const [observacao, setObservacao] = useState('');
  const [selecionados, setSelecionados] = useState<EscolhaAlvo[]>([]);
  const [fotos, setFotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [rascunhos, setRascunhos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [cadTalhoes, cadAlvos, cadPontos, cadSafras] = await Promise.all([
          lerCache<Talhao>('talhoes'), lerCache<MipReferencia>('mip_referencias'),
          lerCache<MipPonto>('mip_pontos').catch(() => []), lerCache<SafraTalhao>('safras_talhoes').catch(() => []),
        ]);
        setTalhoes(cadTalhoes);
        setAlvos(cadAlvos.filter((a) => a.ativo == null || a.ativo === 1 || a.ativo === true));
        setPontos(cadPontos); setSafras(cadSafras);
      } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar o formulário.'); setTalhoes([]); }
    })();
  }, []);

  const opcoesTalhao = useMemo(() => {
    const lista = (talhoes ?? []).filter((t) => selecionada == null || (t.fazenda ?? '').trim() === selecionada);
    return lista.map((t) => ({ id: t.id, nome: t.codigo ?? t.nome ?? `Válvula ${t.id}` })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [talhoes, selecionada]);
  const talhaoAtual = (talhoes ?? []).find((item) => item.id === talhaoId);
  const talhaoPaiAtual = talhaoAtual?.talhao_id ?? talhaoId;
  const opcoesPonto = pontos.filter((item) => Number(item.talhao_id) === Number(talhaoPaiAtual));
  const opcoesSafra = safras.filter((item) => Number(item.talhao_id) === Number(talhaoPaiAtual));

  const adicionarAlvo = () => setSelecionados((atuais) => [...atuais, {
    chave: `${Date.now()}-${atuais.length}`, alvoId: null, quantidade: '', local: '', severidade: '',
  }]);
  const alterarAlvo = (chave: string, campo: keyof EscolhaAlvo, valor: string | number | null) =>
    setSelecionados((atuais) => atuais.map((item) => item.chave === chave ? { ...item, [campo]: valor } : item));

  const escolherFotos = useCallback(async () => {
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.75 });
    if (!resultado.canceled) { setErro(null); setFotos((atuais) => [...atuais, ...resultado.assets]); }
  }, []);

  const fotografar = useCallback(async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) { setErro('Autorize o uso da câmera para registrar evidências.'); return; }
    const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 });
    const foto = resultado.canceled ? null : resultado.assets[0];
    if (foto !== null && foto !== undefined) { setErro(null); setFotos((atuais) => [...atuais, foto]); }
  }, []);

  const salvar = useCallback(async (enviarAgora = false) => {
    if (talhaoId === null) { setErro('Escolha a válvula.'); return; }
    if (!dataValida(data)) { setErro('Informe a data no formato AAAA-MM-DD.'); return; }
    const espaco = espacoAmostral(plantas, '');
    const alvosValidados = validarAlvosMonitorados(
      selecionados.map(({ alvoId, ...item }) => ({ ...item, alvo_id: alvoId })), espaco, unidade,
    );
    if (alvosValidados.erro !== null) { setErro(alvosValidados.erro); return; }
    if (fotos.some((foto) => foto.mimeType !== null && foto.mimeType !== undefined && !['image/jpeg', 'image/png'].includes(foto.mimeType))) {
      setErro('O Web aceita fotos JPG ou PNG. Converta as fotos HEIC para JPG antes de anexar.'); return;
    }
    if (plantas.trim() && espaco === null) { setErro('Plantas amostradas deve ser um número inteiro maior que zero.'); return; }
    setSalvando(true); setErro(null);
    try {
      const listaAlvos = alvosValidados.alvos;
      const setor = (talhoes ?? []).find((t) => t.id === talhaoId);
      const talhaoPai = setor?.talhao_id ?? talhaoId;
      const payload: Record<string, unknown> = { talhao_id: talhaoPai, metodologia, unidade, data, alvos: listaAlvos };
      if (pontoId !== null) payload.ponto_id = pontoId;
      if (safraVinculoId !== null) payload.safra_talhao_id = safraVinculoId;
      const n = Number(plantas.replace(',', '.'));
      if (Number.isFinite(n) && n > 0) payload.plantas_amostradas = Math.round(n);
      if (observacao.trim() !== '') payload.observacao = observacao.trim();
      const uuid = await enfileirar({ tipo: 'monitoramento', rota: '/monitoramentos', payload });
      for (const [index, foto] of fotos.entries()) {
        await enfileirar({ tipo: 'anexo', rota: '/anexos', paiUuid: uuid, payload: {
          uri: foto.uri, nome: foto.fileName ?? `monitoramento-${Date.now()}-${index}.jpg`, mime: foto.mimeType ?? 'image/jpeg',
          origem_uuid: uuid, origem_tipo: 'monitoramento', descricao: 'Evidência do monitoramento MIP/MID',
        } });
      }
      if (enviarAgora) await enfileirar({ tipo: 'monitoramentos_enviar', rota: '/monitoramentos/enviar', payload: { uuids: [uuid] } });
      setRascunhos((atual) => [...atual, uuid]);
      await recontar(); void agora();
      setMensagem(enviarAgora ? 'Monitoramento salvo e envio ao líder agendado.' : 'Rascunho guardado. Você pode continuar a coleta ou enviar para análise.');
      setSelecionados([]); setPlantas(''); setFotos([]);
      if (enviarAgora) router.back();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível guardar o monitoramento.'); }
    finally { setSalvando(false); }
  }, [agora, data, fotos, metodologia, observacao, plantas, pontoId, recontar, safraVinculoId, selecionados, talhaoId, talhoes, unidade]);

  const enviarAnalise = useCallback(async () => {
    if (rascunhos.length === 0) return;
    setEnviando(true); setErro(null);
    try {
      await enfileirar({ tipo: 'monitoramentos_enviar', rota: '/monitoramentos/enviar', payload: { uuids: rascunhos } });
      await recontar(); void agora();
      setMensagem('Envio para análise agendado. Os alertas de pressão são criados quando os monitoramentos chegarem ao servidor.');
      setRascunhos([]);
      router.back();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível agendar o envio.'); }
    finally { setEnviando(false); }
  }, [agora, rascunhos, recontar]);

  if (!pode('mip.monitoramentos.editar')) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não pode registrar monitoramentos MIP/MID." /></View>;
  if (talhoes === null && erro === null) return <View style={e.tela}><Carregando /></View>;
  if (talhoes?.length === 0) return <View style={e.tela}><Vazio titulo="Nenhuma válvula disponível" detalhe="Sincronize antes de registrar um monitoramento." /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta="MIP / MID" titulo="Monitoramento" subtitulo="Registre a amostragem de pragas e doenças. O envio à análise gera os alertas de pressão." />
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
      {mensagem !== null && <View style={e.faixa}><Faixa texto={mensagem} /></View>}

      <Seletor rotulo="Válvula *" opcoes={opcoesTalhao} valor={talhaoId} aoMudar={(id) => {
        const selecionadaTalhao = (talhoes ?? []).find((item) => item.id === id);
        const talhaoPai = selecionadaTalhao?.talhao_id ?? id;
        const primeiraSafra = safras.find((item) => Number(item.talhao_id) === Number(talhaoPai));
        setTalhaoId(id); setPontoId(null); setSafraVinculoId(primeiraSafra?.id ?? null);
        setMetodologia('planta');
      }} />
      {talhaoId !== null && <>
        <Seletor rotulo="Ponto de amostragem" permiteVazio opcoes={opcoesPonto.map((item) => ({ id: item.id, nome: item.nome ?? `Ponto ${item.id}` }))} valor={pontoId} aoMudar={setPontoId} />
        {opcoesSafra.length > 0 && <Seletor rotulo="Safra (vínculo)" permiteVazio opcoes={opcoesSafra.map((item) => ({ id: item.id, nome: item.safra ?? `Safra ${item.safra_id ?? item.id}` }))} valor={safraVinculoId} aoMudar={setSafraVinculoId} />}
      </>}
      <SeletorTexto rotulo="Unidade do índice" opcoes={UNIDADES_INDICE} valor={unidade} aoMudar={(valor) => setUnidade(valor === 'un' ? 'un' : '%')} />
      <SeletorTexto rotulo="Metodologia de amostragem" opcoes={METODOLOGIAS} valor={metodologia} aoMudar={setMetodologia} />
      <Campo rotulo="Plantas amostradas" value={plantas} onChangeText={setPlantas} keyboardType="number-pad" placeholder="Opcional" />
      {Number(plantas) > 0 && <Text style={e.nota}>Espaço amostral: {Number(plantas)} plantas. Em %, o índice é quantidade ÷ espaço amostral × 100; em un, o índice é a própria quantidade.</Text>}
      <CampoData rotulo="Data *" value={data} onChangeText={setData} />

      <Text style={e.secao}>Alvos monitorados *</Text>
      {alvos.length === 0 ? <Text style={e.nota}>Nenhum alvo no cache. Sincronize as referências MIP.</Text> : <>
        {selecionados.map((escolha, indice) => (
          <View key={escolha.chave} style={e.cartaoAlvo}>
            <View style={e.linhaCabecalho}><Text style={e.alvoNome}>Alvo {indice + 1}</Text><Pressable accessibilityRole="button" onPress={() => setSelecionados((itens) => itens.filter((item) => item.chave !== escolha.chave))}><Text style={e.remover}>Remover</Text></Pressable></View>
            <Seletor rotulo="Alvo *" opcoes={alvos.map((item) => ({ id: item.id, nome: `${item.nome ?? `Alvo ${item.id}`}${item.nivel_acao != null ? ` · ação ${item.nivel_acao}%` : ''}` }))} valor={escolha.alvoId} aoMudar={(v) => alterarAlvo(escolha.chave, 'alvoId', v)} />
            <Campo rotulo="Quantidade encontrada" value={escolha.quantidade} onChangeText={(v) => alterarAlvo(escolha.chave, 'quantidade', v)} keyboardType="decimal-pad" placeholder="Qtd de unidades com o alvo" />
            {(() => {
              const espaco = espacoAmostral(plantas, '');
              const indice = indiceCalculado(escolha.quantidade, espaco, unidade);
              const alvo = alvos.find((item) => item.id === escolha.alvoId);
              const pressao = pressaoCalculada(indice, alvo?.nivel_acao == null ? null : Number(alvo.nivel_acao));
              const faixa = pressao === null ? null : faixaPressao(pressao);
              const quantidade = Number(escolha.quantidade.replace(',', '.'));
              const excedeAmostra = unidade === '%' && espaco !== null && Number.isFinite(quantidade) && quantidade > espaco;
              const corFaixa = faixa === 'Crítico' || faixa === 'Alerta' ? cor.erro : faixa === 'Atenção' ? cor.alerta : cor.ok;
              return <View style={e.previaAlvo}>
                {indice !== null && <Text style={e.nota}>Índice calculado: {indice.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {unidade}</Text>}
                {pressao !== null && faixa !== null && <Text style={[e.nota, { color: corFaixa, fontWeight: '700' }]}>{faixa} · {pressao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do nível de ação</Text>}
                {excedeAmostra && <Text accessibilityRole="alert" style={[e.nota, { color: cor.erro, fontWeight: '700' }]}>Quantidade acima do espaço amostral ({espaco} plantas). Confira a coleta antes de enviar.</Text>}
              </View>;
            })()}
            <SeletorTexto rotulo="Local" opcoes={LOCAIS} valor={escolha.local} aoMudar={(v) => alterarAlvo(escolha.chave, 'local', v)} />
            <SeletorTexto rotulo="Severidade" opcoes={SEVERIDADES} valor={escolha.severidade} aoMudar={(v) => alterarAlvo(escolha.chave, 'severidade', v)} />
          </View>
        ))}
        <View style={e.adicionar}><Botao titulo="+ Adicionar alvo" variante="secundario" aoTocar={adicionarAlvo} /></View>
      </>}

      <View style={e.observacao}><Campo rotulo="Observação" value={observacao} onChangeText={setObservacao} placeholder="Opcional" multiline numberOfLines={3} textAlignVertical="top" /></View>
      <Text style={e.secao}>Fotos (JPG/PNG)</Text>
      {fotos.length > 0 && <Text style={e.nota}>{fotos.length} foto(s) selecionada(s).</Text>}
      <View style={e.fotosAcoes}><View style={e.fotoAcao}><Botao titulo="Tirar foto" variante="secundario" aoTocar={() => void fotografar()} /></View><View style={e.fotoAcao}><Botao titulo="Galeria" variante="secundario" aoTocar={() => void escolherFotos()} /></View></View>
      {fotos.map((foto, indice) => <Pressable key={`${foto.uri}-${indice}`} onPress={() => setFotos((atuais) => atuais.filter((_, i) => i !== indice))}><Text style={e.nota}>Foto {indice + 1} · toque para remover</Text></Pressable>)}
      <View style={e.adicionar}><Botao titulo="Salvar rascunho" ocupado={salvando} variante="secundario" aoTocar={() => void salvar(false)} /></View>
      <View style={e.adicionar}><Botao titulo="Salvar e enviar ao líder" ocupado={salvando} aoTocar={() => void salvar(true)} /></View>

      {rascunhos.length > 0 && (
        <View style={e.enviar}>
          <Text style={e.nota}>{rascunhos.length} monitoramento(s) nesta sessão prontos para análise.</Text>
          <Botao titulo="Enviar para análise" variante="secundario" ocupado={enviando} aoTocar={() => void enviarAnalise()} />
        </View>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  faixa: { marginBottom: espaco.sm }, secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.lg, marginBottom: espaco.sm },
  nota: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 21 },
  previaAlvo: { gap: espaco.xs, marginTop: espaco.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  chip: { minHeight: toque.alvo, justifyContent: 'center', backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md },
  chipAtivo: { backgroundColor: cor.acao, borderColor: cor.acao },
  chipTexto: { color: cor.texto, fontSize: fonte.pequena }, chipTextoAtivo: { color: cor.acaoTexto, fontWeight: '700' },
  cartaoAlvo: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginTop: espaco.md },
  alvoNome: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800', marginBottom: espaco.sm }, linhaCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, remover: { color: cor.erro, fontWeight: '700' }, adicionar: { marginTop: espaco.md }, fotosAcoes: { flexDirection: 'row', gap: espaco.sm }, fotoAcao: { flex: 1 },
  observacao: { marginTop: espaco.md }, enviar: { marginTop: espaco.lg, gap: espaco.sm },
});
