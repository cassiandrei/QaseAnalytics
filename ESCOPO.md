# 📊 QASE ANALYTICS AI

## Escopo Técnico do Projeto

**Plataforma de Chat Conversacional com IA para Geração de Relatórios e Dashboards de Métricas de QA do Qase.io**

**Stack: GPT-5 + LangChain + Qase API**

*Janeiro 2026*

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Problema que Resolve](#2-problema-que-resolve)
3. [Arquitetura Proposta](#3-arquitetura-proposta)
4. [Funcionalidades Principais](#4-funcionalidades-principais)
5. [Stack Tecnológica](#5-stack-tecnológica)
6. [Motor de IA com LangChain](#6-motor-de-ia-com-langchain)
7. [Autenticação](#7-autenticação)
8. [Métricas e KPIs](#8-métricas-e-kpis-do-qase)
9. [Fases do Projeto](#9-fases-do-projeto)
10. [Riscos e Mitigações](#10-riscos-e-mitigações)

---

## 1. Visão Geral

Uma plataforma de chat conversacional que utiliza IA (GPT-5) + LangChain integrada à API do Qase para gerar relatórios e dashboards dinâmicos de métricas de QA, permitindo análise de dados de testes em uma arquitetura de microserviços.

### Principais Características

- Chat contextual com IA para consultas em linguagem natural
- Integração direta com Qase.io via API REST
- Geração automática de gráficos e visualizações
- Sistema de widgets salvos para dashboards personalizados
- Suporte a múltiplos projetos/microserviços

---

## 2. Problema que Resolve

**Como QA em ambiente de microserviços, enfrentamos diversos desafios:**

| Problema | Descrição |
|----------|-----------|
| **Fragmentação de dados** | Testes distribuídos por múltiplos projetos/serviços no Qase |
| **Relatórios manuais** | Tempo excessivo gasto consolidando métricas semanais/mensais |
| **Falta de insights** | Dificuldade em responder perguntas ad-hoc da gestão rapidamente |
| **Dashboards estáticos** | Os dashboards nativos do Qase são limitados para análises customizadas |

---

## 3. Arquitetura Proposta

### 3.1 Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Chat     │  │   Gráficos  │  │       Dashboards        │  │
│  │  Interface  │  │  (Preview)  │  │    (Widgets salvos)     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  LangChain AI Engine                        ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐   ││
│  │  │   GPT-5   │◄─┤  Agent    │◄─┤   Qase Tools          │   ││
│  │  │  (OpenAI) │  │ Executor  │  │   (Custom)            │   ││
│  │  └───────────┘  └───────────┘  └───────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Chart Engine   │  │  Widget Store   │  │   Dashboard DB  │  │
│  │  (geração)      │  │  (persistência) │  │   (layouts)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QASE.IO API                                 │
│  Projects │ Test Cases │ Test Runs │ Results │ Defects          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes Principais

| Componente | Responsabilidade |
|------------|------------------|
| **Chat Interface** | Interface de usuário para interação conversacional com a IA |
| **LangChain Agent** | Orquestração de LLM, tools e memória conversacional |
| **Qase Tools** | Ferramentas customizadas para consultar API do Qase |
| **Chart Engine** | Geração de configurações de gráficos (Recharts) |
| **Widget Store** | Persistência de gráficos salvos como widgets |
| **Dashboard DB** | Armazenamento de layouts de dashboards |

---

## 4. Funcionalidades Principais

### 4.1 Chat Conversacional com IA

| Funcionalidade | Descrição |
|----------------|-----------|
| **Consultas em linguagem natural** | "Qual a taxa de falha do serviço de pagamentos nos últimos 30 dias?" |
| **Contexto de conversa** | Memória de interações anteriores na sessão |
| **Sugestões inteligentes** | IA sugere análises baseadas nos dados disponíveis |
| **Multi-projeto** | Consultar e comparar dados entre diferentes projetos/microserviços |

#### Exemplos de Prompts

- "Compare a cobertura de testes entre os serviços auth, payments e notifications"
- "Mostre a evolução de bugs críticos por sprint nos últimos 3 meses"
- "Quais casos de teste estão mais flaky no projeto checkout?"
- "Gere um relatório executivo da qualidade do release 2.5.0"

### 4.2 Tipos de Gráficos Suportados

| Tipo | Caso de Uso |
|------|-------------|
| **Line Chart** | Evolução temporal (bugs, cobertura, execuções ao longo do tempo) |
| **Bar Chart** | Comparação entre projetos/serviços |
| **Pie/Donut** | Distribuição de status (passed/failed/blocked/skipped) |
| **Heatmap** | Matriz de cobertura por funcionalidade |
| **Treemap** | Hierarquia de suites/casos de teste |
| **Area Chart** | Volume de testes ao longo do tempo |

### 4.3 Sistema de Widgets e Dashboards

- Salvar gráficos gerados como widgets reutilizáveis
- Drag & drop de widgets para criar dashboards
- Layouts responsivos com grid system
- Filtros globais (período, projeto, ambiente)
- Compartilhamento via link
- Export para PDF/PNG
- Atualização automática configurável

---

## 5. Stack Tecnológica

### 5.1 Frontend

| Tecnologia | Justificativa |
|------------|---------------|
| **React / Next.js** | SSR, performance, ecossistema rico |
| **Recharts** | Gráficos declarativos, customizáveis, React-first |
| **React Grid Layout** | Dashboards com drag & drop |
| **TailwindCSS** | Estilização rápida e consistente |
| **Zustand** | Gerenciamento de estado leve para widgets |

### 5.2 Backend

| Tecnologia | Justificativa |
|------------|---------------|
| **Node.js / TypeScript** | Type safety, compatível com LangChain |
| **Hono** | Framework web leve e performático |
| **LangChain** | Framework para orquestração de LLM, agents e tools |
| **OpenAI SDK** | Integração com GPT-5 |
| **Prisma + PostgreSQL** | ORM type-safe + banco relacional robusto |
| **Redis** | Cache de queries e sessões |

---

## 6. Motor de IA com LangChain

### 6.1 Arquitetura do AI Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI ENGINE (LangChain)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Prompt     │    │   LangChain  │    │   Output     │       │
│  │  Templates   │───▶│    Agent     │───▶│   Parsers    │       │
│  └──────────────┘    └──────┬───────┘    └──────────────┘       │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │  Qase Tools │    │   Chart     │    │   Memory    │          │
│  │  (Custom)   │    │   Tools     │    │  (Buffer)   │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Qase Tools (LangChain)

*Ferramentas customizadas criadas com DynamicStructuredTool do LangChain para integração com a API do Qase:*

| Tool | Descrição |
|------|-----------|
| **list_projects** | Lista todos os projetos disponíveis no Qase |
| **get_test_cases** | Obtém casos de teste com filtros (status, prioridade, automação) |
| **get_test_runs** | Obtém execuções de teste com filtros de data e status |
| **get_run_results** | Obtém resultados detalhados de uma execução |
| **get_defects** | Obtém defeitos/bugs de um projeto |
| **get_test_suites** | Obtém suites de teste e hierarquia |
| **generate_chart** | Gera configuração de gráfico para visualização |

### 6.3 Fluxo de Processamento

**1. Usuário envia mensagem no chat**
- Mensagem é validada e enriquecida com contexto

**2. Agent LangChain processa a requisição**
- Analisa intenção e seleciona tools apropriadas
- Executa tools do Qase para obter dados

**3. Dados são processados e gráfico é gerado**
- Tool generate_chart cria configuração do gráfico
- Output parser extrai resposta e chartConfig

**4. Resposta é retornada ao usuário**
- Texto explicativo + gráfico renderizado
- Opção de salvar como widget

---

## 7. Autenticação

### 7.1 Modelo Híbrido (Recomendado)

Combinação de API key própria (pool) com opção BYOK (Bring Your Own Key):

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODELO HÍBRIDO                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                 │
│  │   Usuário   │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────┐                     │
│  │         Tem API Key própria?            │                     │
│  └─────────────────┬───────────────────────┘                     │
│                    │                                             │
│         ┌─────────┴─────────┐                                    │
│         ▼                   ▼                                    │
│  ┌─────────────┐     ┌─────────────┐                             │
│  │    SIM      │     │    NÃO      │                             │
│  │ Usar BYOK   │     │ Usar Pool   │                             │
│  └──────┬──────┘     └──────┬──────┘                             │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌─────────────┐     ┌─────────────────────────┐                 │
│  │ Sem limites │     │ Free: 50 msgs/dia       │                 │
│  │ Custo: user │     │ Pro: 500 msgs/dia       │                 │
│  └─────────────┘     │ Custo: plataforma       │                 │
│                      └─────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Tiers de Acesso

| Tier | Msgs/Dia | Max Tokens | Custo |
|------|----------|------------|-------|
| **Free** | 50 | 2.048 | Plataforma |
| **Pro** | 500 | 4.096 | $20/mês |
| **Enterprise** | 5.000 | 8.192 | Customizado |
| **BYOK** | Ilimitado | 8.192 | Usuário |

### 7.3 Segurança

- API keys encriptadas com AES-256-GCM antes de persistir
- Validação de keys antes de salvar
- Cache de clientes com TTL para performance
- Rate limiting por tier
- Tracking de uso para billing e limites

---

## 8. Métricas e KPIs do Qase

### 8.1 Por Projeto/Microserviço

- Total de casos de teste
- Cobertura por prioridade (critical, high, medium, low)
- Taxa de automação (manual vs automatizado)
- Casos flaky (inconsistentes)

### 8.2 Por Test Run

- Pass rate (%)
- Tempo médio de execução
- Bloqueios por ambiente
- Regressões detectadas

### 8.3 Por Período

- Tendência de qualidade (evolução do pass rate)
- Velocity de criação de testes
- Tempo médio de resolução de bugs
- Débito técnico de testes

### 8.4 Comparativos (Microserviços)

- Serviço mais estável vs mais problemático
- Correlação entre deploys e falhas
- Cobertura por equipe/squad

---

## 9. Fases do Projeto

### Fase 1: MVP (4-6 semanas)

- [ ] Setup do projeto (monorepo com Turborepo)
- [ ] Integração Qase API básica
- [ ] Chat simples com GPT-5 + LangChain
- [ ] 3 tipos de gráficos (line, bar, pie)
- [ ] Salvar widget básico
- [ ] Dashboard single-page

### Fase 2: Core Features (4-6 semanas)

- [ ] Mais tipos de gráficos
- [ ] Sistema de filtros
- [ ] Multi-projeto
- [ ] Drag & drop no dashboard
- [ ] Persistência PostgreSQL
- [ ] Autenticação completa

### Fase 3: Polish & Scale (4-6 semanas)

- [ ] Cache inteligente (Redis)
- [ ] Refresh automático de widgets
- [ ] Export PDF/PNG
- [ ] Compartilhamento de dashboards
- [ ] Templates de dashboards
- [ ] Histórico de conversas

### Fase 4: Enterprise (ongoing)

- [ ] SSO/SAML
- [ ] Audit logs
- [ ] Multi-tenancy
- [ ] Alertas baseados em métricas
- [ ] Integração Slack/Teams

---

## 10. Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Rate limit Qase API | Média | Alto | Cache agressivo, batch requests |
| Custo OpenAI API | Média | Médio | Limitar tokens, cache de respostas |
| Qase API instável | Baixa | Alto | Retry com backoff, circuit breaker |
| Gráficos complexos | Média | Médio | Começar simples, iterar |
| Performance com muitos dados | Média | Alto | Paginação, agregação server-side |

---

## Próximos Passos

1. **Validar com stakeholders** - Apresentar escopo e coletar feedback
2. **PoC técnico** - Testar integração LangChain + GPT-5 + Qase API + Recharts
3. **Design UI/UX** - Wireframes do chat e dashboard
4. **Setup infraestrutura** - Repositório, CI/CD, ambientes
5. **Sprint 1** - Iniciar desenvolvimento do MVP

---

*Documento gerado em Janeiro de 2026*