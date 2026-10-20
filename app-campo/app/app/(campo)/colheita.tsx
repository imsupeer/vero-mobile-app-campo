import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ColheitaPendente, ColheitaRegistro, SafraTalhao, Talhao, Variedade } from '@/api/tipos';
import { dataHoje, dataValida } from '@/caderno/modelo';
import { lerCache } from '@/db/banco';
import { useFazenda } from '@/fazenda/contexto';
import { useSessao } from '@/sessao';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Campo, CampoData, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { Seletor, SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

type Classificacoes = { premium: string; cat1: string; cat2: string; cat3: string; perdidos: string };
const VAZIO: Classificacoes = { premium: '', cat1: '', cat2: '', cat3: '', perdidos: '' };
const CAMPOS_CLASSE: Array<[keyof Classificacoes, string]> = [['premium', 'Premium'], ['cat1', 'CAT 1'], ['cat2', 'CAT 2'], ['cat3', 'CAT 3'], ['perdidos', 'Perdidos']];
const UNIDADES = [{ valor: 'kg', rotulo: 'kg' }, { valor: 'caixa', rotulo: 'Caixa' }];
const DESTINOS = [{ valor: 'venda', rotulo: 'Venda' }, { valor: 'packing', rotulo: 'Packing' }, { valor: 'armazenagem', rotulo: 'Armazenagem' }, { valor: 'descarte', rotulo: 'Descarte' }, { valor: 'doacao', rotulo: 'Doação' }];
const CLASSIF_CARGA = [{ valor: 'Premium', rotulo: 'Premium' }, { valor: 'CAT 1', rotulo: 'CAT 1' }, { valor: 'CAT 2', rotulo: 'CAT 2' }, { valor: 'CAT 3', rotulo: 'CAT 3' }, { valor: 'Perdidos', rotulo: 'Perdidos' }];
const UNIDADES_CARGA = [{ valor: '', rotulo: '— Só por peso —' }, { valor: 'caixa', rotulo: 'Caixa' }, { valor: 'palete', rotulo: 'Palete' }, { valor: 'cumbuca', rotulo: 'Cumbuca' }];

function classificacoesPayload(c: Classificacoes): { objeto: Record<string, number>; algum: boolean } {
  const objeto: Record<string, number> = {};
  let algum = false;
  for (const [chave] of CAMPOS_CLASSE) {
    const n = Number(c[chave].replace(',', '.'));
    if (Number.isFinite(n) && n > 0) { objeto[chave] = n; algum = true; }
  }
  return { objeto, algum };
}

function Classes({ valor, aoMudar }: { valor: Classificacoes; aoMudar: (c: Classificacoes) => void }) {
  return (
    <View style={e.classes}>
      {CAMPOS_CLASSE.map(([chave, rotulo]) => (
        <View key={chave} style={e.classeCol}>
          <Campo rotulo={rotulo} value={valor[chave]} onChangeText={(v) => aoMudar({ ...valor, [chave]: v })} keyboardType="decimal-pad" placeholder="0" />
        </View>
      ))}
    </View>
  );
}

export default function Colheita() {
  const { recontar, agora } = useSinc();
  const { pode } = useSessao();
  const { selecionada } = useFazenda();
  const podeColher = pode('agro.colheita.editar');
  const podeCarga = pode('agro.romaneios_colheita.editar');

  const modos = useMemo(() => {
    const lista: Array<{ valor: string; rotulo: string }> = [];
    if (podeColher) lista.push({ valor: 'nova', rotulo: 'Nova colheita' }, { valor: 'previstas', rotulo: 'Previstas' });
    if (podeCarga) lista.push({ valor: 'carga', rotulo: 'Carga / romaneio' });
    return lista;
  }, [podeColher, podeCarga]);
  const [modo, setModo] = useState<string>('');
  useEffect(() => { if (modo === '' && modos[0] != null) setModo(modos[0].valor); }, [modo, modos]);

  const [talhoes, setTalhoes] = useState<Talhao[] | null>(null);
  const [safras, setSafras] = useState<SafraTalhao[]>([]);
  const [variedades, setVariedades] = useState<Variedade[]>([]);
  const [previstas, setPrevistas] = useState<ColheitaPendente[]>([]);
  const [registrosRecentes, setRegistrosRecentes] = useState<ColheitaRegistro[]>([]);
  const [setorId, setSetorId] = useState<number | null>(null);
  const [safraTalhaoId, setSafraTalhaoId] = useState<number | null>(null);
  const [variedadeId, setVariedadeId] = useState<number | null>(null);
  const [producaoPrevista, setProducaoPrevista] = useState('');
  const [classes, setClasses] = useState<Classificacoes>(VAZIO);
  const [unidade, setUnidade] = useState('kg');
  const [observacao, setObservacao] = useState('');
  const [data, setData] = useState(dataHoje());
  // carga
  const [romaneio, setRomaneio] = useState('');
  const [peso, setPeso] = useState('');
  const [classifCarga, setClassifCarga] = useState('');
  const [destino, setDestino] = useState('');
  const [unidadeApont, setUnidadeApont] = useState('');
  const [qtdApont, setQtdApont] = useState('');
  const [caixasPorPalete, setCaixasPorPalete] = useState('110');
  const [registroCargaId, setRegistroCargaId] = useState<number | null>(null);
  // previstas → realizado
  const [prevId, setPrevId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [cadTalhoes, cadPrevistas, cadSafras, cadVariedades, cadRegistros] = await Promise.all([
          lerCache<Talhao>('talhoes'), lerCache<ColheitaPendente>('colheitas_pendentes'),
          lerCache<SafraTalhao>('safras_talhoes').catch(() => []), lerCache<Variedade>('variedades').catch(() => []),
          lerCache<ColheitaRegistro>('colheitas_registros').catch(() => []),
        ]);
        setTalhoes(cadTalhoes); setPrevistas(cadPrevistas); setSafras(cadSafras); setVariedades(cadVariedades); setRegistrosRecentes(cadRegistros);
      } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar a colheita.'); setTalhoes([]); }
    })();
  }, []);

  const opcoesSetor = useMemo(() => {
    const lista = (talhoes ?? []).filter((t) => selecionada == null || (t.fazenda ?? '').trim() === selecionada);
    return lista.map((t) => ({ id: t.id, nome: t.codigo ?? t.nome ?? `Válvula ${t.id}` })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [talhoes, selecionada]);

  const setorAtual = (talhoes ?? []).find((item) => item.id === setorId) ?? null;
  const talhaoPaiAtual = setorAtual?.talhao_id ?? setorId;
  const safrasDaValvula = safras.filter((item) => Number(item.talhao_id) === Number(talhaoPaiAtual));
  const safraAtual = safrasDaValvula.find((item) => item.id === safraTalhaoId) ?? null;
  const variedadesDaSafra = variedades.filter((item) => safraAtual?.cultura_id == null || Number(item.cultura_id) === Number(safraAtual.cultura_id));

  const limpar = () => { setClasses(VAZIO); setObservacao(''); setRomaneio(''); setPeso(''); setClassifCarga(''); setDestino(''); setUnidadeApont(''); setQtdApont(''); setCaixasPorPalete('110'); setRegistroCargaId(null); };

  const salvar = useCallback(async () => {
    setErro(null); setMensagem(null);
    if (!dataValida(data)) { setErro('Informe a data no formato AAAA-MM-DD.'); return; }
    setSalvando(true);
    try {
      if (modo === 'nova') {
        if (setorId === null) { setErro('Escolha a válvula.'); setSalvando(false); return; }
        if (safraTalhaoId === null || safraAtual === null) { setErro('Escolha a safra vinculada à válvula.'); setSalvando(false); return; }
        const { objeto, algum } = classificacoesPayload(classes);
        if (!algum) { setErro('Informe a quantidade de ao menos uma classificação.'); setSalvando(false); return; }
        const previsto = producaoPrevista.trim() === '' ? null : Number(producaoPrevista.replace(',', '.'));
        if (previsto !== null && (!Number.isFinite(previsto) || previsto < 0)) { setErro('A produção prevista deve ser um número igual ou maior que zero.'); setSalvando(false); return; }
        const payload: Record<string, unknown> = { setor_id: setorId, safra_talhao_id: safraTalhaoId, unidade, data, classificacoes: objeto };
        if (variedadeId !== null) payload.variedade_id = variedadeId;
        if (previsto !== null) payload.producao_prevista_kg_ha = previsto;
        if (observacao.trim() !== '') payload.observacao = observacao.trim();
        await enfileirar({ tipo: 'colheita', rota: '/colheitas', payload });
        setMensagem('Colheita guardada na fila de envio.');
      } else if (modo === 'previstas') {
        if (prevId === null) { setErro('Escolha uma colheita prevista.'); setSalvando(false); return; }
        const { objeto, algum } = classificacoesPayload(classes);
        if (!algum) { setErro('Informe a quantidade de ao menos uma classificação.'); setSalvando(false); return; }
        const payload: Record<string, unknown> = { unidade, classificacoes: objeto };
        if (observacao.trim() !== '') payload.observacao = observacao.trim();
        await enfileirar({ tipo: 'colheita_realizado', rota: `/colheitas/${prevId}/realizado`, payload });
        setMensagem('Realizado guardado na fila de envio.');
        setPrevId(null);
      } else {
        if (romaneio.trim() === '') { setErro('Informe o número do romaneio.'); setSalvando(false); return; }
        if (setorId === null) { setErro('Escolha a válvula.'); setSalvando(false); return; }
        const pesoNum = Number(peso.replace(',', '.'));
        if (!Number.isFinite(pesoNum) || pesoNum <= 0) { setErro('Informe o peso da carga.'); setSalvando(false); return; }
        const payload: Record<string, unknown> = { romaneio: romaneio.trim(), setor_id: setorId, peso_kg: pesoNum, data_carga: data };
        if (classifCarga) payload.classificacao = classifCarga;
        if (destino) payload.destino = destino;
        if (safraTalhaoId !== null) payload.safra_talhao_id = safraTalhaoId;
        if (registroCargaId !== null) payload.registro_id = registroCargaId;
        if (unidadeApont) payload.unidade_apont = unidadeApont;
        if (unidadeApont && qtdApont.trim() !== '') payload.qtd_apont = Number(qtdApont.replace(',', '.'));
        if (unidadeApont && caixasPorPalete.trim() !== '') payload.caixas_por_palete = Number(caixasPorPalete);
        await enfileirar({ tipo: 'carga_colheita', rota: '/cargas', payload });
        setMensagem('Carga guardada na fila de envio.');
      }
      limpar();
      await recontar(); void agora();
    } catch (ex) { setErro(ex instanceof Error ? ex.message : 'Não foi possível guardar.'); }
    finally { setSalvando(false); }
  }, [agora, caixasPorPalete, classes, classifCarga, data, destino, modo, observacao, peso, prevId, producaoPrevista, qtdApont, registroCargaId, recontar, romaneio, safraAtual, safraTalhaoId, setorId, unidade, unidadeApont, variedadeId]);

  if (talhoes === null && erro === null) return <View style={e.tela}><Carregando /></View>;
  if (modos.length === 0) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não registra colheita nem cargas." /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta="Colheita" titulo="Registro de colheita" subtitulo="Colheita realizada, romaneios de carga e conclusão das colheitas previstas." />
      {modos.length > 1 && <SeletorTexto rotulo="O que registrar" opcoes={modos} valor={modo} aoMudar={(v) => { setModo(v); setErro(null); setMensagem(null); }} />}
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
      {mensagem !== null && <View style={e.faixa}><Faixa texto={mensagem} /></View>}

      {modo === 'nova' && (
        <>
          <CampoData rotulo="Data da colheita *" value={data} onChangeText={setData} />
          <Seletor rotulo="Válvula *" opcoes={opcoesSetor} valor={setorId} aoMudar={(id) => { setSetorId(id); setSafraTalhaoId(null); setVariedadeId(null); }} />
          {setorId !== null && <Seletor rotulo="Safra *" opcoes={safrasDaValvula.map((item) => ({ id: item.id, nome: `${item.safra ?? `Safra ${item.safra_id ?? item.id}`}${item.cultura ? ` · ${item.cultura}` : ''}` }))} valor={safraTalhaoId} aoMudar={(id) => {
            setSafraTalhaoId(id);
            const vinculo = safrasDaValvula.find((item) => item.id === id);
            const atual = setorAtual?.variedade_id ?? null;
            setVariedadeId(vinculo?.cultura_id == null || atual === null || !variedades.some((item) => item.id === atual && item.cultura_id === vinculo.cultura_id) ? null : atual);
          }} />}
          {safraAtual !== null && variedadesDaSafra.length > 0 && <Seletor rotulo="Variedade" permiteVazio opcoes={variedadesDaSafra.map((item) => ({ id: item.id, nome: item.nome ?? `Variedade ${item.id}` }))} valor={variedadeId} aoMudar={setVariedadeId} />}
          <SeletorTexto rotulo="Unidade" opcoes={UNIDADES} valor={unidade} aoMudar={setUnidade} />
          <Campo rotulo="Produção prevista (kg/ha)" value={producaoPrevista} onChangeText={setProducaoPrevista} keyboardType="decimal-pad" placeholder="Opcional" />
          <Text style={e.secao}>Classificação {unidade === 'caixa' ? '(caixas)' : '(kg)'}</Text>
          <Classes valor={classes} aoMudar={setClasses} />
          <Text style={e.nota}>A produção realizada em kg/ha é calculada a partir das classificações informadas e da área da válvula, como no ERP.</Text>
          <Campo rotulo="Observação" value={observacao} onChangeText={setObservacao} placeholder="Opcional" />
        </>
      )}

      {modo === 'previstas' && (
        previstas.length === 0 ? <View style={e.faixa}><Faixa texto="Nenhuma colheita prevista aguardando realizado." tom="alerta" /></View> : (
          <>
            <Text style={e.secao}>Escolha a colheita prevista</Text>
            {previstas.map((p) => (
              <Pressable key={p.id} onPress={() => setPrevId(p.id)} style={[e.prevista, prevId === p.id && e.previstaAtiva]}>
                <Text style={e.prevNome}>{p.setor_nome ?? p.talhao_nome ?? `Colheita ${p.id}`}</Text>
                <Text style={e.prevDetalhe}>{[p.variedade, p.data_colheita, p.kg_total_previsto != null ? `previsto ${String(p.kg_total_previsto)} kg` : null].filter(Boolean).join(' · ')}</Text>
              </Pressable>
            ))}
            {prevId !== null && (
              <>
                <SeletorTexto rotulo="Unidade" opcoes={UNIDADES} valor={unidade} aoMudar={setUnidade} />
                <Text style={e.secao}>Realizado {unidade === 'caixa' ? '(caixas)' : '(kg)'}</Text>
                <Classes valor={classes} aoMudar={setClasses} />
                <Campo rotulo="Observação" value={observacao} onChangeText={setObservacao} placeholder="Opcional" />
              </>
            )}
          </>
        )
      )}

      {modo === 'carga' && (
        <>
          <Campo rotulo="Romaneio *" value={romaneio} onChangeText={setRomaneio} autoCapitalize="characters" placeholder="Número do romaneio" />
          <Seletor rotulo="Válvula / setor *" opcoes={opcoesSetor} valor={setorId} aoMudar={(id) => { setSetorId(id); setSafraTalhaoId(null); setRegistroCargaId(null); }} />
          {setorId !== null && <Seletor permiteVazio rotulo="Safra (vínculo da carga)" rotuloVazio="Safra atual / sem vínculo" opcoes={safrasDaValvula.map((item) => ({ id: item.id, nome: `${item.safra ?? `Safra ${item.safra_id ?? item.id}`}${item.cultura ? ` · ${item.cultura}` : ''}` }))} valor={safraTalhaoId} aoMudar={setSafraTalhaoId} />}
          {setorId !== null && registrosRecentes.some((item) => Number(item.setor_id) === Number(setorId)) && <Seletor permiteVazio rotulo="Registro de colheita" rotuloVazio="Nenhum" opcoes={registrosRecentes.filter((item) => Number(item.setor_id) === Number(setorId)).map((item) => ({ id: item.id, nome: `${item.data_colheita ?? 'Data não informada'} · ${item.safra ?? 'Sem safra'} · ${item.valvula ?? item.setor_nome ?? 'Válvula'}` }))} valor={registroCargaId} aoMudar={setRegistroCargaId} />}
          <Campo rotulo="Peso (kg) *" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" placeholder="0" />
          <SeletorTexto rotulo="Classificação" opcoes={[{ valor: '', rotulo: '—' }, ...CLASSIF_CARGA]} valor={classifCarga} aoMudar={setClassifCarga} />
          <SeletorTexto rotulo="Unidade do apontamento" opcoes={UNIDADES_CARGA} valor={unidadeApont} aoMudar={setUnidadeApont} />
          <Campo rotulo="Quantidade" value={qtdApont} onChangeText={setQtdApont} keyboardType="decimal-pad" placeholder="Opcional" />
          <Campo rotulo="Caixas por palete" value={caixasPorPalete} onChangeText={setCaixasPorPalete} keyboardType="number-pad" placeholder="110" />
          <SeletorTexto rotulo="Destino" opcoes={[{ valor: '', rotulo: '—' }, ...DESTINOS]} valor={destino} aoMudar={setDestino} />
          <CampoData rotulo="Data *" value={data} onChangeText={setData} />
        </>
      )}

      <View style={e.salvar}><Botao titulo="Guardar" ocupado={salvando} aoTocar={() => void salvar()} /></View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  faixa: { marginTop: espaco.sm }, secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.lg, marginBottom: espaco.sm },
  nota: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 21, marginTop: espaco.xs },
  classes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm }, classeCol: { flexBasis: '30%', flexGrow: 1 },
  prevista: { backgroundColor: cor.superficie, borderWidth: 1.5, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm },
  previstaAtiva: { borderColor: cor.acao, backgroundColor: cor.fundoSuave },
  prevNome: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' }, prevDetalhe: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  salvar: { marginTop: espaco.lg }, alvoPequeno: { minHeight: toque.alvoPequeno },
});
