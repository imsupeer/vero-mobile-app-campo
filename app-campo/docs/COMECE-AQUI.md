# Comece aqui

Escrito para quem vai desenvolver o aplicativo. Leia esta página inteira antes
de abrir o código — são dez minutos que evitam uma semana.

---

## O que é este projeto

Um aplicativo móvel para quem trabalha **na fazenda**: operador, encarregado,
técnico, pessoal do packing house. Ele conversa com o ERP VERO, que já existe
e já funciona.

```
[ este aplicativo ]  ←── HTTPS/JSON ──→  [ ERP · api/v1 ]
    React Native                          PHP, já no ar
    banco local                           dono do dado
```

**Não existe servidor intermediário, e não deve existir.** O ERP é o dono do
dado. Um segundo lugar guardando o mesmo apontamento de colheita criaria um
problema de reconciliação que não se conserta depois — só se administra, para
sempre.

---

## Antes do código: quem usa isto

Quase toda decisão estranha deste projeto se explica aqui, então vale o
minuto.

O aplicativo roda **no meio do talhão**. Sol forte batendo na tela. A pessoa
está de luva, às vezes com a mão suja de terra. O celular é simples e tem
pouca memória. A rede vai de 4G a nada, e muda de uma fileira para a outra. O
expediente começa às cinco da manhã.

Disso saem três regras que não se negociam:

**1. Funcionar sem sinal não é recurso, é requisito.** Tela que só funciona
conectada é tela que não funciona. A leitura vem sempre do banco do aparelho;
a rede só alimenta esse banco, em segundo plano.

**2. Salvar nunca espera rede.** A pessoa toca em salvar, o registro entra na
fila local e a tela já responde. O envio acontece depois, sozinho.

**3. Nunca perder o que a pessoa digitou.** Na dúvida entre perder um registro
e mostrar um duplicado para ela escolher, mostre o duplicado.

---

## Rodar

```bash
cd app
npm install
npx expo start
```

Leia o QR com o **Expo Go** no celular, ou aperte `a` para o emulador Android.

Na primeira abertura o aplicativo pede o **código da empresa** — é ele que
monta o endereço do servidor. Para desenvolver, pule essa tela apontando
direto:

```bash
EXPO_PUBLIC_API_URL=https://<servidor>/api/v1 npx expo start
```

O login é o mesmo do sistema web do cliente: e-mail e senha da tabela
`usuarios`. Peça um acesso de teste a quem entregou este projeto.

```bash
npm run tipos      # tsc --noEmit — precisa ficar limpo antes de entregar
```

---

## O caminho de leitura

Nesta ordem. Não pule o segundo.

1. **[API-DO-ERP.md](API-DO-ERP.md)** — o envelope de resposta, o login, os
   códigos de erro e as rotas. Sem isso nada faz sentido.
2. **[SINCRONIZACAO.md](SINCRONIZACAO.md)** — como o offline funciona e **o
   que não pode ser quebrado**. É o documento mais importante daqui.
3. **[O-QUE-CONSTRUIR.md](O-QUE-CONSTRUIR.md)** — os módulos, tela a tela.
4. **[PADROES.md](PADROES.md)** — como escrever código e interface neste
   projeto.
5. **[ENTREGA.md](ENTREGA.md)** — o que precisa estar pronto no fim.

No código, comece por `app/src/sinc/motor.ts`. Ele tem comentários explicando
o porquê de cada proteção, e cada uma existe por um problema que já aconteceu
em campo.

---

## O que já está pronto

| Peça | Onde | Situação |
|---|---|---|
| Cliente da API | `src/api/cliente.ts` | Pronto |
| Código da empresa | `src/api/ambiente.ts` | Pronto |
| Token no cofre | `src/api/sessaoArmazenada.ts` | Pronto |
| Banco do aparelho | `src/db/banco.ts` | Pronto |
| Fila de escrita | `src/sinc/fila.ts` | Pronta |
| **Motor de sincronização** | `src/sinc/motor.ts` | **Pronto — não reescreva** |
| Sessão e permissões | `src/sessao.tsx` | Pronta |
| Navegação e abas | `app/(campo)/_layout.tsx` | Pronta |
| Tela da fila de envio | `app/(campo)/fila.tsx` | Pronta |
| Componentes e tema | `src/ui/` | Prontos |
| **As telas dos módulos** | `app/(campo)/*.tsx` | **É o seu trabalho** |

---

## Um aviso sobre o motor

O motor de sincronização foi **portado de um aplicativo que já roda em
campo**. Ele parece mais complicado do que precisaria, e não é.

Cada proteção lá dentro existe porque alguma coisa deu errado de verdade, com
o produtor no telefone. Estão documentadas uma a uma em
[SINCRONIZACAO.md](SINCRONIZACAO.md#o-que-não-pode-ser-quebrado).

Se você achar um trecho estranho e tiver vontade de simplificar: leia o
comentário primeiro. Se depois disso ainda parecer errado, **fale antes de
mudar**.

---

## Como perguntar

Faltou definição de regra de negócio? **Pergunte.** Não invente um número
plausível.

Isso não é formalidade. Um valor inventado num aplicativo agrícola não é um
detalhe a acertar depois: ele vira decisão no galpão, entra em relatório, e
sobrevive meses até alguém desconfiar. É mais barato esperar a resposta.
