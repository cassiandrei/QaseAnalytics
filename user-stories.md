# QaseAnalytics - User Stories

## Visão Geral do Produto

**Produto:** QaseAnalytics
**Descrição:** Plataforma de chat conversacional com IA para geração de relatórios e dashboards de métricas de QA do Qase.io
**Stack:** GPT-5 + LangChain + Qase API
**Data:** Janeiro 2026

---

## Personas

| Persona | Descrição |
|---------|-----------|
| **QA Analyst** | Analista de QA que executa testes e precisa visualizar métricas |
| **QA Lead** | Líder de QA que precisa de relatórios consolidados e comparativos |
| **Tech Lead** | Líder técnico que precisa monitorar qualidade dos microserviços |
| **Product Manager** | Gestor que precisa de insights rápidos sobre qualidade do produto |
| **Admin** | Administrador do sistema responsável por configurações |

---

## Épico 1: Setup e Infraestrutura

### US-001: Configuração do Monorepo
**Como** desenvolvedor
**Quero** ter um monorepo configurado com Turborepo
**Para** organizar frontend, backend e pacotes compartilhados de forma eficiente

**Critérios de Aceitação:**
- [ ] Monorepo criado com Turborepo
- [ ] Workspace para frontend (Next.js)
- [ ] Workspace para backend (Node.js/Hono)
- [ ] Workspace para pacotes compartilhados (types, utils)
- [ ] Scripts de build, dev e test configurados
- [ ] TypeScript configurado em todos os workspaces

**Prioridade:** Alta
**Fase:** MVP

---

### US-002: Configuração do Banco de Dados
**Como** desenvolvedor
**Quero** ter PostgreSQL configurado com Prisma ORM
**Para** persistir dados de widgets, dashboards e usuários

**Critérios de Aceitação:**
- [ ] PostgreSQL configurado (local e/ou Docker)
- [ ] Prisma ORM instalado e configurado
- [ ] Schema inicial criado (User, Widget, Dashboard)
- [ ] Migrations funcionando
- [ ] Seed script para dados iniciais

**Prioridade:** Alta
**Fase:** MVP

---

### US-003: Configuração do Redis
**Como** desenvolvedor
**Quero** ter Redis configurado
**Para** cache de queries e gerenciamento de sessões

**Critérios de Aceitação:**
- [ ] Redis configurado (local e/ou Docker)
- [ ] Client Redis integrado ao backend
- [ ] Helpers para cache (get, set, invalidate)
- [ ] TTL configurável por tipo de cache

**Prioridade:** Média
**Fase:** Polish & Scale

---

## Épico 2: Integração com Qase API

### US-004: Conexão com Qase API
**Como** QA Analyst
**Quero** conectar minha conta do Qase.io à plataforma
**Para** poder consultar métricas dos meus projetos

**Critérios de Aceitação:**
- [ ] Formulário para inserir API Token do Qase
- [ ] Validação do token antes de salvar
- [ ] Token armazenado de forma segura (encriptado)
- [ ] Feedback visual de conexão bem-sucedida
- [ ] Listagem de projetos disponíveis após conexão

**Prioridade:** Alta
**Fase:** MVP

---

### US-005: Listar Projetos do Qase
**Como** QA Analyst
**Quero** ver todos os meus projetos do Qase
**Para** escolher qual projeto analisar

**Critérios de Aceitação:**
- [ ] Endpoint para listar projetos (list_projects tool)
- [ ] Exibir nome, código e descrição do projeto
- [ ] Paginação se houver muitos projetos
- [ ] Cache de projetos por 5 minutos
- [ ] Tratamento de erro se API falhar

**Prioridade:** Alta
**Fase:** MVP

---

### US-006: Obter Casos de Teste
**Como** QA Analyst
**Quero** consultar casos de teste de um projeto
**Para** analisar cobertura e status dos testes

**Critérios de Aceitação:**
- [ ] Endpoint para obter test cases (get_test_cases tool)
- [ ] Filtros por: status, prioridade, automação, suite
- [ ] Retornar: id, título, status, prioridade, tipo (manual/auto)
- [ ] Paginação de resultados
- [ ] Cache de 2 minutos

**Prioridade:** Alta
**Fase:** MVP

---

### US-007: Obter Execuções de Teste
**Como** QA Lead
**Quero** consultar execuções de teste (test runs)
**Para** analisar histórico de execuções e pass rates

**Critérios de Aceitação:**
- [ ] Endpoint para obter test runs (get_test_runs tool)
- [ ] Filtros por: data inicial, data final, status, ambiente
- [ ] Retornar: id, título, status, stats (passed, failed, blocked)
- [ ] Ordenação por data (mais recente primeiro)
- [ ] Cache de 2 minutos

