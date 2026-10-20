import { ErroApi } from '@/api/cliente';

export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function numeroDecimal(valor: string): number | null {
  const normalizado = valor.trim().replace(/\./g, '').replace(',', '.');
  if (normalizado === '') return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

export function mensagemErroBipe(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return erro instanceof Error ? erro.message : 'Não foi possível registrar a caixa.';
  const mensagens: Record<string, string> = {
    cracha_invalido: 'Crachá não reconhecido. Confira o código ou atualize o cadastro.',
    posto_sem_atividade: 'Este posto está sem atividade configurada.',
    beep_recusado: 'O servidor recusou este bipe. Confira a pessoa e o posto.',
    sem_recepcao: 'Não existe recepção aceita para esta carga hoje.',
    unidade_invalida: 'A unidade do packing não é válida para este posto.',
  };
  return mensagens[erro.codigo] ?? erro.message;
}

export function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}
