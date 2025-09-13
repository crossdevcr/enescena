// vitest.setup.ts
import "@testing-library/jest-dom";
import React from "react";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

// Silence MUI emotion SSR warnings during tests (optional)
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ✅ Make React available globally for any classic JSX transforms during tests
;(globalThis as any).React = React;