**Prioridade:** Alta
**Fase:** MVP

---

### US-008: Obter Resultados Detalhados
**Como** QA Analyst
**Quero** ver resultados detalhados de uma execução específica
**Para** identificar quais testes falharam e por quê

**Critérios de Aceitação:**
- [ ] Endpoint para obter run results (get_run_results tool)
- [ ] Retornar: caso de teste, status, duração, comentários
- [ ] Agrupar por status (passed, failed, blocked, skipped)
- [ ] Incluir stack trace/logs de falhas quando disponível
- [ ] Cache de 5 minutos

**Prioridade:** Alta
**Fase:** MVP

---

### US-009: Obter Defeitos/Bugs
**Como** QA Lead
**Quero** consultar defeitos registrados no Qase
**Para** rastrear bugs e sua resolução

**Critérios de Aceitação:**
- [ ] Endpoint para obter defects (get_defects tool)
- [ ] Filtros por: status, severidade, período
- [ ] Retornar: id, título, status, severidade, assignee
- [ ] Incluir link para issue (se integrado)
- [ ] Cache de 2 minutos

**Prioridade:** Média
**Fase:** Core Features

---

### US-010: Obter Suites de Teste
**Como** QA Analyst
**Quero** ver a hierarquia de suites de teste
**Para** entender a organização dos testes

**Critérios de Aceitação:**
- [ ] Endpoint para obter test suites (get_test_suites tool)
- [ ] Retornar estrutura hierárquica (pai/filho)
- [ ] Incluir contagem de casos por suite
- [ ] Cache de 10 minutos

**Prioridade:** Média
**Fase:** Core Features

---

## Épico 3: Motor de IA (LangChain)

### US-011: Configuração do LangChain Agent
**Como** desenvolvedor
**Quero** ter o LangChain Agent configurado
**Para** orquestrar as interações entre usuário, LLM e tools

**Critérios de Aceitação:**
- [ ] LangChain instalado e configurado
- [ ] Agent Executor criado com modelo GPT-5
- [ ] Todas as Qase Tools registradas
- [ ] Memory buffer para contexto de conversa
- [ ] Prompt template base definido

**Prioridade:** Alta
**Fase:** MVP

---

### US-012: Consultas em Linguagem Natural
**Como** QA Lead
**Quero** fazer perguntas em português sobre métricas
**Para** obter respostas sem precisar navegar por dashboards

**Critérios de Aceitação:**
- [ ] Processar perguntas como "Qual a taxa de falha do projeto X?"
- [ ] Agent identifica intent e seleciona tools apropriadas
- [ ] Resposta em linguagem natural com dados
- [ ] Tempo de resposta < 10 segundos
- [ ] Fallback educado se não entender

**Prioridade:** Alta
**Fase:** MVP

**Exemplos de Prompts:**
- "Qual a taxa de falha do serviço de pagamentos nos últimos 30 dias?"
- "Compare a cobertura de testes entre os serviços auth, payments e notifications"
- "Mostre a evolução de bugs críticos por sprint nos últimos 3 meses"
- "Quais casos de teste estão mais flaky no projeto checkout?"

---

### US-013: Memória Conversacional
**Como** QA Analyst
**Quero** que o chat lembre do contexto da conversa
**Para** fazer perguntas de follow-up sem repetir informações

**Critérios de Aceitação:**
- [ ] Histórico mantido durante a sessão
- [ ] Referências a mensagens anteriores funcionam
- [ ] Limite de contexto configurável (tokens)
- [ ] Opção de limpar histórico
- [ ] Histórico persistido no banco (Fase 3)

**Prioridade:** Média
**Fase:** MVP (básico) / Polish & Scale (persistido)

---

### US-014: Sugestões Inteligentes
**Como** Product Manager
**Quero** receber sugestões de análises relevantes
**Para** descobrir insights que não pensei em perguntar

**Critérios de Aceitação:**
- [ ] IA sugere análises baseadas nos dados disponíveis
- [ ] Sugestões contextuais após cada resposta
- [ ] Botões de "quick action" para sugestões
- [ ] Máximo de 3 sugestões por resposta

**Prioridade:** Baixa
**Fase:** Core Features

---

### US-015: Geração de Relatórios Executivos
**Como** Product Manager
**Quero** gerar relatórios executivos com um comando
**Para** apresentar status de qualidade para stakeholders

