# Entrega

O que precisa estar pronto, e como saber que está.

---

## O teste que vale

Um módulo só está pronto quando passa neste roteiro. Ele parece bobo e é o
único que representa o uso real.

1. Abra o aplicativo **com rede** e deixe sincronizar.
2. **Ligue o modo avião.**
3. Lance três registros. Todos têm de salvar, na hora, sem erro.
4. **Feche o aplicativo pela lista de tarefas** (fechar de verdade, não
   minimizar).
5. Abra de novo, ainda em modo avião. **Os três registros continuam lá.**
6. Desligue o modo avião. Eles sobem sozinhos, sem você tocar em nada.
7. Confira no sistema web: os três estão lá, **uma vez cada**.
8. Force um reenvio (desligue a rede no meio de um envio e religue). Continua
   **uma vez cada**.

O passo 8 é o que pega o erro mais caro deste tipo de aplicativo. Não pule.

---

## Lista de conferência

**Funcionamento**

- [ ] O roteiro acima passa nos módulos entregues
- [ ] Toda tela abre em modo avião, com o cadastro baixado
- [ ] A fila mostra pendente, recusado e o **motivo** da recusa
- [ ] Recusa definitiva não fica retentando
- [ ] Sair com fila pendente pergunta antes

**Acesso**

- [ ] Entrar com perfis diferentes mostra abas diferentes
- [ ] 403 do servidor não aparece como "erro desconhecido"
- [ ] Token expirado derruba para o login, sem travar

**Código**

- [ ] `npm run tipos` limpo
- [ ] Nenhum `console.log` sobrando
- [ ] Nenhuma credencial, endereço de cliente ou dado real no repositório
- [ ] As decisões não óbvias estão comentadas com o **porquê**

**Interface**

- [ ] Nenhum alvo de toque menor que 56 px
- [ ] Nenhuma fonte menor que 15
- [ ] Toda lista tem estado vazio desenhado
- [ ] Mensagens em português, para o operador

---

## O que entregar

O repositório com o código e um resumo curto (uma página basta) dizendo:

- o que ficou pronto e o que não ficou;
- **as decisões que você tomou sozinho** e por quê;
- o que você tentou e descartou — isso poupa a próxima pessoa;
- o que está frágil e merece atenção.

O terceiro e o quarto item valem mais que os outros dois. Código entregue sem
eles obriga quem recebe a redescobrir tudo.

---

## Combinados

**1. Sem regra de negócio inventada.** Faltou definição, pergunte. Um número
plausível num aplicativo agrícola vira decisão no galpão e sobrevive meses até
alguém desconfiar.

**2. O motor de sincronização não se reescreve.** Ele foi portado de um
aplicativo que já roda em campo, e cada proteção existe por um problema real —
todas documentadas em [SINCRONIZACAO.md](SINCRONIZACAO.md). Se algo parecer
errado depois de ler o comentário, **fale antes de mudar**.

**3. O offline é requisito.** Se uma tela só funciona conectada, ela não está
pronta.

**4. Nada de dado real.** Nenhum nome de cliente, nenhum endereço, nenhuma
credencial no repositório.

**5. Na dúvida entre perder um registro e mostrar duplicado**, mostre o
duplicado e deixe a pessoa escolher.

---

## Quando a dúvida for de regra

Pergunte assim:

> Na tela X, preciso de Y. Encontrei Z na API/documentação, mas não cobre o
> caso W. Como devo tratar?

Uma pergunta específica costuma ser respondida no mesmo dia. "Como funciona o
cálculo de premiação?" não.
