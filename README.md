# Monteiro CRM

Centro de operações da **Monteiro Assessoria Administrativa** — *A Monteiro Resolve.*

Sistema de CRM e gestão empresarial construído por fases. Cadastro único de
cliente, reutilizado em todo o sistema — comercial, documentos, operacional,
financeiro, mídia, WhatsApp e um assistente de análise automática (Monteiro IA).

## Stack

- **Next.js 16 (App Router) + TypeScript**
- **Prisma ORM + PostgreSQL** (via `@prisma/adapter-pg`)
- **Autenticação própria** com sessão em cookie assinado (JWT via `jose`), sem dependências externas de auth
- **Tailwind CSS** para a interface
- **@react-pdf/renderer** para geração de PDF (orçamentos, propostas, documentos)

## Como rodar localmente

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL (Postgres) e SESSION_SECRET
npx prisma migrate deploy   # cria o banco a partir das migrations
npx prisma db seed          # cria o usuário administrador e o catálogo inicial
npm run dev
```

Acesse `http://localhost:3000`.

### Deploy (Vercel)

O `build` já roda `prisma migrate deploy` antes do `next build`, então basta:

1. Importar o repositório na Vercel
2. Configurar `DATABASE_URL` (string de conexão Postgres — Neon, Vercel Postgres, Supabase, etc.) e `SESSION_SECRET`
3. Deploy

### Login inicial (criado pelo seed)

- **E-mail:** `monteiroassessoriaadm@gmail.com`
- **Senha:** `Monteiro@123`

> Troque a senha assim que possível em **Usuários → editar**.

## Módulos entregues

- **Cadastro único de clientes** (PF/PJ) com linha do tempo completa de todas as interações
- **Comercial**: prospecção ativa, leads com funil Kanban, orçamentos e propostas com PDF
- **Documentos**: modelos de contrato com campos dinâmicos e versionamento, geração com tokens do cliente
- **Operacional**: abertura automática de serviço a partir de orçamento/proposta aprovado, checklist por serviço, tarefas, agenda, pós-venda
- **Financeiro**: contas bancárias, contas a receber/pagar, comissões (salário fixo, comissão e outros pagamentos sempre separados), fluxo de caixa
- **Bia / Mídia**: calendário de conteúdo por cliente com aprovação e publicação
- **WhatsApp**: biblioteca de modelos de mensagem com tokens do cliente e registro manual de histórico de conversas (sem integração automática real com a API do WhatsApp Business)
- **Monteiro IA**: painel de análise automática sobre os dados reais do sistema (comercial, financeiro, operacional, mídia, reativação de clientes) — não é um chat com IA externa
- **Busca global** e **relatórios** consolidados por período

Nenhum preço, cláusula contratual ou identidade visual é inventado pelo
sistema — tudo é configurável pelo painel (Serviços, Modelos de documentos,
Configurações) e cadastrado pela administração da Monteiro.
