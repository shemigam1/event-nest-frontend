import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    useGetEventVendorApplicationsQuery,
    useAcceptVendorApplicationMutation,
    useRejectVendorApplicationMutation,
    useRateVendorMutation,
    useGetVendorsQuery,
} from '../vendorsApi';
import {
    useCreateVendorInviteMutation,
    useGetVendorInvitesForEventQuery,
} from '@/features/vendor/vendorInvitesApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';

const STATUS_STYLE = {
    PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending' },
    ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
    REJECTED: { bg: '#FBE9E9', fg: '#D62828', label: 'Rejected' },
};

const APP_FILTERS = [
    ['all', 'All'], ['PENDING', 'Pending'], ['ACCEPTED', 'Accepted'], ['REJECTED', 'Rejected'],
];

const TABS = [
    // Marketplace first — the most likely first action for a new event is to
    // browse known vendors. Invites second — if the organiser already has a
    // working relationship off-platform, they go straight to invite. Inbound
    // applications come last since they trickle in over time.
    { key: 'marketplace',  label: 'Browse marketplace' },
    { key: 'invites',      label: 'Invites' },
    { key: 'applications', label: 'Applications' },
];

function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function ngn(amount) {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—'
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Tab entry point ─────────────────────────────── */
export default function VendorsTab({ eventId }) {
    // Default to the leftmost tab — marketplace is now the primary entry point.
    const [activeTab, setActiveTab] = useState('marketplace');

    return (
        <div>
            {/* Sub-tabs */}
            <div style={{
                display: 'flex', gap: 0, marginBottom: 20,
                borderBottom: '2px solid var(--border)',
            }}>
                {TABS.map(({ key, label }) => {
                    const active = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '10px 18px', border: 0,
                                borderBottom: active ? '2px solid var(--mp-blue)' : '2px solid transparent',
                                background: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 600 : 500,
                                color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                marginBottom: -2,
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'applications' && <ApplicationsPane eventId={eventId} />}
            {activeTab === 'marketplace'  && <MarketplacePane eventId={eventId} />}
            {activeTab === 'invites'      && <InvitesPane eventId={eventId} />}
        </div>
    );
}

/* ─── Invites pane — direct-invite vendors you already work with ───────
   On submit we POST to /organiser/vendor-invites with eventId. The raw token
   comes back ONCE in the response — we surface it as a copyable invite link
   right away so the organiser can send it via whatever channel they use
   (email, WhatsApp, SMS). The link points at /vendor/invite/:token.
   ───────────────────────────────────────────────────────────────────── */
function InvitesPane({ eventId }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    // Tokens come back from the create call once — we stash them locally so
    // the organiser can copy the link before navigating away. Keyed by invite
    // id so re-inviting different emails doesn't overwrite earlier tokens.
    const [tokensById, setTokensById] = useState({});

    const invitesQuery = useGetVendorInvitesForEventQuery(eventId);
    const [createInvite, createState] = useCreateVendorInviteMutation();

    async function handleSend(e) {
        e.preventDefault();
        // Email is optional now — empty means "open invite, anyone with the
        // link can claim it". Only validate the format when something IS typed.
        const trimmed = email.trim().toLowerCase();
        if (trimmed && !/^\S+@\S+\.\S+$/.test(trimmed)) {
            setError('Enter a valid email address (or leave blank for an open link)');
            return;
        }
        setError('');
        try {
            const result = await createInvite({
                targetEmail: trimmed || undefined,
                eventId,
            }).unwrap();
            // The server returns { id, ..., token } once — store the raw token.
            if (result?.id && result?.token) {
                setTokensById((prev) => ({ ...prev, [result.id]: result.token }));
            }
            setEmail('');
        } catch (err) {
            const apiErrs = Array.isArray(err?.data?.errors) ? err.data.errors.join('; ') : '';
            setError(apiErrs || err?.data?.message || 'Could not generate invite. Try again.');
        }
    }

    const invites = invitesQuery.data ?? [];

    return (
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)' }}>
                Already working with a vendor off-platform? Generate an invite link and share it
                however you normally reach them — WhatsApp, X, SMS, email. They&apos;ll land
                sandboxed on this event only; once they verify their account, they become a
                full marketplace vendor.
            </p>

            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            type="email"
                            placeholder="vendor@example.com (optional)"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                            icon={<Icons.mail size={16} />}
                            error={error}
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={createState.isLoading}
                    >
                        {createState.isLoading
                            ? 'Generating…'
                            : email.trim() ? 'Send invite' : 'Generate link'}
                    </Button>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
                    Leave the email blank to generate an open link you can share via any channel —
                    the recipient supplies their own email when they accept. Add an email to lock
                    the invite to that specific account.
                </p>
            </form>

            {/* Invites list */}
            <div>
                <div style={{
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
                    color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10,
                }}>
                    Invitations sent
                </div>

                {invitesQuery.isLoading ? (
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading…</div>
                ) : invites.length === 0 ? (
                    <div style={{
                        padding: 24, fontSize: 13, color: 'var(--text-3)',
                        background: 'var(--surface-subtle)',
                        border: '1px dashed var(--border)', borderRadius: 12,
                    }}>
                        No invites yet. Send your first one above.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {invites.map((inv) => (
                            <InviteRow
                                key={inv.id}
                                invite={inv}
                                // Show the just-issued link if we have it cached;
                                // it's never echoed by the listing endpoint.
                                rawToken={tokensById[inv.id]}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function InviteRow({ invite, rawToken }) {
    const link = rawToken
        ? `${window.location.origin}/vendor/invite/${rawToken}`
        : null;
    const tone = {
        PENDING:  { bg: '#FEF4E2', fg: '#B8770A', label: 'Pending' },
        ACCEPTED: { bg: '#E6F4EA', fg: '#0F9D58', label: 'Accepted' },
        EXPIRED:  { bg: 'var(--surface-subtle)', fg: 'var(--text-3)', label: 'Expired' },
        REVOKED:  { bg: 'var(--surface-subtle)', fg: 'var(--text-3)', label: 'Revoked' },
    }[invite.status] ?? { bg: 'var(--surface-subtle)', fg: 'var(--text-3)', label: invite.status };

    const [copied, setCopied] = useState(false);
    function handleCopy() {
        if (!link) return;
        navigator.clipboard?.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div style={{
            background: 'var(--surface-elevated, white)',
            border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                    width: 32, height: 32, borderRadius: 99,
                    background: 'var(--surface-subtle)', color: 'var(--text-3)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                    <Icons.mail size={14} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {invite.targetEmail || 'Open invite link'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {!invite.targetEmail && 'Anyone with the link · '}
                        Sent {fmtDate(invite.createdAt)}
                        {invite.expiresAt && ` · expires ${fmtDate(invite.expiresAt)}`}
                    </div>
                </div>
                <span style={{
                    padding: '3px 10px', borderRadius: 99,
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                    background: tone.bg, color: tone.fg, textTransform: 'uppercase',
                    flexShrink: 0,
                }}>
                    {tone.label}
                </span>
            </div>

            {link && (
                <>
                    <div style={{
                        display: 'flex', gap: 6, alignItems: 'center',
                        padding: '8px 10px',
                        background: 'var(--mp-blue-50, #EAF1FE)',
                        borderRadius: 8,
                    }}>
                        <code style={{
                            flex: 1, fontSize: 12, color: 'var(--mp-blue)',
                            wordBreak: 'break-all',
                            fontFamily: 'ui-monospace, monospace',
                        }}>
                            {link}
                        </code>
                        <Button variant="secondary" size="sm" onClick={handleCopy}>
                            {copied ? 'Copied!' : 'Copy link'}
                        </Button>
                    </div>
                    <ShareRow
                        link={link}
                        eventTitle={invite.eventTitle}
                        targetEmail={invite.targetEmail}
                    />
                </>
            )}
            {!link && invite.status === 'PENDING' && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
                    Invite link was shown when this invite was created. For security, the
                    raw link isn&apos;t re-displayed. Send a new invite if you need to share it again.
                </p>
            )}
        </div>
    );
}

/* ─── Share row — quick-share buttons for a freshly-issued invite ──────
   Pre-composes the right URL for each channel (WhatsApp, X, Email, SMS) so
   the organiser can fire the invite off through whichever channel they
   normally use to reach this vendor. The native Web Share API picker is
   surfaced on devices that support it (mobile mostly) under "More".
   ─────────────────────────────────────────────────────────────────────── */
function ShareRow({ link, eventTitle, targetEmail }) {
    const eventLabel = eventTitle || 'my event';
    const message = `Hi! I'd like to bring you on as a vendor for ${eventLabel} via EventNest. Accept your invite here: ${link}`;
    const shortMessage = `EventNest vendor invite for ${eventLabel}: ${link}`;
    const subject = `Vendor invite — ${eventLabel}`;

    const targets = [
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            href: `https://wa.me/?text=${encodeURIComponent(message)}`,
            color: '#25D366',
            icon: <WhatsAppGlyph />,
        },
        {
            key: 'email',
            label: 'Email',
            // Pre-fill the invitee's address when we have it; the organiser
            // can still change it before sending.
            href: `mailto:${encodeURIComponent(targetEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
            color: 'var(--mp-blue)',
            icon: <Icons.mail size={13} />,
        },
        {
            key: 'x',
            label: 'X',
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortMessage)}`,
            color: 'var(--text-1)',
            icon: <XGlyph />,
        },
        {
            key: 'sms',
            label: 'SMS',
            href: `sms:?&body=${encodeURIComponent(message)}`,
            color: 'var(--text-2)',
            icon: <Icons.message size={13} />,
        },
    ];

    const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    async function handleNativeShare() {
        try {
            await navigator.share({ title: subject, text: message, url: link });
        } catch {
            // user cancelled or the browser refused — silent
        }
    }

    const btn = (color) => ({
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 600,
        color, background: 'var(--surface-elevated, white)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '5px 10px',
        cursor: 'pointer', fontFamily: 'inherit',
        textDecoration: 'none',
        transition: 'background 0.15s, border-color 0.15s',
    });

    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            alignItems: 'center',
        }}>
            <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                color: 'var(--text-3)', textTransform: 'uppercase',
                marginRight: 4,
            }}>
                Share via
            </span>
            {targets.map((t) => (
                <a
                    key={t.key}
                    href={t.href}
                    target={t.key === 'email' || t.key === 'sms' ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    aria-label={`Share via ${t.label}`}
                    style={btn(t.color)}
                >
                    {t.icon}{t.label}
                </a>
            ))}
            {hasNativeShare && (
                <button
                    type="button"
                    onClick={handleNativeShare}
                    aria-label="Open device share sheet"
                    style={btn('var(--text-2)')}
                >
                    <Icons.send size={13} />More…
                </button>
            )}
        </div>
    );
}

function WhatsAppGlyph() {
    // Minimal monochrome glyph — picks up `color: currentColor` from the
    // parent button so the fill matches the button's text colour.
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="currentColor"
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.99.58 3.86 1.59 5.45L2 22l4.78-1.25a9.84 9.84 0 0 0 5.26 1.5h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.13-2.9-7-1.87-1.88-4.36-2.92-7.02-2.92zm5.78 14.07c-.24.69-1.4 1.32-1.95 1.39-.49.07-1.11.1-1.79-.11-.41-.13-.95-.31-1.63-.6-2.86-1.23-4.74-4.12-4.88-4.3-.14-.18-1.17-1.55-1.17-2.96 0-1.4.74-2.09 1-2.37.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2.01.9 2.15.07.14.12.31.02.49-.09.18-.14.29-.27.45-.14.16-.29.36-.41.49-.14.14-.28.29-.12.57.16.27.71 1.17 1.52 1.9 1.04.93 1.92 1.21 2.19 1.35.27.14.43.12.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.24.09 1.55.73 1.81.86.27.14.44.2.51.32.07.12.07.71-.17 1.4z"
            />
        </svg>
    );
}

function XGlyph() {
    return (
        <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="currentColor"
                d="M18.244 2H21.5l-7.5 8.572L23 22h-6.875l-5.39-7.04L4.5 22H1.244l8.018-9.165L1 2h7.044l4.87 6.435L18.244 2zm-2.41 18h1.91L6.273 4h-2.05l11.61 16z"
            />
        </svg>
    );
}

/* ─── Applications pane ───────────────────────────── */
function ApplicationsPane({ eventId }) {
    const navigate = useNavigate();
    const apps = useGetEventVendorApplicationsQuery({ eventId });
    const [accept, acceptState] = useAcceptVendorApplicationMutation();
    const [reject, rejectState] = useRejectVendorApplicationMutation();
    const [rate, rateState]     = useRateVendorMutation();

    const [filter, setFilter]         = useState('all');
    const [actionError, setError]     = useState('');
    const [pendingReject, setPendingReject] = useState(null);
    const [pendingRate,   setPendingRate]   = useState(null);
    const [rateError,     setRateError]    = useState('');

    const list    = useMemo(() => apps.data || [], [apps.data]);
    const counts  = useMemo(() => {
        const c = { all: list.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
        for (const a of list) if (c[a.status] !== undefined) c[a.status] += 1;
        return c;
    }, [list]);
    const filtered = useMemo(() => (
        filter === 'all' ? list : list.filter((a) => a.status === filter)
    ), [list, filter]);

    async function handleAccept(a) {
        setError('');
        try { await accept({ eventId, applicationId: a.id }).unwrap(); }
        catch (err) { setError(err?.data?.message || 'Could not accept application.'); }
    }
    async function handleReject() {
        if (!pendingReject) return;
        setError('');
        try {
            await reject({ eventId, applicationId: pendingReject.id }).unwrap();
            setPendingReject(null);
        } catch (err) { setError(err?.data?.message || 'Could not reject application.'); }
    }
    async function handleRate({ score, comment }) {
        if (!pendingRate) return;
        setRateError('');
        try {
            await rate({ eventId, applicationId: pendingRate.id, score, comment }).unwrap();
            setPendingRate(null);
        } catch (err) { setRateError(err?.data?.message || 'Could not submit rating.'); }
    }

    if (apps.isLoading) return <Skeleton />;
    if (apps.isError) return (
        <ErrorCard message={apps.error?.data?.message || 'Could not load vendor applications.'} onRetry={apps.refetch} />
    );

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: 20,
        }}>
            <div style={{ minWidth: 0 }}>
                {/* Stat tiles removed — the filter chips below already surface
                    the same counts (All N · Pending N · Accepted N · Rejected N),
                    so the tiles were just duplicating information. */}

                <div style={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '14px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: 12, flexWrap: 'wrap',
                    }}>
                        <FilterBar filters={APP_FILTERS} counts={counts} active={filter} onChange={setFilter} />
                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            {filtered.length} application{filtered.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {actionError && (
                        <div role="alert" style={{
                            margin: '12px 20px 0', padding: '10px 12px',
                            background: 'var(--error-bg, #FBE9E9)', color: 'var(--error)',
                            borderRadius: 8, fontSize: 13,
                        }}>
                            {actionError}
                        </div>
                    )}

                    {counts.all === 0 ? (
                        <EmptyCard message="No vendor applications yet." sub="Once your event is live, vendors who want to work on it will submit applications here." />
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-3)', fontSize: 14 }}>
                            No applications with this status.
                        </div>
                    ) : (
                        filtered.map((a, i) => (
                            <ApplicationRow
                                key={a.id}
                                application={a}
                                isLast={i === filtered.length - 1}
                                onAccept={() => handleAccept(a)}
                                onReject={() => setPendingReject(a)}
                                onRate={() => setPendingRate(a)}
                                onViewProfile={() => navigate(`/vendors/${a.vendorProfileId}`)}
                                busy={
                                    (acceptState.isLoading && acceptState.originalArgs?.applicationId === a.id)
                                    || (rejectState.isLoading && pendingReject?.id === a.id)
                                }
                            />
                        ))
                    )}
                </div>
            </div>

            <aside style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                position: 'sticky', top: 24, height: 'fit-content',
            }}>
                <HowVendorsApplyCard />
            </aside>

            {pendingReject && (
                <ConfirmDialog
                    title="Reject application?"
                    body={<>The application from <strong>{pendingReject.businessName}</strong> for <strong>{pendingReject.vendorCategory}</strong> will be rejected.</>}
                    confirmLabel="Reject"
                    loading={rejectState.isLoading}
                    onConfirm={handleReject}
                    onDismiss={() => setPendingReject(null)}
                />
            )}
            {pendingRate && (
                <RateModal
                    application={pendingRate}
                    loading={rateState.isLoading}
                    error={rateError}
                    onSubmit={handleRate}
                    onDismiss={() => { setPendingRate(null); setRateError(''); }}
                />
            )}
        </div>
    );
}
/* ─── Marketplace pane ────────────────────────────── */
/* Marketplace browse view inside the organiser's Vendors tab. Sends
   the user to the public vendor profile page on click — no inquiry CTA,
   no separate chat thread (the inquiry endpoints don't exist on the
   backend). When a chat module lands we'll surface a "Message vendor"
   action here. */
