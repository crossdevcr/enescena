// src/components/common/StatusTabs.tsx
"use client";

import * as React from "react";
import { Tabs, Tab } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  statuses: string[];       // e.g. ["ALL","PENDING","ACCEPTED",...]
  basePath: string;         // e.g. "/dashboard/venue/performances"
  queryKey?: string;        // default: "status"
  omitQueryForFirst?: boolean; // default: true
};

export default function StatusTabs({
  statuses,
  basePath,
  queryKey = "status",
  omitQueryForFirst = true,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const currentFromUrl =
    (sp.get(queryKey)?.toUpperCase() as string | null) || statuses[0]; // defaults to first (e.g. "ALL")

  const value = Math.max(0, statuses.indexOf(currentFromUrl));

  function hrefFor(idx: number) {
    const s = statuses[idx] ?? statuses[0];
    if (omitQueryForFirst && idx === 0) return basePath;

    const next = new URLSearchParams(sp?.toString() || "");
    next.set(queryKey, s);
    return `${basePath}?${next.toString()}`;
  }

  return (
    <Tabs
      value={value}
      onChange={(_, idx: number) => router.push(hrefFor(idx))}
      aria-label="status filter tabs"
      sx={{ mb: 1 }}
    >
      {statuses.map((s) => (
        <Tab key={s} label={s} />
      ))}
    </Tabs>
  );
}