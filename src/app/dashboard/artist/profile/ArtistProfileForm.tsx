"use client";

import * as React from "react";
import { Stack, TextField, Button } from "@mui/material";

type Props = {
  initial: {
    name?: string;
    city?: string;
    genres?: string;     // comma-separated
    rate?: number | null;
    bio?: string | null;
  };
};

export default function ArtistProfileForm({ initial }: Props) {
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = Object.fromEntries(fd.entries());
      const res = await fetch("/api/dashboard/artist/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to save profile");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={2} component="form" onSubmit={onSubmit}>
      <TextField name="name" label="Artist name" defaultValue={initial.name || ""} required />
      <TextField name="city" label="City" defaultValue={initial.city || ""} />
      <TextField
        name="genres"
        label="Genres (comma‑separated)"
        defaultValue={initial.genres || ""}
      />
      <TextField
        name="rate"
        label="Rate (number)"
        type="number"
        defaultValue={initial.rate ?? ""}
      />
      <TextField name="bio" label="Bio" multiline minRows={3} defaultValue={initial.bio || ""} />
      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </Button>
    </Stack>
  );
}