"use client";

import * as React from "react";
import { Alert, Button, Stack, TextField } from "@mui/material";
import { useRouter } from "next/navigation";

export default function AddBlackoutForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const start = String(fd.get("start") || "");
      const end = String(fd.get("end") || "");
      const reason = String(fd.get("reason") || "");

      if (!start || !end) {
        setError("Please provide both start and end.");
        return;
      }
      const s = new Date(start), eEnd = new Date(end);
      if (Number.isNaN(s.getTime()) || Number.isNaN(eEnd.getTime())) {
        setError("Invalid date/time.");
        return;
      }
      if (eEnd <= s) {
        setError("End must be after start.");
        return;
      }

      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, reason }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Failed to add blackout.");
        return;
      }

      formRef.current?.reset();
      router.refresh(); // re-fetch server data
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
        {error && <Alert severity="error" sx={{ width: "100%" }}>{error}</Alert>}
        <TextField name="start" label="Start" type="datetime-local" InputLabelProps={{ shrink: true }} required />
        <TextField name="end" label="End" type="datetime-local" InputLabelProps={{ shrink: true }} required />
        <TextField name="reason" label="Reason (optional)" />
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? "Adding..." : "Add blackout"}
        </Button>
      </Stack>
    </form>
  );
}