import { useState } from 'react';
import { useNavigate } from 'react-router';
import Brand from '../../components/ui/Brand';
import Button from '../../components/ui/Button';
import CapacityBar from '../../components/ui/CapacityBar';
import EventCard from '../../components/ui/EventCard';
import QrPattern from '../../components/ui/QrPattern';
import { StatusBadge } from '../../components/ui/Badge';
import { Icons } from '../../components/ui/Icon';
import { SAMPLE_EVENTS } from '../../data/sampleEvents';

/* ── Tile used in the organiser preview card ── */
function Tile({ label, value, sub }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 8 }}>{label}</div>
      <div className="mp-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Attendee preview card (ticket mockup) ── */
function AttendeePreview() {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: 'var(--shadow-elevated)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mp-blue)', letterSpacing: '0.05em' }}>
            YOUR TICKET
          </div>
          <div className="mp-h3" style={{ marginTop: 4, color: 'var(--text-1)' }}>
            Merchant Summit &apos;26
          </div>
        </div>
        <StatusBadge status="VALID" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 18, alignItems: 'center' }}>
        <QrPattern size={120} seed="SUMMIT26" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>SEAT</div>
            <div className="mp-num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>
              VIP2-5
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>WHEN</div>
            <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>
              16 May · 10:00
            </div>
          </div>
        </div>
      </div>
      <div style={{
        paddingTop: 14,
        borderTop: '1px dashed var(--border)',
        fontSize: 13,
        color: 'var(--text-2)',
      }}>
        Hall A · Eko Convention Centre · Lagos
      </div>
    </div>
  );
}

/* ── Organiser preview card (dashboard mockup) ── */
function OrganiserPreview() {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 16,
      boxShadow: 'var(--shadow-elevated)',
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Merchant Summit · Live</div>
          <div className="mp-h3" style={{ marginTop: 2, color: 'var(--text-1)' }}>Capacity overview</div>
        </div>
        <span style={{
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center',
          fontSize: 12,
          color: 'var(--success)',
          fontWeight: 600,
        }}>
          <span className="mp-live-dot" />Live
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Tile label="Sold" value="423" sub="of 650" />
        <Tile label="Checked in" value="267" sub="63%" />
      </div>
      <CapacityBar sold={423} total={650} label="Total capacity" />
      <div style={{
        marginTop: 16,
        padding: 12,
        background: 'var(--surface-subtle)',
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
          Recent activity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="mp-live-dot" />Tunde booked 2 × VIP
          </div>
          <div>· Aisha checked in</div>
          <div>· Chuka booked 1 × General</div>
        </div>
      </div>
    </div>
  );
}

/* ── Pillar card ── */
function Pillar({ icon, title, body }) {
  return (
    <div>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'var(--mp-blue-50)',
        color: 'var(--mp-blue)',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 16,
      }}>
        {icon}
      </div>
      <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h3>
      <p className="body" style={{ marginTop: 8, color: 'var(--text-2)' }}>{body}</p>
    </div>
  );
}

/* ── Top navigation ── */
function TopNav({ onLogin, onRegister, onBrowse }) {
  return (
    <nav data-testid="topnav" style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(2,16,45,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '0 24px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      gap: 24,
    }}>
      <Brand size={18} color="white" />
      <div style={{ flex: 1 }} />
      <button
        onClick={onBrowse}
        style={{
          background: 'none',
          border: 0,
          color: 'rgba(255,255,255,0.75)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          padding: '8px 0',
          transition: 'color var(--motion-fast)',
        }}
        onMouseOver={e => e.currentTarget.style.color = 'white'}
        onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
      >
        Browse events
      </button>
      <Button size="sm" variant="onDark" onClick={onLogin}>
        Sign in
      </Button>
      <Button size="sm" variant="primary" onClick={onRegister}>
        Get started
      </Button>
    </nav>
  );
}

