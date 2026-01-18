# QaseAnalytics - Instruções para Claude

## Sobre o Projeto

**QaseAnalytics** é uma plataforma de analytics para QA com chat conversacional usando GPT-5 + LangChain. Permite consultar métricas do Qase.io através de linguagem natural e gerar dashboards personalizados.

### Stack Tecnológica
- **Frontend:** React/Next.js, Recharts, React Grid Layout, TailwindCSS, Zustand
- **Backend:** Node.js/TypeScript, Hono, LangChain, OpenAI SDK, Prisma + PostgreSQL, Redis
- **Testes:** Playwright (e2e), Vitest (unitários/integração)

---

## Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `/dev <US-ID>` | Desenvolve uma User Story completa |

---

## Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `BACKLOG.md` | Kanban board - atualizar status das US aqui |
| `user-stories.md` | Detalhes completos e critérios de aceitação |
| `ESCOPO.md` | Escopo técnico completo do projeto (carregado pelo /dev) |
| `.claude/docs/ARCHITECTURE.md` | Documentação técnica e decisões |

---

## Estrutura do Monorepo

```
QaseAnalytics/
├── apps/
│   ├── web/                    # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/           # App Router (Next.js 14+)
│   │   │   ├── components/    # Componentes React
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Utilitários
│   │   │   └── stores/        # Zustand stores
│   │   └── e2e/               # Testes Playwright
│   │
│   └── api/                    # Backend Hono
│       ├── src/
│       │   ├── routes/        # Endpoints da API
│       │   ├── services/      # Lógica de negócio
│       │   ├── agents/        # LangChain agents
│       │   ├── tools/         # Qase API tools
│       │   └── middleware/    # Middlewares Hono
│       └── __tests__/         # Testes Vitest
│
├── packages/
│   ├── ui/                    # Componentes compartilhados
│   ├── types/                 # TypeScript types
│   ├── config/                # ESLint, TSConfig
│   └── utils/                 # Funções utilitárias
│
├── .claude/
│   ├── commands/              # Comandos personalizados (/dev, etc)
│   └── docs/                  # Documentação técnica
│
├── BACKLOG.md                 # Kanban board
├── ESCOPO.md                  # Escopo técnico do projeto
├── CLAUDE.md                  # Este arquivo
└── user-stories.md            # User Stories
```

---

## Padrões de Código

### TypeScript
- Strict mode habilitado
- Tipos explícitos para funções públicas
- Evitar `any` - usar `unknown` quando necessário

### Estilo de Código
- ESLint + Prettier configurados
- Imports organizados (externos, internos, relativos)
- Componentes funcionais com hooks

### Commits
- **Conventional Commits** obrigatório
- Formato: `<type>(<scope>): <description>`
- Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Exemplo: `feat(chat): add message streaming support`

### Nomenclatura
- Arquivos: `kebab-case.ts`, `PascalCase.tsx` para componentes
- Variáveis/funções: `camelCase`
- Types/Interfaces: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`

---

## Estrutura de Testes

### Testes Unitários (Vitest)
- **Local:** `__tests__/unit/<module>.test.ts`
- **Cobertura mínima:** 80%
- **Padrão:** Arrange-Act-Assert

```typescript
// Exemplo
describe('calculatePassRate', () => {
  it('should return 100 when all tests pass', () => {
    // Arrange
    const results = { passed: 10, failed: 0, blocked: 0 };

    // Act
    const rate = calculatePassRate(results);

    // Assert
    expect(rate).toBe(100);
  });
});
```

### Testes de Integração (Vitest)
- **Local:** `__tests__/integration/<feature>.test.ts`
- Testar fluxos completos entre módulos
- Mockar apenas dependências externas (APIs)

### Testes E2E (Playwright)
- **Local:** `e2e/<feature>.spec.ts`
- Testar jornadas completas do usuário
- Page Object Pattern recomendado

---

## Workflow de Desenvolvimento

1. **Escopo** - Carregar `ESCOPO.md` para contexto
2. **Análise** - Ler US em `user-stories.md`
3. **Planejamento** - Definir arquivos e testes
4. **Implementação** - Código + testes
5. **Documentação** - Atualizar ARCHITECTURE.md
6. **Revisão** - Executar testes e atualizar BACKLOG.md

---

## Variáveis de Ambiente

```bash
# API Keys
QASE_API_TOKEN=           # Token da API do Qase.io
OPENAI_API_KEY=           # API Key da OpenAI

# Database
DATABASE_URL=             # PostgreSQL connection string

# Redis
REDIS_URL=                # Redis connection string

# Auth
JWT_SECRET=               # Secret para JWT
```

---

## Referências Úteis

- [Qase API Docs](https://developers.qase.io/reference/introduction-to-the-qase-api)
- [LangChain.js](https://js.langchain.com/docs/)
- [Hono](https://hono.dev/)
- [Recharts](https://recharts.org/)
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
