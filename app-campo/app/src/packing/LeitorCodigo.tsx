import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { cor, espaco, fonte, raio, toque } from '@/ui/tema';

export function LeitorCodigo({ visivel, aoLer, aoFechar }: { visivel: boolean; aoLer: (codigo: string) => void; aoFechar: () => void }) {
  const [permissao, pedirPermissao] = useCameraPermissions();
  const ultima = useRef<{ codigo: string; instante: number }>({ codigo: '', instante: 0 });
  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={aoFechar}>
      <View style={e.tela}>
        <View style={e.cabecalho}><View><Text style={e.titulo}>Leitor de crachás</Text><Text style={e.subtitulo}>Cada leitura válida registra uma caixa.</Text></View><Pressable accessibilityRole="button" onPress={aoFechar} style={e.fechar}><Text style={e.fecharTexto}>Fechar</Text></Pressable></View>
        {permissao?.granted ? <View style={e.cameraContainer}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'] }} onBarcodeScanned={({ data }) => {
          const agora = Date.now(); const codigo = data.trim();
          if (codigo === '') return;
          if (ultima.current.codigo === codigo && agora - ultima.current.instante < 600) {
            ultima.current = { codigo, instante: agora };
            return;
          }
          ultima.current = { codigo, instante: agora }; aoLer(codigo);
        }} /><View pointerEvents="none" style={e.mira}><View style={e.quadro} /></View></View> : <View style={e.permissao}><Text style={e.permissaoTitulo}>A câmera precisa de autorização</Text><Text style={e.permissaoTexto}>O leitor usa a câmera somente para identificar o código do crachá.</Text><Pressable onPress={() => void pedirPermissao()} style={e.autorizar}><Text style={e.autorizarTexto}>Autorizar câmera</Text></Pressable></View>}
        <Text style={e.rodape}>Mantenha o código dentro do quadro. Leitores físicos também funcionam pelo campo manual.</Text>
      </View>
    </Modal>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cor.cabecalho }, cabecalho: { minHeight: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.md, padding: espaco.md }, titulo: { color: cor.acaoTexto, fontSize: fonte.media, fontWeight: '800' }, subtitulo: { color: cor.borda, fontSize: fonte.pequena, marginTop: espaco.xs }, fechar: { minHeight: toque.alvo, justifyContent: 'center', paddingHorizontal: espaco.md }, fecharTexto: { color: cor.acaoTexto, fontSize: fonte.pequena, fontWeight: '700' }, cameraContainer: { flex: 1, position: 'relative' }, mira: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,38,42,0.22)' }, quadro: { width: '78%', height: 220, borderWidth: 3, borderColor: cor.acaoTexto, borderRadius: raio.lg }, permissao: { flex: 1, justifyContent: 'center', padding: espaco.xl }, permissaoTitulo: { color: cor.acaoTexto, fontSize: fonte.media, fontWeight: '800', textAlign: 'center' }, permissaoTexto: { color: cor.borda, fontSize: fonte.normal, lineHeight: 24, textAlign: 'center', marginTop: espaco.sm }, autorizar: { minHeight: toque.alvo, alignItems: 'center', justifyContent: 'center', backgroundColor: cor.acao, borderRadius: raio.md, marginTop: espaco.lg }, autorizarTexto: { color: cor.acaoTexto, fontSize: fonte.normal, fontWeight: '700' }, rodape: { color: cor.acaoTexto, fontSize: fonte.pequena, lineHeight: 22, textAlign: 'center', padding: espaco.md },
});
