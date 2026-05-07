import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import EventCard from '@/components/ui/EventCard';

const baseEvent = {
    id: 'evt_001',
    title: 'Merchant Summit 2026',
    venue: 'Eko Convention Centre, Lagos',
    dateLabel: 'Sat 16 May · 10:00 AM',
    status: 'PUBLISHED',
    tiers: [
        { id: 't1', name: 'VIP',     price: 75000, sold: 38,  total: 50  },
        { id: 't2', name: 'General', price: 25000, sold: 287, total: 400 },
    ],
};

describe('EventCard', () => {
    test('renders event title', () => {
        renderWithProviders(<EventCard event={baseEvent} />);
        expect(screen.getByText('Merchant Summit 2026')).toBeInTheDocument();
    });

    test('renders venue and date', () => {
        renderWithProviders(<EventCard event={baseEvent} />);
        expect(screen.getByText('Eko Convention Centre, Lagos')).toBeInTheDocument();
        expect(screen.getByText('Sat 16 May · 10:00 AM')).toBeInTheDocument();
    });

    test('shows lowest tier price in Naira', () => {
        renderWithProviders(<EventCard event={baseEvent} />);
        expect(screen.getByText(/₦25,000/)).toBeInTheDocument();
    });

    test('shows "Free" for events with a free tier', () => {
        const freeEvent = {
            ...baseEvent,
            tiers: [{ id: 't1', name: 'Standard', price: 0, sold: 10, total: 100 }],
        };
        renderWithProviders(<EventCard event={freeEvent} />);
        expect(screen.getByText('Free')).toBeInTheDocument();
    });

    test('shows sold/total count', () => {
        renderWithProviders(<EventCard event={baseEvent} />);
        // 38+287=325 sold, 50+400=450 total
        expect(screen.getByText('325/450 sold')).toBeInTheDocument();
    });

    test('shows "Selling fast" badge when over 75% sold', () => {
        const hotEvent = {
            ...baseEvent,
            tiers: [{ id: 't1', name: 'VIP', price: 10000, sold: 80, total: 100 }],
        };
        renderWithProviders(<EventCard event={hotEvent} />);
        expect(screen.getByText(/selling fast/i)).toBeInTheDocument();
    });

    test('does not show "Selling fast" when under 75% sold', () => {
        const coldEvent = {
            ...baseEvent,
            tiers: [{ id: 't1', name: 'General', price: 5000, sold: 20, total: 100 }],
        };
        renderWithProviders(<EventCard event={coldEvent} />);
        expect(screen.queryByText(/selling fast/i)).not.toBeInTheDocument();
    });

    test('calls onClick with the event object when clicked', async () => {
        const handler = vi.fn();
        renderWithProviders(<EventCard event={baseEvent} onClick={handler} />);
        await userEvent.click(screen.getByRole('button'));
        expect(handler).toHaveBeenCalledWith(baseEvent);
    });

    test('navigates to /events/:id when no onClick prop is provided', async () => {
        renderWithProviders(<EventCard event={baseEvent} />, { initialEntries: ['/'] });
        await userEvent.click(screen.getByRole('button'));
        expect(screen.getByTestId('location')).toHaveTextContent('/events/evt_001');
    });
});
