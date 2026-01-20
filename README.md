# QaseAnalytics

Plataforma de analytics para QA com chat conversacional usando IA (GPT) + LangChain. Consulte métricas do Qase.io através de linguagem natural e gere dashboards personalizados.

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

## Funcionalidades

- **Chat Conversacional com IA** - Faça perguntas em linguagem natural sobre suas métricas de QA
- **Geração Automática de Gráficos** - Linha, barras, pizza, barras empilhadas e mais
- **Widgets Salvos** - Salve gráficos importantes com refresh automático
- **Dashboards Personalizados** - Organize widgets em layouts customizáveis
- **Integração com Qase.io** - Acesso direto a projetos, test runs, resultados e defects

## Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | Next.js 14, React, TailwindCSS, Recharts, React Grid Layout, Zustand |
| **Backend** | Node.js, TypeScript, Hono, LangChain, OpenAI SDK |
| **Database** | PostgreSQL (Prisma ORM), Redis |
| **Testes** | Playwright (E2E), Vitest (Unit/Integration) |
| **Infra** | Docker, Turborepo (monorepo) |

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose
- Conta no [Qase.io](https://qase.io) com API token
- API Key da OpenAI

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/GrupoVoalle/QaseAnalytics.git
cd QaseAnalytics
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://qase:qase@localhost:5433/qaseanalytics?schema=public"

# Redis
REDIS_URL="redis://localhost:6380"

# Qase API
QASE_API_TOKEN="seu-token-do-qase"

# OpenAI
OPENAI_API_KEY="sua-api-key-openai"

# Auth (gere com: openssl rand -base64 32)
JWT_SECRET="seu-jwt-secret"
```

### 4. Inicie os serviços Docker

```bash
pnpm docker:up
```

### 5. Execute as migrations do banco

```bash
pnpm db:migrate
```

### 6. Inicie o ambiente de desenvolvimento

```bash
pnpm dev
```

A aplicação estará disponível em:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001

## Estrutura do Projeto

```
QaseAnalytics/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/           # App Router
│   │   │   ├── components/    # Componentes React
│   │   │   ├── hooks/         # Custom hooks
│   │   │   └── lib/           # Utilitários
│   │   └── e2e/               # Testes Playwright
│   │
│   └── api/                    # Backend Hono
│       ├── src/
│       │   ├── routes/        # Endpoints da API
│       │   ├── services/      # Lógica de negócio
│       │   ├── agents/        # LangChain agents
│       │   └── tools/         # Qase API tools
│       └── __tests__/         # Testes Vitest
│
├── packages/
│   ├── types/                 # TypeScript types compartilhados
│   ├── config/                # Configurações ESLint, TSConfig
│   └── utils/                 # Funções utilitárias
│
└── docker-compose.yml         # PostgreSQL + Redis
```

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia ambiente de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Inicia em modo produção |
| `pnpm lint` | Executa ESLint |
| `pnpm test` | Executa todos os testes |
| `pnpm test:unit` | Testes unitários (Vitest) |
| `pnpm test:e2e` | Testes E2E (Playwright) |
| `pnpm docker:up` | Inicia containers Docker |
| `pnpm docker:down` | Para containers Docker |
| `pnpm db:migrate` | Executa migrations Prisma |
| `pnpm db:studio` | Abre Prisma Studio |

## Exemplos de Uso

### Chat Conversacional

Faça perguntas em linguagem natural:

```
"Quais projetos eu tenho acesso?"
"Mostre um gráfico de linha com a evolução do pass rate"
"Crie um gráfico de barras dos testes por projeto"
"Compare os resultados em um gráfico de pizza"
```

### Salvar Widgets

Após gerar um gráfico, clique em "Salvar como Widget" para:
- Definir nome e descrição
- Configurar intervalo de refresh automático (15min a 24h)
- Adicionar a dashboards personalizados

### Criar Dashboards

Organize seus widgets em dashboards com layout drag-and-drop usando React Grid Layout.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Chat Interface  │  Gráficos (Preview)  │  Dashboards       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              LangChain AI Engine                       │ │
│  │   GPT (OpenAI)  ◄──  Agent Executor  ◄──  Qase Tools   │ │
│  └────────────────────────────────────────────────────────┘ │
│  Chart Engine  │  Widget Store  │  Dashboard DB             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      QASE.IO API                             │
│  Projects  │  Test Cases  │  Test Runs  │  Results          │
└─────────────────────────────────────────────────────────────┘
```

## Desenvolvimento

### Padrões de Código

- **TypeScript** strict mode habilitado
- **ESLint + Prettier** para formatação
- **Conventional Commits** para mensagens de commit

```bash
# Formato de commit
<type>(<scope>): <description>

# Exemplos
feat(chat): add message streaming support
fix(widgets): resolve refresh interval bug
```

### Testes

```bash
# Todos os testes
pnpm test

# Apenas unitários
pnpm test:unit

# Apenas E2E
pnpm test:e2e

# Com coverage
pnpm test -- --coverage
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/chat` | Envia mensagem para o chat (streaming) |
| GET | `/api/widgets` | Lista widgets do usuário |
| POST | `/api/widgets` | Cria novo widget |
| POST | `/api/widgets/:id/refresh` | Força refresh dos dados |
| GET | `/api/dashboards` | Lista dashboards |
| POST | `/api/dashboards` | Cria novo dashboard |
| PUT | `/api/dashboards/:id` | Atualiza layout do dashboard |

## Licença

Proprietary - Grupo Voalle

## Links Úteis

- [Qase API Documentation](https://developers.qase.io/reference/introduction-to-the-qase-api)
- [LangChain.js](https://js.langchain.com/docs/)
- [Hono](https://hono.dev/)
- [Recharts](https://recharts.org/)
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
