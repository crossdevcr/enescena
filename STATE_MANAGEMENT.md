# Modern State Management Architecture

This document outlines the new professional state management architecture implemented in the Enescena application.

## Architecture Overview

### 🏗️ **Technology Stack**
- **Zustand**: Global client-side state management (auth, UI preferences)
- **TanStack Query**: Server state management with caching, refetching, and optimistic updates
- **TypeScript**: Full type safety throughout the state layer

### 🎯 **Benefits**
- ✅ **Type Safety**: Full TypeScript support throughout
- ✅ **Performance**: Automatic caching and background refetching
- ✅ **Developer Experience**: React DevTools integration
- ✅ **Scalability**: Easily extensible for new features
- ✅ **Industry Standard**: Modern React patterns used in 2025

## Usage Examples

### Authentication State (Zustand)

```tsx
import { useAuthStore } from '@/stores/authStore';

function MyComponent() {
  const { user, isAuthenticated, isLoading, signOut, checkAuth } = useAuthStore();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.name}!</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

### Server Data Queries (TanStack Query)

```tsx
import { useEvents, useCreateEvent } from '@/hooks/useQueries';

function EventsPage() {
  // Fetch events with automatic caching
  const { data: events, isLoading, error } = useEvents({ status: 'PUBLISHED' });

  // Create event mutation
  const createEventMutation = useCreateEvent();

  const handleCreateEvent = (eventData) => {
    createEventMutation.mutate(eventData, {
      onSuccess: () => {
        // Automatically invalidates and refetches events list
        console.log('Event created successfully!');
      },
    });
  };

  if (isLoading) return <div>Loading events...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {events?.map(event => (
        <div key={event.id}>{event.title}</div>
      ))}
      <button 
        onClick={() => handleCreateEvent({ title: 'New Event' })}
        disabled={createEventMutation.isPending}
      >
        {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
      </button>
    </div>
  );
}
```

### Booking Management

```tsx
import { useBookings, useUpdateBookingStatus } from '@/hooks/useQueries';
import { useAuthStore } from '@/stores/authStore';

function BookingsPage() {
  const { user } = useAuthStore();
  
  // Fetch bookings for current venue
  const { data: bookings, isLoading } = useBookings({ 
    venueId: user?.venue?.id 
  });

  // Update booking status mutation
  const updateStatusMutation = useUpdateBookingStatus();

  const handleAcceptBooking = (bookingId: string) => {
    updateStatusMutation.mutate(
      { bookingId, status: 'ACCEPTED' },
      {
        onSuccess: () => {
          // Automatically updates the bookings list
          console.log('Booking accepted!');
        },
      }
    );
  };

  return (
    <div>
      {bookings?.map(booking => (
        <div key={booking.id}>
          <h3>{booking.event?.title}</h3>
          <button onClick={() => handleAcceptBooking(booking.id)}>
            Accept
          </button>
        </div>
      ))}
    </div>
  );
}
```

## File Structure

```
src/
├── stores/
│   └── authStore.ts          # Zustand auth store
├── providers/
│   └── QueryProvider.tsx    # TanStack Query provider
├── hooks/
│   └── useQueries.ts        # Query hooks for server data
├── components/
│   └── AuthInitializer.tsx  # Auth initialization component
└── app/
    └── layout.tsx           # Root layout with providers
```

## Migration Guide

### From useAuth Hook to useAuthStore

**Before:**
```tsx
import { useAuth } from '@/hooks/useAuth';

const { user, isAuthenticated, signOut } = useAuth();
```

**After:**
```tsx
import { useAuthStore } from '@/stores/authStore';

const { user, isAuthenticated, signOut } = useAuthStore();
```

### From Direct API Calls to Query Hooks

**Before:**
```tsx
const [events, setEvents] = useState([]);

useEffect(() => {
  fetch('/api/events')
    .then(res => res.json())
    .then(setEvents);
}, []);
```

**After:**
```tsx
import { useEvents } from '@/hooks/useQueries';

const { data: events, isLoading, error } = useEvents();
```

## Best Practices

### 1. **Query Keys**
- Use the centralized `queryKeys` object for consistency
- Follow the hierarchical structure: `['resource', 'subResource', id]`

### 2. **Error Handling**
- TanStack Query provides built-in error handling and retry logic
- Use `error` property from query hooks for user-friendly messages

### 3. **Loading States**
- Use `isLoading` for initial loading
- Use `isFetching` for background refetching
- Use `isPending` for mutation loading states

### 4. **Cache Invalidation**
- Mutations automatically invalidate related queries
- Use `queryClient.invalidateQueries()` for manual invalidation

### 5. **Optimistic Updates**
- Use `onMutate` in mutations for immediate UI updates
- Implement rollback logic in `onError` handlers

## Development Tools

- **React Query DevTools**: Available in development mode (bottom-left corner)
- **Zustand DevTools**: Integrated with Redux DevTools extension
- **Type Safety**: Full TypeScript support with proper inference

## Performance Considerations

- **Automatic Deduplication**: Multiple components requesting same data share one request
- **Background Refetching**: Keeps data fresh without blocking UI
- **Cache Persistence**: Zustand auth store persists user data across sessions
- **Smart Retry Logic**: Different retry strategies for different error types