/**
 * Quem está usando o aplicativo, e o que ele pode.
 *
 * Fala com `auth/login`, `auth/refresh` e `auth/logout` do ERP. O token é
 * opaco (64 hexadecimais) e mora no cofre do aparelho — ver
 * `api/sessaoArmazenada.ts`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as Device from 'expo-device';

import { ErroApi, http, registrarPerdaDeSessao } from '@/api/cliente';
import { lerBaseUrl } from '@/api/ambiente';
import {
  apagarToken,
  apagarUsuarioGuardado,
  gravarToken,
  gravarUsuarioGuardado,
  lerToken,
  lerUsuarioGuardado,
} from '@/api/sessaoArmazenada';
import type { RespostaLogin, Usuario } from '@/api/tipos';
import { limparBanco } from '@/db/banco';
import { contarFalhas, contarPendentes } from '@/sinc/fila';

type Sessao = {
  usuario: Usuario | null;
  temAmbiente: boolean;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: (forcar?: boolean) => Promise<void>;
  conferirAmbiente: () => Promise<void>;
  /** `modulo.acao`. Use para não desenhar botão que vai dar 403. */
  pode: (permissao: string) => boolean;
};

const Contexto = createContext<Sessao | null>(null);

/** O nome que identifica este aparelho no servidor, para poder revogá-lo sozinho. */
function nomeDoAparelho(): string {
  return (
    [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || 'Aparelho sem nome'
  );
}

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [temAmbiente, setTemAmbiente] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const conferirAmbiente = useCallback(async () => {
    /* `lerBaseUrl` já considera as duas fontes de endereço: o EXPO_PUBLIC_API_URL
       (atalho de desenvolvimento que aponta para o lab local) e o código da
       empresa digitado. Usar só o código deixava o app preso na tela de empresa
       mesmo com a variável setada — contrariando o que o README promete. */
    setTemAmbiente((await lerBaseUrl()) !== null);
  }, []);

  /**
   * Ao abrir: recupera o que está guardado.
   *
   * Note que **não** se exige rede aqui. Se o aparelho está sem sinal, a
   * sessão continua valendo e a pessoa trabalha normalmente — é o caso comum
   * no campo. Um token revogado de verdade será recusado na primeira
   * sincronização, e aí a sessão cai sozinha (ver `registrarPerdaDeSessao`).
   */
  useEffect(() => {
    let vivo = true;

    void (async () => {
      await conferirAmbiente();

      const token = await lerToken();
      if (token === null) {
        if (vivo) setCarregando(false);

        return;
      }

      /* o usuário guardado é o que permite abrir offline já autenticado */
      const guardado = await lerUsuarioGuardado<Usuario>();
      if (guardado !== null && vivo) setUsuario(guardado);

      /* renova o prazo do token, se houver rede. Falhar aqui não derruba. */
      try {
        await http.post('/auth/refresh');
      } catch {
        /* sem rede, ou token vencido — o segundo caso já limpou a sessão */
      } finally {
        if (vivo) setCarregando(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [conferirAmbiente]);

  /* o cliente avisa quando o servidor recusa o token: some a sessão */
  useEffect(() => {
    registrarPerdaDeSessao(() => {
      void apagarToken();
      void apagarUsuarioGuardado();
      setUsuario(null);
    });
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { data } = await http.postPublico<RespostaLogin>('/auth/login', {
      email: email.trim().toLowerCase(),
      senha,
      device: { nome: nomeDoAparelho(), lembrar: true },
    });

    await gravarToken(data.token);
    await gravarUsuarioGuardado(data.usuario);
    setUsuario(data.usuario);
  }, []);

  /**
   * Sair apaga o banco do aparelho — inclusive a fila.
   *
   * Por isso o `forcar`: com trabalho pendente, a tela precisa perguntar
   * antes. Sair sem avisar destrói trabalho de verdade, e a pessoa não tem
   * como recuperar.
  */
  const sair = useCallback(async (forcar = false) => {
    const [pendentes, falhas] = forcar
      ? [0, 0]
      : await Promise.all([contarPendentes(), contarFalhas()]);

    if (pendentes + falhas > 0) {
      throw new ErroApi('fila_pendente', 'Há registros ainda não enviados.', 0);
    }

    try {
      await http.post('/auth/logout');
    } catch {
      /* sem rede: sai mesmo assim, o token local vai embora */
    }

    await apagarToken();
    await apagarUsuarioGuardado();
    await limparBanco();
    setUsuario(null);
  }, []);

  const pode = useCallback(
    (permissao: string) => {
      const lista = usuario?.permissoes;
      if (lista == null) return false;
      /* super_admin vem do ERP com permissoes ['*'] — curinga de acesso total.
         Sem tratar isso, todo pode() falharia no match exato e o menu inteiro
         sumiria justamente para quem tem tudo liberado. */
      return lista.includes('*') || lista.includes(permissao);
    },
    [usuario],
  );

  const valor = useMemo<Sessao>(
    () => ({ usuario, temAmbiente, carregando, entrar, sair, conferirAmbiente, pode }),
    [usuario, temAmbiente, carregando, entrar, sair, conferirAmbiente, pode],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const s = useContext(Contexto);
  if (s === null) throw new Error('useSessao fora do ProvedorSessao.');

  return s;
}