/* ══════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState('attendee');

  const config = audience === 'attendee' ? {
    eyebrow: 'For people who actually want their seat',
    headline: <>Book the <em className="mp-display-em">right seat</em>, every single time.</>,
    body: 'Discover events around you, lock in an assigned seat in seconds, and keep every ticket in one place. No spreadsheets, no overbooking, no waiting in line.',
    primaryLabel: 'Browse events',
    primaryRoute: '/events',
    secondaryLabel: 'Sign in',
    secondaryRoute: '/login',
    stats: [
      ['12,400+', 'Tickets booked'],
      ['<400ms',  'Booking confirmed'],
      ['0',       'Lost seats this year'],
    ],
    pillars: [
      {
        title: 'Assigned seats, locked in',
        body: 'Every ticket comes with a real seat. The booking is yours the moment you confirm — no race conditions, no surprises at the door.',
        icon: <Icons.ticket size={20} />,
      },
      {
        title: 'One wallet for every event',
        body: 'All your past, present, and upcoming tickets in one place. QR ready offline. Refunds and changes flow into the same view.',
        icon: <Icons.shield size={20} />,
      },
      {
        title: 'Walk straight in',
        body: 'Scanners read your QR in under a second. Live status syncs back to the organiser, so check-in never queues.',
        icon: <Icons.signal size={20} />,
      },
    ],
    pillarsHeadline: <>Built for the people <em className="mp-display-em">in the seat</em>.</>,
    pillarsEyebrow: 'Why EventNest',
    eventsHeadline: 'On the calendar',
  } : {
    eyebrow: "For teams running events that can't go wrong",
    headline: <>Run <em className="mp-display-em">dependable</em> events at any scale.</>,
    body: "EventNest gives organisers the booking infrastructure they need — assigned seats, no overbooking, real-time check-in, and clear approvals — without the spreadsheets.",
    primaryLabel: 'Host an event',
    primaryRoute: '/register',
    secondaryLabel: 'Open organiser console',
    secondaryRoute: '/login',
    stats: [
      ['99.98%', 'Booking uptime'],
      ['340ms',  'P95 response'],
      ['0',      'Overbookings, ever'],
    ],
    pillars: [
      {
        title: 'No overbooking, ever',
        body: "Optimistic locking on capacity means two people racing for the last seat won't both get it. One wins; the other picks another tier.",
        icon: <Icons.shield size={20} />,
      },
      {
        title: 'One account, many roles',
        body: 'The same login organises your launch, attends a partner event, and works check-in next door. Permissions resolve per event, not globally.',
        icon: <Icons.users size={20} />,
      },
      {
        title: 'Live, dependable feedback',
        body: 'Bookings confirm in milliseconds. Check-in updates the dashboard instantly. Notifications fire async, so the user never waits.',
        icon: <Icons.signal size={20} />,
      },
    ],
    pillarsHeadline: <>Built for the moments where <em className="mp-display-em">overbooking</em> isn&apos;t an option.</>,
    pillarsEyebrow: 'Why teams choose us',
    eventsHeadline: 'Recently published',
  };

  return (
    <div style={{ background: 'var(--surface-page)' }}>
      <TopNav
        onLogin={() => navigate('/login')}
        onRegister={() => navigate('/register')}
        onBrowse={() => navigate('/events')}
      />

      {/* ── Hero ── */}
      <section style={{
        padding: '64px 24px 80px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--mp-navy)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative radial glows */}
        <div aria-hidden="true" style={{
          position: 'absolute', right: -240, top: -200,
          width: 640, height: 640, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(3,87,238,0.45) 0%, transparent 62%)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', left: -180, bottom: -180,
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(3,87,238,0.22) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          {/* Audience segmented control */}
          <div style={{
            display: 'inline-flex',
            padding: 4,
            borderRadius: 99,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            marginBottom: 36,
          }}>
            {[['attendee', 'For attendees'], ['organiser', 'For organisers']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setAudience(id)}
                style={{
                  background: audience === id ? 'white' : 'transparent',
                  color: audience === id ? 'var(--mp-navy)' : 'rgba(255,255,255,0.78)',
                  border: 0,
                  padding: '9px 20px',
                  borderRadius: 99,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--motion-fast)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}>
            {/* Left: copy */}
            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 99,
                background: 'rgba(3,87,238,0.18)',
                color: '#9DB9FF',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 24,
                border: '1px solid rgba(3,87,238,0.4)',
              }}>
                <span className="mp-live-dot" style={{
                  background: 'var(--mp-blue)',
                  boxShadow: '0 0 0 4px rgba(3,87,238,0.25)',
                }} />
                {config.eyebrow}
              </span>

              <h1 className="mp-h-display mp-display" style={{
                margin: 0,
                color: 'white',
              }}>
                {config.headline}
              </h1>

              <p className="body-lg" style={{
                marginTop: 16,
                color: 'rgba(255,255,255,0.78)',
                maxWidth: 540,
              }}>
                {config.body}
              </p>

              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <Button
                  size="lg"
                  variant="primary"
                  iconRight={<Icons.arrowR size={16} />}
                  onClick={() => navigate(config.primaryRoute)}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    fontSize: 17,
                  }}
                >
                  {config.primaryLabel}
                </Button>
                <Button
                  size="lg"
                  variant="onDark"
                  onClick={() => navigate(config.secondaryRoute)}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    fontSize: 17,
                  }}
                >
                  {config.secondaryLabel}
                </Button>
              </div>

              {/* Stats strip */}
              <div style={{
                display: 'flex',
                gap: 32,
                marginTop: 48,
                paddingTop: 32,
                borderTop: '1px solid rgba(255,255,255,0.15)',
              }}>
                {config.stats.map(([k, v]) => (
                  <div key={v}>
                    <div className="mp-num" style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                      {k}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: contextual preview card */}
            {audience === 'attendee' ? <AttendeePreview /> : <OrganiserPreview />}
          </div>
        </div>
      </section>

      {/* ── Feature pillars ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ maxWidth: 720 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--mp-blue)',
            letterSpacing: '0.02em',
          }}>
            {config.pillarsEyebrow}
          </span>
          <h2 className="mp-h1 mp-display" style={{ margin: '8px 0 0', color: 'var(--text-1)' }}>
            {config.pillarsHeadline}
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginTop: 48,
        }}>
          {config.pillars.map(p => (
            <Pillar key={p.title} icon={p.icon} title={p.title} body={p.body} />
          ))}
        </div>
      </section>

      {/* ── Featured events ── */}
      <section style={{
        background: 'var(--surface-subtle)',
        padding: '64px 24px',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <h2 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
              {config.eventsHeadline}
            </h2>
            <button
              onClick={() => navigate('/events')}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--mp-blue)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Browse all →
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}>
            {SAMPLE_EVENTS.slice(0, 3).map(event => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/events/${event.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: 'var(--mp-navy)',
        color: 'rgba(255,255,255,0.75)',
        padding: '48px 24px',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Brand color="white" size={20} />
          <div style={{ fontSize: 13 }}>
            EventNest · Moniepoint DreamDev · v2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
