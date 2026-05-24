import { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ── Module mocks ────────────────────────────────────────────────────────
   We mock the Google Maps loader so the component takes its "real" path
   (PlaceAutocompleteElement web component) instead of the fallback input.
   The fake element exposes a `value` setter and dispatches matching
   `input` events, which is the only surface VenueAutocomplete actually
   binds to.
   ──────────────────────────────────────────────────────────────────── */
vi.mock('@/utils/googleMaps', () => {
    // The real ctor returns a custom element; in jsdom we can't extend
    // HTMLDivElement without registering it, so we return a plain <div>
    // with a `value` property tacked on. The component only ever calls
    // `style`, `addEventListener('input'|'gmp-select', ...)`, sets
    // `.value`, and `appendChild`s it — a real DOM node covers all of that.
    function PlaceAutocompleteElement() {
        const el = document.createElement('div');
        el.setAttribute('data-testid', 'fake-place-autocomplete');
        let _value = '';
        Object.defineProperty(el, 'value', {
            configurable: true,
            get: () => _value,
            set: (v) => { _value = v; },
        });
        return el;
    }

    const fakeGoogle = {
        maps: {
            places: { PlaceAutocompleteElement },
            Map: vi.fn(),
            Marker: vi.fn(),
        },
    };
    return {
        hasGoogleMapsKey: () => true,
        loadGoogleMaps: () => Promise.resolve(fakeGoogle),
    };
});

import VenueAutocomplete from '@/components/ui/VenueAutocomplete';

/* Mirror the real CreateEventPage wrapper: typing in the venue field
   spreads ...data and patches `venue`. If VenueAutocomplete's internal
   listener closes over a stale `onChange`/`data`, typing in venue here
   will reset `title` to its initial value — that's the bug we're pinning. */
function HostForm() {
    const [data, setData] = useState({ title: '', venue: '' });
    return (
        <>
            <label>
                Title
                <input
                    value={data.title}
                    onChange={(e) => setData({ ...data, title: e.target.value })}
                />
            </label>
            <VenueAutocomplete
                label="Venue"
                value={data.venue}
                onChange={(e) => setData({ ...data, venue: e.target.value })}
            />
            <div data-testid="snapshot">{JSON.stringify(data)}</div>
        </>
    );
}

/* Wait one microtask cycle so the loadGoogleMaps().then(...) inside the
   component resolves and the fake element gets appended into the slot. */
async function flushMount() {
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });
}

describe('VenueAutocomplete — stale-closure regression', () => {
    test('typing in venue does not wipe other parent state', async () => {
        const user = userEvent.setup();
        render(<HostForm />);
        await flushMount();

        // 1. User fills the title first.
        await user.type(screen.getByLabelText('Title'), 'My event');
        expect(screen.getByTestId('snapshot')).toHaveTextContent('"title":"My event"');

        // 2. Now simulate Google's <PlaceAutocompleteElement> dispatching an
        //    `input` event after the user types "s" — by directly mutating
        //    the fake element and firing the event the component listens for.
        const fakeAc = await screen.findByTestId('fake-place-autocomplete');

        await act(async () => {
            fakeAc.value = 's';
            fakeAc.dispatchEvent(new Event('input'));
        });

        // 3. Venue updates, AND title survives. Pre-fix, title would be wiped.
        const snap = JSON.parse(screen.getByTestId('snapshot').textContent);
        expect(snap.venue).toBe('s');
        expect(snap.title).toBe('My event');
    });
});
