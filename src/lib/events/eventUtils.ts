/**
 * Event Management Utilities
 * Business logic for Event-centric architecture
 */

export interface EventCreationData {
  createdBy: string;
  title: string;
  eventDate: Date;
  endDate?: Date;
  description?: string;
  totalHours?: number;
  totalBudget?: number;
  isPublic?: boolean;
  
  // Venue options (either internal or external)
  venueId?: string;
  externalVenueName?: string;
  externalVenueAddress?: string;
  externalVenueCity?: string;
  externalVenueContact?: string;
}

export interface PerformanceData {
  eventId: string;
  artistId: string;
  proposedFee?: number;
  agreedFee?: number;
  hours?: number;
  notes?: string;
  artistNotes?: string;
  venueNotes?: string;
}

/**
 * Generate unique slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Validate event creation data
 */
export function validateEventCreation(data: EventCreationData): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  if (!data.title?.trim()) {
    errors.push("Title is required");
  }

  if (!data.eventDate) {
    errors.push("Event date is required");
  } else if (data.eventDate < new Date()) {
    errors.push("Event date must be in the future");
  }

  if (!data.createdBy) {
    errors.push("Creator ID is required");
  }

  // Venue validation - either internal venue ID or external venue details
  const hasInternalVenue = !!data.venueId;
  const hasExternalVenue = !!data.externalVenueName;
  
  if (!hasInternalVenue && !hasExternalVenue) {
    errors.push("Either venue ID or external venue name is required");
  }

  if (hasInternalVenue && hasExternalVenue) {
    errors.push("Cannot specify both internal venue and external venue");
  }

  if (data.totalHours && data.totalHours <= 0) {
    errors.push("Total hours must be positive");
  }

  if (data.totalBudget && data.totalBudget <= 0) {
    errors.push("Total budget must be positive");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate performance data
 */
export function validatePerformance(data: PerformanceData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.eventId) {
    errors.push("Event ID is required");
  }

  if (!data.artistId) {
    errors.push("Artist ID is required");
  }

  if (data.proposedFee && data.proposedFee < 0) {
    errors.push("Proposed fee cannot be negative");
  }

  if (data.agreedFee && data.agreedFee < 0) {
    errors.push("Agreed fee cannot be negative");
  }

  if (data.hours && data.hours <= 0) {
    errors.push("Performance hours must be positive");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Determine event status based on performances
 */
export function calculateEventStatus(performances: Array<{status: string}>): string {
  if (performances.length === 0) {
    return "DRAFT";
  }

  const statuses = performances.map(p => p.status);
  
  if (statuses.every(s => s === "CONFIRMED")) {
    return "CONFIRMED";
  }
  
  if (statuses.some(s => s === "CONFIRMED")) {
    return "PENDING";
  }
  
  if (statuses.every(s => s === "DECLINED")) {
    return "CANCELLED";
  }
  
  return "SEEKING_ARTISTS";
}

/**
 * Check if user can create event at venue
 */
export function canUserCreateEventAtVenue(
  userRole: string, 
  userId: string, 
  venueUserId?: string
): boolean {
  // Admins can create events anywhere
  if (userRole === "ADMIN") {
    return true;
  }
  
  // Venue owners can create events at their venue
  if (userRole === "VENUE" && userId === venueUserId) {
    return true;
  }
  
  // Artists can create events with external venues or request venue bookings
  if (userRole === "ARTIST") {
    return true; // Artists can always create events (may need venue approval)
  }
  
  return false;
}

/**
 * Check if artist can perform at event
 */
export function canArtistPerformAtEvent(
  artistId: string,
  eventCreatorId: string,
  eventStatus: string,
  existingPerformances: Array<{artistId: string}>
): { canPerform: boolean; reason?: string } {
  
  // Check if artist is already performing at this event
  const alreadyPerforming = existingPerformances.some(p => p.artistId === artistId);
  if (alreadyPerforming) {
    return { canPerform: false, reason: "Artist already performing at this event" };
  }
  
  // Check event status
  const acceptingArtists = ["DRAFT", "SEEKING_ARTISTS", "PENDING"].includes(eventStatus);
  if (!acceptingArtists) {
    return { canPerform: false, reason: "Event is not accepting new artists" };
  }
  
  return { canPerform: true };
}

/**
 * Calculate total event budget from performances
 */
export function calculateTotalEventCost(
  performances: Array<{agreedFee?: number; proposedFee?: number}>
): {confirmed: number; estimated: number} {
  let confirmed = 0;
  let estimated = 0;
  
  for (const perf of performances) {
    if (perf.agreedFee) {
      confirmed += perf.agreedFee;
      estimated += perf.agreedFee;
    } else if (perf.proposedFee) {
      estimated += perf.proposedFee;
    }
  }
  
  return { confirmed, estimated };
}

/**
 * Check for artist scheduling conflicts
 */
export function hasSchedulingConflict(
  eventDate: Date,
  eventHours: number,
  existingEvents: Array<{eventDate: Date; hours?: number}>
): boolean {
  const eventStart = eventDate;
  const eventEnd = new Date(eventDate.getTime() + (eventHours || 2) * 60 * 60 * 1000);
  
  for (const existing of existingEvents) {
    const existingStart = existing.eventDate;
    const existingEnd = new Date(existingStart.getTime() + (existing.hours || 2) * 60 * 60 * 1000);
    
    // Check for overlap
    if (eventStart < existingEnd && eventEnd > existingStart) {
      return true;
    }
  }
  
  return false;
}