**Critérios de Aceitação:**
- [ ] Comando "Gere um relatório executivo da qualidade do release X"
- [ ] Relatório inclui: pass rate, bugs críticos, cobertura, tendências
- [ ] Formatação adequada para apresentação
- [ ] Opção de exportar para PDF
- [ ] Templates de relatório configuráveis

**Prioridade:** Média
**Fase:** Core Features

---

## Épico 4: Interface de Chat

### US-016: Tela de Chat
**Como** QA Analyst
**Quero** uma interface de chat intuitiva
**Para** conversar com a IA de forma natural

**Critérios de Aceitação:**
- [ ] Input de texto com envio por Enter ou botão
- [ ] Histórico de mensagens visível (scroll)
- [ ] Diferenciação visual entre mensagens do usuário e IA
- [ ] Indicador de "digitando" enquanto IA processa
- [ ] Suporte a markdown nas respostas
- [ ] Design responsivo (desktop e mobile)

**Prioridade:** Alta
**Fase:** MVP

---

### US-017: Preview de Gráficos no Chat
**Como** QA Lead
**Quero** ver gráficos inline nas respostas do chat
**Para** visualizar dados sem sair da conversa

**Critérios de Aceitação:**
- [ ] Gráficos renderizados com Recharts
- [ ] Tamanho adequado para visualização inline
- [ ] Tooltip interativo nos gráficos
- [ ] Botão "Expandir" para tela cheia
- [ ] Botão "Salvar como Widget"

**Prioridade:** Alta
**Fase:** MVP

---

### US-018: Seleção de Projeto
**Como** QA Analyst
**Quero** selecionar qual projeto do Qase estou analisando
**Para** focar minhas consultas em um projeto específico

**Critérios de Aceitação:**
- [ ] Dropdown/selector de projetos no header
- [ ] Projeto selecionado é contexto padrão para queries
- [ ] Opção "Todos os projetos" para análises comparativas
- [ ] Persistência da seleção na sessão

**Prioridade:** Alta
**Fase:** MVP

---

### US-019: Multi-Projeto no Chat
**Como** Tech Lead
**Quero** comparar métricas entre múltiplos projetos
**Para** identificar quais microserviços precisam de atenção

**Critérios de Aceitação:**
- [ ] Suporte a queries com múltiplos projetos
- [ ] Syntax: "Compare projeto A com projeto B"
- [ ] Gráficos comparativos (barras lado a lado)
- [ ] Tabela comparativa quando apropriado

**Prioridade:** Média
**Fase:** Core Features

---

## Épico 5: Visualização de Dados (Gráficos)

### US-020: Gráfico de Linhas
**Como** QA Lead
**Quero** visualizar evolução temporal em gráficos de linha
**Para** identificar tendências ao longo do tempo

**Critérios de Aceitação:**
- [ ] Line chart com Recharts
- [ ] Eixo X: tempo (dias, semanas, sprints)
- [ ] Eixo Y: métrica (pass rate, bugs, execuções)
- [ ] Múltiplas linhas para comparação
- [ ] Tooltip com valores exatos
- [ ] Zoom e pan para grandes períodos

**Prioridade:** Alta
**Fase:** MVP

---

### US-021: Gráfico de Barras
**Como** Tech Lead
**Quero** comparar valores entre categorias
**Para** ver diferenças claras entre projetos/serviços

**Critérios de Aceitação:**
- [ ] Bar chart vertical e horizontal
- [ ] Barras agrupadas para comparações
- [ ] Barras empilhadas para composição
- [ ] Cores diferenciadas por série
- [ ] Labels de valores configuráveis

**Prioridade:** Alta
**Fase:** MVP

---

### US-022: Gráfico de Pizza/Donut
**Como** QA Analyst
**Quero** ver distribuição percentual em gráficos circulares
**Para** entender proporções (passed/failed/blocked)

**Critérios de Aceitação:**
- [ ] Pie chart e Donut chart
- [ ] Legendas com percentuais
- [ ] Cores semânticas (verde=passed, vermelho=failed)
- [ ] Destaque em hover
- [ ] Valor central no donut (opcional)

**Prioridade:** Alta
**Fase:** MVP

---

### US-023: Gráfico Heatmap
**Como** QA Lead
**Quero** visualizar matriz de cobertura em heatmap
**Para** identificar áreas com baixa cobertura de testes

**Critérios de Aceitação:**
- [ ] Heatmap com gradiente de cores
- [ ] Eixos configuráveis (features x sprints, etc)
- [ ] Legenda de escala de cores
- [ ] Tooltip com valor exato da célula
- [ ] Destaque de células críticas

