import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/stores/authStore';

// Query Keys - centralized for consistency
export const queryKeys = {
  // Auth
  currentUser: ['currentUser'] as const,
  
  // Events
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  venueEvents: (venueId: string) => ['events', 'venue', venueId] as const,
  
  // Performances (replaces bookings)
  performances: ['performances'] as const,
  performance: (id: string) => ['performances', id] as const,
  venuePerformances: (venueId: string) => ['performances', 'venue', venueId] as const,
  artistPerformances: (artistId: string) => ['performances', 'artist', artistId] as const,
  
  // Artists
  artists: ['artists'] as const,
  artist: (id: string) => ['artists', id] as const,
  
  // Venues
  venues: ['venues'] as const,
  venue: (id: string) => ['venues', id] as const,
} as const;

// Auth Queries
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async (): Promise<User> => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      
      return response.json();
    },
    // Don't retry auth failures
    retry: false,
    // Keep trying in background
    refetchOnWindowFocus: true,
  });
}

// Event Queries
export function useEvents(filters?: { status?: string; venueId?: string }) {
  const queryKey = filters?.venueId 
    ? queryKeys.venueEvents(filters.venueId)
    : queryKeys.events;
    
  return useQuery({
    queryKey: [...queryKey, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.venueId) params.set('venueId', filters.venueId);
      
      const response = await fetch(`/api/events?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json();
    },
    enabled: !!id,
  });
}

// Performance Queries (replaces booking queries)
export function usePerformances(filters?: { status?: string; venueId?: string; artistId?: string }) {
  let queryKey: readonly string[];
  
  if (filters?.venueId) {
    queryKey = queryKeys.venuePerformances(filters.venueId);
  } else if (filters?.artistId) {
    queryKey = queryKeys.artistPerformances(filters.artistId);
  } else {
    queryKey = queryKeys.performances;
  }
  
  return useQuery({
    queryKey: [...queryKey, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.venueId) params.set('venueId', filters.venueId);
      if (filters?.artistId) params.set('artistId', filters.artistId);
      
      const response = await fetch(`/api/performances?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch performances');
      return response.json();
    },
  });
}

// Mutation Hooks
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) throw new Error('Failed to create event');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch events
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
  });
}

export function useRespondToPerformanceInvitation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ performanceId, action }: { performanceId: string; action: 'accept' | 'decline' }) => {
      const response = await fetch(`/api/performances/${performanceId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) throw new Error('Failed to respond to performance invitation');
      return response.json();
    },
    onSuccess: (_, { performanceId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.performances });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance(performanceId) });
    },
  });
}

export function useRequestEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventData: {
      title: string;
      description: string;
      eventDate: string;
      budget?: number;
      venueSlug: string;
    }) => {
      const response = await fetch('/api/events/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) throw new Error('Failed to request event');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate events queries
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
  });
}

export function useRespondToEventRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, action, reason }: { eventId: string; action: 'approve' | 'decline'; reason?: string }) => {
      const response = await fetch(`/api/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
      });
      
      if (!response.ok) throw new Error('Failed to respond to event request');
      return response.json();
    },
    onSuccess: (_, { eventId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
    },
  });
}