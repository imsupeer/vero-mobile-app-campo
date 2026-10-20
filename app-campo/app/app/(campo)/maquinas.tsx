import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { Maquina, MaquinaRegistro } from '@/api/tipos';
import { dataHoje, dataValida } from '@/caderno/modelo';
import { lerCache } from '@/db/banco';
import { lerHorimetro } from '@/maquinas/regras';
import { useSessao } from '@/sessao';
import { enfileirar } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Campo, CampoData, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { Seletor, SeletorTexto } from '@/ui/Seletor';
import { cor, espaco, fonte, raio } from '@/ui/tema';

const MODOS = [
  { valor: 'horimetro', rotulo: 'Horímetro' },
  { valor: 'abastecimento', rotulo: 'Abastecimento' },
];

export default function Maquinas() {
  const { recontar, agora } = useSinc();
  const { pode } = useSessao();
  const podeVerHorimetro = pode('maquinas.horimetro.ver') || pode('maquinas.horimetro.editar');
  const podeVerAbastecimento = pode('maquinas.abastecimentos.ver') || pode('maquinas.abastecimentos.editar');
  const podeConsultar = podeVerHorimetro || podeVerAbastecimento;
  const podeEditarHorimetro = pode('maquinas.horimetro.editar');
  const podeEditarAbastecimento = pode('maquinas.abastecimentos.editar');
  const modos = useMemo(() => MODOS.filter((item) => item.valor === 'horimetro' ? podeEditarHorimetro : podeEditarAbastecimento), [podeEditarAbastecimento, podeEditarHorimetro]);
  const [maquinas, setMaquinas] = useState<Maquina[] | null>(null);
  const [maquinaId, setMaquinaId] = useState<number | null>(null);
  const [modo, setModo] = useState(podeEditarHorimetro ? 'horimetro' : 'abastecimento');
  const [horimetro, setHorimetro] = useState('');
  const [litros, setLitros] = useState('');
  const [registros, setRegistros] = useState<MaquinaRegistro[]>([]);
  const [data, setData] = useState(dataHoje());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    const primeiroModo = modos[0];
    if (primeiroModo !== undefined && !modos.some((item) => item.valor === modo)) setModo(primeiroModo.valor);
  }, [modo, modos]);

  useFocusEffect(useCallback(() => {
    void (async () => {
      try {
        const [frota, historico] = await Promise.all([
          lerCache<Maquina>('maquinas'),
          lerCache<MaquinaRegistro>('maquina_registros').catch(() => []),
        ]);
        setMaquinas(frota);
        setRegistros(historico);
      } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar a frota.'); setMaquinas([]); }
    })();
  }, []));

  const opcoes = useMemo(
    () => (maquinas ?? []).map((m) => ({ id: m.id, nome: m.nome ?? m.descricao ?? m.codigo ?? m.placa ?? `Máquina ${m.id}` })).sort((a, b) => a.nome.localeCompare(b.nome)),
    [maquinas],
  );

  const salvar = useCallback(async () => {
    if (maquinaId === null) { setErro('Escolha a máquina.'); return; }
    if (!dataValida(data)) { setErro('Informe a data no formato AAAA-MM-DD.'); return; }
    const horas = lerHorimetro(horimetro);
    const qtdLitros = Number(litros.replace(',', '.'));
    setSalvando(true); setErro(null); setMensagem(null);
    try {
      if (modo === 'horimetro') {
        if (horas === null) { setErro('Informe uma leitura do horímetro igual ou maior que zero.'); setSalvando(false); return; }
        await enfileirar({ tipo: 'maquina_horimetro', rota: `/maquinas/${maquinaId}/horimetro`, payload: { horimetro: horas, data } });
      } else {
        if (!Number.isFinite(qtdLitros) || qtdLitros <= 0) { setErro('Informe os litros abastecidos.'); setSalvando(false); return; }
        const payload: Record<string, unknown> = { litros: qtdLitros, data };
        if (horimetro.trim() !== '') {
          if (horas === null) { setErro('O horímetro deve ser igual ou maior que zero.'); setSalvando(false); return; }
          payload.horimetro = horas;
        }
        await enfileirar({ tipo: 'maquina_abastecimento', rota: `/maquinas/${maquinaId}/abastecimento`, payload });
      }
      await recontar(); void agora();
      setMensagem(modo === 'horimetro' ? 'Leitura de horímetro guardada na fila.' : 'Abastecimento guardado na fila.');
      setHorimetro(''); setLitros('');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível guardar o registro.'); }
    finally { setSalvando(false); }
  }, [agora, data, horimetro, litros, maquinaId, modo, recontar]);

  const maquinaAtual = maquinas?.find((m) => m.id === maquinaId) ?? null;
  const historico = registros
    .filter((r) => r.registro_tipo === 'horimetro' ? podeVerHorimetro : podeVerAbastecimento)
    .filter((r) => maquinaId === null || r.maquina_id === maquinaId)
    .slice()
    .sort((a, b) => String(b.data ?? b.updated_at ?? '').localeCompare(String(a.data ?? a.updated_at ?? '')))
    .slice(0, 20);

  if (maquinas === null && erro === null) return <View style={e.tela}><Carregando /></View>;
  if (!podeConsultar) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não pode consultar os registros de máquinas." /></View>;
  if (maquinas?.length === 0) return <View style={e.tela}><Vazio titulo="Nenhuma máquina disponível" detalhe="Sincronize a frota antes de registrar leituras." /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
      <CabecalhoPagina etiqueta="Frota" titulo="Máquinas" subtitulo="Leitura de horímetro e abastecimento no pátio." />
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
      {mensagem !== null && <View style={e.faixa}><Faixa texto={mensagem} /></View>}
      {modos.length === 0 && <View style={e.faixa}><Faixa texto="Acesso somente para consulta. Seu perfil não pode registrar horímetro ou abastecimento." /> </View>}
      {modos.length > 0 && <>
      <Seletor rotulo="Máquina *" opcoes={opcoes} valor={maquinaId} aoMudar={setMaquinaId} />
      {maquinaAtual?.horimetro_atual != null && <Text style={e.atual}>Horímetro atual: {Number(maquinaAtual.horimetro_atual).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h</Text>}
      {modos.length > 1 && <SeletorTexto rotulo="Registro" opcoes={modos} valor={modo} aoMudar={setModo} />}
      {modo === 'horimetro' ? (
        <Campo rotulo="Horímetro (h) *" value={horimetro} onChangeText={setHorimetro} keyboardType="decimal-pad" placeholder="Leitura atual" />
      ) : (
        <>
          <Campo rotulo="Litros *" value={litros} onChangeText={setLitros} keyboardType="decimal-pad" placeholder="0" />
          <Campo rotulo="Horímetro (opcional)" value={horimetro} onChangeText={setHorimetro} keyboardType="decimal-pad" placeholder="Registra a leitura junto" />
          <Text style={e.nota}>O app registra litros e horímetro. O valor financeiro do abastecimento é conciliado no Web.</Text>
        </>
      )}
      <CampoData rotulo="Data *" value={data} onChangeText={setData} />
      {modo === 'horimetro' && <Text style={e.nota}>A leitura precisa ser maior ou igual à última registrada; o servidor recusa um valor menor.</Text>}
      <View style={e.salvar}><Botao titulo="Guardar registro" ocupado={salvando} aoTocar={() => void salvar()} /></View>
      </>}
      <Text style={e.secao}>Histórico recente</Text>
      {historico.map((r) => (
        <View key={r.id} style={e.registro}>
          <View style={e.registroTexto}>
            <Text style={e.registroTitulo}>{r.registro_tipo === 'horimetro' ? 'Leitura de horímetro' : 'Abastecimento'}{r.codigo ? ` · ${r.codigo}` : ''}</Text>
            <Text style={e.nota}>{[r.maquina, r.data?.slice(0, 10)].filter(Boolean).join(' · ')}</Text>
          </View>
          <Text style={e.valor}>{r.registro_tipo === 'horimetro' ? `${Number(r.horimetro ?? 0).toLocaleString('pt-BR')} h` : `${Number(r.litros ?? 0).toLocaleString('pt-BR')} L`}</Text>
        </View>
      ))}
      {historico.length === 0 && <Text style={e.nota}>Nenhum registro sincronizado para esta máquina.</Text>}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  faixa: { marginBottom: espaco.sm }, nota: { color: cor.textoSuave, fontSize: fonte.pequena, lineHeight: 20, marginTop: espaco.md }, salvar: { marginTop: espaco.lg },
  atual: { color: cor.acao, fontSize: fonte.pequena, fontWeight: '700', marginTop: espaco.xs },
  secao: { color: cor.textoForte, fontSize: fonte.media, fontWeight: '800', marginTop: espaco.xl, marginBottom: espaco.sm },
  registro: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, padding: espaco.md, marginBottom: espaco.sm },
  registroTexto: { flex: 1 }, registroTitulo: { color: cor.textoForte, fontSize: fonte.normal, fontWeight: '700' }, valor: { color: cor.textoForte, fontSize: fonte.pequena, fontWeight: '800' },
});