**Prioridade:** Média
**Fase:** Core Features

---

### US-024: Gráfico Treemap
**Como** QA Analyst
**Quero** visualizar hierarquia de suites em treemap
**Para** ver proporção de testes por módulo

**Critérios de Aceitação:**
- [ ] Treemap hierárquico (suite > casos)
- [ ] Tamanho proporcional à quantidade
- [ ] Cor representando status ou prioridade
- [ ] Drill-down ao clicar
- [ ] Breadcrumb de navegação

**Prioridade:** Média
**Fase:** Core Features

---

### US-025: Gráfico de Área
**Como** QA Lead
**Quero** visualizar volume ao longo do tempo
**Para** ver magnitude de execuções e tendências

**Critérios de Aceitação:**
- [ ] Area chart com preenchimento
- [ ] Áreas empilhadas para composição
- [ ] Transparência para sobreposição
- [ ] Mesmas interações do line chart

**Prioridade:** Média
**Fase:** Core Features

---

## Épico 6: Sistema de Widgets

### US-026: Salvar Gráfico como Widget
**Como** QA Lead
**Quero** salvar gráficos gerados como widgets reutilizáveis
**Para** não precisar refazer consultas frequentes

**Critérios de Aceitação:**
- [ ] Botão "Salvar como Widget" em cada gráfico
- [ ] Modal para nomear o widget
- [ ] Persistência no banco de dados
- [ ] Widget salva: query original, config do gráfico, filtros
- [ ] Confirmação visual de salvamento

**Prioridade:** Alta
**Fase:** MVP

---

### US-027: Listar Meus Widgets
**Como** QA Analyst
**Quero** ver todos os meus widgets salvos
**Para** reutilizá-los nos dashboards

**Critérios de Aceitação:**
- [ ] Página/sidebar com lista de widgets
- [ ] Preview miniatura do widget
- [ ] Busca e filtro por nome
- [ ] Data de criação e última atualização
- [ ] Ações: editar, duplicar, excluir

**Prioridade:** Alta
**Fase:** MVP

---

### US-028: Editar Widget
**Como** QA Lead
**Quero** editar configurações de um widget salvo
**Para** ajustar filtros ou visualização

**Critérios de Aceitação:**
- [ ] Abrir widget em modo de edição
- [ ] Alterar nome e descrição
- [ ] Modificar filtros (período, projeto)
- [ ] Alterar tipo de gráfico
- [ ] Preview antes de salvar

**Prioridade:** Média
**Fase:** Core Features

---

### US-029: Refresh Automático de Widget
**Como** QA Lead
**Quero** que widgets atualizem automaticamente
**Para** ter dados sempre atualizados no dashboard

**Critérios de Aceitação:**
- [ ] Configuração de intervalo de refresh (5min, 15min, 1h)
- [ ] Indicador visual de última atualização
- [ ] Botão de refresh manual
- [ ] Refresh só quando dashboard está visível
- [ ] Rate limiting para evitar sobrecarga

**Prioridade:** Média
**Fase:** Polish & Scale

---

## Épico 7: Dashboards

### US-030: Criar Dashboard
**Como** QA Lead
**Quero** criar dashboards personalizados
**Para** organizar widgets relevantes para minha análise

**Critérios de Aceitação:**
- [ ] Botão "Novo Dashboard"
- [ ] Nome e descrição do dashboard
- [ ] Dashboard criado vazio, pronto para widgets
- [ ] Limite de dashboards por usuário (configurável)

**Prioridade:** Alta
**Fase:** MVP (básico) / Core Features (completo)

---

### US-031: Adicionar Widgets ao Dashboard
**Como** QA Lead
**Quero** adicionar widgets salvos ao meu dashboard
**Para** compor a visualização desejada

**Critérios de Aceitação:**
- [ ] Botão "Adicionar Widget" no dashboard
- [ ] Modal com lista de widgets disponíveis
- [ ] Preview do widget antes de adicionar
- [ ] Widget adicionado em posição padrão
- [ ] Mesmo widget pode estar em múltiplos dashboards

**Prioridade:** Alta
**Fase:** MVP

---

### US-032: Drag & Drop de Widgets
**Como** QA Lead
**Quero** arrastar e reorganizar widgets no dashboard
**Para** personalizar o layout conforme minha preferência

**Critérios de Aceitação:**
- [ ] React Grid Layout implementado
- [ ] Arrastar widgets para nova posição
- [ ] Redimensionar widgets (altura e largura)
- [ ] Snap to grid
- [ ] Layout responsivo (reorganiza em telas menores)
- [ ] Salvar layout automaticamente

