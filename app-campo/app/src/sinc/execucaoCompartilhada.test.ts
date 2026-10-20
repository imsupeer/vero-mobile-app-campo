import { describe, expect, it, jest } from '@jest/globals';

import { criarExecucaoCompartilhada } from './execucaoCompartilhada';

describe('criarExecucaoCompartilhada', () => {
  it('faz chamadas concorrentes aguardarem a mesma sincronização', async () => {
    let concluir!: (valor: string) => void;
    const executar = jest.fn(() => new Promise<string>((resolve) => { concluir = resolve; }));
    const chamada = criarExecucaoCompartilhada(executar);

    const primeira = chamada();
    const segunda = chamada();

    expect(segunda).toBe(primeira);
    expect(executar).toHaveBeenCalledTimes(0);
    await Promise.resolve();
    expect(executar).toHaveBeenCalledTimes(1);

    concluir('sincronizada');
    await expect(Promise.all([primeira, segunda])).resolves.toEqual(['sincronizada', 'sincronizada']);
  });

  it('permite iniciar outra sincronização depois que a anterior termina', async () => {
    const executar = jest.fn(async () => 'ok');
    const chamada = criarExecucaoCompartilhada(executar);

    await chamada();
    await chamada();

    expect(executar).toHaveBeenCalledTimes(2);
  });
});
