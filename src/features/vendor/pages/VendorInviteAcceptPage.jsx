import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthEmail } from '@/features/auth/authSlice';
import {
    usePeekVendorInviteQuery,
    useCompleteVendorInviteMutation,
} from '../vendorInvitesApi';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

/* ────────────────────────────────────────────────────────────────────────────
   Invite-acceptance landing page.

   Routed at /vendor/invite/:token. The page first peeks at the invite to
   render the right context (inviter name, event title), then branches on
   auth state:

     · Signed in   → "Accept as <user>" button. Calls completeInvite, no signup.
     · Signed out  → Compact signup form. The targetEmail comes back from peek
                      and is locked (the invite is tied to that address). User
                      picks a password + name and completes in one shot.

   Server-side, event-scoped invites land the new vendor in SANDBOXED state +
   create a VENDOR EventMembership on the inviting event. The success screen
   nudges them straight to self-verify.
   ──────────────────────────────────────────────────────────────────────── */

const CATEGORIES = [
    'PHOTOGRAPHY', 'CATERING', 'MUSIC', 'DECOR', 'VENUE',
    'TRANSPORT', 'SECURITY', 'AUDIO_VISUAL', 'PRINTING', 'OTHER',
];

export default function VendorInviteAcceptPage() {
    const { token } = useParams();
    const navigate = useNavigate();

    const peek = usePeekVendorInviteQuery(token, { skip: !token });
    const [completeInvite, completeState] = useCompleteVendorInviteMutation();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const authEmail = useSelector(selectAuthEmail);

    const [form, setForm] = useState({
        businessName: '',
        category: '',
        bio: '',
        // Only used on open invites (no targetEmail on the invitation) when
        // the user is signing up fresh.
        targetEmail: '',
        firstName: '',
        lastName: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [succeeded, setSucceeded] = useState(false);

    function patch(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
        if (error) setError('');
    }

    async function handleAccept(e) {
        e?.preventDefault?.();
        setError('');

        if (!form.businessName.trim()) { setError('Business name is required'); return; }
        if (!form.category)            { setError('Pick a category'); return; }

        // Open invites (no pre-scoped email) require the recipient to type their
        // own email here. Scoped invites lock the email server-side.
        const isOpenInvite = !invite.targetEmail;
        if (isOpenInvite && !isAuthenticated) {
            const e = form.targetEmail.trim();
            if (!/^\S+@\S+\.\S+$/.test(e)) { setError('Enter a valid email address'); return; }
        }

        // Signup fields are only required when the email isn't already in the
        // system. The peek response doesn't tell us that, so we always send
        // them when the user isn't authenticated and let the backend decide.
        if (!isAuthenticated) {
            if (!form.firstName.trim() || !form.lastName.trim()) {
                setError('Enter your first and last name'); return;
            }
            if (form.password.length < 8) {
                setError('Password must be at least 8 characters'); return;
            }
        }

        const body = {
            token,
            businessName: form.businessName.trim(),
            category: form.category,
            bio: form.bio.trim() || null,
        };
        if (isOpenInvite && !isAuthenticated) {
            body.targetEmail = form.targetEmail.trim().toLowerCase();
        }
        if (!isAuthenticated) {
            body.firstName = form.firstName.trim();
            body.lastName  = form.lastName.trim();
            body.password  = form.password;
        }

        try {
            await completeInvite(body).unwrap();
            setSucceeded(true);
        } catch (err) {
            const apiErrs = Array.isArray(err?.data?.errors) ? err.data.errors.join('; ') : '';
            setError(apiErrs || err?.data?.message || 'Could not accept invite. Try again.');
        }
    }

    /* ── Loading + error states ────────────────────────────────────── */
    if (peek.isLoading) {
        return (
            <Shell>
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
                    Loading invite…
                </div>
            </Shell>
        );
    }

    if (peek.isError || !peek.data) {
        return (
            <Shell>
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Icons.alert size={32} style={{ color: 'var(--error)' }} />
                    <h2 className="mp-h3" style={{ margin: '12px 0 6px', color: 'var(--text-1)' }}>
                        Invite link not valid
                    </h2>
                    <p className="body-sm" style={{ color: 'var(--text-2)' }}>
                        This invite may have expired, been revoked, or the link is wrong.
                        Ask the organiser to send a new one.
                    </p>
                </div>
            </Shell>
        );
    }

    const invite = peek.data;
    const eventTitle = invite.eventTitle || 'their event';
    const inviterName = invite.inviterName || 'The organiser';
    const isOpenInvite = !invite.targetEmail;
    // Email matching only applies to scoped invites. For open invites any
    // signed-in user can accept (and we use their account email).
    const emailMatch = isOpenInvite
        || (isAuthenticated && authEmail?.toLowerCase() === invite.targetEmail?.toLowerCase());

    /* ── Success screen ─────────────────────────────────────────────── */
    if (succeeded) {
        return (
            <Shell>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'var(--success-bg, #E6F4EA)',
                        color: 'var(--success, #0F7B3E)',
                        display: 'grid', placeItems: 'center', margin: '0 auto 16px',
                    }}>
                        <Icons.check size={28} />
                    </div>
                    <h2 className="mp-h2" style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
                        You&apos;re in!
                    </h2>
                    <p className="body" style={{ margin: '0 0 24px', color: 'var(--text-2)' }}>
                        Your vendor profile is set up and linked to <strong>{eventTitle}</strong>.
                        Verify your account to unlock the full marketplace.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <Button variant="primary" size="md" onClick={() => navigate('/vendor')}>
                            Go to vendor dashboard
                        </Button>
                    </div>
                </div>
            </Shell>
        );
    }

    /* ── Accept form ────────────────────────────────────────────────── */
    return (
        <Shell>
            <div style={{ marginBottom: 24 }}>
                <p style={{
                    margin: 0, fontSize: 12, color: 'var(--text-3)',
                    letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase',
                }}>
                    Vendor invitation
                </p>
                <h1 className="mp-h2" style={{ margin: '4px 0 8px', color: 'var(--text-1)' }}>
                    {inviterName} invited you to {eventTitle}
                </h1>
                <p className="body-sm" style={{ margin: 0, color: 'var(--text-2)' }}>
                    Accept to set up your vendor profile. You&apos;ll be able to work on
                    this event right away. Verify your account to become a full
                    marketplace vendor.
                </p>
            </div>

            {/* Scoped-invite mismatch banner. Open invites (no targetEmail) skip
                this entirely — any account may accept them. */}
            {!isOpenInvite && isAuthenticated && !emailMatch && (
                <div style={{
                    padding: '10px 14px', marginBottom: 16, borderRadius: 10,
                    background: 'var(--warning-bg)', color: 'var(--warning)',
                    fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
                }}>
                    <Icons.alert size={14} />
                    <span>
                        This invite is for <strong>{invite.targetEmail}</strong>, but you&apos;re
                        signed in as <strong>{authEmail}</strong>. Sign out and use the right
                        account to accept.
                    </span>
                </div>
            )}

            <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Input
                    label="Business name"
                    value={form.businessName}
                    onChange={(e) => patch('businessName', e.target.value)}
                    placeholder="Your business as customers know it"
                />

                <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                        Category
                    </span>
                    <select
                        value={form.category}
                        onChange={(e) => patch('category', e.target.value)}
                        style={{
                            width: '100%', height: 44, padding: '0 14px',
                            background: 'var(--surface-elevated, white)',
                            border: '1px solid var(--border)',
                            borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                            fontFamily: 'inherit',
                        }}
                    >
                        <option value="">Choose a category…</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (s) => s.toUpperCase())}
                            </option>
                        ))}
                    </select>
                </label>

                <label style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                        Short bio <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                    </span>
                    <textarea
                        value={form.bio}
                        onChange={(e) => patch('bio', e.target.value)}
                        rows={3}
                        placeholder="What you do, what makes you good at it."
                        style={{
                            width: '100%', padding: '10px 14px',
                            background: 'var(--surface-elevated, white)',
                            border: '1px solid var(--border)',
                            borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                            resize: 'vertical', fontFamily: 'inherit',
                            boxSizing: 'border-box',
                        }}
                    />
                </label>

                {/* Signup fields — only when not signed in. For open invites
                    the email field is editable; for scoped invites the email
                    is locked server-side and we just show it as context. */}
                {!isAuthenticated && (
                    <>
                        <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
                            {isOpenInvite
                                ? 'Create your EventNest account to accept:'
                                : <>Create your EventNest account for <strong>{invite.targetEmail}</strong>:</>}
                        </p>
                        {isOpenInvite && (
                            <Input
                                label="Email"
                                type="email"
                                value={form.targetEmail}
                                onChange={(e) => patch('targetEmail', e.target.value)}
                                placeholder="you@example.com"
                                icon={<Icons.mail size={16} />}
                            />
                        )}
                        <div className="mp-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Input
                                label="First name"
                                value={form.firstName}
                                onChange={(e) => patch('firstName', e.target.value)}
                                placeholder="Ada"
                            />
                            <Input
                                label="Last name"
                                value={form.lastName}
                                onChange={(e) => patch('lastName', e.target.value)}
                                placeholder="Lovelace"
                            />
                        </div>
                        <Input
                            label="Password"
                            type="password"
                            value={form.password}
                            onChange={(e) => patch('password', e.target.value)}
                            placeholder="At least 8 characters"
                            icon={<Icons.lock size={16} />}
                        />
                    </>
                )}

                {error && (
                    <div role="alert" style={{
                        padding: '10px 12px', borderRadius: 10, fontSize: 13,
                        background: 'var(--error-bg)', color: 'var(--error)',
                    }}>
                        {error}
                    </div>
                )}

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={completeState.isLoading || (isAuthenticated && !emailMatch)}
                >
                    {completeState.isLoading
                        ? 'Accepting…'
                        : isAuthenticated
                            ? `Accept as ${authEmail}`
                            : 'Create account & accept'}
                </Button>

                {!isAuthenticated && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--mp-blue)', fontWeight: 600 }}>
                            Sign in first
                        </Link>{' '}
                        then come back to accept.
                    </p>
                )}
            </form>
        </Shell>
    );
}

function Shell({ children }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--surface-subtle)',
            padding: '48px 24px',
        }}>
            <div className="mp-card-pad" style={{
                maxWidth: 560, margin: '0 auto',
                background: 'var(--surface-elevated, white)',
                border: '1px solid var(--border)',
                borderRadius: 16, padding: '32px 28px',
                boxShadow: 'var(--shadow-card)',
            }}>
                {children}
            </div>
        </div>
    );
}
