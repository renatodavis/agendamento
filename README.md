# AgendaAgentic

Sistema de agendamento inteligente via WhatsApp com IA. Clientes enviam mensagens em linguagem natural e o assistente agenda, confirma e lembra automaticamente — sem recepcionista.

## Stack

- **Frontend / Backend**: Next.js 15 (App Router) — deploy no Vercel
- **Banco de dados**: Supabase (PostgreSQL + Auth + RLS)
- **IA**: Claude (Anthropic) via API
- **Mensageria**: WhatsApp Business Cloud API (Meta)
- **Observabilidade**: Langfuse (opcional)

## Estrutura de rotas

| Rota | Descrição |
|------|-----------|
| `/` | Landing page pública (AgendaAgentic) |
| `/dashboard` | Painel de gestão — requer autenticação |
| `/login` | Login da recepção/admin |
| `/api/whatsapp` | Webhook do WhatsApp (GET = verificação, POST = mensagens) |
| `/api/clinic-config` | Configuração da clínica (nome, horários, etc.) |
| `/api/appointments` | CRUD de agendamentos |
| `/api/doctors` | Profissionais cadastrados |

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (somente servidor) |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic |
| `WHATSAPP_API_TOKEN` | Token da API WhatsApp Business Cloud |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número WhatsApp |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificação do webhook Meta |
| `NEXT_PUBLIC_APP_URL` | URL pública do app (ex: `https://meuapp.vercel.app`) |
| `CRON_SECRET` | Segredo para proteger a rota de lembretes (`/api/appointments/remind`) |
| `LANGFUSE_SECRET_KEY` | (Opcional) Monitoramento de custo LLM |
| `LANGFUSE_PUBLIC_KEY` | (Opcional) |
| `LANGFUSE_BASE_URL` | (Opcional) — padrão: `https://cloud.langfuse.com` |

> **Atenção:** Nunca commite `.env` ou `.env.local`. O `.gitignore` já os exclui.

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Configurar o nome do negócio

O nome exibido em todo o sistema vem da tabela `clinic_config` no Supabase:

```sql
UPDATE clinic_config SET value = 'Minha Clínica' WHERE key = 'clinic_name';
```

Ou via API autenticada:

```bash
curl -X PUT https://seu-app.vercel.app/api/clinic-config \
  -H "Content-Type: application/json" \
  -d '{"clinic_name": "Minha Clínica", "working_hours": "Seg a Sex, 8h às 18h"}'
```

## Deploy

O deploy é automático via Vercel ao fazer push em `main`. Configure as variáveis de ambiente no painel do Vercel em **Settings → Environment Variables**.

## Generalização para outros domínios

O sistema suporta qualquer tipo de negócio com agendamentos (barbearias, salões, clínicas odontológicas, veterinárias, etc.). Altere `clinic_name` e `working_hours` na config e o assistente adapta automaticamente o vocabulário e as respostas.
