"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

// Create a minimal theme for now
const theme = createTheme({
  palette: { mode: "light" },
  shape: { borderRadius: 12 },
});

// Augment the cache type so we can read inserted styles without ts-expect-error
type EmotionCache = ReturnType<typeof createCache> & {
  inserted: Record<string, string>;
  sheet: { tags: string[] };
};

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = React.useState<EmotionCache>(() => {
    return createCache({ key: "mui", prepend: true }) as EmotionCache;
  });

  useServerInsertedHTML(() => {
    const names = Object.keys(cache.inserted);
    if (names.length === 0) return null;

    const css = names.map((n) => cache.inserted[n]).join(" ");
    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: css }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}