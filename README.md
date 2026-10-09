# Expedito

**Visibilidade e controle das tarefas externas da expedição portuária.**

Projeto do Hackathon UNISANTA 2026 (Desafio T2S / DYNApp Hub).

**Demo:** https://expedito-two.vercel.app

---

## O problema

Em empresas de logística portuária, a equipe de expedição passa o dia retirando e entregando documentos (BL original, cartas de liberação, procurações) nas agências dos armadores. O gestor costuma acompanhar tudo por planilha, WhatsApp e memória. Ele não sabe, a tempo de agir, **o que está atrasado e o que vai atrasar**. Um BL que não sai hoje vira custo de armazenagem e de demurrage do contêiner.

## A solução

O Expedito é uma aplicação web com dois perfis.

**Gestor (desktop)**
- **Painel do dia**: tarefas agrupadas, com destaque imediato para as **atrasadas** e **em risco**. Atualiza sozinho a cada minuto.
- **Alertas em pop-up**: avisam quando uma tarefa entra em risco, vence em até 30 min, atrasa, está sem responsável ou recebe uma ocorrência do campo.
- **Indicadores**: o histórico com período selecionável (7 dias, 30 dias, 90 dias, 12 meses, ano ou intervalo livre). Mostra:
  - pontualidade e comparação com o período anterior;
  - atraso médio;
  - evolução no tempo;
  - desempenho por pessoa;
  - agências que concentram atrasos e ocorrências;
  - mapa de calor de dia × hora;
  - carga dos próximos 7 dias;
  - estimativa de custo dos atrasos.
- **Demurrage evitado**: quanto a empresa deixou de gastar com sobre-estadia porque as entregas saíram no prazo. Compara a taxa de atraso antes e depois do sistema, com premissas ajustáveis (diária, contêineres por BL, dias por atraso) e o cálculo sempre visível. Aparece em destaque no painel e mês a mês em Indicadores.
- **Análise com IA (Gemini)**: aponta gargalos, sazonalidade e planos de ação a partir dos números do período. A IA recebe só dados agregados.
- **Assistente de IA** que cadastra tarefas a partir de linguagem natural ("retirar o BL MSCU123 na Maersk amanhã até 15h, urgente, com o Bruno"). O gestor confirma antes de gravar.
- **Planilhas**:
  - importação de tarefas por CSV (exportado do Excel ou do Google Sheets);
  - exportação do período em CSV.
- **Roteirização**:
  - rota do dia de cada pessoa, considerando prazo, horário da agência, distância entre as visitas e meio de transporte (ônibus/a pé, moto ou carro);
  - **revisão com IA**, que sugere trocas e agrupamentos;
  - ao criar uma tarefa, o sistema **sugere o responsável** que já vai passar perto (o gestor pode trocar).
- **Empresa**: no primeiro acesso, o gestor cadastra a empresa e o endereço de onde a equipe sai, e as rotas partem dali.
- Cadastros de agências (horário, endereço localizado automaticamente, exigências), tarefas e equipe. Lista de tarefas com busca por BL e selo de risco.

**Campo (celular)**
- Lista do dia **na ordem sugerida da rota**, com chegada prevista, status em um toque, ocorrências ("agência fechada", "faltou documento") e alertas do que está vencendo.
- **Conclusão com assinatura** de quem recebeu, desenhada na tela.

### Regra de risco

| Situação | Quando |
|---|---|
| Atrasada | o prazo passou e a tarefa não foi concluída |
| Em risco | faltam 2 h ou menos para o prazo, **ou** o prazo é hoje e a agência fecha em 1 h ou menos |
| No prazo | demais tarefas abertas |

A regra fica num lugar só, a view SQL `tasks_with_risk`. Telas, alertas e indicadores leem o resultado dela.

## Contas de demonstração

Cenário **simulado**: pessoas e empresas fictícias e agências de armadores com endereços e horários simulados em Santos. Há duas empresas, para mostrar o isolamento entre gestores.

