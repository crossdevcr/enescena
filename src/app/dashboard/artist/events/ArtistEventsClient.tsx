"use client";

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";

import EventTabs from "./EventTabs";
import EventsList from "@/components/events/EventsList";
import PerformancesList from "@/components/events/PerformancesList";
import CreateEventModal from "@/components/events/CreateEventModal";
import { Add as AddIcon } from "@mui/icons-material";

const PAGE_SIZE = 20;



type EventWithDetails = {
  id: string;
  title: string;
  status: string;
  eventDate: Date;
  totalBudget: number | null;
  createdAt: Date;
  venue: { name: string; slug: string } | null;
  externalVenueName: string | null;
  _count: { performances: number };
};

type PerformanceWithDetails = {
  id: string;
  agreedFee: number | null;
  proposedFee: number | null;
  hours: number | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  event: {
    id: string;
    title: string;
    eventDate: Date;
    venue: { name: string } | null;
    externalVenueName: string | null;
  };
};

interface ArtistEventsClientProps {
  initialEvents: EventWithDetails[];
  initialPerformances: PerformanceWithDetails[];
  activeTab: string;
}

export default function ArtistEventsClient({
  initialEvents,
  initialPerformances,
  activeTab,
}: ArtistEventsClientProps) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const eventPage = initialEvents.slice(0, PAGE_SIZE);
  const performancePage = initialPerformances.slice(0, PAGE_SIZE);

  const handleEventCreated = (eventId: string) => {
    // Navigate to the event management page
    router.push(`/dashboard/artist/events/manage/${eventId}`);
  };

  return (
    <>
      <Box sx={{ 
        minHeight: "100vh", 
        backgroundColor: "grey.50", 
        py: 4 
      }}>
        <Container sx={{ py: 6, maxWidth: 1200 }}>
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4" fontWeight={700}>
                My Events
              </Typography>
              <Button
                onClick={() => setCreateModalOpen(true)}
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
              >
                Create Event
              </Button>
            </Stack>

            {/* Navigation */}
            <Stack direction="row" spacing={1}>
              <Button component={Link} href="/dashboard" variant="outlined" size="small">
                ← Dashboard
              </Button>
              <Button component={Link} href="/dashboard/artist/availability" variant="outlined" size="small">
                Availability
              </Button>
            </Stack>

            {/* Tabs */}
            <EventTabs 
              activeTab={activeTab} 
              eventCount={activeTab === "my-events" ? eventPage.length : "—"}
              performanceCount={activeTab === "invitations" ? performancePage.length : "—"}
            />



            {/* Content */}
            {activeTab === "my-events" ? (
              <EventsList
                events={eventPage}
                userRole="ARTIST"
                createLabel="Create Your First Event"
                emptyTitle="No events yet"
                emptyDescription="Create your first event to start organizing performances."
                getEventHref={(event) => `/dashboard/artist/events/manage/${event.id}`}
                onCreateClick={() => setCreateModalOpen(true)}
              />
            ) : (
              <PerformancesList
                performances={performancePage}
                getPerformanceHref={(performance) => `/dashboard/artist/events/${performance.id}`}
              />
            )}
          </Stack>
        </Container>
      </Box>

      <CreateEventModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleEventCreated}
        userRole="ARTIST"
      />
    </>
  );
}