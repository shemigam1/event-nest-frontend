import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '@/components/ui/Button';

describe('Button', () => {
    test('renders children', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    test('calls onClick when clicked', async () => {
        const handler = vi.fn();
        render(<Button onClick={handler}>Go</Button>);
        await userEvent.click(screen.getByRole('button'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('does not call onClick when disabled', async () => {
        const handler = vi.fn();
        render(<Button onClick={handler} disabled>Go</Button>);
        await userEvent.click(screen.getByRole('button'));
        expect(handler).not.toHaveBeenCalled();
    });

    test('renders leading icon slot', () => {
        render(<Button icon={<svg data-testid="icon" />}>Label</Button>);
        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    test('renders trailing iconRight slot', () => {
        render(<Button iconRight={<svg data-testid="icon-right" />}>Label</Button>);
        expect(screen.getByTestId('icon-right')).toBeInTheDocument();
    });

    test('is disabled when disabled prop is true', () => {
        render(<Button disabled>Submit</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
