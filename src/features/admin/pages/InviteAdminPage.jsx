import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

export default function InviteAdminPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [invites, setInvites] = useState([]);

    function submit(e) {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed) return;
        setInvites((prev) => [{ email: trimmed, sentAt: new Date() }, ...prev]);
        setSent(true);
        setEmail('');
    }

    return (
        <div style={{ background: 'var(--surface-subtle)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 className="mp-h1" style={{ margin: 0, color: 'var(--text-1)' }}>Invite Admin</h1>
                    <p className="body" style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>
                        Grant admin access to another person by sending them an invitation link.
                    </p>
                </div>

                <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)', padding: 28, marginBottom: 24 }}>
                    <h2 className="mp-h3" style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>Send invitation</h2>
                    <p className="body-sm" style={{ margin: '0 0 20px', color: 'var(--text-2)' }}>
                        The recipient will receive an email with a link to set up their admin account.
                    </p>

                    {sent && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '12px 16px', borderRadius: 10,
                            background: 'var(--success-bg)', color: 'var(--success)',
                            fontSize: 14, fontWeight: 500, marginBottom: 20,
                        }}>
                            <Icons.check size={16} /> Invitation sent successfully.
                        </div>
                    )}

                    <form onSubmit={submit}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
                            Email address
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input
                                type="email"
                                placeholder="colleague@example.com"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setSent(false); }}
                                required
                                style={{
                                    flex: 1, height: 44, padding: '0 14px',
                                    background: 'var(--surface-elevated)', border: '1px solid var(--border)',
                                    borderRadius: 12, fontSize: 15, color: 'var(--text-1)',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <Button type="submit" variant="primary" size="md" icon={<Icons.mail size={15} />}>
                                Send invite
                            </Button>
                        </div>
                        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)', margin: '10px 0 0' }}>
                            Admin accounts have full access to event moderation and user management.
                        </p>
                    </form>
                </div>

                {invites.length > 0 && (
                    <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                            Sent invitations
                        </div>
                        {invites.map((inv, i) => (
                            <div
                                key={inv.email + i}
                                style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '14px 20px',
                                    borderBottom: i === invites.length - 1 ? 0 : '1px solid var(--border)',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{inv.email}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                                        Sent {inv.sentAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 12, fontWeight: 600, padding: '4px 10px',
                                    borderRadius: 6, background: 'var(--surface-subtle)',
                                    color: 'var(--text-2)', border: '1px solid var(--border)',
                                }}>
                                    Pending
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
