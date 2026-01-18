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
| - | Zustand para state management | Simples, performático, sem boilerplate | US-016 |
| - | Recharts para gráficos | Componentizado, customizável, boa docs | US-020 |

---

## Schemas do Banco de Dados

### Schema Prisma Planejado

```prisma
// prisma/schema.prisma

model User {
  id          String      @id @default(cuid())
  email       String      @unique
  name        String?
  qaseToken   String?     // Encrypted
  openaiKey   String?     // Encrypted (BYOK)
  tier        Tier        @default(FREE)
  widgets     Widget[]
  dashboards  Dashboard[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Widget {
  id          String      @id @default(cuid())
  name        String
  type        ChartType
  query       String      // Original chat query
  config      Json        // Chart configuration
  filters     Json?       // Applied filters
  user        User        @relation(fields: [userId], references: [id])
  userId      String
  dashboards  DashboardWidget[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Dashboard {
  id          String      @id @default(cuid())
  name        String
  description String?
  layout      Json        // React Grid Layout config
  user        User        @relation(fields: [userId], references: [id])
  userId      String
  widgets     DashboardWidget[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model DashboardWidget {
  id          String      @id @default(cuid())
  dashboard   Dashboard   @relation(fields: [dashboardId], references: [id])
  dashboardId String
  widget      Widget      @relation(fields: [widgetId], references: [id])
  widgetId    String
  position    Json        // x, y, w, h
  createdAt   DateTime    @default(now())
}

enum Tier {
  FREE
  PRO
  ENTERPRISE
}

enum ChartType {
  LINE
  BAR
  PIE
  DONUT
  HEATMAP
  TREEMAP
  AREA
}
```

---

## APIs

### Endpoints Planejados

#### Chat
| Método | Endpoint | Descrição | US |
|--------|----------|-----------|-----|
| POST | `/api/chat/message` | Envia mensagem ao agent | US-012 |
| GET | `/api/chat/history` | Lista histórico de conversas | US-049 |

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

#### Qase Integration
| Método | Endpoint | Descrição | US |
|--------|----------|-----------|-----|
| GET | `/api/qase/projects` | Lista projetos | US-005 |
| GET | `/api/qase/projects/:code/cases` | Lista casos de teste | US-006 |
| GET | `/api/qase/projects/:code/runs` | Lista test runs | US-007 |
| GET | `/api/qase/runs/:id/results` | Lista resultados | US-008 |

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

### Tools Planejadas para Qase API

| Tool | Descrição | US |
|------|-----------|-----|
| `list_projects` | Lista projetos do Qase | US-005 |
| `get_test_cases` | Obtém casos de teste | US-006 |
| `get_test_runs` | Obtém test runs | US-007 |
| `get_run_results` | Obtém resultados de um run | US-008 |
| `get_defects` | Obtém defeitos/bugs | US-009 |
| `get_test_suites` | Obtém hierarquia de suites | US-010 |

---

## Changelog

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-01-18 | US-001: Monorepo configurado com Turborepo, Next.js, Hono, Docker | Claude |
| Jan 2026 | Documento inicial criado | Setup |

---

*Este documento é atualizado automaticamente durante o desenvolvimento das User Stories.*
