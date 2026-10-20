/**
 * O estado da sincronização, compartilhado pelo aplicativo inteiro.
 *
 * Ela roda sozinha — ao abrir e de tempos em tempos —, mas o resultado
 * precisa ficar **visível**. O operador não deve ter de lembrar de apertar um
 * botão, mas precisa conseguir olhar a tela e saber se o trabalho da manhã já
 * subiu. Sem isso, ele vai perguntar isso todo dia, para outra pessoa.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { reconectou } from '@/sinc/conexao';
import { criarExecucaoCompartilhada } from '@/sinc/execucaoCompartilhada';
import { contarFalhas, contarPendentes, reidratarPresos } from '@/sinc/fila';
import { sincronizar } from '@/sinc/motor';
import type { ResultadoSinc } from '@/sinc/motor';

type EstadoSinc = {
  rodando: boolean;
  pendentes: number;
  /** Recusados de vez pelo servidor. Precisam de decisão da pessoa. */
  falhas: number;
  ultima: ResultadoSinc | null;
  /** Dispara uma rodada agora ou aguarda a rodada que já está em andamento. */
  agora: () => Promise<ResultadoSinc>;
  /** Reconta a fila sem sincronizar. Chame após salvar algo. */
  recontar: () => Promise<void>;
};

const Contexto = createContext<EstadoSinc | null>(null);

/** De quanto em quanto tempo tentar sozinho, com o app aberto. */
const INTERVALO_MS = 60_000;

export function ProvedorSinc({ children }: { children: ReactNode }) {
  const [rodando, setRodando] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [ultima, setUltima] = useState<ResultadoSinc | null>(null);
  const [falhas, setFalhas] = useState(0);

  /* Uma única rodada compartilhada. Além de evitar tráfego duplicado, isso
     garante que um botão manual espere a sincronização automática em curso
     antes de reler o cache. Devolver `null` aqui fazia a tela acreditar que
     terminou e exibir dados antigos enquanto a API ainda estava respondendo. */
  const executarRodada = useRef<(() => Promise<ResultadoSinc>) | null>(null);
  if (executarRodada.current === null) {
    executarRodada.current = criarExecucaoCompartilhada(async () => {
      setRodando(true);
      try {
        const resultado = await sincronizar();
        setUltima(resultado);
        return resultado;
      } finally {
        setRodando(false);
        await recontar();
      }
    });
  }

  const recontar = useCallback(async () => {
    setPendentes(await contarPendentes());
    setFalhas(await contarFalhas());
  }, []);

  const agora = useCallback(() => executarRodada.current!(), []);

  /* ao abrir, de minuto em minuto, e toda vez que o app volta do segundo
     plano — este último é o momento mais provável de haver rede de novo,
     porque a pessoa acabou de tirar o celular do bolso */
  useEffect(() => {
    /* um travamento entre enviar e confirmar deixa itens presos em
       'enviando'. Devolvê-los à fila na abertura é seguro: a idempotência
       por client_uuid garante que reenviar não duplica. */
    void reidratarPresos().then(() => agora());

    const relogio = setInterval(() => void agora(), INTERVALO_MS);
    const inscricao = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void agora();
    });
    let estavaConectado: boolean | null = null;
    const inscricaoRede = NetInfo.addEventListener((estado) => {
      const conectado = estado.isConnected === true && estado.isInternetReachable !== false;
      if (reconectou(estavaConectado, conectado)) void agora();
      estavaConectado = conectado;
    });

    return () => {
      clearInterval(relogio);
      inscricao.remove();
      inscricaoRede();
    };
  }, [agora]);

  const valor = useMemo<EstadoSinc>(
    () => ({ rodando, pendentes, falhas, ultima, agora, recontar }),
    [rodando, pendentes, falhas, ultima, agora, recontar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSinc(): EstadoSinc {
  const s = useContext(Contexto);
  if (s === null) throw new Error('useSinc fora do ProvedorSinc.');

  return s;
}