function MarketplacePane() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');

    const CATS = [
        { key: 'all',       label: 'All',       keyword: null },
        { key: 'catering',  label: 'Catering',  keyword: 'cater' },
        { key: 'av',        label: 'AV',        keyword: 'av' },
        { key: 'photo',     label: 'Photo',     keyword: 'photo' },
        { key: 'venue',     label: 'Venue',     keyword: 'venue' },
        { key: 'security',  label: 'Security',  keyword: 'security' },
        { key: 'print',     label: 'Print',     keyword: 'print' },
        { key: 'decor',     label: 'Decor',     keyword: 'decor' },
        { key: 'transport', label: 'Transport', keyword: 'transport' },
    ];

    const keyword = CATS.find((c) => c.key === category)?.keyword || null;
    const { data: rawVendors = [], isLoading, isError, refetch } =
        useGetVendorsQuery({ serviceType: keyword });

    // Backend returns a paginated Page object; extract the content array defensively.
    // Backend doesn't support a name search — apply it client-side.
    const vendors = useMemo(() => {
        const items = Array.isArray(rawVendors) ? rawVendors : (rawVendors?.content ?? []);
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((v) => {
            const hay = `${v.businessName || ''} ${v.category || ''} ${v.bio || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [rawVendors, search]);

    function viewVendor(v) {
        navigate(`/vendors/${v.id}`);
    }

    return (
        <div>
            <div style={{ marginBottom: 14 }}>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name"
                    style={{
                        width: '100%', maxWidth: 360,
                        padding: '9px 12px', borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontFamily: 'inherit', fontSize: 14,
                        color: 'var(--text-1)', boxSizing: 'border-box',
                    }}
                />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {CATS.map(({ key, label }) => {
                    const active = category === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setCategory(key)}
                            style={{
                                padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                                border: active ? '2px solid var(--mp-blue)' : '1px solid var(--border)',
                                background: active ? '#EAF1FE' : 'white',
                                color: active ? 'var(--mp-blue)' : 'var(--text-2)',
                                fontWeight: active ? 600 : 500, fontSize: 12,
                                fontFamily: 'inherit',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {isLoading && <Skeleton />}
            {isError && <ErrorCard message="Could not load vendors." onRetry={refetch} />}

            {!isLoading && !isError && vendors.length === 0 && (
                <EmptyCard message="No vendors found." sub="Try a different category." />
            )}

            {!isLoading && !isError && vendors.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 14,
                }}>
                    {vendors.map((v) => (
                        <MiniVendorCard key={v.id} vendor={v} onView={() => viewVendor(v)} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MiniVendorCard({ vendor, onView }) {
    const name     = vendor.businessName || '';
    const verified = vendor.verifiedAt != null;
    const service  = vendor.category || '';
    const bio      = vendor.bio || '';
    const rating   = vendor.trustScore;
    const events   = vendor.completedContracts;

    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: 'var(--surface-subtle)', color: 'var(--text-2)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 700,
                }}>
                    {initials(name)}
                </div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
                            {name}
                        </span>
                        {verified && (
                            <Icons.shield size={12} style={{ color: 'var(--mp-blue)' }} title="Verified" />
                        )}
                    </div>
                    {service && <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{service}</div>}
                </div>
            </div>
            {bio && (
                <p style={{
                    margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                    {bio}
                </p>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {rating != null
                    ? <>★ <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{Number(rating).toFixed(1)}</span>{events != null && ` · ${events} events`}</>
                    : events != null
                        ? `${events} event${events !== 1 ? 's' : ''} completed`
                        : 'New vendor'
                }
            </div>
            <Button size="sm" variant="secondary" onClick={onView} style={{ marginTop: 'auto' }}>
                View profile
            </Button>
        </div>
    );
}

/* ─── Shared subcomponents ────────────────────────── */

function FilterBar({ filters, counts, active, onChange }) {
    return (
        <div style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'var(--surface-subtle)', borderRadius: 10,
            border: '1px solid var(--border)', flexWrap: 'wrap',
        }}>
            {filters.map(([k, l]) => {
                const isActive = active === k;
                const n = k === 'all' ? counts.all : counts[k];
                return (
                    <button
                        key={k}
                        onClick={() => onChange(k)}
                        style={{
                            background: isActive ? 'white' : 'transparent', border: 0,
                            padding: '6px 12px', borderRadius: 7,
                            fontSize: 13, fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--mp-blue)' : 'var(--text-2)',
                            boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                            cursor: 'pointer', fontFamily: 'inherit',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        {l}
                        <span className="mp-num" style={{ color: 'var(--text-3)' }}>{n}</span>
                    </button>
                );
            })}
        </div>
    );
}

function ApplicationRow({ application, isLast, onAccept, onReject, onRate, onViewProfile, busy }) {
    const style = STATUS_STYLE[application.status] || STATUS_STYLE.PENDING;
    const isPending  = application.status === 'PENDING';
    const isAccepted = application.status === 'ACCEPTED';
    // Show "Rate vendor" for accepted applications — backend enforces the event-ended rule
    const canRate    = isAccepted;
    const trust      = application.trustScore != null ? Number(application.trustScore) : null;
    const completed  = application.completedContracts ?? 0;
    const total      = application.totalContracts ?? 0;

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '48px 1fr auto',
            gap: 16, alignItems: 'flex-start',
            padding: '18px 20px',
            borderBottom: isLast ? 0 : '1px solid var(--border)',
        }}>
            {/* Avatar — clickable shortcut to vendor profile */}
            <button
                onClick={onViewProfile}
                title="View vendor profile"
                style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: 'var(--surface-subtle)', color: 'var(--text-2)',
                    display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700,
                    border: 0, cursor: 'pointer', padding: 0, flexShrink: 0,
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#dde3ed'; e.currentTarget.style.color = 'var(--mp-blue)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
                {initials(application.businessName)}
            </button>

            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    {/* Business name — clickable */}
                    <button
                        onClick={onViewProfile}
                        style={{
                            background: 'none', border: 0, padding: 0,
                            fontWeight: 600, color: 'var(--text-1)',
                            cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--mp-blue)'; e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.textDecoration = 'none'; }}
                    >
                        {application.businessName}
                    </button>
                    <span style={{
                        fontSize: 11, padding: '2px 8px',
                        background: 'var(--surface-subtle)', borderRadius: 6,
                        color: 'var(--text-2)', fontWeight: 600,
                    }}>
                        {application.vendorCategory}
                    </span>
                    <span style={{
                        padding: '2px 9px', background: style.bg, color: style.fg,
                        fontSize: 11, fontWeight: 600, borderRadius: 99,
                    }}>
                        {style.label}
                    </span>
                </div>
                {application.coverNote && (
                    <p className="body-sm" style={{
                        margin: '0 0 8px', color: 'var(--text-2)',
                        whiteSpace: 'pre-wrap', lineHeight: 1.5,
                    }}>
                        {application.coverNote}
                    </p>
                )}
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                    {trust != null && (
                        <span className="mp-num" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icons.shield size={12} />
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{trust.toFixed(0)}</span>
                            <span>trust score</span>
                        </span>
                    )}
                    {total > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{completed}/{total}</span>
                            <span>contracts completed</span>
                        </span>
                    )}
                    <span>· Applied {fmtDate(application.appliedAt)}</span>
                    {application.vendorEmail && (
                        <span>· {application.vendorEmail}</span>
                    )}
                </div>
            </div>

            {/* Actions column — accept/reject/rate stacked above a persistent View profile link */}
            <div style={{
                display: 'flex', flexDirection: 'column',
                gap: 8, paddingTop: 4, alignItems: 'flex-end',
            }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {isPending ? (
                        <>
                            <Button size="sm" variant="primary" icon={<Icons.check size={13} />} onClick={onAccept} disabled={busy}>
                                Accept
                            </Button>
                            <Button size="sm" variant="secondary" icon={<Icons.x size={13} />} onClick={onReject} disabled={busy}>
                                Reject
                            </Button>
                        </>
                    ) : canRate ? (
                        <Button size="sm" variant="secondary" icon={<StarIcon size={13} />} onClick={onRate}>
                            Rate vendor
                        </Button>
                    ) : null}
                </div>
                {/* Always-visible profile link */}
                <button
                    onClick={onViewProfile}
                    style={{
                        background: 'none', border: 0, padding: 0,
                        color: 'var(--mp-blue)', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseOut={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                    View profile
                    <Icons.arrowR size={11} />
                </button>
            </div>
        </div>
    );
}

function HowVendorsApplyCard() {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 18,
        }}>
            <Icons.shield size={20} style={{ color: 'var(--mp-blue)' }} />
            <div className="mp-h4" style={{ marginTop: 10, color: 'var(--text-1)' }}>
                How vendors apply
            </div>
            <ol style={{
                margin: '10px 0 0', padding: 0, listStyle: 'none',
                color: 'var(--text-2)', fontSize: 13,
            }}>
                {[
                    'A vendor finds your event on the public page.',
                    'They submit a short pitch with service type and proposed price.',
                    'Their application lands here for you to accept or reject.',
                    'You can also browse the marketplace and reach out directly.',
                ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, padding: '6px 0' }}>
                        <span style={{
                            width: 22, height: 22, borderRadius: 99,
                            background: '#EAF1FE', color: 'var(--mp-blue)',
                            fontSize: 11, fontWeight: 700,
                            display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}>
                            {i + 1}
                        </span>
                        <span style={{ lineHeight: 1.5 }}>{t}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function EmptyCard({ message, sub }) {
    return (
        <div style={{ textAlign: 'center', padding: 50 }}>
            <div style={{
                width: 52, height: 52, borderRadius: 99,
                margin: '0 auto 14px', background: 'var(--surface-subtle)',
                display: 'grid', placeItems: 'center', color: 'var(--text-3)',
            }}>
                <Icons.inbox size={20} />
            </div>
            <div className="mp-h4" style={{ color: 'var(--text-1)', margin: 0 }}>{message}</div>
            {sub && <p className="body-sm" style={{ color: 'var(--text-2)', marginTop: 6 }}>{sub}</p>}
        </div>
    );
}

function ErrorCard({ message, onRetry }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                    Retry
                </Button>
            )}
        </div>
    );
}

function ConfirmDialog({ title, body, confirmLabel, loading, onConfirm, onDismiss }) {
    return (
        <div
            role="dialog"
            aria-label={title}
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 420, background: 'white',
                borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28,
            }}>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h2>
                <p className="body-sm" style={{ margin: '8px 0 24px', color: 'var(--text-2)' }}>{body}</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" size="md" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Working…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StarIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2l2.9 6.3L22 9.3l-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2 2 9.3l7.1-1L12 2z" />
        </svg>
    );
}

function RateModal({ application, loading, error, onSubmit, onDismiss }) {
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState('');

    return (
        <div
            role="dialog"
            aria-label="Rate vendor"
            onClick={onDismiss}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 440, background: 'white',
                borderRadius: 16, boxShadow: 'var(--shadow-modal)', padding: 28,
            }}>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>
                    Rate {application.applicantName}
                </h2>
                <p className="body-sm" style={{ margin: '6px 0 20px', color: 'var(--text-2)' }}>
                    How did the {application.serviceType} service go?
                </p>

                {/* Star picker */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setScore(n)}
                            aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                            style={{
                                width: 44, height: 44, borderRadius: 10,
                                border: `2px solid ${score >= n ? '#F59E0B' : 'var(--border)'}`,
                                background: score >= n ? '#FFFBEB' : 'white',
                                color: score >= n ? '#F59E0B' : 'var(--text-3)',
                                fontSize: 22, cursor: 'pointer',
                                display: 'grid', placeItems: 'center',
                                transition: 'border-color 0.1s, background 0.1s, color 0.1s',
                            }}
                        >
                            ★
                        </button>
                    ))}
                    {score > 0 && (
                        <span style={{
                            alignSelf: 'center', marginLeft: 8,
                            fontSize: 13, color: 'var(--text-2)', fontWeight: 500,
                        }}>
                            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][score]}
                        </span>
                    )}
                </div>

                {/* Comment */}
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Leave a comment (optional)"
                    rows={3}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px 12px', borderRadius: 8,
                        border: '1px solid var(--border)',
                        fontFamily: 'inherit', fontSize: 14, color: 'var(--text-1)',
                        resize: 'vertical', outline: 'none',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--mp-blue)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
                />

                {error && (
                    <div role="alert" style={{
                        marginTop: 12, padding: '10px 12px',
                        background: 'var(--error-bg, #FBE9E9)', color: 'var(--error)',
                        borderRadius: 8, fontSize: 13,
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <Button variant="ghost" size="md" onClick={onDismiss} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary" size="md"
                        onClick={() => onSubmit({ score, comment: comment.trim() || undefined })}
                        disabled={score === 0 || loading}
                    >
                        {loading ? 'Submitting…' : 'Submit rating'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Skeleton() {
    const tile = {
        height: 90, background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    const row = {
        height: 96, background: 'var(--surface-subtle)',
        borderBottom: '1px solid var(--border)',
        animation: 'mp-flash 1.6s ease-in-out infinite',
    };
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
                <div style={tile} />
                <div style={{ ...tile, opacity: 0.8 }} />
                <div style={{ ...tile, opacity: 0.6 }} />
                <div style={{ ...tile, opacity: 0.4 }} />
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ ...row, height: 50 }} />
                <div style={row} />
                <div style={{ ...row, opacity: 0.7 }} />
                <div style={{ ...row, opacity: 0.4, borderBottom: 0 }} />
            </div>
        </div>
    );
}
