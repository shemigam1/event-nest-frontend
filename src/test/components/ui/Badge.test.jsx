import { render, screen } from '@testing-library/react';
import { StatusBadge, RoleBadge } from '@/components/ui/Badge';

describe('StatusBadge', () => {
    test.each([
        ['DRAFT',            'Draft'],
        ['PENDING_APPROVAL', 'Pending approval'],
        ['PUBLISHED',        'Published'],
        ['CANCELLED',        'Cancelled'],
        ['VALID',            'Valid'],
        ['USED',             'Used'],
        ['REFUNDED',         'Refunded'],
    ])('renders correct label for status %s', (status, expectedLabel) => {
        render(<StatusBadge status={status} />);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    test('falls back to Draft label for unknown status', () => {
        render(<StatusBadge status="UNKNOWN_STATUS" />);
        expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    test('renders optional icon', () => {
        render(<StatusBadge status="VALID" icon={<svg data-testid="badge-icon" />} />);
        expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    });
});

describe('RoleBadge', () => {
    test.each([
        ['ATTENDEE',      'Attendee'],
        ['ORGANISER',     'Organiser'],
        ['CHECKIN_STAFF', 'Check-in'],
        ['ADMIN',         'Admin'],
    ])('renders correct label for role %s', (role, expectedLabel) => {
        render(<RoleBadge role={role} />);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    test('falls back to Attendee label for unknown role', () => {
        render(<RoleBadge role="UNKNOWN_ROLE" />);
        expect(screen.getByText('Attendee')).toBeInTheDocument();
    });
});
