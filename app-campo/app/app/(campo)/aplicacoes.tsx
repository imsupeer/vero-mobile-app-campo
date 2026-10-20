import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import type { Aplicacao } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { cor, espaco, fonte, raio } from '@/ui/tema';

const ROTULO_TIPO: Record<string, string> = {
  pulverizacao: 'Pulverização', fertirrigacao: 'Fertirrigação', indutor_brotacao: 'Indução de brotação', foliar: 'Foliar', tratamento: 'Tratamento', outro: 'Aplicação',
};
const ROTULO_STATUS: Record<string, string> = {
  planejada: 'Planejada', rascunho: 'Rascunho', registrada: 'Registrada', validada: 'Validada', cancelada: 'Cancelada',
};

export default function Aplicacoes() {
  const { agora } = useSinc();
  const [itens, setItens] = useState<Aplicacao[] | null>(null);
  const [erroSync, setErroSync] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void (async () => { try { setItens(await lerCache<Aplicacao>('aplicacoes')); } catch { setItens([]); } })();
  }, []));

  const ordenadas = useMemo(() => {
    const peso = (a: Aplicacao) => ({ planejada: 0, registrada: 1, rascunho: 2, validada: 3, cancelada: 4 }[a.status ?? ''] ?? 5);
    return [...(itens ?? [])].sort((a, b) => peso(a) - peso(b) || String(b.data_prevista ?? '').localeCompare(String(a.data_prevista ?? '')));
  }, [itens]);

  if (itens === null) return <View style={e.tela}><Carregando /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo}>
      <CabecalhoPagina etiqueta="Defensivos / fertirrigação" titulo="Aplicações (DF/IF)" subtitulo="Consulte o histórico e, conforme o status, confirme a execução ou assine a ordem." />
      {erroSync !== null && <View style={e.mensagem}><Faixa texto={erroSync} tom="erro" /></View>}
      {ordenadas.length === 0 ? <Vazio titulo="Nenhuma aplicação" detalhe="Sincronize para trazer as ordens e o histórico de aplicações do Web." /> : ordenadas.map((a) => {
        const planejada = a.status === 'planejada';
        const status = a.status ?? '';
        const assinadaOperador = a.assinado_operador === 1 || a.assinado_operador === true;
        const assinadaRt = a.assinado_rt === 1 || a.assinado_rt === true;
        const assinada = assinadaOperador && assinadaRt;
        const estiloSelo = status === 'planejada' ? e.seloPlanejada : status === 'registrada' ? e.seloOk : status === 'validada' ? e.seloValidada : status === 'cancelada' ? e.seloCancelada : e.seloHistorico;
        return (
          <Pressable key={a.id} onPress={() => router.push({ pathname: '/aplicacao', params: { id: String(a.id) } })} style={e.cartao}>
            <View style={e.topo}>
              <Text style={e.titulo} numberOfLines={2}>{ROTULO_TIPO[a.tipo ?? 'outro'] ?? 'Aplicação'}</Text>
              <Text style={[e.selo, estiloSelo]}>{ROTULO_STATUS[status] ?? 'Documento'}</Text>
            </View>
            <Text style={e.detalhe}>{[a.talhao_nome, a.data_prevista ?? a.data, `${(a.itens ?? []).length} produto(s)`].filter(Boolean).join(' · ')}</Text>
            <Text style={e.acao}>{planejada ? 'Tocar para confirmar execução ›' : status === 'registrada' ? assinada ? 'Registrada e assinada ›' : 'Tocar para assinar ›' : 'Consultar documento ›'}</Text>
          </Pressable>
        );
      })}
      <View style={e.rodape}><Botao titulo="Sincronizar aplicações" variante="secundario" aoTocar={() => void (async () => {
        setErroSync(null);
        try {
          const resultado = await agora();
          const atualizadas = await lerCache<Aplicacao>('aplicacoes');
          setItens(atualizadas);
          const falha = resultado?.falhasLeitura.find((item) => item.modulo === 'aplicacoes');
          if (falha !== undefined) setErroSync(`Não foi possível sincronizar DF/IF (${falha.codigo}). Verifique sua conexão e permissão de acesso MIP.`);
          else if (atualizadas.length === 0) setErroSync('Sincronização concluída, mas o servidor não retornou aplicações DF/IF para este tenant. Confira os documentos no Web.');
        } catch (erro) {
          setErroSync(erro instanceof Error ? `Falha na sincronização: ${erro.message}` : 'Falha ao sincronizar aplicações.');
        }
      })()} /></View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl }, mensagem: { marginBottom: espaco.md },
  cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  titulo: { flex: 1, color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' },
  selo: { overflow: 'hidden', borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 2, fontSize: 11, fontWeight: '800' },
  seloPlanejada: { color: cor.acao, backgroundColor: cor.fundoSuave }, seloOk: { color: cor.ok, backgroundColor: cor.okFundo },
  seloValidada: { color: cor.ok, backgroundColor: cor.okFundo }, seloCancelada: { color: cor.textoSuave, backgroundColor: cor.campo }, seloHistorico: { color: cor.textoSuave, backgroundColor: cor.campo },
  detalhe: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  acao: { color: cor.acao, fontSize: fonte.pequena, fontWeight: '700', marginTop: espaco.sm },
  rodape: { marginTop: espaco.md },
});
