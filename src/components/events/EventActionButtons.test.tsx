import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouter } from 'next/navigation';
import EventActionButtons from './EventActionButtons';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn()
  }))
}));

// Mock fetch
global.fetch = vi.fn();

const mockEvent = {
  id: 'event123',
  title: 'Test Event',
  slug: 'test-event',
  description: 'A test event description',
  eventDate: new Date('2025-12-01T20:00:00Z'),
  endDate: new Date('2025-12-01T23:00:00Z'),
  totalHours: 3,
  totalBudget: 50000,
  status: 'DRAFT',
  performances: [
    {
      id: 'perf1',
      artistId: 'artist1',
      status: 'CONFIRMED',
      artist: { id: 'artist1', name: 'Test Artist', slug: 'test-artist' }
    }
  ]
};

const defaultProps = {
  event: mockEvent,
  canManage: true
};

describe('EventActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Edit Event Details Button - Enabled States', () => {
    const enabledStatuses = ['DRAFT', 'SEEKING_VENUE', 'SEEKING_ARTISTS', 'PENDING', 'CONFIRMED', 'PUBLISHED', 'PENDING_VENUE_APPROVAL'];

    enabledStatuses.forEach(status => {
      it(`should enable "Edit Event Details" button when event status is ${status}`, () => {
        const eventWithStatus = { ...mockEvent, status };
        render(<EventActionButtons {...defaultProps} event={eventWithStatus} />);
        
        const editButton = screen.getByRole('button', { name: /edit event details/i });
        expect(editButton).not.toBeDisabled();
      });

      it(`should not show tooltip when hovering enabled "Edit Event Details" button for ${status} status`, async () => {
        const eventWithStatus = { ...mockEvent, status };
        render(<EventActionButtons {...defaultProps} event={eventWithStatus} />);
        
        const editButton = screen.getByRole('button', { name: /edit event details/i });
        fireEvent.mouseOver(editButton);
        
        // Should not show tooltip for enabled state
        await waitFor(() => {
          expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Edit Event Details Button - Disabled States', () => {
    const disabledTestCases = [
      {
        status: 'CANCELLED',
        expectedTooltip: 'Cannot edit details of a cancelled event.'
      },
      {
        status: 'COMPLETED',
        expectedTooltip: 'Cannot edit details of a completed event.'
      }
    ];

    disabledTestCases.forEach(({ status, expectedTooltip }) => {
      it(`should disable "Edit Event Details" button when event status is ${status}`, () => {
        const eventWithStatus = { ...mockEvent, status };
        render(<EventActionButtons {...defaultProps} event={eventWithStatus} />);
        
        const editButton = screen.getByRole('button', { name: /edit event details/i });
        expect(editButton).toBeDisabled();
      });

      it(`should show correct tooltip when hovering disabled "Edit Event Details" button for ${status} status`, async () => {
        const eventWithStatus = { ...mockEvent, status };
        render(<EventActionButtons {...defaultProps} event={eventWithStatus} />);
        
        const editButton = screen.getByRole('button', { name: /edit event details/i });
        fireEvent.mouseOver(editButton);
        
        await waitFor(() => {
          expect(screen.getByRole('tooltip')).toHaveTextContent(expectedTooltip);
        });
      });
    });
  });

  describe('Loading State', () => {
    it('should disable edit button during loading state', async () => {
      // Mock a slow fetch response to simulate loading
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ event: { ...mockEvent, title: 'Updated Title' } })
          }), 100)
        )
      );
      
      render(<EventActionButtons {...defaultProps} />);
      
      // Click edit button to open dialog
      const editButton = screen.getByRole('button', { name: /edit event details/i });
      fireEvent.click(editButton);
      
      // Fill in required field and submit
      const titleField = screen.getByLabelText(/title/i);
      fireEvent.change(titleField, { target: { value: 'Updated Title' } });
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);
      
      // During loading, the button should be disabled and wrapped in a tooltip
      await waitFor(() => {
        // The button is wrapped in a span with aria-label="Processing..." during loading
        const processingSpan = screen.getByLabelText('Processing...');
        expect(processingSpan).toBeInTheDocument();
        
        // Find the button specifically (not the dialog title)
        const allEditTexts = screen.getAllByText('Edit Event Details');
        const editButtonAfterSubmit = allEditTexts.find(el => el.tagName === 'BUTTON');
        expect(editButtonAfterSubmit).toBeDisabled();
      }, { timeout: 50 });
    });
  });

  describe('Cancel Event Button Visibility', () => {
    it('should show "Cancel Event" button when event is not cancelled', () => {
      render(<EventActionButtons {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /cancel event/i })).toBeInTheDocument();
    });

    it('should hide "Cancel Event" button when event is cancelled', () => {
      const cancelledEvent = { ...mockEvent, status: 'CANCELLED' };
      render(<EventActionButtons {...defaultProps} event={cancelledEvent} />);
      
      expect(screen.queryByRole('button', { name: /cancel event/i })).not.toBeInTheDocument();
    });
  });

  describe('Draft Mode Alert', () => {
    it('should show draft mode alert when event status is DRAFT', () => {
      const draftEvent = { ...mockEvent, status: 'DRAFT' };
      render(<EventActionButtons {...defaultProps} event={draftEvent} />);
      
      expect(screen.getByText(/this event is in draft mode/i)).toBeInTheDocument();
    });

    it('should not show draft mode alert when event status is not DRAFT', () => {
      const publishedEvent = { ...mockEvent, status: 'PUBLISHED' };
      render(<EventActionButtons {...defaultProps} event={publishedEvent} />);
      
      expect(screen.queryByText(/this event is in draft mode/i)).not.toBeInTheDocument();
    });
  });

  describe('Dialog Interactions', () => {
    it('should open edit dialog when edit button is clicked (enabled state)', () => {
      render(<EventActionButtons {...defaultProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit event details/i });
      fireEvent.click(editButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Edit Event Details' })).toBeInTheDocument();
    });

    it('should not open dialog when edit button is disabled and clicked', () => {
      const cancelledEvent = { ...mockEvent, status: 'CANCELLED' };
      render(<EventActionButtons {...defaultProps} event={cancelledEvent} />);
      
      const editButton = screen.getByRole('button', { name: /edit event details/i });
      fireEvent.click(editButton);
      
      // Dialog should not open for disabled button
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Status Options in Edit Dialog', () => {
    it('should include COMPLETED status option in edit dialog', () => {
      render(<EventActionButtons {...defaultProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit event details/i });
      fireEvent.click(editButton);
      
      // Check that COMPLETED is available as a status option
      const statusField = screen.getByLabelText(/status/i);
      fireEvent.mouseDown(statusField);
      
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should disable save button when title is empty', () => {
      render(<EventActionButtons {...defaultProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit event details/i });
      fireEvent.click(editButton);
      
      // Clear the title field
      const titleField = screen.getByLabelText(/title/i);
      fireEvent.change(titleField, { target: { value: '' } });
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });
  });
});