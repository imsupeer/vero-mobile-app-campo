import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { SafraTalhao, Talhao } from '@/api/tipos';
import { dataHoje, dataValida } from '@/caderno/modelo';
import { lerCache } from '@/db/banco';
import { useFazenda } from '@/fazenda/contexto';
import { useSessao } from '@/sessao';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Campo, CampoData, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { Seletor } from '@/ui/Seletor';
import { cor, espaco, fonte } from '@/ui/tema';

export default function Irrigacao() {
  const { recontar, agora } = useSinc();
  const { pode } = useSessao();
  const { selecionada } = useFazenda();
  const [talhoes, setTalhoes] = useState<Talhao[] | null>(null);
  const [talhaoId, setTalhaoId] = useState<number | null>(null);
  const [horas, setHoras] = useState('');
  const [lamina, setLamina] = useState('');
  const [agua, setAgua] = useState('');
  const [energia, setEnergia] = useState('');
  const [custoAgua, setCustoAgua] = useState('');
  const [custoEnergia, setCustoEnergia] = useState('');
  const [safrasTalhoes, setSafrasTalhoes] = useState<SafraTalhao[]>([]);
  const [safraTalhaoId, setSafraTalhaoId] = useState<number | null>(null);
  const [data, setData] = useState(dataHoje());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [valvulas, vinculos] = await Promise.all([lerCache<Talhao>('talhoes'), lerCache<SafraTalhao>('safras_talhoes').catch(() => [])]);
        setTalhoes(valvulas);
        setSafrasTalhoes(vinculos);
      }
      catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar as válvulas.'); setTalhoes([]); }
    })();
  }, []);

  const opcoes = useMemo(() => {
    const lista = (talhoes ?? []).filter((t) => selecionada == null || (t.fazenda ?? '').trim() === selecionada);
    return lista.map((t) => ({ id: t.id, nome: t.codigo ?? t.nome ?? `Válvula ${t.id}` })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [talhoes, selecionada]);

  const salvar = useCallback(async () => {
    if (talhaoId === null) { setErro('Escolha a válvula.'); return; }
    if (!dataValida(data)) { setErro('Informe a data no formato AAAA-MM-DD.'); return; }
    const setor = (talhoes ?? []).find((t) => t.id === talhaoId);
    const talhaoPai = setor?.talhao_id ?? talhaoId;
    const vinculosSafra = safrasTalhoes.filter((item) => Number(item.talhao_id) === Number(talhaoPai));
    const safraSelecionada = safraTalhaoId == null ? null : vinculosSafra.find((item) => item.id === safraTalhaoId) ?? null;
    if (safraTalhaoId !== null && safraSelecionada === null) { setErro('A safra escolhida não pertence a esta válvula.'); return; }
    setSalvando(true); setErro(null);
    try {
      const payload: Record<string, unknown> = { talhao_id: talhaoPai, setor_id: talhaoId, data };
      const numero = (rotulo: string, valor: string) => {
        if (valor.trim() === '') return null;
        const n = Number(valor.replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) throw new Error(`${rotulo} deve ser um número igual ou maior que zero.`);
        return n;
      };
      const h = numero('Horas', horas); if (h != null) payload.horas = h;
      const l = numero('Lâmina', lamina); if (l != null) payload.lamina_mm = l;
      const a = numero('Água', agua); if (a != null) payload.agua_qtd = a;
      const en = numero('Energia', energia); if (en != null) payload.energia_qtd = en;
      const ca = numero('Custo da água', custoAgua); if (ca != null) payload.agua_custo = ca;
      const ce = numero('Custo da energia', custoEnergia); if (ce != null) payload.energia_custo = ce;
      if (safraSelecionada !== null) payload.safra_talhao_id = safraSelecionada.id;
      await enfileirar({ tipo: 'irrigacao_apontamento', rota: '/irrigacao/apontamentos', payload });
      await recontar(); void agora();
      router.back();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível guardar o apontamento.'); }
    finally { setSalvando(false); }
  }, [agora, agua, custoAgua, custoEnergia, data, energia, horas, lamina, recontar, safraTalhaoId, safrasTalhoes, talhaoId, talhoes]);

  if (!pode('irrigacao.apontamentos_irrigacao.editar')) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não pode registrar apontamentos de irrigação." /></View>;
  if (talhoes === null && erro === null) return <View style={e.tela}><Carregando /></View>;
  if (talhoes?.length === 0) return <View style={e.tela}><Vazio titulo="Nenhuma válvula disponível" detalhe="Sincronize antes de apontar a irrigação." /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta="Irrigação" titulo="Apontamento de irrigação" subtitulo="Horas e lâmina aplicadas. A água e a energia saem da bomba do setor quando você não informa." />
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
        <Seletor rotulo="Válvula / setor *" opcoes={opcoes} valor={talhaoId} aoMudar={(id) => { setTalhaoId(id); setSafraTalhaoId(null); }} />
      {talhaoId !== null && (() => {
        const setor = talhoes?.find((item) => item.id === talhaoId);
        const vinculos = safrasTalhoes.filter((item) => Number(item.talhao_id) === Number(setor?.talhao_id ?? talhaoId));
        return vinculos.length > 0 ? <Seletor rotulo="Safra (vínculo)" permiteVazio opcoes={vinculos.map((item) => ({ id: item.id, nome: item.safra ?? `Safra ${item.safra_id ?? item.id}` }))} valor={safraTalhaoId} aoMudar={setSafraTalhaoId} /> : null;
      })()}
      <View style={e.duas}><View style={e.col}><Campo rotulo="Horas" value={horas} onChangeText={setHoras} keyboardType="decimal-pad" placeholder="0" /></View><View style={e.col}><Campo rotulo="Lâmina (mm)" value={lamina} onChangeText={setLamina} keyboardType="decimal-pad" placeholder="0" /></View></View>
      <Text style={e.nota}>Consumos e custos do período. Ao deixar quantidade ou custo em branco, o ERP tenta calcular pela bomba e pelas tarifas configuradas.</Text>
      <View style={e.duas}><View style={e.col}><Campo rotulo="Água (m³)" value={agua} onChangeText={setAgua} keyboardType="decimal-pad" placeholder="Automático" /></View><View style={e.col}><Campo rotulo="Energia (kWh)" value={energia} onChangeText={setEnergia} keyboardType="decimal-pad" placeholder="Automático" /></View></View>
      <View style={e.duas}><View style={e.col}><Campo rotulo="Custo da água (R$)" value={custoAgua} onChangeText={setCustoAgua} keyboardType="decimal-pad" placeholder="Tarifa automática" /></View><View style={e.col}><Campo rotulo="Custo da energia (R$)" value={custoEnergia} onChangeText={setCustoEnergia} keyboardType="decimal-pad" placeholder="Tarifa automática" /></View></View>
      <CampoData rotulo="Data *" value={data} onChangeText={setData} />
      <View style={e.salvar}><Botao titulo="Guardar apontamento" ocupado={salvando} aoTocar={() => void salvar()} /></View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  faixa: { marginBottom: espaco.sm }, duas: { flexDirection: 'row', gap: espaco.sm, marginTop: espaco.md }, col: { flex: 1 },
  nota: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.md }, salvar: { marginTop: espaco.lg },
});