**Prioridade:** Alta
**Fase:** Core Features

---

### US-033: Filtros Globais do Dashboard
**Como** Tech Lead
**Quero** aplicar filtros globais que afetam todos os widgets
**Para** analisar um período ou projeto específico

**Critérios de Aceitação:**
- [ ] Seletor de período (data início/fim)
- [ ] Seletor de projeto(s)
- [ ] Seletor de ambiente (se aplicável)
- [ ] Filtros aplicados a todos os widgets
- [ ] Widgets re-renderizam com novos dados

**Prioridade:** Média
**Fase:** Core Features

---

### US-034: Templates de Dashboard
**Como** QA Lead
**Quero** criar dashboards a partir de templates
**Para** começar rapidamente com layouts pré-definidos

**Critérios de Aceitação:**
- [ ] Template "Overview" (pass rate, bugs, cobertura)
- [ ] Template "Sprint Report" (métricas de sprint)
- [ ] Template "Microservices Comparison"
- [ ] Opção "Criar do zero"
- [ ] Customização após criar de template

**Prioridade:** Baixa
**Fase:** Polish & Scale

---

### US-035: Compartilhar Dashboard via Link
**Como** QA Lead
**Quero** compartilhar dashboard com colegas via link
**Para** que vejam as mesmas métricas sem login

**Critérios de Aceitação:**
- [ ] Botão "Compartilhar" no dashboard
- [ ] Gerar link único (hash)
- [ ] Link público (read-only) ou autenticado
- [ ] Opção de expiração do link
- [ ] Preview do que será compartilhado

**Prioridade:** Média
**Fase:** Polish & Scale

---

### US-036: Exportar Dashboard para PDF
**Como** Product Manager
**Quero** exportar dashboard como PDF
**Para** anexar em relatórios e apresentações

**Critérios de Aceitação:**
- [ ] Botão "Exportar PDF" no dashboard
- [ ] Layout otimizado para impressão
- [ ] Cabeçalho com título e data
- [ ] Todos os widgets renderizados
- [ ] Download automático do arquivo

**Prioridade:** Média
**Fase:** Polish & Scale

---

### US-037: Exportar Widget como PNG
**Como** QA Lead
**Quero** exportar gráfico individual como imagem
**Para** usar em documentos e apresentações

**Critérios de Aceitação:**
- [ ] Botão "Exportar PNG" em cada widget
- [ ] Resolução adequada para impressão
- [ ] Fundo branco (não transparente)
- [ ] Nome do arquivo com título do widget

**Prioridade:** Média
**Fase:** Polish & Scale

---

## Épico 8: Autenticação e Autorização

### US-038: Cadastro de Usuário
**Como** novo usuário
**Quero** me cadastrar na plataforma
**Para** começar a usar o QaseAnalytics

**Critérios de Aceitação:**
- [ ] Formulário de cadastro (email, senha, nome)
- [ ] Validação de email único
- [ ] Validação de força da senha
- [ ] Email de confirmação
- [ ] Aceite de termos de uso

**Prioridade:** Alta
**Fase:** Core Features

---

### US-039: Login de Usuário
**Como** usuário cadastrado
**Quero** fazer login na plataforma
**Para** acessar meus dashboards e widgets

**Critérios de Aceitação:**
- [ ] Formulário de login (email/senha)
- [ ] "Esqueci minha senha"
- [ ] Session management com JWT
- [ ] "Lembrar de mim" (token de longa duração)
- [ ] Logout funcional

**Prioridade:** Alta
**Fase:** Core Features

---

### US-040: Tiers de Acesso
**Como** usuário
**Quero** entender os limites do meu plano
**Para** saber quantas consultas posso fazer

**Critérios de Aceitação:**
- [ ] Free: 50 msgs/dia, 2048 tokens max
- [ ] Pro: 500 msgs/dia, 4096 tokens max - $20/mês
- [ ] Enterprise: 5000 msgs/dia, 8192 tokens - custom
- [ ] Contador de uso visível no UI
- [ ] Aviso quando próximo do limite
- [ ] Bloqueio suave ao atingir limite

**Prioridade:** Média
**Fase:** Core Features

---

### US-041: BYOK (Bring Your Own Key)
**Como** power user
**Quero** usar minha própria API key da OpenAI
**Para** ter uso ilimitado sem custos para a plataforma

**Critérios de Aceitação:**
- [ ] Campo para inserir OpenAI API Key
- [ ] Validação da key antes de salvar
- [ ] Key encriptada com AES-256-GCM
- [ ] Uso da key do usuário nas requests
- [ ] Sem limites de mensagens para BYOK

