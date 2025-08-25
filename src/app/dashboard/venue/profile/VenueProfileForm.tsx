"use client";

import * as React from "react";
import { Stack, TextField, Button } from "@mui/material";

type Props = {
  initial: {
    name?: string;
    city?: string;
    address?: string;
    about?: string;
  };
  afterSaveHref?: string; // optional redirect after save
};

export default function VenueProfileForm({ initial, afterSaveHref = "/dashboard" }: Props) {
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = Object.fromEntries(fd.entries());
      const res = await fetch("/api/dashboard/venue/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = afterSaveHref;
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to save profile");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2} component="form" onSubmit={onSubmit}>
      <TextField name="name" label="Venue name" defaultValue={initial.name || ""} required />
      <TextField name="city" label="City" defaultValue={initial.city || ""} />
      <TextField name="address" label="Address" defaultValue={initial.address || ""} />
      <TextField name="about" label="About" defaultValue={initial.about || ""} multiline minRows={3} />
      <Button type="submit" variant="contained" disabled={submitting}>
        {submitting ? "Saving..." : "Save"}
      </Button>
    </Stack>
  );
}