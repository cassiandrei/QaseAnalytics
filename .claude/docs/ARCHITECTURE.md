# QaseAnalytics - Arquitetura

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Chat UI   │  │  Dashboard  │  │   Widgets   │  │   Project   │    │
│  │  Interface  │  │    View     │  │   Gallery   │  │  Selector   │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│                           Zustand Store                                  │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │ HTTP/WebSocket
┌───────────────────────────────────┼──────────────────────────────────────┐
│                              BACKEND                                     │
│                                   │                                      │
│  ┌────────────────────────────────▼────────────────────────────────┐    │
│  │                         Hono Router                              │    │
│  │  /api/chat  │  /api/widgets  │  /api/dashboards  │  /api/qase   │    │
│  └──────┬──────────────┬────────────────┬────────────────┬─────────┘    │
│         │              │                │                │              │
│  ┌──────▼──────┐ ┌─────▼─────┐  ┌──────▼──────┐  ┌──────▼──────┐       │
│  │  LangChain  │ │  Widget   │  │  Dashboard  │  │    Qase     │       │
│  │   Agent     │ │  Service  │  │   Service   │  │   Service   │       │
│  └──────┬──────┘ └─────┬─────┘  └──────┬──────┘  └──────┬──────┘       │
│         │              │                │                │              │
│         │        ┌─────▼────────────────▼─────┐          │              │
│         │        │       Prisma ORM           │          │              │
│         │        └─────────────┬──────────────┘          │              │
│         │                      │                         │              │
└─────────┼──────────────────────┼─────────────────────────┼──────────────┘
          │                      │                         │
   ┌──────▼──────┐        ┌──────▼──────┐          ┌──────▼──────┐
   │   OpenAI    │        │ PostgreSQL  │          │  Qase API   │
   │   GPT-5     │        │             │          │             │
   └─────────────┘        └─────────────┘          └─────────────┘