**Prioridade:** Média
**Fase:** Core Features

---

### US-042: SSO/SAML (Enterprise)
**Como** Admin de empresa
**Quero** integrar com SSO corporativo
**Para** gerenciar acesso via identity provider existente

**Critérios de Aceitação:**
- [ ] Integração com SAML 2.0
- [ ] Suporte a Okta, Azure AD, Google Workspace
- [ ] Provisionamento automático de usuários
- [ ] Mapeamento de grupos para roles
- [ ] Logout single sign-out

**Prioridade:** Baixa
**Fase:** Enterprise

---

## Épico 9: Métricas e KPIs

### US-043: Pass Rate por Projeto
**Como** QA Lead
**Quero** ver o pass rate de cada projeto
**Para** identificar projetos com mais falhas

**Critérios de Aceitação:**
- [ ] Cálculo: (passed / total) * 100
- [ ] Período configurável
- [ ] Comparação com período anterior
- [ ] Indicador visual (verde/amarelo/vermelho)
- [ ] Drill-down para ver falhas

**Prioridade:** Alta
**Fase:** MVP

---

### US-044: Taxa de Automação
**Como** Tech Lead
**Quero** ver a proporção de testes automatizados vs manuais
**Para** acompanhar progresso da automação

**Critérios de Aceitação:**
- [ ] Cálculo: (automated / total) * 100
- [ ] Breakdown por prioridade
- [ ] Evolução ao longo do tempo
- [ ] Meta configurável
- [ ] Comparativo entre projetos

**Prioridade:** Alta
**Fase:** MVP

---

### US-045: Identificação de Testes Flaky
**Como** QA Analyst
**Quero** identificar testes inconsistentes (flaky)
**Para** priorizar correção de testes instáveis

**Critérios de Aceitação:**
- [ ] Detecção: mesmo teste com resultados diferentes em runs consecutivos
- [ ] Score de flakiness (% de inconsistência)
- [ ] Lista ordenada por flakiness
- [ ] Histórico de resultados do teste
- [ ] Link para caso de teste no Qase

**Prioridade:** Média
**Fase:** Core Features

---

### US-046: Tempo Médio de Execução
**Como** QA Lead
**Quero** monitorar o tempo de execução dos test runs
**Para** identificar gargalos e otimizar pipelines

**Critérios de Aceitação:**
- [ ] Tempo total por run
- [ ] Tempo médio por caso de teste
- [ ] Evolução ao longo do tempo
- [ ] Top 10 testes mais lentos
- [ ] Comparação entre ambientes

**Prioridade:** Média
**Fase:** Core Features

---

### US-047: Tendência de Qualidade
**Como** Product Manager
**Quero** ver a evolução da qualidade ao longo do tempo
**Para** apresentar progresso aos stakeholders

**Critérios de Aceitação:**
- [ ] Gráfico de tendência (pass rate x tempo)
- [ ] Linha de meta/baseline
- [ ] Marcadores de releases
- [ ] Análise de regressões
- [ ] Projeção futura (opcional)

**Prioridade:** Média
**Fase:** Core Features

---

### US-048: Comparativo entre Microserviços
**Como** Tech Lead
**Quero** comparar métricas entre diferentes microserviços
**Para** identificar serviços problemáticos

**Critérios de Aceitação:**
- [ ] Tabela comparativa de métricas
- [ ] Ranking por pass rate
- [ ] Identificação do "mais estável" e "mais problemático"
- [ ] Correlação com frequência de deploys
- [ ] Filtro por equipe/squad

**Prioridade:** Média
**Fase:** Core Features

---

## Épico 10: Histórico e Auditoria

### US-049: Histórico de Conversas
**Como** QA Analyst
**Quero** acessar histórico de minhas conversas anteriores
**Para** retomar análises ou referenciar respostas

**Critérios de Aceitação:**
- [ ] Lista de conversas passadas
- [ ] Busca por conteúdo
- [ ] Ordenação por data
- [ ] Continuar conversa antiga
- [ ] Deletar conversas

**Prioridade:** Média
**Fase:** Polish & Scale

---

### US-050: Audit Log (Enterprise)
**Como** Admin
**Quero** ver log de todas as ações na plataforma
**Para** compliance e investigação de incidentes

**Critérios de Aceitação:**
- [ ] Log de: login, queries, mudanças em dashboards
- [ ] Quem fez, o quê, quando
- [ ] Filtros por usuário, ação, período
- [ ] Export para CSV
- [ ] Retenção configurável

**Prioridade:** Baixa
**Fase:** Enterprise