| Empresa | Perfil | E-mail |
|---|---|---|
| Rota Litoral Despachos Aduaneiros | Gestora | `mariana.albuquerque@rotalitoral.test` |
| | Campo (moto) | `rafael.monteiro@rotalitoral.test` |
| | Campo (ônibus) | `juliana.pacheco@rotalitoral.test` |
| | Campo (carro) | `thiago.nascimento@rotalitoral.test` |
| | Campo (moto) | `camila.duarte@rotalitoral.test` |
| Atlântica Comissária de Despachos | Gestor | `eduardo.vasconcelos@atlanticacomissaria.test` |
| | Campo | `lucas.ferreira@` e `patricia.gomes@atlanticacomissaria.test` |

A senha é informada na apresentação.

## Stack

- **Next.js 16** (App Router, Server Components e Server Actions) + **React 19** + **TypeScript** estrito
- **Supabase**: PostgreSQL, Auth e **Row Level Security**
- **Tailwind CSS 4** e **Motion**
- **Zod** para validar toda entrada
- **Gemini** (`@google/genai`) para o assistente e as análises
- Hospedagem na **Vercel**; CI no GitHub Actions (typecheck, lint e build)

## Decisões de segurança

- **Isolamento por gestor no banco**: toda tabela tem `manager_id`, e o RLS garante que um gestor nunca lê nem altera dados de outro. Há um teste automatizado direto pela API (`npm run test:isolation`).
- **Autorização em duas camadas**: o RLS é a definitiva; as Server Actions também conferem o perfil e o dono de cada agência e responsável.
- **O campo não tem UPDATE em `tasks`**. Ele só muda status por funções do banco (`security definer`) que não deixam mexer em prazo, agência ou responsável.
- **Sem cadastro público**: o gestor é criado pela administração e cria a própria equipe. Toda conta nova recebe senha temporária, trocada no primeiro acesso.
- **Chaves sensíveis só no servidor**: a service role do Supabase e a chave do Gemini nunca vão para o navegador (`server-only`).
- **A IA só propõe**: o assistente devolve um rascunho, e a gravação passa pela mesma validação do formulário. Nas análises, a IA recebe só números agregados, sem BLs nem descrições.
- **Planilhas**: a importação casa agência e responsável pelo nome dentro dos dados do próprio gestor. A exportação neutraliza fórmulas (`=`, `+`, `-`, `@`).

## Como rodar

Pré-requisitos: Node 22 e um projeto Supabase.

```bash
git clone https://github.com/expedito-app/expedito.git
cd expedito
npm install
cp .env.example .env.local        # preencha as chaves do Supabase e do Gemini
```

1. No SQL Editor do Supabase, aplique os arquivos de `supabase/migrations/` em ordem. O `..._tasks_same_owner.sql` é opcional.
2. Em Authentication, desligue "Allow new users to sign up".
3. Rode:

```bash
npm run dev                       # http://localhost:3000
npm run manager:create -- --email voce@empresa.com --name "Seu Nome"
```

| Comando | O que faz |
|---|---|
| `npm run typecheck` / `npm run lint` / `npm run build` | Checagens antes de cada commit |
| `npm run test:isolation` | Teste de RLS direto pela API (precisa de `.env.test.local`) |
| `npm run reset:all -- --confirmo-apagar-tudo` | Apaga todas as contas e dados |
| `npm run seed:demo` | Cenário completo (duas empresas, hoje, amanhã e 12 meses de histórico) |
| `npm run seed:apresentacao` | Mesmo cenário, com prazos ancorados às 19:40 (rodar de manhã) |
| `npm run demo:ocorrencia` | Registra uma ocorrência ao vivo (pop-up no painel) |
| `npm run scenario:risk` | Cria uma tarefa para cada situação de risco e confere a view |

Num clone novo, rode `npx next typegen` antes do `typecheck`.

## Estrutura

```
supabase/migrations/   schema, RLS e funções (fonte da verdade)
scripts/               seed da demo, cenários e teste de isolamento
src/app/(manager)/     painel, indicadores, tarefas, rotas, agências, equipe
src/app/(field)/hoje   tela do campo (mobile)
src/actions/           Server Actions (sempre com Zod)
src/lib/               regras de risco, indicadores, datas, clientes Supabase e Gemini
```
