# Expedito

**Controle das tarefas externas da expedição portuária: quem está com qual documento, o que está atrasado e o que está em risco.**

Projeto do **Hackathon UNISANTA 2026** (Desafio T2S / DYNApp Hub).

**Demo:** https://expedito-two.vercel.app

---

## O problema

Na expedição de uma empresa de logística portuária, parte do trabalho acontece fora do escritório: retirar e entregar documentos (como o BL) nas agências dos armadores. Hoje o gestor acompanha isso por planilhas, WhatsApp e memória. Ele não sabe com certeza quem está com o quê nem o que vai atrasar. Um BL atrasado vira custo de **armazenagem e demurrage**.

## A solução

- **Gestor (desktop):** cadastra agências e tarefas, acompanha o dia num painel que destaca o que está **atrasado** ou **em risco**.
- **Equipe de campo (celular):** vê as próprias tarefas, muda o status com um toque, registra ocorrências ("agência fechada", "faltou documento") e coleta a **assinatura** de quem recebeu o documento.

### Funcionalidades

| Área | O que faz |
|---|---|
| Painel do dia | Contadores e lista agrupada: "Precisa de atenção" primeiro; atualiza sozinho a cada 60 s |
| Regra de risco | **Atrasada**: prazo passou. **Em risco**: faltam até 2 h, ou a agência fecha em até 1 h e o prazo é hoje |
| Tarefas e agências | Cadastro, edição, filtros por status e por risco |
| Assistente de IA | Cria tarefas a partir de uma frase ("retirar o BL MSCU123 na Maré Alta amanhã até 15h com o Bruno"); o gestor confirma antes de gravar |
| Campo | Lista do dia, status em um toque com "Desfazer", ocorrências e assinatura na conclusão |
| Equipe | O gestor cria os usuários de campo com senha temporária, trocada no primeiro acesso |

## Contas da demo

O cenário é **simulado**: empresas, agências e pessoas fictícias.

| Perfil | E-mail | Onde entra |
|---|---|---|
| Gestora | `ana.ribeiro@expedito.test` | `/painel` (use no computador) |
| Campo | `bruno.santos@expedito.test` | `/hoje` (use no celular) |
| Campo | `carla.mendes@expedito.test` | `/hoje` (use no celular) |

Senha das três contas: `SENHA_DA_DEMO`

## Stack

- **Next.js 16** (App Router, Server Components e Server Actions) + **React 19** + **TypeScript** estrito
- **Supabase**: PostgreSQL, autenticação e **Row Level Security**
- **Tailwind CSS** e **Motion** na interface
- **Zod** para validar toda entrada no servidor
- **Gemini** (Google) para o assistente de IA
- Hospedagem na **Vercel**

## Segurança

- **Isolamento por gestor no próprio banco (RLS):** cada gestor só enxerga as suas agências, tarefas e equipe; o campo só enxerga as tarefas atribuídas a ele. Isso vale mesmo para quem chamar a API diretamente.
- O usuário de campo **não edita tarefas**: muda apenas o status, por funções do banco que conferem se a tarefa é dele.
- **Sem cadastro público**: gestores são criados pela administração, e cada conta nova troca a senha temporária no primeiro acesso.
- Chaves sensíveis (service role do Supabase, chave do Gemini) existem **só no servidor**.
- A IA **só propõe**: nenhuma tarefa é gravada sem o gestor confirmar, e a gravação passa pela mesma validação do formulário.

O isolamento é verificado por um teste automatizado direto na API (`npm run test:isolation`).

## Como rodar

```bash
git clone https://github.com/expedito-app/expedito.git
cd expedito
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase e do Gemini
npm run dev
```

O schema do banco está em `supabase/migrations/`. Aplique os arquivos em ordem no SQL Editor do Supabase.

| Comando | O que faz |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run typecheck` / `npm run lint` / `npm run build` | Checagens antes de cada commit |
| `npm run test:isolation` | Teste de isolamento (RLS) pela API |
| `npm run seed:demo` | Recria o cenário simulado da apresentação |
| `npm run manager:create -- --email <e-mail> --name "<nome>"` | Cria um gestor com senha temporária |

Para os scripts de teste, crie `.env.test.local` a partir de `.env.test.example`.
