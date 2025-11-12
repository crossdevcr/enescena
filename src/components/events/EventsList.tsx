import React from 'react';
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import Link from "next/link";
import EventCard from "./EventCard";

type Event = {
  id: string;
  title: string;
  status: string;
  eventDate: Date;
  totalHours?: number | null;
  totalBudget?: number | null;
  venue?: { name: string; slug: string } | null;
  externalVenueName?: string | null;
  performances?: any[];
  _count?: { performances: number };
};

type EventsListProps = {
  events: Event[];
  userRole: 'ARTIST' | 'VENUE';
  createHref?: string;
  createLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  getEventHref: (event: Event) => string;
  onCreateClick?: () => void;
};

export default function EventsList({
  events,
  userRole,
  createHref,
  createLabel,
  emptyTitle,
  emptyDescription,
  getEventHref,
  onCreateClick,
}: EventsListProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {emptyTitle}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {emptyDescription}
          </Typography>
          <Button
            {...(onCreateClick 
              ? { onClick: onCreateClick }
              : { component: Link, href: createHref }
            )}
            variant="contained"
          >
            {createLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ 
      display: "grid",
      gridTemplateColumns: {
        xs: "1fr",
        md: "repeat(2, 1fr)",
        lg: "repeat(3, 1fr)"
      },
      gap: 3
    }}>
      {events.map((event) => {
        const confirmedPerformances = event.performances?.filter(p => p.status === 'CONFIRMED').length || 0;
        
        return (
          <EventCard
            key={event.id}
            id={event.id}
            title={event.title}
            status={event.status}
            eventDate={event.eventDate}
            totalHours={event.totalHours}
            totalBudget={event.totalBudget}
            venueName={event.venue?.name}
            externalVenueName={event.externalVenueName}
            performanceCount={event._count?.performances}
            confirmedPerformances={confirmedPerformances}
            userRole={userRole}
            href={getEventHref(event)}
          />
        );
      })}
    </Box>
  );
}