```

---

## Estrutura do Monorepo

```
QaseAnalytics/
├── apps/
│   ├── web/                        # Frontend Next.js 14
│   │   ├── src/
│   │   │   ├── app/               # App Router
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx       # Home/Chat
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── [id]/
│   │   │   │   └── widgets/
│   │   │   ├── components/
│   │   │   │   ├── chat/          # Chat components
│   │   │   │   ├── charts/        # Recharts wrappers
│   │   │   │   ├── dashboard/     # Dashboard components
│   │   │   │   └── widgets/       # Widget components
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── stores/            # Zustand stores
│   │   ├── e2e/                   # Playwright tests
│   │   ├── public/
│   │   └── package.json
│   │
│   └── api/                        # Backend Hono
│       ├── src/
│       │   ├── index.ts           # Entry point
│       │   ├── routes/
│       │   │   ├── chat.ts
│       │   │   ├── widgets.ts
│       │   │   ├── dashboards.ts
│       │   │   └── qase.ts
│       │   ├── services/
│       │   │   ├── chat.service.ts
│       │   │   ├── widget.service.ts
│       │   │   ├── dashboard.service.ts
│       │   │   └── qase.service.ts
│       │   ├── agents/
│       │   │   └── qa-analyst.agent.ts
│       │   ├── tools/
│       │   │   ├── list-projects.tool.ts
│       │   │   ├── get-test-cases.tool.ts
│       │   │   ├── get-test-runs.tool.ts
│       │   │   └── get-run-results.tool.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── error-handler.ts
│       │   └── lib/
│       │       ├── prisma.ts
│       │       ├── redis.ts
│       │       └── openai.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── __tests__/
│       │   ├── unit/
│       │   └── integration/
│       └── package.json
│
├── packages/
│   ├── ui/                         # Shared UI components
│   │   ├── src/
│   │   └── package.json
│   ├── types/                      # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── qase.ts
│   │   │   ├── chat.ts
│   │   │   ├── widget.ts
│   │   │   └── dashboard.ts
│   │   └── package.json
│   ├── config/                     # Shared configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── package.json
│   └── utils/                      # Shared utilities
│       ├── src/
│       └── package.json
│
├── turbo.json                      # Turborepo config
├── pnpm-workspace.yaml
├── package.json
├── BACKLOG.md
├── CLAUDE.md
└── user-stories.md
```

---

## Decisões Técnicas

| Data | Decisão | Justificativa | US Relacionada |
|------|---------|---------------|----------------|
| 2026-01-18 | Turborepo como build system | Performance de builds incrementais, caching integrado | US-001 |
| 2026-01-18 | Hono como framework backend | Leve, rápido, edge-ready, TypeScript nativo | US-001 |
| 2026-01-18 | Docker Compose para dev local | PostgreSQL + Redis em containers, facilita setup | US-001 |
| 2026-01-18 | pnpm como package manager | Rápido, eficiente em disco, bom suporte a workspaces | US-001 |
| 2026-01-18 | Next.js 15 com App Router | SSR, Server Components, TypeScript nativo | US-001 |
| 2026-01-18 | Prisma 6.x como ORM | Type-safe, migrations automáticas, excelente DX | US-002 |
| 2026-01-18 | Portas alternativas (5433/6380) | Evitar conflito com outros serviços Docker locais | US-002 |
| 2026-01-18 | Schema expandido com Conversation/Message | Suporte a histórico de chat persistido | US-002 |
| 2026-01-18 | AES-256-GCM para encriptação de tokens | Padrão NIST, autenticação integrada, resistente a ataques | US-004 |
| 2026-01-18 | scrypt para derivação de chave | Resistente a ataques de hardware, parâmetros ajustáveis | US-004 |
| 2026-01-18 | Retry com exponential backoff | Resiliência contra falhas transientes da API, jitter para evitar thundering herd | US-004, US-059 |
| 2026-01-18 | Zod para validação de requests | Type-safe, integração com Hono via @hono/zod-validator | US-004 |
| 2026-01-18 | Redis para cache (ioredis) | Cache de projetos com TTL 5min, cliente singleton | US-005 |
| 2026-01-18 | LangChain tools para Qase API | DynamicStructuredTool com schema Zod, cache integrado | US-005 |
| - | Zustand para state management | Simples, performático, sem boilerplate | US-016 |
| - | Recharts para gráficos | Componentizado, customizável, boa docs | US-020 |

---

## Schemas do Banco de Dados

### Schema Prisma Implementado (US-002)

O schema completo está em `apps/api/prisma/schema.prisma`. Principais modelos:

| Model | Descrição | Campos Principais |
|-------|-----------|-------------------|
| `User` | Usuário da plataforma | email, tier, qaseApiToken (encrypted), openaiApiKey (BYOK) |
| `Session` | Sessão JWT | token, expiresAt, userAgent, ipAddress |
| `Widget` | Widget de visualização | name, query, chartType, chartConfig, filters, refreshInterval |
| `Dashboard` | Dashboard com layout | name, layout (RGL format), globalFilters, shareToken |
| `DashboardWidget` | Relação N:N | dashboardId, widgetId, position |
| `Conversation` | Conversa do chat | title, projectCode |
| `Message` | Mensagem do chat | role, content, chartData, tokensUsed |
| `AuditLog` | Log de auditoria | action, resource, details (Enterprise) |

### Enums

```typescript
enum UserTier { FREE, PRO, ENTERPRISE, BYOK }
enum ChartType { LINE, BAR, PIE, DONUT, AREA, HEATMAP, TREEMAP, TABLE, METRIC }
enum MessageRole { USER, ASSISTANT, SYSTEM }
```

### Comandos de Banco

```bash
# Iniciar containers
pnpm docker:up

# Gerar Prisma Client
pnpm db:generate

# Aplicar schema ao banco
pnpm db:push

# Popular dados de exemplo
pnpm db:seed

