/**
 * O card de clima do Mapa da Fazenda.
 *
 * É o mesmo bloco que abre o Mapa no VERO web: a previsão de hoje em destaque
 * (temperatura, condição, chuva, vento, UV e o horário do sol) e a tira dos
 * sete dias abaixo. Fecha com a origem do dado — Open-Meteo, modelo global,
 * ponto de referência no centro das válvulas — porque prometer estação local o
 * que é modelo global é o tipo de detalhe que quebra confiança no campo.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Previsao } from '@/clima/previsao';
import { cor, espaco, familia, fonte, raio } from '@/ui/tema';

/** Código WMO → emoji e rótulo em português. */
function tempo(codigo: number): { emoji: string; rotulo: string } {
  if (codigo === 0) return { emoji: '☀️', rotulo: 'Céu limpo' };
  if (codigo <= 2) return { emoji: '🌤️', rotulo: 'Parcialmente nublado' };
  if (codigo === 3) return { emoji: '☁️', rotulo: 'Nublado' };
  if (codigo <= 48) return { emoji: '🌫️', rotulo: 'Névoa' };
  if (codigo <= 57) return { emoji: '🌦️', rotulo: 'Garoa' };
  if (codigo <= 67) return { emoji: '🌧️', rotulo: 'Chuva' };
  if (codigo <= 77) return { emoji: '🌨️', rotulo: 'Neve' };
  if (codigo <= 82) return { emoji: '🌧️', rotulo: 'Pancadas de chuva' };
  if (codigo <= 86) return { emoji: '🌨️', rotulo: 'Pancadas de neve' };
  if (codigo <= 99) return { emoji: '⛈️', rotulo: 'Tempestade' };
  return { emoji: '🌡️', rotulo: '—' };
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function rotuloDia(iso: string, indice: number): { nome: string; data: string } {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const d = new Date(ano ?? 2026, (mes ?? 1) - 1, dia ?? 1);
  const nome = indice === 0 ? 'Hoje' : DIAS_SEMANA[d.getDay()] ?? '—';
  return { nome, data: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}` };
}

function grau(n: number): string {
  return `${Math.round(n)}°`;
}

function dataExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split('T')[0]?.split('-').map(Number) ?? [];
  if (dia == null) return '';
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}

function horaCurta(iso: string): string {
  const t = iso.split('T')[1];
  return t != null ? t.slice(0, 5) : '';
}

export function ClimaCard({ previsao, offline }: { previsao: Previsao; offline?: boolean }) {
  const hoje = previsao.dias[0];
  const cond = tempo(previsao.atual.codigo);
  const virgula = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

  return (
    <View style={e.cartao}>
      {/* previsão de hoje em destaque */}
      <View style={e.topo}>
        <Text style={e.emojiGrande}>{cond.emoji}</Text>
        <View style={e.textoFlex}>
          <Text style={e.etiqueta}>
            Previsão · Hoje{hoje != null ? ` · ${rotuloDia(hoje.data, 0).data}` : ''}
          </Text>
          <Text style={e.tempAtual}>{grau(previsao.atual.temp)}C</Text>
          <Text style={e.condicao}>
            {cond.rotulo}
            {hoje != null ? ` · máx ${grau(hoje.tempMax)} / mín ${grau(hoje.tempMin)}` : ''}
          </Text>
        </View>
      </View>

      {/* medidas do dia */}
      <View style={e.medidas}>
        <Medida rotulo="Chuva" valor={`${Math.round(previsao.hoje.chuva)}%`} />
        <Medida rotulo="Vento máx" valor={`${Math.round(previsao.hoje.ventoMax)} km/h`} />
        <Medida rotulo="UV máx" valor={virgula(previsao.hoje.uvMax)} />
        <Medida rotulo="Sol" valor={`${previsao.hoje.nascer}–${previsao.hoje.ocaso}`} />
      </View>

      {/* tira de sete dias */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={e.tira}>
        {previsao.dias.map((dia, i) => {
          const r = rotuloDia(dia.data, i);
          const t = tempo(dia.codigo);
          return (
            <View key={dia.data} style={[e.dia, i === 0 && e.diaHoje]}>
              <Text style={[e.diaNome, i === 0 && e.diaNomeHoje]}>{r.nome}</Text>
              <Text style={e.diaData}>{r.data}</Text>
              <Text style={e.diaEmoji}>{t.emoji}</Text>
              <View style={e.diaTemps}>
                <Text style={e.diaMax}>{grau(dia.tempMax)}</Text>
                <Text style={e.diaMin}>{grau(dia.tempMin)}</Text>
              </View>
              <Text style={e.diaChuva}>💧 {Math.round(dia.chuva)}%</Text>
            </View>
          );
        })}
      </ScrollView>

      <Text style={e.fonte}>
        Fonte: <Text style={e.fonteForte}>Open-Meteo</Text> · modelo global, sem estação local ·
        ponto de referência no centro das válvulas
        {offline ? ` · última leitura ${dataExtenso(previsao.atualizadoEm)} ${horaCurta(previsao.atualizadoEm)}` : ''}
      </Text>
    </View>
  );
}

function Medida({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={e.medida}>
      <Text style={e.medidaRotulo}>{rotulo}</Text>
      <Text style={e.medidaValor}>{valor}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  cartao: {
    backgroundColor: cor.cabecalho,
    borderRadius: raio.lg,
    padding: espaco.md,
    gap: espaco.md,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  emojiGrande: { fontSize: 44 },
  textoFlex: { flex: 1 },
  etiqueta: { color: cor.textoLateralSuave, fontFamily: familia.corpo, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  tempAtual: { color: '#FFFFFF', fontFamily: familia.numero, fontSize: 34, fontWeight: '700', marginTop: 2 },
  condicao: { color: cor.textoLateral, fontFamily: familia.corpo, fontSize: fonte.pequena, marginTop: 2 },

  medidas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  medida: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 74,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: raio.md,
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.sm,
  },
  medidaRotulo: { color: cor.textoLateralSuave, fontFamily: familia.corpo, fontSize: 11, fontWeight: '600' },
  medidaValor: { color: '#FFFFFF', fontFamily: familia.numero, fontSize: fonte.pequena, fontWeight: '700', marginTop: 2 },

  tira: { gap: espaco.sm, paddingVertical: 2 },
  dia: {
    alignItems: 'center',
    width: 62,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: raio.md,
    paddingVertical: espaco.sm,
    gap: 2,
  },
  diaHoje: { backgroundColor: cor.acao },
  diaNome: { color: cor.textoLateral, fontFamily: familia.corpo, fontSize: 12, fontWeight: '700' },
  diaNomeHoje: { color: '#FFFFFF' },
  diaData: { color: cor.textoLateralSuave, fontFamily: familia.numero, fontSize: 10 },
  diaEmoji: { fontSize: 20, marginVertical: 2 },
  diaTemps: { flexDirection: 'row', gap: 4, alignItems: 'baseline' },
  diaMax: { color: '#FFFFFF', fontFamily: familia.numero, fontSize: 13, fontWeight: '700' },
  diaMin: { color: cor.textoLateralSuave, fontFamily: familia.numero, fontSize: 12 },
  diaChuva: { color: cor.textoLateral, fontFamily: familia.corpo, fontSize: 10 },

  fonte: { color: cor.textoLateralSuave, fontFamily: familia.corpo, fontSize: 11, lineHeight: 16 },
  fonteForte: { color: cor.textoLateral, fontWeight: '700' },
});
