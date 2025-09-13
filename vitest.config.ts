import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
  },
  esbuild: {
    // Ensure TSX compiles using the automatic JSX runtime in tests
    // (so it doesn’t depend on a global React symbol).
    jsx: "automatic",
    jsxImportSource: "react",
  },
});