---

## Épico 11: Integrações

### US-051: Alertas por Email
**Como** QA Lead
**Quero** receber alertas por email quando métricas cruzarem thresholds
**Para** ser notificado de problemas sem ficar olhando dashboards

**Critérios de Aceitação:**
- [ ] Configurar threshold (ex: pass rate < 80%)
- [ ] Escolher métricas para monitorar
- [ ] Frequência de verificação
- [ ] Email com resumo e link para dashboard
- [ ] Snooze de alertas

**Prioridade:** Média
**Fase:** Enterprise

---

### US-052: Integração Slack
**Como** Tech Lead
**Quero** receber notificações no Slack
**Para** alertas chegarem onde minha equipe está

**Critérios de Aceitação:**
- [ ] Configurar webhook do Slack
- [ ] Escolher canal para notificações
- [ ] Formato de mensagem rico (blocks)
- [ ] Botões de ação na mensagem
- [ ] Comandos slash do Slack (opcional)

**Prioridade:** Baixa
**Fase:** Enterprise

---

### US-053: Integração Microsoft Teams
**Como** Tech Lead
**Quero** receber notificações no Teams
**Para** alertas no ambiente Microsoft da empresa

**Critérios de Aceitação:**
- [ ] Configurar connector do Teams
- [ ] Escolher canal para notificações
- [ ] Formato de adaptive card
- [ ] Link para dashboard na mensagem

**Prioridade:** Baixa
**Fase:** Enterprise

---

## Épico 12: Multi-tenancy (Enterprise)

### US-054: Organizações
**Como** Admin Enterprise
**Quero** criar organizações separadas
**Para** isolar dados entre diferentes clientes/departamentos

**Critérios de Aceitação:**
- [ ] CRUD de organizações
- [ ] Usuários pertencem a organizações
- [ ] Dados completamente isolados
- [ ] Admin de organização
- [ ] Billing por organização

**Prioridade:** Baixa
**Fase:** Enterprise

---

### US-055: Gerenciamento de Usuários
**Como** Admin de Organização
**Quero** gerenciar usuários da minha organização
**Para** controlar quem tem acesso

**Critérios de Aceitação:**
- [ ] Convidar usuários por email
- [ ] Definir roles (admin, editor, viewer)
- [ ] Remover usuários
- [ ] Ver atividade dos usuários
- [ ] Transferir ownership

**Prioridade:** Baixa
**Fase:** Enterprise

---

## Épico 13: Performance e Cache

### US-056: Cache de Queries Qase
**Como** sistema
**Quero** cachear respostas da API do Qase
**Para** reduzir latência e evitar rate limiting

**Critérios de Aceitação:**
- [ ] Cache em Redis
- [ ] TTL por tipo de dado (projetos: 5min, runs: 2min)
- [ ] Invalidação manual possível
- [ ] Cache key baseada em query + filtros
- [ ] Hit rate monitorado

**Prioridade:** Alta
**Fase:** MVP (básico) / Polish & Scale (Redis)

---

### US-057: Cache de Respostas LLM
**Como** sistema
**Quero** cachear respostas similares do LLM
**Para** reduzir custos com OpenAI

**Critérios de Aceitação:**
- [ ] Semantic cache (queries similares)
- [ ] Hash de query + contexto
- [ ] TTL de 1 hora
- [ ] Invalidação quando dados Qase mudam
- [ ] Economia de tokens monitorada

**Prioridade:** Média
**Fase:** Polish & Scale

---

### US-058: Rate Limiting
**Como** sistema
**Quero** limitar requisições por usuário
**Para** proteger a plataforma e controlar custos

**Critérios de Aceitação:**
- [ ] Limite por tier (Free, Pro, Enterprise)
- [ ] Contador em Redis
- [ ] Reset diário
- [ ] Header com limite restante
- [ ] Resposta 429 quando exceder

**Prioridade:** Alta
**Fase:** Core Features

---

## Épico 14: Resiliência

### US-059: Retry com Backoff
**Como** sistema
**Quero** retry automático em falhas transitórias
**Para** melhorar resiliência a falhas temporárias

**Critérios de Aceitação:**
- [ ] Retry em erros 5xx e timeout
- [ ] Exponential backoff (1s, 2s, 4s)
- [ ] Máximo de 3 tentativas
- [ ] Log de retries
- [ ] Não retry em 4xx

**Prioridade:** Alta
**Fase:** MVP

---

### US-060: Circuit Breaker
**Como** sistema
**Quero** circuit breaker na integração com Qase
**Para** evitar sobrecarga quando API está instável

