/**
 * Contexto da fazenda única do tenant.
 *
 * A lista é descoberta pelas válvulas em cache. Havendo mais de um nome de
 * fazenda, o app bloqueia a área autenticada: escolher uma silenciosamente
 * poderia ocultar dados ou permitir operações no tenant errado.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { Talhao } from '@/api/tipos';
import { lerCache } from '@/db/banco';
import { useSinc } from '@/sinc/useSinc';
import { cor, espaco, familia, fonte, raio } from '@/ui/tema';

import { filtrarPorFazenda, listarFazendas } from './modelo';

type FazendaContexto = {
  /** Nome da fazenda única. Nulo enquanto não há uma fazenda conhecida. */
  selecionada: string | null;
  fazendas: string[];
  filtrar: <T extends { fazenda?: string | null }>(itens: T[]) => T[];
  recarregarFazendas: () => Promise<void>;
};

const Contexto = createContext<FazendaContexto | null>(null);

export function ProvedorFazenda({ children }: { children: ReactNode }) {
  const { ultima } = useSinc();
  const [fazendas, setFazendas] = useState<string[]>([]);
  const [erroCache, setErroCache] = useState(false);

  const recarregarFazendas = useCallback(async () => {
    try {
      const talhoes = await lerCache<Talhao>('talhoes');
      setFazendas(listarFazendas(talhoes));
      setErroCache(false);
    } catch {
      setFazendas([]);
      setErroCache(true);
    }
  }, []);

  useEffect(() => {
    void recarregarFazendas();
  }, [recarregarFazendas, ultima]);

  const selecionada = fazendas.length === 1 ? fazendas[0] ?? null : null;
  const filtrar = useCallback(
    <T extends { fazenda?: string | null }>(itens: T[]): T[] =>
      filtrarPorFazenda(itens, selecionada),
    [selecionada],
  );

  const valor = useMemo<FazendaContexto>(
    () => ({ selecionada, fazendas, filtrar, recarregarFazendas }),
    [selecionada, fazendas, filtrar, recarregarFazendas],
  );

  if (erroCache || fazendas.length > 1) {
    return (
      <View style={estilos.bloqueio}>
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color={cor.erro} />
        <Text style={estilos.titulo}>{erroCache ? 'Não foi possível carregar a fazenda' : 'Tenant com mais de uma fazenda'}</Text>
        <Text style={estilos.mensagem}>
          {erroCache
            ? 'O cache de válvulas não pôde ser lido. Feche e abra o app novamente; se o problema continuar, contate o suporte.'
            : `Este tenant deve ter somente uma fazenda, mas o app encontrou ${fazendas.length}: ${fazendas.join(', ')}. Corrija o cadastro no sistema e sincronize novamente.`}
        </Text>
      </View>
    );
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

const estilos = StyleSheet.create({
  bloqueio: { flex: 1, backgroundColor: cor.fundo, alignItems: 'center', justifyContent: 'center', padding: espaco.xl, gap: espaco.md },
  titulo: { color: cor.textoForte, fontFamily: familia.titulo, fontSize: fonte.media, fontWeight: '800', textAlign: 'center' },
  mensagem: { color: cor.texto, fontFamily: familia.corpo, fontSize: fonte.normal, lineHeight: 25, textAlign: 'center', backgroundColor: cor.erroFundo, borderRadius: raio.md, padding: espaco.md },
});

export function useFazenda(): FazendaContexto {
  const contexto = useContext(Contexto);
  if (contexto === null) throw new Error('useFazenda fora do ProvedorFazenda.');
  return contexto;
}
