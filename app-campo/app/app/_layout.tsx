/**
 * A raiz do aplicativo.
 *
 * Decide entre três estados, nesta ordem: sem código da empresa → sem sessão
 * → dentro. Nada além disso mora aqui.
 */
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { ProvedorSessao, useSessao } from "@/sessao";
import { Carregando } from "@/ui/componentes";
import { silenciarAvisosWeb } from "@/ui/silenciarAvisosWeb";

/* remove o ruído do react-native-svg na web (ver o arquivo). Uma vez, no boot. */
silenciarAvisosWeb();

function Porteiro() {
  const { usuario, temAmbiente, carregando } = useSessao();
  const trecho = useSegments();

  useEffect(() => {
    if (carregando) return;

    const primeiro = trecho[0];
    const dentro = primeiro === "(campo)";

    /* sem código da empresa não há para onde falar — nem o login funciona */
    if (!temAmbiente) {
      if (primeiro !== "empresa") router.replace("/empresa");

      return;
    }

    if (usuario === null && primeiro !== "entrar") router.replace("/entrar");
    if (usuario !== null && !dentro) router.replace("/(campo)/inicio");
  }, [usuario, temAmbiente, carregando, trecho]);

  if (carregando) return <Carregando />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Raiz() {
  return (
    <ProvedorSessao>
      <StatusBar style="dark" />
      <Porteiro />
    </ProvedorSessao>
  );
}
