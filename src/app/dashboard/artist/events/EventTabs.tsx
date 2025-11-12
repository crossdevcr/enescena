"use client";

import { Box, Tabs, Tab } from "@mui/material";
import { useRouter } from "next/navigation";

interface EventTabsProps {
  activeTab: string;
  eventCount: number | string;
  performanceCount: number | string;
}

export default function EventTabs({ activeTab, eventCount, performanceCount }: EventTabsProps) {
  const router = useRouter();

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    router.push(`/dashboard/artist/events?tab=${newValue}`);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange}
        aria-label="event tabs"
      >
        <Tab 
          label={`My Events (${eventCount})`} 
          value="my-events" 
        />
        <Tab 
          label={`Performance Invitations (${performanceCount})`} 
          value="invitations" 
        />
      </Tabs>
    </Box>
  );
}