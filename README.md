# Monteiro CRM

Centro de operações da **Monteiro Assessoria Administrativa** — *A Monteiro Resolve.*

Sistema de CRM e gestão empresarial construído por fases (veja o roadmap abaixo). Esta é a **Fase 1 — Base**.

## Stack

- **Next.js 16 (App Router) + TypeScript**
- **Prisma ORM + SQLite** (dev) — pronto para migrar para PostgreSQL em produção trocando `DATABASE_URL`
- **Autenticação própria** com sessão em cookie assinado (JWT via `jose`), sem dependências externas de auth
- **Tailwind CSS** para a interface

## Como rodar

```bash
npm install
cp .env.example .env      # ajuste SESSION_SECRET em produção
npx prisma migrate deploy # cria o banco a partir das migrations
npx prisma db seed        # cria o usuário administrador e o catálogo inicial de serviços
npm run dev
```

Acesse `http://localhost:3000`.

### Login inicial (criado pelo seed)

- **E-mail:** `monteiroassessoriaadm@gmail.com`
- **Senha:** `Monteiro@123`

> Troque a senha assim que possível em **Usuários → editar**.

## O que tem na Fase 1 (Base)

- Login e controle de acesso por papel (Administrador, Gestor, Bia/Mídia)
- Cadastro único de clientes (Pessoa Física e Pessoa Jurídica), com linha do tempo
- Leads (prospecção) com temperatura e etapa do funil, e conversão em cliente sem redigitar dados
- Catálogo de serviços com preço e prazo **configuráveis pelo painel** (nada fixo no código)
- Gestão de usuários (Administrador)
- Configurações da empresa: nome, slogan e logo oficial (usada futuramente em contratos/orçamentos/PDFs — o sistema nunca cria identidade visual por conta própria)
- Dashboard com indicadores reais (comercial, clientes, equipe); seções de fases futuras aparecem identificadas como "Disponível na Fase X"

## Roadmap por fases

1. **Base** — login, usuários, clientes, leads, serviços, dashboard ✅ (esta entrega)
2. **Comercial** — funil (Kanban), orçamentos, propostas, follow-up, prospecção ativa
3. **Documentos** — gerador de contratos com modelos e campos dinâmicos, editor de modelos, PDF
4. **Operacional** — checklist por serviço, tarefas, agenda, prazos e entregas
5. **Financeiro** — contas a receber/pagar, contas bancárias, fluxo de caixa, comissões
6. **Bia / Mídia** — clientes de mídia, calendário editorial, aprovações, relatórios
7. **WhatsApp** — inbox, histórico por cliente, automações de mensagens
8. **Monteiro IA** — assistente que consulta os dados reais do sistema

Cada fase evolui o schema (`prisma/schema.prisma`) sem reescrever o que já existe, seguindo o princípio: **cadastrar uma vez, reutilizar em todo o sistema**.
