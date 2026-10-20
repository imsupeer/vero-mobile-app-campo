# Padrões

Como escrever código e interface neste projeto.

---

## Código

**Português.** Nomes de variável, função, arquivo e comentário. Quem mantém
este sistema fala português, e a mistura dos dois idiomas é pior que qualquer
um deles sozinho.

**TypeScript estrito.** `npm run tipos` tem de ficar limpo. `noUncheckedIndexedAccess`
está ligado: acesso a índice devolve `T | undefined` e você trata.

**Tipe o que a tela usa, não tudo.** O cache guarda o item como veio do
servidor. Se você tipar cada campo de cada módulo, um campo novo no ERP vira
uma publicação na loja. Veja `src/api/tipos.ts`.

**Nenhuma tela chama `fetch`.** Tudo passa por `src/api/cliente.ts`, que
desembrulha o envelope e classifica o erro.

**Nenhuma tela lê da rede.** `lerCache(...)` do banco local. A rede alimenta o
cache, em segundo plano.

### Comentários

Explique **por quê**, nunca **o quê**. O código já diz o que faz.

```ts
// ruim: incrementa tentativas
tentativas += 1;

// bom: contar tentativa quando falta rede puniria o operador pelo lugar
// onde ele trabalha — uma semana sem sinal estouraria o teto sozinha
if (codigo !== 'sem_conexao') tentativas += 1;
```

Se você tomar uma decisão não óbvia, escreva duas linhas dizendo o que
considerou. Quem ler daqui a seis meses — talvez você — não vai lembrar.

---

## Interface

Os valores estão em `src/ui/tema.ts`, cada um com o motivo ao lado. Os que
parecem exagero e não são:

**Alvo de toque: 56 px**, não os 44 das diretrizes. Dedo de luva tem área de
contato maior e menos precisão, e errar o botão custa uma repetição inteira do
gesto.

**Nenhuma fonte menor que 15.** Tela empoeirada, sol forte, vista cansada às
cinco da manhã.

**Contraste alto, fundo claro.** Sob sol direto é a diferença entre ler e não
ler. Tema escuro não é prioridade — quem usa isto trabalha de dia.

**Animações de 120 a 180 ms.** O aparelho é fraco e a pessoa repete o mesmo
gesto dezenas de vezes por dia. O que encanta na primeira vez atrasa na
trigésima.

**O botão encolhe ao tocar** (`scale 0.97`). É a única animação que nunca se
remove: sem a resposta imediata, num celular lento, a pessoa acha que não
pegou e toca de novo — e lança duas vezes.

### Estados de tela

Toda lista precisa dos quatro:

| Estado | O que mostrar |
|---|---|
| Carregando | Indicador, sem travar a tela |
| **Vazio** | O que aconteceu **e o que fazer agora** |
| Com conteúdo | |
| Erro | O motivo, em português, e o que tentar |

O vazio é o que mais fica sem desenho, porque quem desenvolve trabalha sempre
com o banco cheio — e é o primeiro estado que todo usuário novo vê. Use o
componente `Vazio`.

### Mensagens

Escreva para a pessoa que está no talhão, não para o programador.

| Não | Sim |
|---|---|
| "Erro 422" | "A data não pode estar no futuro." |
| "Falha ao sincronizar" | "Sem conexão. Os registros sobem quando houver rede." |
| "Erro desconhecido" | (nunca) — mostre a `message` do servidor |

---

## Estrutura de pastas

```
app/            telas (expo-router: o arquivo é a rota)
src/api/        cliente, ambiente, armazenamento seguro, tipos
src/db/         SQLite do aparelho
src/sinc/       fila, motor e o estado visível da sincronização
src/ui/         componentes, tema e a faixa de sincronização
```

Importe com `@/`, que aponta para `src/`.

---

## Segurança

**Token no `expo-secure-store`**, nunca em AsyncStorage. AsyncStorage é
arquivo comum; o celular de campo é emprestado, perdido e esquecido em cima de
caixa.

**Nenhuma credencial no código, nunca.** Nem em comentário, nem em exemplo,
nem em arquivo de teste.

**Nenhum endereço de cliente fixo no código.** O endereço vem do código da
empresa digitado pelo operador.

**Não registre dado de cliente em log.** `console.log` de resposta da API vaza
nome, valor e às vezes o token. Se precisar depurar, tire antes de entregar.

---

## Antes de abrir um PR

- `npm run tipos` limpo;
- testado **em modo avião**, com o cadastro já baixado;
- a fila mostra pendente, recusado e o motivo da recusa;
- nenhum `console.log` sobrando;
- as decisões não óbvias estão comentadas.