# Abrir Prisma Studio
pnpm db:studio
```

### Configuração de Portas (evitar conflitos)

| Serviço | Porta Padrão | Porta QaseAnalytics |
|---------|--------------|---------------------|
| PostgreSQL | 5432 | 5433 |
| Redis | 6379 | 6380 |

---

## APIs

### Endpoints Planejados

#### Chat (Implementado - US-012)
| Método | Endpoint | Descrição | US | Status |
|--------|----------|-----------|-----|--------|
| POST | `/api/chat/message` | Envia mensagem ao agent (suporta SSE) | US-012 | ✅ |
| GET | `/api/chat/history` | Lista histórico de mensagens | US-012 | ✅ |
| DELETE | `/api/chat/history` | Limpa histórico do chat | US-012 | ✅ |
| GET | `/api/chat/status` | Status da sessão de chat | US-012 | ✅ |
| POST | `/api/chat/project` | Define projeto ativo | US-012 | ✅ |

#### Widgets
| Método | Endpoint | Descrição | US |
|--------|----------|-----------|-----|
| POST | `/api/widgets` | Cria novo widget | US-026 |
| GET | `/api/widgets` | Lista widgets do usuário | US-027 |
| GET | `/api/widgets/:id` | Obtém widget específico | US-027 |
| PATCH | `/api/widgets/:id` | Atualiza widget | US-028 |
| DELETE | `/api/widgets/:id` | Remove widget | US-027 |

#### Dashboards
| Método | Endpoint | Descrição | US |
|--------|----------|-----------|-----|
| POST | `/api/dashboards` | Cria novo dashboard | US-030 |
| GET | `/api/dashboards` | Lista dashboards | US-030 |
| GET | `/api/dashboards/:id` | Obtém dashboard | US-030 |
| PATCH | `/api/dashboards/:id` | Atualiza dashboard | US-032 |
| DELETE | `/api/dashboards/:id` | Remove dashboard | US-030 |

#### Qase Integration (Implementado - US-004)
| Método | Endpoint | Descrição | US | Status |
|--------|----------|-----------|-----|--------|
| POST | `/api/qase/validate` | Valida token sem salvar | US-004 | ✅ |
| POST | `/api/qase/connect` | Conecta usuário ao Qase | US-004 | ✅ |
| POST | `/api/qase/disconnect` | Desconecta do Qase | US-004 | ✅ |
| GET | `/api/qase/status` | Status da conexão | US-004 | ✅ |
| POST | `/api/qase/revalidate` | Revalida token armazenado | US-004 | ✅ |
| GET | `/api/qase/projects` | Lista projetos | US-005 | ✅ |
| GET | `/api/qase/projects/:code` | Detalhes do projeto | US-005 | ✅ |
| GET | `/api/qase/projects/:code/cases` | Lista casos de teste | US-006 | ⏳ |
| GET | `/api/qase/projects/:code/runs` | Lista test runs | US-007 | ⏳ |
| GET | `/api/qase/runs/:id/results` | Lista resultados | US-008 | ⏳ |

---

## Componentes Frontend

### Componentes Planejados

| Componente | Descrição | US |
|------------|-----------|-----|
| `<ChatInterface />` | Interface principal do chat | US-016 |
| `<ChatMessage />` | Mensagem individual | US-016 |
| `<ChartPreview />` | Preview de gráfico inline | US-017 |
| `<ProjectSelector />` | Seletor de projeto Qase | US-018 |
| `<LineChart />` | Wrapper Recharts - Linhas | US-020 |
| `<BarChart />` | Wrapper Recharts - Barras | US-021 |
| `<PieChart />` | Wrapper Recharts - Pizza | US-022 |
| `<WidgetCard />` | Card de widget reutilizável | US-027 |
| `<DashboardGrid />` | Grid de widgets (RGL) | US-030 |

---

## LangChain Tools

### Tools Implementadas

| Tool | Descrição | US | Status |
|------|-----------|-----|--------|
| `list_projects` | Lista projetos do Qase com cache 5min | US-005 | ✅ |
| `get_test_cases` | Obtém casos de teste | US-006 | ⏳ |
| `get_test_runs` | Obtém test runs | US-007 | ⏳ |
| `get_run_results` | Obtém resultados de um run | US-008 | ⏳ |
| `get_defects` | Obtém defeitos/bugs | US-009 | ⏳ |
| `get_test_suites` | Obtém hierarquia de suites | US-010 | ⏳ |

### list_projects Tool (US-005)

```typescript
// Uso com callbacks
const listProjectsTool = createListProjectsTool(
  () => userToken,
  () => userId
);

// Uso com contexto fixo
const tool = createListProjectsToolWithContext(token, userId);

// Parâmetros
interface ListProjectsInput {
  limit?: number;  // 1-100, default: 100
  offset?: number; // Paginação, default: 0
}

// Resultado
interface ListProjectsResult {
  success: boolean;
  total: number;
  count: number;
  projects: Array<{
    code: string;
    title: string;
    description: string | null;
    casesCount?: number;
    suitesCount?: number;
  }>;
  error?: string;
  cached?: boolean;
}
```

---

## Cache (Redis)

### Configuração (US-005)

O cache Redis é opcional e ativado automaticamente quando `REDIS_URL` está configurada.

```bash
REDIS_URL=redis://localhost:6380
```

### TTL (Time-To-Live)

| Tipo de Dado | TTL | Constante |
|--------------|-----|-----------|
| Lista de projetos | 5 minutos | `CACHE_TTL.PROJECTS` |
| Casos de teste | 2 minutos | `CACHE_TTL.TEST_CASES` |
| Resultados | 1 minuto | `CACHE_TTL.RESULTS` |

### Chaves de Cache

```typescript
// Lista de projetos de um usuário
CACHE_KEYS.projectList(userId) // "qase:projects:{userId}"

