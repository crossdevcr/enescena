"use client";

import * as React from "react";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";

export default function DeleteBlockButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const onDelete = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch(`/api/availability/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="small" color="error" onClick={onDelete} disabled={loading}>
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}