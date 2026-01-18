# QaseAnalytics - Kanban Board

## Legenda
🔴 Bloqueado | 🟡 Em risco | 🟢 No prazo

---

## 📋 BACKLOG - MVP (Fase 1)
| ID | User Story | Prioridade | Épico |
|----|------------|------------|-------|
| US-016 | Tela de Chat | Alta | Interface de Chat |
| US-017 | Preview de Gráficos no Chat | Alta | Interface de Chat |
| US-018 | Seleção de Projeto | Alta | Interface de Chat |
| US-020 | Gráfico de Linhas | Alta | Visualização de Dados |
| US-021 | Gráfico de Barras | Alta | Visualização de Dados |
| US-022 | Gráfico de Pizza/Donut | Alta | Visualização de Dados |
| US-026 | Salvar Gráfico como Widget | Alta | Sistema de Widgets |
| US-027 | Listar Meus Widgets | Alta | Sistema de Widgets |
| US-030 | Criar Dashboard (básico) | Alta | Dashboards |
| US-031 | Adicionar Widgets ao Dashboard | Alta | Dashboards |
| US-043 | Pass Rate por Projeto | Alta | Métricas e KPIs |
| US-044 | Taxa de Automação | Alta | Métricas e KPIs |
| US-056 | Cache de Queries Qase (básico) | Alta | Performance e Cache |

---

## 🔄 IN PROGRESS
| ID | User Story | Responsável | Início | Status |
|----|------------|-------------|--------|--------|

---

## 👀 IN REVIEW
| ID | User Story | Revisor | Início Revisão |
|----|------------|---------|----------------|

---

## ✅ DONE
| ID | User Story | Data Conclusão | Observações |
|----|------------|----------------|-------------|
| US-012 | Consultas em Linguagem Natural | 2026-01-18 | ChatService + 5 endpoints + SSE streaming + 302 testes |
| US-011 | Configuração do LangChain Agent | 2026-01-18 | QaseAgent + GPT-4o + Memory buffer + 4 tools + 256 testes |
| US-008 | Obter Resultados Detalhados | 2026-01-18 | LangChain tool get_run_results + Redis cache 5min + 203 testes |
| US-007 | Obter Execuções de Teste | 2026-01-18 | LangChain tool get_test_runs + Redis cache 2min + 178 testes |
| US-006 | Obter Casos de Teste | 2026-01-18 | LangChain tool get_test_cases + Redis cache 2min + 149 testes |
| US-005 | Listar Projetos do Qase | 2026-01-18 | LangChain tool + Redis cache 5min + 121 testes |
| US-004 | Conexão com Qase API | 2026-01-18 | Cliente HTTP + AES-256-GCM + Retry + 91 testes |
| US-002 | Configuração do Banco de Dados | 2026-01-18 | Prisma 6.x + PostgreSQL 16 + Schema completo + Seed |
| US-001 | Configuração do Monorepo | 2026-01-18 | Turborepo + Next.js + Hono + Docker |

---

## 📊 Métricas do MVP

| Métrica | Valor |
|---------|-------|
| Total de US | 22 |
| Concluídas | 9 |
| Em Progresso | 0 |
| Em Revisão | 0 |
| No Backlog | 13 |
| **Progresso** | **41%** |

---

## 📝 Próximas Fases

### Fase 2: Core Features
- US-009, US-010, US-013, US-014, US-015, US-019
- US-023, US-024, US-025, US-028, US-032, US-033
- US-038, US-039, US-040, US-041, US-045, US-046, US-047, US-048
- US-058, US-060

### Fase 3: Polish & Scale
- US-003, US-029, US-034, US-035, US-036, US-037, US-049, US-057

### Fase 4: Enterprise
- US-042, US-050, US-051, US-052, US-053, US-054, US-055

---

## 📖 Referências

- **Detalhes das US:** [user-stories.md](./user-stories.md)
- **Arquitetura:** [.claude/docs/ARCHITECTURE.md](./.claude/docs/ARCHITECTURE.md)
- **Escopo Técnico:** [ESCOPO.md](./ESCOPO.md)

---

*Última atualização: Janeiro 2026*
