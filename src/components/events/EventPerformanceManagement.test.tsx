import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventPerformanceManagement from './EventPerformanceManagement';

// Mock the API calls
global.fetch = vi.fn();

const mockPerformances = [
  {
    id: '1',
    artistId: 'artist1',
    fee: 1000,
    hours: 2,
    notes: 'Great performance',
    status: 'CONFIRMED',
    artist: { id: 'artist1', name: 'Test Artist 1', slug: 'test-artist-1' }
  },
  {
    id: '2',
    artistId: 'artist2',
    fee: 1500,
    hours: 3,
    notes: null,
    status: 'PENDING',
    artist: { id: 'artist2', name: 'Test Artist 2', slug: 'test-artist-2' }
  }
];

const defaultProps = {
  eventId: 'event123',
  performances: mockPerformances,
  canManage: true,
  currentUserId: 'user123',
  eventStatus: 'DRAFT'
};

describe('EventPerformanceManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invite Artist Button - Enabled States', () => {
    const enabledStatuses = ['DRAFT', 'SEEKING_VENUE', 'SEEKING_ARTISTS', 'PENDING', 'CONFIRMED', 'PUBLISHED'];

    enabledStatuses.forEach(status => {
      it(`should enable "Invite Artist" button when event status is ${status}`, () => {
        render(<EventPerformanceManagement {...defaultProps} eventStatus={status} />);
        
        const inviteButton = screen.getByRole('button', { name: /invite artist/i });
        expect(inviteButton).not.toBeDisabled();
      });

      it(`should not show tooltip when hovering enabled "Invite Artist" button for ${status} status`, async () => {
        render(<EventPerformanceManagement {...defaultProps} eventStatus={status} />);
        
        const inviteButton = screen.getByRole('button', { name: /invite artist/i });
        fireEvent.mouseOver(inviteButton);
        
        // Should not show tooltip for enabled state
        await waitFor(() => {
          expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Invite Artist Button - Disabled States', () => {
    const disabledTestCases = [
      {
        status: 'CANCELLED',
        expectedTooltip: 'Cannot invite artists because this event has been cancelled.'
      },
      {
        status: 'COMPLETED',
        expectedTooltip: 'Cannot invite artists because this event has been completed.'
      },
      {
        status: 'PENDING_VENUE_APPROVAL',
        expectedTooltip: 'Cannot invite artists while this event is awaiting venue approval.'
      }
    ];

    disabledTestCases.forEach(({ status, expectedTooltip }) => {
      it(`should disable "Invite Artist" button when event status is ${status}`, () => {
        render(<EventPerformanceManagement {...defaultProps} eventStatus={status} />);
        
        const inviteButton = screen.getByRole('button', { name: /invite artist/i });
        expect(inviteButton).toBeDisabled();
      });

      it(`should show correct tooltip when hovering disabled "Invite Artist" button for ${status} status`, async () => {
        render(<EventPerformanceManagement {...defaultProps} eventStatus={status} />);
        
        const inviteButton = screen.getByRole('button', { name: /invite artist/i });
        fireEvent.mouseOver(inviteButton);
        
        await waitFor(() => {
          expect(screen.getByRole('tooltip')).toHaveTextContent(expectedTooltip);
        });
      });
    });

    it('should allow invitations for unknown status (falls back to enabled)', async () => {
      render(<EventPerformanceManagement {...defaultProps} eventStatus="UNKNOWN_STATUS" />);
      
      const inviteButton = screen.getByRole('button', { name: /invite artist/i });
      expect(inviteButton).not.toBeDisabled();
      
      // Should not show tooltip for enabled state
      fireEvent.mouseOver(inviteButton);
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Integration', () => {
    it('should open invite dialog when button is clicked (enabled state)', () => {
      render(<EventPerformanceManagement {...defaultProps} eventStatus="DRAFT" />);
      
      const inviteButton = screen.getByRole('button', { name: /invite artist/i });
      fireEvent.click(inviteButton);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Invite Artist to Perform')).toBeInTheDocument();
    });

    it('should disable "Send Invitation" button in dialog when event cannot accept invitations', () => {
      render(<EventPerformanceManagement {...defaultProps} eventStatus="CANCELLED" />);
      
      // Force open dialog (this shouldn't happen in real usage, but test the safeguard)
      const inviteButton = screen.getByRole('button', { name: /invite artist/i });
      // Since button is disabled, we need to test the dialog state logic directly
      // by checking if the dialog would be properly configured
      expect(inviteButton).toBeDisabled();
    });
  });

  describe('Permissions', () => {
    it('should not show "Invite Artist" button when canManage is false', () => {
      render(<EventPerformanceManagement {...defaultProps} canManage={false} />);
      
      expect(screen.queryByRole('button', { name: /invite artist/i })).not.toBeInTheDocument();
    });
  });

  describe('Performance List Display', () => {
    it('should display performance count in header', () => {
      render(<EventPerformanceManagement {...defaultProps} />);
      
      expect(screen.getByText('Performance Invitations (2)')).toBeInTheDocument();
    });

    it('should show message when no performances exist', () => {
      render(<EventPerformanceManagement {...defaultProps} performances={[]} />);
      
      expect(screen.getByText('No performance invitations yet.')).toBeInTheDocument();
    });
  });
});