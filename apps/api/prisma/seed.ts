/**
 * Prisma Seed Script
 *
 * Popula o banco de dados com dados iniciais para desenvolvimento.
 *
 * Uso: pnpm db:seed
 */

import { PrismaClient, UserTier, ChartType, MessageRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean up existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.dashboardWidget.deleteMany();
  await prisma.dashboard.deleteMany();
  await prisma.widget.deleteMany();
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // ==========================================================================
  // USERS
  // ==========================================================================
  console.log("👤 Creating users...");

  // Test user for development (frontend uses "test-user" as default userId)
  const testUser = await prisma.user.create({
    data: {
      id: "test-user",
      email: "test@qaseanalytics.com",
      name: "Test User",
      // Password: "test123" (bcrypt hash)
      password: "$2b$10$rQZ5QzX5QzX5QzX5QzX5QuOZzX5QzX5QzX5QzX5QzX5QzX5QzX5Qu",
      tier: UserTier.PRO,
      qaseTokenValid: false,
    },
  });

  console.log(`  ✓ Created test user: ${testUser.email} (id: ${testUser.id})`);

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@qaseanalytics.com",
      name: "Demo User",
      // Password: "demo123" (bcrypt hash)
      password: "$2b$10$rQZ5QzX5QzX5QzX5QzX5QuOZzX5QzX5QzX5QzX5QzX5QzX5QzX5Qu",
      tier: UserTier.PRO,
      qaseTokenValid: false,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@qaseanalytics.com",
      name: "Admin User",
      // Password: "admin123" (bcrypt hash)
      password: "$2b$10$rQZ5QzX5QzX5QzX5QzX5QuOZzX5QzX5QzX5QzX5QzX5QzX5QzX5Qu",
      tier: UserTier.ENTERPRISE,
      qaseTokenValid: false,
    },
  });

  console.log(`  ✓ Created user: ${demoUser.email}`);
  console.log(`  ✓ Created user: ${adminUser.email}`);

  // ==========================================================================
  // WIDGETS
  // ==========================================================================
  console.log("\n📊 Creating sample widgets...");

  const passRateWidget = await prisma.widget.create({
    data: {
      name: "Pass Rate - Last 30 Days",
      description: "Taxa de aprovação dos testes nos últimos 30 dias",
      query: "Qual a taxa de aprovação dos testes nos últimos 30 dias?",
      chartType: ChartType.LINE,
      chartConfig: {
        xAxisKey: "date",
        yAxisKey: "passRate",
        yAxisLabel: "Pass Rate (%)",
        lineColor: "#10b981",
        showGrid: true,
        showTooltip: true,
      },
      filters: {
        dateRange: "last_30_days",
      },
      refreshInterval: 15, // 15 minutes
      userId: demoUser.id,
    },
  });

  const testDistributionWidget = await prisma.widget.create({
    data: {
      name: "Test Status Distribution",
      description: "Distribuição de status dos testes",
      query: "Mostre a distribuição de status dos testes",
      chartType: ChartType.DONUT,
      chartConfig: {
        dataKey: "count",
        nameKey: "status",
        colors: {
          passed: "#10b981",
          failed: "#ef4444",
          blocked: "#f59e0b",
          skipped: "#6b7280",
        },
        showLegend: true,
        showPercentage: true,
      },
      userId: demoUser.id,
    },
  });

  const automationRateWidget = await prisma.widget.create({
    data: {
      name: "Automation Coverage",
      description: "Taxa de automação por projeto",
      query: "Qual a taxa de automação dos projetos?",
      chartType: ChartType.BAR,
      chartConfig: {
        xAxisKey: "project",
        yAxisKey: "automationRate",
        yAxisLabel: "Automation (%)",
        barColor: "#3b82f6",
        showValues: true,
      },
      userId: demoUser.id,
    },
  });

  const bugsWidget = await prisma.widget.create({
    data: {
      name: "Critical Bugs Trend",
      description: "Evolução de bugs críticos por sprint",
      query: "Mostre a evolução de bugs críticos por sprint",
      chartType: ChartType.AREA,
      chartConfig: {
        xAxisKey: "sprint",
        yAxisKey: "count",
        areaColor: "#ef4444",
        fillOpacity: 0.3,
      },
      filters: {
        severity: "critical",
      },
      userId: demoUser.id,
    },
  });

  console.log(`  ✓ Created widget: ${passRateWidget.name}`);
  console.log(`  ✓ Created widget: ${testDistributionWidget.name}`);
  console.log(`  ✓ Created widget: ${automationRateWidget.name}`);
  console.log(`  ✓ Created widget: ${bugsWidget.name}`);

  // ==========================================================================
  // DASHBOARDS
  // ==========================================================================
  console.log("\n📋 Creating sample dashboards...");

  const overviewDashboard = await prisma.dashboard.create({
    data: {
      name: "QA Overview",
      description: "Visão geral das métricas de qualidade",
      layout: [
        { i: "passRate", x: 0, y: 0, w: 6, h: 4 },
        { i: "distribution", x: 6, y: 0, w: 6, h: 4 },
        { i: "automation", x: 0, y: 4, w: 6, h: 4 },
        { i: "bugs", x: 6, y: 4, w: 6, h: 4 },
      ],
      isPublic: false,
      userId: demoUser.id,
    },
  });

  // Add widgets to dashboard
  await prisma.dashboardWidget.createMany({
    data: [
      {
        dashboardId: overviewDashboard.id,
        widgetId: passRateWidget.id,
        position: { i: "passRate", x: 0, y: 0, w: 6, h: 4 },
      },
      {
        dashboardId: overviewDashboard.id,
        widgetId: testDistributionWidget.id,
        position: { i: "distribution", x: 6, y: 0, w: 6, h: 4 },
      },
      {
        dashboardId: overviewDashboard.id,
        widgetId: automationRateWidget.id,
        position: { i: "automation", x: 0, y: 4, w: 6, h: 4 },
      },
      {
        dashboardId: overviewDashboard.id,
        widgetId: bugsWidget.id,
        position: { i: "bugs", x: 6, y: 4, w: 6, h: 4 },
      },
    ],
  });

  console.log(`  ✓ Created dashboard: ${overviewDashboard.name}`);

  // ==========================================================================
  // CONVERSATIONS (Sample chat history)
  // ==========================================================================
  console.log("\n💬 Creating sample conversations...");

  const sampleConversation = await prisma.conversation.create({
    data: {
      title: "Análise de Pass Rate",
      projectCode: "DEMO",
      userId: demoUser.id,
      messages: {
        create: [
          {
            role: MessageRole.USER,
            content: "Qual a taxa de aprovação dos testes nos últimos 30 dias?",
          },
          {
            role: MessageRole.ASSISTANT,
            content:
              "Analisando os dados do projeto DEMO nos últimos 30 dias:\n\n" +
              "**Taxa de Aprovação (Pass Rate): 87.5%**\n\n" +
              "Detalhamento:\n" +
              "- ✅ Passed: 350 testes\n" +
              "- ❌ Failed: 42 testes\n" +
              "- ⚠️ Blocked: 8 testes\n\n" +
              "A taxa está acima da meta de 85%. " +
              "Houve uma melhoria de 3% comparado ao período anterior.",
            chartData: {
              type: "line",
              data: [
                { date: "2026-01-01", passRate: 85 },
                { date: "2026-01-08", passRate: 86 },
                { date: "2026-01-15", passRate: 87.5 },
              ],
            },
            chartType: ChartType.LINE,
            tokensUsed: 245,
          },
          {
            role: MessageRole.USER,
            content: "Quais testes falharam mais vezes?",
          },
          {
            role: MessageRole.ASSISTANT,
            content:
              "Os 5 testes com mais falhas no período:\n\n" +
              "1. **TC-142: Login com 2FA** - 8 falhas (flaky test)\n" +
              "2. **TC-089: Checkout com cupom** - 5 falhas\n" +
              "3. **TC-201: Busca com filtros** - 4 falhas\n" +
              "4. **TC-156: Upload de arquivo** - 3 falhas\n" +
              "5. **TC-178: Notificação push** - 3 falhas\n\n" +
              "Recomendo priorizar a correção do TC-142 que apresenta " +
              "comportamento inconsistente (flaky).",
            tokensUsed: 198,
          },
        ],
      },
    },
  });

  console.log(`  ✓ Created conversation: ${sampleConversation.title}`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log("\n✅ Seed completed successfully!\n");
  console.log("📊 Summary:");
  console.log(`   - Users: 3`);
  console.log(`   - Widgets: 4`);
  console.log(`   - Dashboards: 1`);
  console.log(`   - Conversations: 1`);
  console.log(`   - Messages: 4`);

  console.log("\n🔐 Credentials:");
  console.log("   Test User (for frontend): test@qaseanalytics.com (id: test-user)");
  console.log("   Demo User: demo@qaseanalytics.com / demo123");
  console.log("\n⚠️  To connect Qase for testing:");
  console.log(`   curl -X POST http://localhost:3001/api/qase/connect \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "X-User-ID: test-user" \\`);
  console.log(`     -d '{"token":"YOUR_QASE_API_TOKEN"}'\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
