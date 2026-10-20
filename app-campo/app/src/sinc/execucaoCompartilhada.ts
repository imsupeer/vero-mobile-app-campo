/** Compartilha uma operação em andamento e libera a próxima após terminar. */
export function criarExecucaoCompartilhada<T>(
  executar: () => Promise<T>,
): () => Promise<T> {
  let atual: Promise<T> | null = null;

  return () => {
    if (atual !== null) return atual;

    let compartilhada!: Promise<T>;
    compartilhada = Promise.resolve()
      .then(executar)
      .finally(() => {
        if (atual === compartilhada) atual = null;
      });
    atual = compartilhada;
    return compartilhada;
  };
}
