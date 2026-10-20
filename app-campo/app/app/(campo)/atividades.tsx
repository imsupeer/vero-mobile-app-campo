import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Atividade } from '@/api/tipos';
import { acoesAtividade, type AcaoAtividade } from '@/atividades/fluxo';
import { lerCache } from '@/db/banco';
import { enfileirar, estadoDe } from '@/sinc/fila';
import { useSinc } from '@/sinc/useSinc';
import { Botao, CabecalhoPagina, Carregando, Faixa, Vazio } from '@/ui/componentes';
import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

/** Rótulo do status atual (enum do banco). */
function rotuloStatus(status?: string | null): string {
  switch (status) {
    case 'em_execucao': return 'Em execução';
    case 'concluida': return 'Concluída';
    case 'pausada': return 'Pausada';
    default: return 'Planejada';
  }
}

const ROTULOS_ACAO: Record<string, string> = { andamento: 'Iniciar', concluida: 'Concluir' };

/** Status-alvo (enum do banco) que cada ação produz — para o realce e o
 *  "já está assim". */
const ALVO: Record<AcaoAtividade, string> = { andamento: 'em_execucao', concluida: 'concluida' };

export default function Atividades() {
  const { recontar, agora } = useSinc();
  const [itens, setItens] = useState<Atividade[] | null>(null);
  const [pendentes, setPendentes] = useState<Record<number, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const lista = await lerCache<Atividade>('atividades');
      setItens(lista.filter((a) => a.status !== 'cancelada'));
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar as atividades.'); setItens([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const ordenadas = useMemo(
    () => [...(itens ?? [])].sort((a, b) => String(b.data_planejada ?? '').localeCompare(String(a.data_planejada ?? ''))),
    [itens],
  );

  const mudar = useCallback(async (atividade: Atividade, acao: AcaoAtividade) => {
    setErro(null); setMensagem(null);
    try {
      const payload: Record<string, unknown> = { status: acao };
      if (atividade.updated_at != null) payload.updated_at_conhecido = String(atividade.updated_at).slice(0, 19);
      const clientUuid = await enfileirar({ tipo: 'atividade_status', rota: `/atividades/${atividade.id}/status`, payload });
      setPendentes((atual) => ({ ...atual, [atividade.id]: ALVO[acao] }));
      await recontar();
      await agora();

      const estadoFila = await estadoDe(clientUuid);
      if (estadoFila === 'confirmado' || estadoFila === 'falha' || estadoFila === 'erro') {
        // A resposta da API pode avançar updated_at. Releia o cache antes de
        // permitir outra transição, para não reenviar a próxima ação com uma
        // versão antiga da atividade.
        await carregar();
        setPendentes((atual) => {
          const copia = { ...atual };
          delete copia[atividade.id];
          return copia;
        });
      }

      if (estadoFila === 'confirmado') setMensagem('Status sincronizado com o sistema.');
      else if (estadoFila === 'falha' || estadoFila === 'erro') setErro('Não foi possível sincronizar esta mudança. Confira a fila de envio.');
      else setMensagem('Mudança guardada na fila e aguardando conexão.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível mudar o status.'); }
  }, [agora, carregar, recontar]);

  if (itens === null && erro === null) return <View style={e.tela}><Carregando /></View>;

  return (
    <ScrollView style={e.tela} contentContainerStyle={e.conteudo}>
      <CabecalhoPagina etiqueta="Ordens de serviço" titulo="Atividades planejadas" subtitulo="Avance o status das atividades do campo. A mudança sobe na próxima sincronização." />
      {erro !== null && <View style={e.faixa}><Faixa texto={erro} tom="erro" /></View>}
      {mensagem !== null && <View style={e.faixa}><Faixa texto={mensagem} /></View>}
      {ordenadas.length === 0 ? <Vazio titulo="Nenhuma atividade planejada" detalhe="Sincronize para trazer as ordens de serviço." acao={<Botao titulo="Sincronizar agora" aoTocar={() => void agora()} />} /> : ordenadas.map((a) => {
        const statusAtual = pendentes[a.id] ?? a.status ?? 'planejada';
        return (
          <View key={a.id} style={e.cartao}>
            <View style={e.topo}>
              <Text style={e.titulo} numberOfLines={2}>{a.descricao ?? a.nome ?? `Atividade ${a.id}`}</Text>
              <Text style={[e.selo, statusAtual === 'concluida' ? e.seloOk : statusAtual === 'em_execucao' ? e.seloAndamento : e.seloPlanejada]}>{rotuloStatus(statusAtual)}</Text>
            </View>
            <Text style={e.detalhe}>{[a.talhao_nome, a.data_planejada].filter(Boolean).join(' · ') || 'Sem válvula/data'}</Text>
            {pendentes[a.id] != null && <Text style={e.aguardando}>Aguardando envio</Text>}
            <View style={e.acoes}>
            {pendentes[a.id] != null ? null : acoesAtividade(statusAtual).map((acao) => (
                  <Pressable key={acao} onPress={() => void mudar(a, acao)} style={e.acao}>
                    <Text style={e.acaoTexto}>{ROTULOS_ACAO[acao]}</Text>
                  </Pressable>
                ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.fundo }, conteudo: { padding: espaco.md, paddingBottom: espaco.xl },
  faixa: { marginBottom: espaco.sm },
  cartao: { backgroundColor: cor.superficie, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.lg, padding: espaco.md, marginBottom: espaco.sm },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: espaco.sm },
  titulo: { flex: 1, color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' },
  selo: { overflow: 'hidden', borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: 2, fontSize: 11, fontWeight: '800' },
  seloOk: { color: cor.ok, backgroundColor: cor.okFundo }, seloAndamento: { color: cor.acao, backgroundColor: cor.fundoSuave }, seloPlanejada: { color: cor.textoSuave, backgroundColor: cor.campo },
  detalhe: { color: cor.textoSuave, fontSize: fonte.pequena, marginTop: espaco.xs },
  aguardando: { color: cor.alerta, fontSize: fonte.pequena, fontWeight: '700', marginTop: espaco.xs },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, marginTop: espaco.md },
  acao: { minHeight: toque.alvoPequeno, justifyContent: 'center', borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md, paddingHorizontal: espaco.md, backgroundColor: cor.superficie },
  acaoInativa: { opacity: 0.4 },
  acaoTexto: { color: cor.acao, fontSize: fonte.pequena, fontWeight: '700' }, acaoTextoInativa: { color: cor.textoSuave },
});
