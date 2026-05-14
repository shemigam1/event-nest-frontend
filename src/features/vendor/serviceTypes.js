/* Canonical list of vendor service types — the single source of truth for
   the dropdown on the verification profile + every "Apply as vendor" form.
   The values are stored verbatim on the backend (varchar(100), free-text),
   which means changing a label here would orphan existing rows. So when
   we render an existing serviceType that isn't in this list (legacy /
   free-text entries), we surface it as a transient extra option keyed by
   the stored value — see `withExisting` below. */
export const VENDOR_SERVICE_TYPES = [
    { value: 'Catering',      label: 'Catering' },
    { value: 'A/V & Sound',   label: 'A/V & Sound' },
    { value: 'Photography',   label: 'Photography' },
    { value: 'Videography',   label: 'Videography' },
    { value: 'Venues',        label: 'Venues' },
    { value: 'Security',      label: 'Security' },
    { value: 'Print & Swag',  label: 'Print & Swag' },
    { value: 'Decor',         label: 'Decor' },
    { value: 'Transport',     label: 'Transport' },
    { value: 'Entertainment', label: 'Entertainment' },
    { value: 'Other',         label: 'Other' },
];

const VALUE_SET = new Set(VENDOR_SERVICE_TYPES.map((t) => t.value));

/* Returns the canonical list with the caller's current value tacked on if
   it doesn't match any known option. Keeps legacy free-text serviceTypes
   editable without silently rewriting them. */
export function withExisting(existingValue) {
    if (!existingValue || VALUE_SET.has(existingValue)) {
        return VENDOR_SERVICE_TYPES;
    }
    return [
        { value: existingValue, label: `${existingValue} (current)` },
        ...VENDOR_SERVICE_TYPES,
    ];
}

export function isKnownServiceType(value) {
    return VALUE_SET.has(value);
}
