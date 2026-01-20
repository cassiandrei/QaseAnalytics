/**
 * Vitest Setup File
 *
 * Configures global test utilities including jest-dom matchers.
 */

import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
