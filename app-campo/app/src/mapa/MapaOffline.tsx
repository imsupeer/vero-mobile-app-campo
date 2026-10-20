import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as TextoSvg } from 'react-native-svg';

import type { Talhao } from '@/api/tipos';
import { projetarTalhoes } from '@/mapa/geometria';
import type { Coordenada } from '@/mapa/geometria';
import { cor, espaco, fonte, raio, sombra } from '@/ui/tema';

const LARGURA = 340;
const ALTURA = 220;

/** Estados que o mapa sabe colorir: os de situação e os de pressão MIP/MID. */
export type EstadoMapa =
  | 'normal' | 'servico' | 'alerta'          // lente "situação"
  | 'sem' | 'controlado' | 'atencao' | 'critico'; // lente "pressão MIP/MID"

/** Cor de cada estado. `alerta` (situação) e `alerta` (pressão ≥100%) são o
 *  mesmo vermelho de propósito — os dois querem dizer "olhe aqui". */
const COR_ESTADO: Record<EstadoMapa, string> = {
  normal: cor.ok,
  controlado: cor.ok,
  servico: cor.alerta,
  atencao: cor.alerta,
  alerta: cor.erro,
  critico: '#7A1D14',
  sem: cor.tenue,
};

/** A cor de um estado do mapa — usada tanto no desenho offline quanto nos
 *  polígonos do mapa de satélite, para os dois combinarem. */
export function corDoEstado(estado: EstadoMapa): string {
  return COR_ESTADO[estado] ?? cor.ok;
}

export function MapaOffline({ talhoes, estados = {}, legenda, selecionadoId, posicao, aoSelecionar, titulo = 'Mapa offline da fazenda', selo = 'SEM INTERNET' }: { talhoes: Talhao[]; estados?: Record<string, EstadoMapa>; legenda?: Array<{ cor: string; texto: string }>; selecionadoId?: number | null; posicao?: Coordenada | null; aoSelecionar?: (talhao: Talhao) => void; titulo?: string; selo?: string | null }) {
  const projecao = useMemo(() => projetarTalhoes(talhoes, LARGURA, ALTURA, posicao), [posicao, talhoes]);
  const porId = useMemo(() => new Map(talhoes.map((item) => [item.id, item])), [talhoes]);
  const grade = [];
  for (let x = 42; x < LARGURA; x += 42) grade.push(<Line key={`x-${x}`} x1={x} y1={0} x2={x} y2={ALTURA} stroke={cor.campo} strokeWidth={1} />);
  for (let y = 42; y < ALTURA; y += 42) grade.push(<Line key={`y-${y}`} x1={0} y1={y} x2={LARGURA} y2={y} stroke={cor.campo} strokeWidth={1} />);

  const tinta = (id: number) => COR_ESTADO[estados[String(id)] ?? 'normal'] ?? cor.ok;
  const itensLegenda = legenda ?? [
    { cor: cor.ok, texto: 'Sem pendência' },
    { cor: cor.alerta, texto: 'Serviço aberto' },
    { cor: cor.erro, texto: 'Alerta' },
  ];
  return (
    <View style={e.cartao}>
      <View style={e.tituloLinha}><Text style={e.titulo}>{titulo}</Text>{selo != null && <Text style={e.offline}>{selo}</Text>}</View>
      {projecao.formas.length === 0 ? <Text style={e.semMapa}>As válvulas ainda não possuem geometria ou coordenadas sincronizadas.</Text> : (
        <View style={e.quadro}>
          <Svg width="100%" height={ALTURA} viewBox={`0 0 ${LARGURA} ${ALTURA}`}>
            {grade}
            {projecao.formas.map((forma) => {
              const selecionado = forma.id === selecionadoId;
              const item = porId.get(forma.id);
              const corForma = tinta(forma.id);
              return forma.caminho === null ? (
                <Circle key={forma.id} cx={forma.centro.x} cy={forma.centro.y} r={selecionado ? 10 : 7} fill={corForma} stroke={cor.superficie} strokeWidth={2} onPress={() => item != null && aoSelecionar?.(item)} />
              ) : (
                <Path key={forma.id} d={forma.caminho} fill={corForma} fillOpacity={selecionado ? 0.52 : 0.3} stroke={selecionado ? cor.cabecalho : cor.superficie} strokeWidth={selecionado ? 3 : 2} fillRule="evenodd" onPress={() => item != null && aoSelecionar?.(item)} />
              );
            })}
            {projecao.formas.map((forma) => <TextoSvg key={`nome-${forma.id}`} x={forma.centro.x} y={forma.centro.y - 11} fill={cor.textoForte} fontSize={15} fontWeight="700" textAnchor="middle">{forma.nome.slice(0, 18)}</TextoSvg>)}
            {projecao.posicao != null && <><Circle cx={projecao.posicao.x} cy={projecao.posicao.y} r={13} fill={cor.acaoApoio} fillOpacity={0.2} /><Circle cx={projecao.posicao.x} cy={projecao.posicao.y} r={6} fill={cor.acao} stroke={cor.superficie} strokeWidth={2} /></>}
          </Svg>
        </View>
      )}
      <View style={e.legenda}>{itensLegenda.map((l) => <Legenda key={l.texto} cor={l.cor} texto={l.texto} />)}{posicao != null && <Legenda cor={cor.acao} texto="Sua posição" />}</View>
      <Text style={e.nota}>Desenho gerado apenas com dados armazenados no aparelho.</Text>
    </View>
  );
}

function Legenda({ cor: tinta, texto }: { cor: string; texto: string }) {
  return <View style={e.legendaItem}><View style={[e.ponto, { backgroundColor: tinta }]} /><Text style={e.legendaTexto}>{texto}</Text></View>;
}

const e = StyleSheet.create({
  cartao: { backgroundColor: cor.superficie, borderRadius: raio.lg, borderWidth: 1, borderColor: cor.borda, padding: espaco.md, ...sombra.cartao },
  tituloLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaco.sm }, titulo: { flex: 1, color: cor.textoForte, fontSize: fonte.normal, fontWeight: '800' }, offline: { color: cor.ok, backgroundColor: cor.okFundo, borderRadius: raio.sm, paddingHorizontal: espaco.sm, paddingVertical: espaco.xs, fontSize: fonte.pequena, fontWeight: '800' },
  quadro: { marginTop: espaco.sm, overflow: 'hidden', backgroundColor: cor.fundoSuave, borderWidth: 1, borderColor: cor.borda, borderRadius: raio.md }, semMapa: { color: cor.textoSuave, fontSize: fonte.normal, lineHeight: 24, paddingVertical: espaco.lg },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.md, marginTop: espaco.sm }, legendaItem: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs }, ponto: { width: 10, height: 10, borderRadius: 5 }, legendaTexto: { color: cor.textoSuave, fontSize: fonte.pequena }, nota: { color: cor.textoDesativado, fontSize: fonte.pequena, marginTop: espaco.sm },
});