**Critérios de Aceitação:**
- [ ] Estado: closed, open, half-open
- [ ] Threshold de falhas para abrir
- [ ] Tempo de recovery
- [ ] Fallback com dados cacheados
- [ ] Alerta quando circuit abre

**Prioridade:** Média
**Fase:** Core Features

---

---

## Resumo por Fase

### Fase 1: MVP (4-6 semanas)
| ID | User Story | Prioridade |
|----|------------|------------|
| US-001 | Configuração do Monorepo | Alta |
| US-002 | Configuração do Banco de Dados | Alta |
| US-004 | Conexão com Qase API | Alta |
| US-005 | Listar Projetos do Qase | Alta |
| US-006 | Obter Casos de Teste | Alta |
| US-007 | Obter Execuções de Teste | Alta |
| US-008 | Obter Resultados Detalhados | Alta |
| US-011 | Configuração do LangChain Agent | Alta |
| US-012 | Consultas em Linguagem Natural | Alta |
| US-016 | Tela de Chat | Alta |
| US-017 | Preview de Gráficos no Chat | Alta |
| US-018 | Seleção de Projeto | Alta |
| US-020 | Gráfico de Linhas | Alta |
| US-021 | Gráfico de Barras | Alta |
| US-022 | Gráfico de Pizza/Donut | Alta |
| US-026 | Salvar Gráfico como Widget | Alta |
| US-027 | Listar Meus Widgets | Alta |
| US-030 | Criar Dashboard (básico) | Alta |
| US-031 | Adicionar Widgets ao Dashboard | Alta |
| US-043 | Pass Rate por Projeto | Alta |
| US-044 | Taxa de Automação | Alta |
| US-056 | Cache de Queries Qase (básico) | Alta |
| US-059 | Retry com Backoff | Alta |

### Fase 2: Core Features (4-6 semanas)
| ID | User Story | Prioridade |
|----|------------|------------|
| US-009 | Obter Defeitos/Bugs | Média |
| US-010 | Obter Suites de Teste | Média |
| US-013 | Memória Conversacional (básico) | Média |
| US-014 | Sugestões Inteligentes | Baixa |
| US-015 | Geração de Relatórios Executivos | Média |
| US-019 | Multi-Projeto no Chat | Média |
| US-023 | Gráfico Heatmap | Média |
| US-024 | Gráfico Treemap | Média |
| US-025 | Gráfico de Área | Média |
| US-028 | Editar Widget | Média |
| US-032 | Drag & Drop de Widgets | Alta |
| US-033 | Filtros Globais do Dashboard | Média |
| US-038 | Cadastro de Usuário | Alta |
| US-039 | Login de Usuário | Alta |
| US-040 | Tiers de Acesso | Média |
| US-041 | BYOK (Bring Your Own Key) | Média |
| US-045 | Identificação de Testes Flaky | Média |
| US-046 | Tempo Médio de Execução | Média |
| US-047 | Tendência de Qualidade | Média |
| US-048 | Comparativo entre Microserviços | Média |
| US-058 | Rate Limiting | Alta |
| US-060 | Circuit Breaker | Média |

### Fase 3: Polish & Scale (4-6 semanas)
| ID | User Story | Prioridade |
|----|------------|------------|
| US-003 | Configuração do Redis | Média |
| US-029 | Refresh Automático de Widget | Média |
| US-034 | Templates de Dashboard | Baixa |
| US-035 | Compartilhar Dashboard via Link | Média |
| US-036 | Exportar Dashboard para PDF | Média |
| US-037 | Exportar Widget como PNG | Média |
| US-049 | Histórico de Conversas | Média |
| US-057 | Cache de Respostas LLM | Média |

### Fase 4: Enterprise (ongoing)
| ID | User Story | Prioridade |
|----|------------|------------|
| US-042 | SSO/SAML | Baixa |
| US-050 | Audit Log | Baixa |
| US-051 | Alertas por Email | Média |
| US-052 | Integração Slack | Baixa |
| US-053 | Integração Microsoft Teams | Baixa |
| US-054 | Organizações | Baixa |
| US-055 | Gerenciamento de Usuários | Baixa |

---

## Métricas de Sucesso do Projeto

| Métrica | Target |
|---------|--------|
| Tempo de resposta do chat | < 10 segundos |
| Precisão das respostas da IA | > 90% |
| Uptime da plataforma | > 99.5% |
| NPS dos usuários | > 50 |
| Redução de tempo em relatórios manuais | > 70% |

---

*Documento gerado em Janeiro de 2026*
*Total de User Stories: 60*
