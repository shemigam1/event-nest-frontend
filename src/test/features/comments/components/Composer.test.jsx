import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Composer from '@/features/comments/components/Composer';

function renderComposer(props = {}) {
    const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(true);
    return { onSubmit, ...render(<Composer onSubmit={onSubmit} {...props} /> ) };
}

describe('Composer', () => {
    test('renders textarea with given placeholder', () => {
        renderComposer({ placeholder: 'Share your thoughts…' });
        expect(screen.getByPlaceholderText('Share your thoughts…')).toBeInTheDocument();
    });

    test('submit button is disabled when textarea is empty', () => {
        renderComposer({ submitLabel: 'Post comment' });
        expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled();
    });

    test('submit button is enabled when text is typed', async () => {
        renderComposer({ submitLabel: 'Post comment' });
        await userEvent.type(screen.getByRole('textbox'), 'Hello!');
        expect(screen.getByRole('button', { name: /post comment/i })).toBeEnabled();
    });

    test('calls onSubmit with trimmed body on submit', async () => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        renderComposer({ onSubmit, submitLabel: 'Post' });
        await userEvent.type(screen.getByRole('textbox'), '  Great event!  ');
        await userEvent.click(screen.getByRole('button', { name: /^post$/i }));
        expect(onSubmit).toHaveBeenCalledWith('Great event!');
    });

    test('clears textarea after successful submit (onSubmit returns true)', async () => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        renderComposer({ onSubmit });
        const textarea = screen.getByRole('textbox');
        await userEvent.type(textarea, 'Hello');
        await userEvent.click(screen.getByRole('button', { name: /post/i }));
        expect(textarea).toHaveValue('');
    });

    test('does not clear textarea after failed submit (onSubmit returns false)', async () => {
        const onSubmit = vi.fn().mockResolvedValue(false);
        renderComposer({ onSubmit });
        const textarea = screen.getByRole('textbox');
        await userEvent.type(textarea, 'Hello');
        await userEvent.click(screen.getByRole('button', { name: /post/i }));
        expect(textarea).toHaveValue('Hello');
    });

    test('shows Cancel button only when onCancel prop is provided', () => {
        const { rerender } = renderComposer({ onCancel: undefined });
        expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();

        const onCancel = vi.fn();
        rerender(<Composer onSubmit={vi.fn()} onCancel={onCancel} />);
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('calls onCancel when Cancel is clicked', async () => {
        const onCancel = vi.fn();
        renderComposer({ onCancel });
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('displays error message when error prop is set', () => {
        renderComposer({ error: 'Could not post. Try again.' });
        expect(screen.getByRole('alert')).toHaveTextContent('Could not post. Try again.');
    });

    test('does not render alert when error is empty', () => {
        renderComposer({ error: '' });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('submit button is disabled when textarea is whitespace-only', async () => {
        renderComposer({ submitLabel: 'Post' });
        await userEvent.type(screen.getByRole('textbox'), '   ');
        expect(screen.getByRole('button', { name: /^post$/i })).toBeDisabled();
    });
});
