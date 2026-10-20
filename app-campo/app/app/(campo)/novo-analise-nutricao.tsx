import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { FenologiaEstagio, Nutriente, SafraTalhao, Talhao, Variedade } from '@/api/tipos';
import { dataHoje, dataValida } from '@/caderno/modelo';
import { lerCache } from '@/db/banco';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { useSessao } from '@/sessao';
import { Botao, CabecalhoPagina, Campo, CampoData, Carregando, Faixa } from '@/ui/componentes';
import { Seletor, SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, fonte, raio } from '@/ui/tema';

type TipoAnalise = 'solo' | 'foliar';
const PARTES = [
  { valor: '', rotulo: 'Não informado' },
  { valor: 'limbo', rotulo: 'Limbo' },
  { valor: 'peciolo', rotulo: 'Pecíolo' },
  { valor: 'folha_inteira', rotulo: 'Folha inteira' },
];

export default function NovaAnaliseNutricao() {
  const { tipo: parametro } = useLocalSearchParams<{ tipo?: string }>();
  const tipo: TipoAnalise = parametro === 'foliar' ? 'foliar' : 'solo';
  const { recontar, agora } = useSinc();
  const { pode } = useSessao();
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [safras, setSafras] = useState<SafraTalhao[]>([]);
  const [nutrientes, setNutrientes] = useState<Nutriente[]>([]);
  const [variedades, setVariedades] = useState<Variedade[]>([]);
  const [fases, setFases] = useState<FenologiaEstagio[]>([]);
  const [talhaoId, setTalhaoId] = useState<number | null>(null);
  const [safraVinculoId, setSafraVinculoId] = useState<number | null>(null);
  const [variedadeId, setVariedadeId] = useState<number | null>(null);
  const [fenologiaId, setFenologiaId] = useState<number | null>(null);
  const [data, setData] = useState(dataHoje());
  const [profundidade, setProfundidade] = useState('');
  const [parteFolha, setParteFolha] = useState('');
  const [observacao, setObservacao] = useState('');
  const [valores, setValores] = useState<Record<number, string>>({});
  const [unidades, setUnidades] = useState<Record<number, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void Promise.all([
      lerCache<Talhao>('talhoes'),
      lerCache<SafraTalhao>('safras_talhoes').catch(() => []),
      lerCache<Nutriente>('nutrientes'),
      lerCache<Variedade>('variedades').catch(() => []),
      lerCache<FenologiaEstagio>('fenologia_estagios').catch(() => []),
    ]).then(([v, s, n, vr, f]) => {
      if (!ativo) return;
      setTalhoes(v);
      setSafras(s);
      setNutrientes(n.filter((item) => item.aplicacao === tipo || item.aplicacao === 'ambos'));
      setVariedades(vr); setFases(f);
    }).catch((e: unknown) => {
      if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados da análise.');
    }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [tipo]);

  const valvula = talhoes.find((item) => item.id === talhaoId) ?? null;
  const safraVinculos = useMemo(() => safras.filter((item) => Number(item.talhao_id) === Number(valvula?.talhao_id ?? 0)), [safras, valvula]);
  const variedadesDaCultura = useMemo(() => variedades.filter((item) => valvula?.cultura_atual_id == null || Number(item.cultura_id) === Number(valvula.cultura_atual_id)), [valvula, variedades]);
  const fasesDaCultura = useMemo(() => fases.filter((item) => valvula?.cultura_atual_id == null || Number(item.cultura_id) === Number(valvula.cultura_atual_id)), [valvula, fases]);
  const salvar = async () => {
    if (!dataValida(data)) { setErro('Informe uma data de amostra válida.'); return; }
    if (valvula === null) { setErro('Selecione a válvula.'); return; }
    const resultados: Array<{ nutriente_id: number; valor: number; unidade: string | null }> = [];
    for (const nutriente of nutrientes) {
      const texto = valores[nutriente.id]?.trim() ?? '';
      if (texto === '') continue;
      const normalizado = texto.includes(',')
        ? texto.replace(/\./g, '').replace(',', '.')
        : /^\d{1,3}(\.\d{3})+$/.test(texto) ? texto.replace(/\./g, '') : texto;
      const valor = Number(normalizado);
      if (!Number.isFinite(valor)) { setErro(`Valor inválido para ${nutriente.nome ?? nutriente.simbolo ?? 'nutriente'}.`); return; }
      const unidadeDigitada = unidades[nutriente.id]?.trim() ?? '';
      const unidade = unidadeDigitada || nutriente.unidade_padrao || null;
      if (nutriente.simbolo?.trim().toLowerCase() === 'ph') {
        if (valor < 0 || valor > 14) { setErro('pH deve estar entre 0 e 14.'); return; }
        if (unidade != null && !['-', 'ph', 'adimensional', 'escala'].includes(unidade.toLowerCase())) { setErro('pH é adimensional; deixe a unidade em branco.'); return; }
      }
      if (unidade != null && /^-?\d+([.,]\d+)?$/.test(unidade)) { setErro(`Informe uma unidade de medida válida para ${nutriente.nome ?? 'o nutriente'}.`); return; }
      resultados.push({ nutriente_id: nutriente.id, valor, unidade });
    }
    if (resultados.length === 0) { setErro('Informe o resultado de ao menos um nutriente.'); return; }

    const vinculo = safraVinculoId == null ? null : safraVinculos.find((item) => item.id === safraVinculoId) ?? null;
    if (safraVinculoId != null && vinculo === null) { setErro('A safra selecionada não pertence à válvula.'); return; }
    const payload: Record<string, unknown> = {
      data_amostra: data,
      talhao_id: valvula.talhao_id ?? valvula.id,
      setor_id: valvula.id,
      resultados,
    };
    if (vinculo?.safra_id != null) payload.safra_id = vinculo.safra_id;
    if (observacao.trim()) payload.observacao = observacao.trim();
    if (tipo === 'solo' && profundidade.trim()) payload.profundidade = profundidade.trim();
    if (tipo === 'foliar') {
      if (variedadeId !== null) payload.variedade_id = variedadeId;
      if (fenologiaId !== null) payload.fenologia_id = fenologiaId;
      if (parteFolha) payload.parte_folha = parteFolha;
    }

    setSalvando(true);
    setErro(null);
    try {
      await enfileirar({ tipo: `analise_nutricao_${tipo}`, rota: `/nutricao/analises/${tipo}`, payload });
      await recontar();
      void agora();
      router.back();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível guardar a análise.');
    } finally { setSalvando(false); }
  };

  if (carregando) return <View style={e.tela}><Carregando /></View>;
  if (!pode(`nutricao.analise_${tipo}.editar`)) return <View style={e.tela}><Faixa texto="Seu perfil não pode registrar este tipo de análise." tom="erro" /></View>;
  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta="Nutrição" titulo={tipo === 'solo' ? 'Nova análise de solo' : 'Nova análise foliar'} subtitulo="Registre os resultados do laudo. A classificação e os alertas são calculados no ERP conforme as faixas do responsável técnico." />
      {erro !== null && <View style={e.erro}><Faixa texto={erro} tom="erro" /></View>}
      {talhoes.length === 0 && <Faixa texto="Sincronize as válvulas antes de registrar a análise." tom="alerta" />}
      {nutrientes.length === 0 && <Faixa texto="O catálogo de nutrientes não está no aparelho. Sincronize e tente novamente." tom="alerta" />}
      <CampoData rotulo="Data da amostra *" value={data} onChangeText={setData} />
      <Seletor rotulo="Válvula *" opcoes={talhoes.map((item) => ({ id: item.id, nome: item.nome ?? item.codigo ?? `Válvula ${item.id}` })).sort((a, b) => a.nome.localeCompare(b.nome))} valor={talhaoId} aoMudar={(id) => { const item = talhoes.find((t) => t.id === id); setTalhaoId(id); setSafraVinculoId(null); setVariedadeId(item?.variedade_id ?? null); setFenologiaId(null); }} />
      {valvula !== null && safraVinculos.length > 0 && <Seletor rotulo="Safra" opcoes={safraVinculos.map((item) => ({ id: item.id, nome: `${item.safra ?? `Safra ${item.safra_id ?? item.id}`}${item.cultura ? ` · ${item.cultura}` : ''}` }))} valor={safraVinculoId} aoMudar={setSafraVinculoId} permiteVazio rotuloVazio="Sem safra" />}
      {tipo === 'solo'
        ? <Campo rotulo="Profundidade" value={profundidade} onChangeText={setProfundidade} placeholder="Ex.: 0–20 cm" />
        : <>
          {variedadesDaCultura.length > 0 && <Seletor rotulo="Variedade" opcoes={variedadesDaCultura.map((item) => ({ id: item.id, nome: item.nome ?? `Variedade ${item.id}` }))} valor={variedadeId} aoMudar={setVariedadeId} permiteVazio rotuloVazio="Não informada" />}
          {fasesDaCultura.length > 0 && <Seletor rotulo="Fase fenológica" opcoes={fasesDaCultura.map((item) => ({ id: item.id, nome: `${item.codigo ?? ''}${item.codigo ? ' — ' : ''}${item.nome ?? `Fase ${item.id}`}` }))} valor={fenologiaId} aoMudar={setFenologiaId} permiteVazio rotuloVazio="Não informada" />}
          <SeletorTexto rotulo="Parte da folha" opcoes={PARTES} valor={parteFolha} aoMudar={setParteFolha} />
        </>}
      <Text style={e.secao}>Resultados do laudo</Text>
      {nutrientes.map((nutriente) => <View key={nutriente.id}>
        <Campo rotulo={`${nutriente.nome ?? nutriente.simbolo ?? 'Nutriente'}${nutriente.simbolo ? ` · ${nutriente.simbolo}` : ''}`} value={valores[nutriente.id] ?? ''} onChangeText={(valor) => setValores((atual) => ({ ...atual, [nutriente.id]: valor }))} keyboardType="decimal-pad" placeholder="Deixe em branco se não consta no laudo" />
        <Campo rotulo="Unidade" value={unidades[nutriente.id] ?? nutriente.unidade_padrao ?? ''} onChangeText={(valor) => setUnidades((atual) => ({ ...atual, [nutriente.id]: valor }))} placeholder="Unidade do laudo" />
      </View>)}
      <Campo rotulo="Observação (laboratório, laudo…)" value={observacao} onChangeText={setObservacao} multiline numberOfLines={3} textAlignVertical="top" />
      <View style={e.salvar}><Botao titulo="Guardar e classificar" ocupado={salvando} desativado={talhoes.length === 0 || nutrientes.length === 0} aoTocar={() => void salvar()} /></View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo },
  conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  erro: { marginTop: espaco.sm },
  secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.lg },
  salvar: { marginTop: espaco.lg },
});
