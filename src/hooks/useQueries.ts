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
  
  // Bookings
  bookings: ['bookings'] as const,
  booking: (id: string) => ['bookings', id] as const,
  venueBookings: (venueId: string) => ['bookings', 'venue', venueId] as const,
  artistBookings: (artistId: string) => ['bookings', 'artist', artistId] as const,
  
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

// Booking Queries
export function useBookings(filters?: { status?: string; venueId?: string; artistId?: string }) {
  let queryKey: readonly string[];
  
  if (filters?.venueId) {
    queryKey = queryKeys.venueBookings(filters.venueId);
  } else if (filters?.artistId) {
    queryKey = queryKeys.artistBookings(filters.artistId);
  } else {
    queryKey = queryKeys.bookings;
  }
  
  return useQuery({
    queryKey: [...queryKey, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.venueId) params.set('venueId', filters.venueId);
      if (filters?.artistId) params.set('artistId', filters.artistId);
      
      const response = await fetch(`/api/bookings?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch bookings');
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

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error('Failed to update booking status');
      return response.json();
    },
    onSuccess: (_, { bookingId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      queryClient.invalidateQueries({ queryKey: queryKeys.booking(bookingId) });
    },
  });
}