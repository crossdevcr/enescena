import React from 'react';
import { Box, Alert } from "@mui/material";
import PerformanceCard from "./PerformanceCard";

type Performance = {
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
};

type PerformancesListProps = {
  performances: Performance[];
  getPerformanceHref: (performance: Performance) => string;
};

export default function PerformancesList({
  performances,
  getPerformanceHref,
}: PerformancesListProps) {
  if (performances.length === 0) {
    return (
      <Alert severity="info">
        No performance invitations yet.
      </Alert>
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
      {performances.map((performance) => (
        <PerformanceCard
          key={performance.id}
          id={performance.id}
          status={performance.status}
          proposedFee={performance.proposedFee}
          agreedFee={performance.agreedFee}
          hours={performance.hours}
          notes={performance.notes}
          event={performance.event}
          href={getPerformanceHref(performance)}
        />
      ))}
    </Box>
  );
}