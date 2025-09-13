import "@testing-library/jest-dom";

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean;
}

// Silence MUI emotion SSR warnings during tests (optional)
globalThis.IS_REACT_ACT_ENVIRONMENT = true;