// Projeto específico
CACHE_KEYS.project(userId, code) // "qase:project:{userId}:{code}"
```

### Funções de Cache

```typescript
// Armazenar
await cacheSet(key, value, ttlSeconds);

// Buscar
const value = await cacheGet<T>(key);

// Deletar
await cacheDelete(key);

// Deletar por padrão
await cacheDeletePattern("qase:projects:*");

// Verificar conexão
const connected = await isRedisConnected();
```

### Invalidação Automática

- O cache de projetos é invalidado quando:
  - Usuário desconecta do Qase (`disconnectQase`)
  - Chamada explícita a `invalidateProjectsCache`

---

## Segurança

### Encriptação de Tokens (US-004)

Tokens da API Qase são armazenados encriptados usando:

| Componente | Algoritmo | Parâmetros |
|------------|-----------|------------|
| Cifra | AES-256-GCM | 256-bit key, 12-byte IV |
| Derivação de chave | scrypt | N=16384, r=8, p=1 |
| Salt | Random | 16 bytes |
| Auth Tag | GCM | 16 bytes |

**Formato do ciphertext:**
```
Base64(salt[16] + iv[12] + authTag[16] + encrypted_data)
```

**Variável de ambiente requerida:**
```bash
ENCRYPTION_KEY=<mínimo 32 caracteres>
```

### Retry Strategy (US-004, US-059)

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐     Sucesso     ┌─────────────┐
│   API Request    │ ───────────────▶│   Return    │
└────────┬─────────┘                 └─────────────┘
         │
         │ Erro
         ▼
┌──────────────────┐
│  É Retentável?   │
│  (5xx, 408)      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
   Sim       Não
    │         │
    ▼         ▼
┌────────┐  ┌──────────┐
│ Retry  │  │  Throw   │
│ +Backoff│  │  Error   │
└────────┘  └──────────┘
```

**Parâmetros de Retry:**
- Max retries: 3
- Initial delay: 1000ms
- Max delay: 10000ms
- Backoff multiplier: 2x
- Jitter: 0-30% variação

**Erros não retentáveis:**
- 401/403 (Autenticação)
- 429 (Rate Limit - cliente decide quando retry)
- 4xx genéricos

---

## ChatService (US-012)

O ChatService processa mensagens em linguagem natural e integra com o QaseAgent.

### Endpoints

```typescript
// POST /api/chat/message
// Envia mensagem para o agente
interface SendMessageRequest {
  message: string;           // 1-2000 caracteres
  projectCode?: string;      // Código do projeto Qase
  stream?: boolean;          // Se true, usa SSE
}

interface SendMessageResponse {
  success: boolean;
  message?: {
    id: string;
    role: "assistant";
    content: string;
    timestamp: Date;
    toolsUsed?: string[];
    durationMs?: number;
  };
  toolsUsed?: string[];
  durationMs?: number;
  error?: string;
}
```

### Streaming (SSE)

Quando `stream: true`, a resposta é enviada via Server-Sent Events:

```
event: start
data: {"timestamp":"2026-01-18T10:00:00.000Z"}

event: chunk
data: {"content":"Você tem 5 projetos..."}

event: done
data: {"message":{...},"toolsUsed":["list_projects"],"durationMs":1500}
```

### Tratamento de Erros

| Erro | Código | Mensagem |
|------|--------|----------|
| Usuário não autenticado | 401 | "Authentication required" |
| Sem conexão Qase | 400 | "Please connect your Qase account first" |
| Mensagem vazia | 400 | "Message is required" |
| Mensagem longa | 400 | "Message is too long (max 2000 characters)" |
| Rate limit OpenAI | 400 | "Rate limit exceeded. Please wait..." |
| Timeout | 400 | "Request timed out. Please try a simpler question." |

---

## Changelog

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-01-18 | US-012: ChatService + Routes + SSE streaming + 46 testes | Claude |
| 2026-01-18 | US-005: LangChain tool list_projects + Redis cache 5min | Claude |
| 2026-01-18 | US-004: Integração Qase API - validação, conexão, encriptação | Claude |
| 2026-01-18 | US-002: Banco de dados PostgreSQL + Prisma ORM configurados | Claude |
| 2026-01-18 | US-001: Monorepo configurado com Turborepo, Next.js, Hono, Docker | Claude |
| Jan 2026 | Documento inicial criado | Setup |

---

*Este documento é atualizado automaticamente durante o desenvolvimento das User Stories.*
