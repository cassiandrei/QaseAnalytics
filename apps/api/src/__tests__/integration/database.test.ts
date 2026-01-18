/**
 * Integration Tests - Database
 *
 * Testes de integração com o banco de dados PostgreSQL.
 * Estes testes requerem um banco de dados rodando (Docker).
 *
 * Executar: pnpm test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient, UserTier, ChartType, MessageRole } from "@prisma/client";

const prisma = new PrismaClient();

describe("Database Integration", () => {
  beforeAll(async () => {
    // Verificar conexão com o banco
    try {
      await prisma.$connect();
    } catch (error) {
      console.error("Failed to connect to database. Is Docker running?");
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpar dados de teste antes de cada teste
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.dashboardWidget.deleteMany();
    await prisma.dashboard.deleteMany();
    await prisma.widget.deleteMany();
    await prisma.session.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
  });

  describe("User Model", () => {
    it("should create a user with required fields", async () => {
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          name: "Test User",
          password: "hashed_password",
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.tier).toBe(UserTier.FREE); // default
      expect(user.dailyMessagesUsed).toBe(0); // default
      expect(user.qaseTokenValid).toBe(false); // default
    });

    it("should enforce unique email constraint", async () => {
      await prisma.user.create({
        data: {
          email: "unique@example.com",
          name: "User 1",
          password: "hash1",
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email: "unique@example.com",
            name: "User 2",
            password: "hash2",
          },
        })
      ).rejects.toThrow();
    });

    it("should update user tier", async () => {
      const user = await prisma.user.create({
        data: {
          email: "upgrade@example.com",
          name: "Upgrade User",
          password: "hash",
          tier: UserTier.FREE,
        },
      });

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { tier: UserTier.PRO },
      });

      expect(updated.tier).toBe(UserTier.PRO);
    });

    it("should delete user and cascade relations", async () => {
      const user = await prisma.user.create({
        data: {
          email: "cascade@example.com",
          name: "Cascade User",
          password: "hash",
        },
      });

      // Create related entities
      await prisma.widget.create({
        data: {
          name: "Test Widget",
          query: "test query",
          chartType: ChartType.LINE,
          chartConfig: {},
          userId: user.id,
        },
      });

      await prisma.dashboard.create({
        data: {
          name: "Test Dashboard",
          userId: user.id,
        },
      });

      // Delete user should cascade
      await prisma.user.delete({ where: { id: user.id } });

      // Verify cascade
      const widgets = await prisma.widget.findMany({
        where: { userId: user.id },
      });
      const dashboards = await prisma.dashboard.findMany({
        where: { userId: user.id },
      });

      expect(widgets).toHaveLength(0);
      expect(dashboards).toHaveLength(0);
    });
  });

  describe("Widget Model", () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: "widget-test@example.com",
          name: "Widget Test User",
          password: "hash",
        },
      });
      testUserId = user.id;
    });

    it("should create a widget with chart configuration", async () => {
      const widget = await prisma.widget.create({
        data: {
          name: "Pass Rate Chart",
          description: "Taxa de aprovação dos testes",
          query: "Qual a taxa de aprovação?",
          chartType: ChartType.LINE,
          chartConfig: {
            xAxisKey: "date",
            yAxisKey: "passRate",
            lineColor: "#10b981",
          },
          filters: { dateRange: "last_30_days" },
          refreshInterval: 15,
          userId: testUserId,
        },
      });

      expect(widget.id).toBeDefined();
      expect(widget.chartType).toBe(ChartType.LINE);
      expect(widget.chartConfig).toEqual({
        xAxisKey: "date",
        yAxisKey: "passRate",
        lineColor: "#10b981",
      });
      expect(widget.filters).toEqual({ dateRange: "last_30_days" });
    });

    it("should support all chart types", async () => {
      const chartTypes = [
        ChartType.LINE,
        ChartType.BAR,
        ChartType.PIE,
        ChartType.DONUT,
        ChartType.AREA,
        ChartType.HEATMAP,
        ChartType.TREEMAP,
        ChartType.TABLE,
        ChartType.METRIC,
      ];

      for (const chartType of chartTypes) {
        const widget = await prisma.widget.create({
          data: {
            name: `${chartType} Widget`,
            query: `Test ${chartType}`,
            chartType,
            chartConfig: {},
            userId: testUserId,
          },
        });
        expect(widget.chartType).toBe(chartType);
      }
    });
  });

  describe("Dashboard Model", () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: "dashboard-test@example.com",
          name: "Dashboard Test User",
          password: "hash",
        },
      });
      testUserId = user.id;
    });

    it("should create dashboard with layout", async () => {
      const layout = [
        { i: "w1", x: 0, y: 0, w: 6, h: 4 },
        { i: "w2", x: 6, y: 0, w: 6, h: 4 },
      ];

      const dashboard = await prisma.dashboard.create({
        data: {
          name: "QA Overview",
          description: "Main dashboard",
          layout,
          userId: testUserId,
        },
      });

      expect(dashboard.layout).toEqual(layout);
      expect(dashboard.isPublic).toBe(false); // default
    });

    it("should add widgets to dashboard (many-to-many)", async () => {
      // Create dashboard
      const dashboard = await prisma.dashboard.create({
        data: {
          name: "Test Dashboard",
          userId: testUserId,
        },
      });

      // Create widgets
      const widget1 = await prisma.widget.create({
        data: {
          name: "Widget 1",
          query: "Query 1",
          chartType: ChartType.LINE,
          chartConfig: {},
          userId: testUserId,
        },
      });

      const widget2 = await prisma.widget.create({
        data: {
          name: "Widget 2",
          query: "Query 2",
          chartType: ChartType.BAR,
          chartConfig: {},
          userId: testUserId,
        },
      });

      // Add widgets to dashboard
      await prisma.dashboardWidget.createMany({
        data: [
          {
            dashboardId: dashboard.id,
            widgetId: widget1.id,
            position: { x: 0, y: 0, w: 6, h: 4 },
          },
          {
            dashboardId: dashboard.id,
            widgetId: widget2.id,
            position: { x: 6, y: 0, w: 6, h: 4 },
          },
        ],
      });

      // Verify relationship
      const dashboardWithWidgets = await prisma.dashboard.findUnique({
        where: { id: dashboard.id },
        include: {
          widgets: {
            include: { widget: true },
          },
        },
      });

      expect(dashboardWithWidgets?.widgets).toHaveLength(2);
    });

    it("should enforce unique widget per dashboard", async () => {
      const dashboard = await prisma.dashboard.create({
        data: { name: "Test", userId: testUserId },
      });

      const widget = await prisma.widget.create({
        data: {
          name: "Widget",
          query: "Query",
          chartType: ChartType.LINE,
          chartConfig: {},
          userId: testUserId,
        },
      });

      await prisma.dashboardWidget.create({
        data: { dashboardId: dashboard.id, widgetId: widget.id },
      });

      // Try to add same widget again
      await expect(
        prisma.dashboardWidget.create({
          data: { dashboardId: dashboard.id, widgetId: widget.id },
        })
      ).rejects.toThrow();
    });
  });

  describe("Conversation & Messages", () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: "chat-test@example.com",
          name: "Chat Test User",
          password: "hash",
        },
      });
      testUserId = user.id;
    });

    it("should create conversation with messages", async () => {
      const conversation = await prisma.conversation.create({
        data: {
          title: "Test Conversation",
          projectCode: "DEMO",
          userId: testUserId,
          messages: {
            create: [
              { role: MessageRole.USER, content: "Hello" },
              {
                role: MessageRole.ASSISTANT,
                content: "Hi there!",
                tokensUsed: 50,
              },
            ],
          },
        },
        include: { messages: true },
      });

      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[0]?.role).toBe(MessageRole.USER);
      expect(conversation.messages[1]?.tokensUsed).toBe(50);
    });

    it("should store chart data in message", async () => {
      const conversation = await prisma.conversation.create({
        data: { userId: testUserId },
      });

      const chartData = {
        type: "line",
        data: [
          { date: "2026-01-01", value: 85 },
          { date: "2026-01-02", value: 87 },
        ],
      };

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          content: "Here is the chart",
          chartData,
          chartType: ChartType.LINE,
        },
      });

      expect(message.chartData).toEqual(chartData);
      expect(message.chartType).toBe(ChartType.LINE);
    });

    it("should cascade delete messages when conversation is deleted", async () => {
      const conversation = await prisma.conversation.create({
        data: {
          userId: testUserId,
          messages: {
            create: [
              { role: MessageRole.USER, content: "Test 1" },
              { role: MessageRole.ASSISTANT, content: "Test 2" },
            ],
          },
        },
      });

      await prisma.conversation.delete({ where: { id: conversation.id } });

      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
      });

      expect(messages).toHaveLength(0);
    });
  });

  describe("Session Model", () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: "session-test@example.com",
          name: "Session Test User",
          password: "hash",
        },
      });
      testUserId = user.id;
    });

    it("should create session with expiration", async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await prisma.session.create({
        data: {
          userId: testUserId,
          token: "unique_token_123",
          expiresAt,
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
        },
      });

      expect(session.token).toBe("unique_token_123");
      expect(session.expiresAt).toEqual(expiresAt);
    });

    it("should enforce unique token", async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      await prisma.session.create({
        data: {
          userId: testUserId,
          token: "duplicate_token",
          expiresAt,
        },
      });

      await expect(
        prisma.session.create({
          data: {
            userId: testUserId,
            token: "duplicate_token",
            expiresAt,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("AuditLog Model", () => {
    it("should create audit log entry", async () => {
      const user = await prisma.user.create({
        data: {
          email: "audit-test@example.com",
          name: "Audit User",
          password: "hash",
        },
      });

      const log = await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "create_dashboard",
          resource: "dashboard:abc123",
          details: { dashboardName: "New Dashboard" },
          ipAddress: "192.168.1.1",
        },
      });

      expect(log.action).toBe("create_dashboard");
      expect(log.details).toEqual({ dashboardName: "New Dashboard" });
    });

    it("should allow anonymous audit logs", async () => {
      const log = await prisma.auditLog.create({
        data: {
          action: "failed_login",
          details: { email: "unknown@example.com" },
          ipAddress: "10.0.0.1",
        },
      });

      expect(log.userId).toBeNull();
      expect(log.action).toBe("failed_login");
    });
  });
});
