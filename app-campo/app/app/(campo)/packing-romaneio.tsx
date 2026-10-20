import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErroApi } from '@/api/cliente';
import { packingApi } from '@/packing/api';
import type { RomaneioPacking } from '@/packing/api';
import { useSessao } from '@/sessao';
import { Botao, Campo, Faixa, Vazio } from '@/ui/componentes';
import { cor, espaco, fonte, raio } from '@/ui/tema';

export default function PackingRomaneio() {
  const { pode } = useSessao();
  const podeConsultar = pode('packing.apontar.ver');
  const [numero, setNumero] = useState(''); const [resultado, setResultado] = useState<RomaneioPacking | null>(null); const [erro, setErro] = useState<string | null>(null); const [buscando, setBuscando] = useState(false);
  const buscar = async () => { if (numero.trim() === '') return; setBuscando(true); setErro(null); setResultado(null); try { setResultado(await packingApi.romaneio(numero.trim())); } catch (e) { setErro(e instanceof ErroApi && e.codigo === 'sem_conexao' ? 'A consulta de romaneio precisa de conexão.' : e instanceof Error ? e.message : 'Romaneio não encontrado.'); } finally { setBuscando(false); } };
  if (!podeConsultar) return <View style={e.tela}><Vazio titulo="Sem permissão" detalhe="Seu perfil não pode consultar romaneios pelo posto de caixas." /></View>;
  return <ScrollView style={e.tela} contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled"><Text style={e.titulo}>Consultar romaneio</Text><Text style={e.subtitulo}>Localize a carga antes de configurar o posto ou a recepção.</Text><View style={e.cartao}><Campo rotulo="Número do romaneio" value={numero} onChangeText={setNumero} onSubmitEditing={() => void buscar()} autoCapitalize="characters" placeholder="Digite ou leia o número" autoFocus /><Botao titulo="Buscar" ocupado={buscando} desativado={numero.trim() === ''} aoTocar={() => void buscar()} /></View>{erro !== null && <Faixa texto={erro} tom="erro" />}{resultado !== null && <View style={e.resultado}><View style={e.resultadoCabecalho}><Text style={e.resultadoTitulo}>{resultado.numero ?? numero.trim()}</Text><Text style={e.estado}>{String(resultado.status ?? 'Encontrado')}</Text></View><Linha rotulo="Data" valor={resultado.data} /><Linha rotulo="Válvula" valor={resultado.talhao_nome} /><Linha rotulo="Peso" valor={resultado.peso_kg == null ? null : `${resultado.peso_kg} kg`} /></View>}</ScrollView>;
}

function Linha({ rotulo, valor }: { rotulo: string; valor: unknown }) { if (valor == null || valor === '') return null; return <View style={e.linha}><Text style={e.rotulo}>{rotulo}</Text><Text style={e.valor}>{String(valor)}</Text></View>; }
const e = StyleSheet.create({ tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl, gap: espaco.md }, titulo: { color: cor.textoForte, fontSize: fonte.grande, fontWeight: '800' }, subtitulo: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24, marginTop: -espaco.sm }, cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md }, resultado: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md }, resultadoCabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, marginBottom: espaco.md }, resultadoTitulo: { flex: 1, color: cor.textoForte, fontSize: fonte.media, fontWeight: '800' }, estado: { color: cor.ok, backgroundColor: cor.okFundo, borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: espaco.xs, fontSize: fonte.pequena, fontWeight: '700' }, linha: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: cor.borda }, rotulo: { width: 90, color: cor.textoSuave, fontSize: fonte.pequena }, valor: { flex: 1, color: cor.texto, fontSize: fonte.normal, fontWeight: '700' } });
