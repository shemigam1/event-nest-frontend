import { render, screen } from '@testing-library/react';
import CapacityBar from '@/components/ui/CapacityBar';

describe('CapacityBar', () => {
    test('renders label when provided', () => {
        render(<CapacityBar sold={50} total={100} label="Total capacity" />);
        expect(screen.getByText('Total capacity')).toBeInTheDocument();
    });

    test('displays sold and total counts', () => {
        render(<CapacityBar sold={423} total={650} label="Capacity" />);
        expect(screen.getByText('423')).toBeInTheDocument();
        expect(screen.getByText('/ 650')).toBeInTheDocument();
    });

    test('formats large numbers with locale separators', () => {
        render(<CapacityBar sold={1200} total={5000} label="Seats" />);
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByText('/ 5,000')).toBeInTheDocument();
    });

    test('does not render label when omitted', () => {
        const { container } = render(<CapacityBar sold={10} total={100} />);
        // Only the bar div should be rendered, no text
        expect(container.firstChild.children).toHaveLength(1);
    });

    test('does not show counts when showPct is false', () => {
        render(<CapacityBar sold={50} total={100} label="Cap" showPct={false} />);
        expect(screen.queryByText('50')).not.toBeInTheDocument();
    });

    test('clamps bar width to 100% when sold exceeds total', () => {
        const { container } = render(<CapacityBar sold={110} total={100} label="Cap" />);
        const bar = container.querySelector('[style*="width"]');
        expect(bar.style.width).toBe('100%');
    });

    test('renders a zero-width bar when total is 0', () => {
        const { container } = render(<CapacityBar sold={0} total={0} label="Cap" />);
        const bar = container.querySelector('[style*="width"]');
        expect(bar.style.width).toBe('0%');
    });
});
