import React from 'react';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";

type PerformanceCardProps = {
  id: string;
  status: string;
  proposedFee?: number | null;
  agreedFee?: number | null;
  hours?: number | null;
  notes?: string | null;
  event: {
    id: string;
    title: string;
    eventDate: Date;
    venue?: { name: string } | null;
    externalVenueName?: string | null;
  };
  href: string;
};

function statusChip(status: string) {
  const map: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
    PENDING: "warning",
    CONFIRMED: "success",
    DECLINED: "error",
    CANCELLED: "default",
    COMPLETED: "info",
  };
  return <Chip label={status} color={map[status] ?? "default"} size="small" />;
}

function formatDateTimeCR(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Costa_Rica",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

export default function PerformanceCard({
  id: _id, // eslint-disable-line @typescript-eslint/no-unused-vars
  status,
  proposedFee,
  agreedFee,
  hours,
  notes,
  event,
  href,
}: PerformanceCardProps) {
  const venue = event.venue?.name || event.externalVenueName || "—";
  const fee = agreedFee || proposedFee;

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <Link 
                href={href}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {event.title}
              </Link>
            </Typography>
            {statusChip(status)}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            <strong>Venue:</strong> {venue}
          </Typography>

          <Typography variant="body2" color="text.secondary" noWrap>
            {formatDateTimeCR(event.eventDate)}
            {hours && ` • ${hours}h`}
          </Typography>

          {fee && (
            <Typography variant="body2" color="text.secondary">
              <strong>Fee:</strong> ₡{fee.toLocaleString()}
              {agreedFee && agreedFee !== proposedFee && (
                <span style={{ color: 'green' }}> (agreed)</span>
              )}
            </Typography>
          )}

          {notes && (
            <Typography variant="body2" color="text.secondary" sx={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              <strong>Notes:</strong> {notes}
            </Typography>
          )}
        </Stack>
      </CardContent>
      
      <CardContent sx={{ pt: 0 }}>
        <Button
          component={Link}
          href={href}
          variant="outlined"
          size="small"
          fullWidth
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}