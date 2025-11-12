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

type EventCardProps = {
  id: string;
  title: string;
  status: string;
  eventDate: Date;
  totalHours?: number | null;
  totalBudget?: number | null;
  venueName?: string | null;
  externalVenueName?: string | null;
  performanceCount?: number;
  confirmedPerformances?: number;
  userRole: 'ARTIST' | 'VENUE';
  href: string;
};

function statusChip(status: string) {
  const map: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
    DRAFT: "default",
    SEEKING_VENUE: "warning",
    PENDING_VENUE_APPROVAL: "warning", 
    SEEKING_ARTISTS: "info",
    CONFIRMED: "success",
    PUBLISHED: "success",
    CANCELLED: "error", 
    COMPLETED: "info",
    // Performance statuses
    PENDING: "warning",
    DECLINED: "error",
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

export default function EventCard({
  id,
  title,
  status,
  eventDate,
  totalHours,
  totalBudget,
  venueName,
  externalVenueName,
  performanceCount,
  confirmedPerformances,
  userRole,
  href,
}: EventCardProps) {
  const venue = venueName || externalVenueName || (userRole === 'ARTIST' ? "Seeking venue" : "—");

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
                {title}
              </Link>
            </Typography>
            {statusChip(status)}
          </Stack>

          <Typography variant="body2" color="text.secondary" noWrap>
            {formatDateTimeCR(eventDate)}
            {totalHours && ` • ${totalHours}h`}
          </Typography>

          {userRole === 'ARTIST' && (
            <Typography variant="body2" color="text.secondary">
              <strong>Venue:</strong> {venue}
            </Typography>
          )}

          {performanceCount !== undefined && (
            <Typography variant="body2" color="text.secondary">
              <strong>Artists:</strong> {performanceCount}
              {confirmedPerformances !== undefined && confirmedPerformances > 0 && (
                <span> ({confirmedPerformances} confirmed)</span>
              )}
            </Typography>
          )}

          {totalBudget && (
            <Typography variant="body2" color="text.secondary">
              <strong>Budget:</strong> ₡{totalBudget.toLocaleString()}
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
          {userRole === 'VENUE' ? 'Manage Event' : 'View Details'}
        </Button>
      </CardContent>
    </Card>
  );
}