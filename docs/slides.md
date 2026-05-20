<!--
EventNest capstone deck. Render with Marp:
  npx -y @marp-team/marp-cli@latest docs/slides.md -o docs/slides.html
  # → open docs/slides.html in any browser (no Chrome dependency)
or:
  npx -y @marp-team/marp-cli@latest --watch --preview docs/slides.md
or install the "Marp for VS Code" extension and hit ⌘⇧V on the open file.

For PDF: open slides.html in Chrome → Print → Save as PDF → Landscape → No margins.

Runtime target: 8 minutes presentation + 2 minutes Q&A.
-->

---

marp: true
paginate: true
size: 16:9
theme: default
transition: fade
style: |
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fraunces:wght@600;700;800;900&display=swap');

:root {
--ink: #02102D;
--ink-2: #4A5468;
--ink-3: #8892A6;
--paper: #ffffff;
--paper-2: #F5F7FA;
--line: #E5E7EB;
--brand: #0247c7;
--brand-deep: #02307F;
--brand-soft: #EAF1FE;
--accent: #F59E0B;
--green: #0F7B3E;
--green-soft: #E6F4EA;
--coral: #C62828;
--coral-soft: #FBE9E9;
--amber: #B8770A;
--amber-soft: #FEF4E2;
}

section {
font-family: 'Inter', -apple-system, sans-serif;
color: var(--ink);
background: var(--paper);
font-size: 26px;
padding: 64px 80px;
letter-spacing: -0.01em;
line-height: 1.4;
}
h1, h2, h3 {
font-family: 'Fraunces', Georgia, serif;
letter-spacing: -0.035em;
line-height: 1;
margin: 0 0 0.4em;
font-feature-settings: 'ss01';
}
h1 { font-size: 92px; font-weight: 800; line-height: 0.98; }
h2 { font-size: 60px; font-weight: 700; line-height: 1.02; }
h3 { font-size: 30px; font-weight: 600; color: var(--ink-2); }
p, li { line-height: 1.5; }
strong { color: var(--ink); font-weight: 700; }
em { font-style: italic; color: var(--ink-2); }

code {
font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
background: var(--paper-2);
padding: 2px 7px;
border-radius: 4px;
font-size: 0.86em;
color: var(--brand);
}
pre {
background: #0a0f1e;
color: #d6e0f5;
border-radius: 14px;
padding: 24px 28px;
font-size: 17px;
line-height: 1.55;
border: 0;
}
pre code { background: none; color: inherit; padding: 0; }

/_ ─── Variants ─────────────────────────────────────── _/

/_ Dark hero slides _/
section.dark {
background: #02102D;
color: #fff;
background-image:
radial-gradient(circle at 12% 14%, rgba(2, 71, 199, 0.35) 0%, transparent 42%),
radial-gradient(circle at 88% 92%, rgba(2, 71, 199, 0.18) 0%, transparent 40%);
}
section.dark h1, section.dark h2, section.dark h3 { color: #fff; }
section.dark p, section.dark li { color: rgba(255,255,255,0.78); }
section.dark strong { color: #fff; }
section.dark em { color: rgba(255,255,255,0.55); }
section.dark::after { color: rgba(255,255,255,0.4); }

/_ ─── Reusable bits ────────────────────────────────── _/

.kicker {
font-family: 'Inter', sans-serif;
font-weight: 700;
font-size: 13px;
letter-spacing: 0.22em;
text-transform: uppercase;
color: var(--brand);
margin: 0 0 22px;
}
section.dark .kicker { color: #93B4F4; }

.brand-badge {
display: inline-flex;
align-items: center;
gap: 12px;
font-weight: 700;
color: var(--ink);
letter-spacing: -0.02em;
}
.brand-badge::before {
content: 'N';
display: inline-grid;
place-items: center;
width: 34px; height: 34px;
background: var(--brand);
color: #fff;
border-radius: 8px;
font-family: 'Inter', sans-serif;
font-weight: 800;
font-size: 18px;
letter-spacing: 0;
}
section.dark .brand-badge { color: #fff; }

.pill {
display: inline-flex;
align-items: center;
padding: 5px 13px;
border-radius: 99px;
font-size: 13px;
font-weight: 700;
letter-spacing: 0.04em;
background: var(--brand-soft);
color: var(--brand);
margin-right: 6px;
}
.pill.green { background: var(--green-soft); color: var(--green); }
.pill.amber { background: var(--amber-soft); color: var(--amber); }
.pill.coral { background: var(--coral-soft); color: var(--coral); }

.chip {
display: inline-block;
padding: 6px 11px;
border-radius: 8px;
background: var(--paper-2);
border: 1px solid var(--line);
font-size: 14px;
font-weight: 500;
color: var(--ink-2);
margin: 0 4px 6px 0;
}
section.dark .chip {
background: rgba(255,255,255,0.06);
border-color: rgba(255,255,255,0.1);
color: rgba(255,255,255,0.82);
}

/_ Layout grids _/
.cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
.cols-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
.cols-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }

.col-card {
border: 1px solid var(--line);
border-radius: 16px;
padding: 22px 24px;
background: #fff;
}
section.dark .col-card {
background: rgba(255,255,255,0.04);
border-color: rgba(255,255,255,0.12);
backdrop-filter: blur(6px);
}
.col-card .label {
font-family: 'Inter', sans-serif;
margin: 0 0 10px;
font-size: 11px;
text-transform: uppercase;
letter-spacing: 0.12em;
color: var(--ink-3);
font-weight: 700;
}
section.dark .col-card .label { color: rgba(255,255,255,0.5); }
.col-card p { margin: 0; font-size: 19px; line-height: 1.45; }

/_ Numbered cards (slide 9) _/
.num-card {
border-left: 3px solid var(--brand);
padding: 14px 22px;
margin-bottom: 22px;
position: relative;
}
.num-card .num {
font-family: 'Fraunces', serif;
font-weight: 800;
font-size: 22px;
color: var(--brand);
letter-spacing: 0;
margin-bottom: 6px;
display: block;
}
.num-card .head {
font-family: 'Fraunces', serif;
font-weight: 700;
font-size: 32px;
color: var(--ink);
line-height: 1.15;
margin: 0 0 8px;
letter-spacing: -0.02em;
}
.num-card .sub {
font-size: 17px;
color: var(--ink-2);
margin: 0;
}

/_ Stats _/
.stat .big {
font-family: 'Fraunces', serif;
font-size: 88px;
font-weight: 900;
color: var(--brand);
line-height: 0.95;
letter-spacing: -0.04em;
font-feature-settings: 'tnum';
}
.stat .label {
font-size: 15px;
color: var(--ink-2);
margin-top: 8px;
line-height: 1.4;
}

/_ Pipeline chevron _/
.pipeline {
display: flex;
flex-wrap: wrap;
gap: 8px;
align-items: center;
margin-top: 8px;
}
.pipeline .step {
background: var(--paper-2);
border: 1px solid var(--line);
border-radius: 8px;
padding: 8px 14px;
font-family: ui-monospace, monospace;
font-size: 14px;
color: var(--ink);
font-weight: 500;
}
.pipeline .arrow {
color: var(--ink-3);
font-size: 16px;
}

/_ Architecture node _/
.arch-grid {
display: grid;
grid-template-columns: 1fr 1fr 1fr;
gap: 16px;
margin-top: 12px;
}
.arch-node {
border: 1.5px solid var(--line);
border-radius: 14px;
padding: 16px 18px;
background: #fff;
}
.arch-node.front {
grid-column: 1 / -1;
border-color: var(--brand);
background: var(--brand-soft);
}
.arch-node.api {
grid-column: 1 / -1;
background: #02102D;
border-color: #02102D;
color: #fff;
}
.arch-node h5 {
font-family: 'Inter', sans-serif;
margin: 0 0 4px;
font-size: 17px;
font-weight: 700;
letter-spacing: -0.01em;
}
.arch-node small {
font-size: 13px;
color: var(--ink-3);
line-height: 1.4;
display: block;
}
.arch-node.api small { color: rgba(255,255,255,0.55); }
.arch-arrow {
text-align: center;
color: var(--ink-3);
font-size: 18px;
margin: 2px 0;
}

/_ Quote stack (innovation slide) _/
.quote {
font-family: 'Fraunces', Georgia, serif;
font-size: 38px;
line-height: 1.18;
margin: 0 0 6px;
color: var(--ink);
font-weight: 700;
letter-spacing: -0.025em;
}
.quote-sub {
font-family: 'Inter', sans-serif;
font-size: 18px;
color: var(--ink-2);
display: block;
margin-bottom: 30px;
}

section::after {
color: var(--ink-3);
font-size: 12px;
letter-spacing: 0.04em;
}
section.no-page::after { content: ''; }

/_ Cold-open slide — one huge word/number on black _/
.cold-number {
font-family: 'Fraunces', serif;
font-size: 280px;
font-weight: 900;
line-height: 0.9;
letter-spacing: -0.06em;
color: #fff;
font-feature-settings: 'tnum';
margin: 0;
}
.cold-caption {
font-family: 'Inter', sans-serif;
font-size: 22px;
font-weight: 500;
letter-spacing: 0.04em;
color: rgba(255,255,255,0.55);
text-transform: none;
margin-top: 32px;
max-width: 820px;
line-height: 1.45;
}

/_ Roadmap slide — two-column shipped vs next _/
.road-col h4 {
font-family: 'Inter', sans-serif;
font-size: 12px;
font-weight: 700;
letter-spacing: 0.18em;
text-transform: uppercase;
margin: 0 0 16px;
}
.road-col.shipped h4 { color: var(--green); }
.road-col.next h4 { color: var(--amber); }
.road-item {
padding: 11px 0;
border-bottom: 1px dashed var(--line);
display: flex;
gap: 12px;
align-items: flex-start;
font-size: 16px;
line-height: 1.45;
}
.road-item:last-child { border-bottom: 0; }
.road-item .marker {
font-family: ui-monospace, monospace;
font-weight: 700;
flex-shrink: 0;
width: 22px;
}
.shipped .road-item .marker { color: var(--green); }
.next .road-item .marker { color: var(--amber); }
.road-item strong { color: var(--ink); font-weight: 700; }
.road-item .why { display: block; color: var(--ink-3); font-size: 14px; margin-top: 2px; }

---

<!-- _class: dark no-page -->

<div style="display:flex; flex-direction:column; height:100%; justify-content:center; align-items:center; text-align:center;">

<p class="cold-number">OVERSOLD.</p>

<p class="cold-caption">
BNXN Live &nbsp;·&nbsp; Lagos &nbsp;·&nbsp; <em style="color:rgba(255,255,255,0.85);">2025</em>
</p>

</div>

<!--
COLD OPEN — 18s. Walk on. Let the word sit on screen for two full seconds
before you speak. Don't fill the silence.

THEN:

"BNXN's 2025 Lagos show. The promoter sold more tickets than the venue
could hold. Fans who paid ₦150,000 each stood at the gate. Some of them
never got in.

This wasn't an accident. It's how the Nigerian events industry runs."

BEAT. Click forward.

(Verify the exact venue + month against current news before delivery —
swap in the right details. The core fact is: BNXN, Lagos, 2025, oversold.)
-->

---

<!-- _class: dark no-page -->

<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between;">

<span class="brand-badge" style="font-size:24px;">EventNest</span>

<div>
<h1 style="max-width: 1080px;">Lagos runs<br/>on events.<br/><span style="color: #93B4F4;">So does this.</span></h1>
<p style="font-size:24px; margin-top:36px; max-width:760px; line-height:1.45;">
A workspace for the Nigerian event economy — organisers, attendees, vendors, and check-in staff in one shared system of record.
</p>
</div>

<div style="font-size:14px; color: rgba(255,255,255,0.55); letter-spacing: 0.04em;">
[YOUR NAME] &nbsp;·&nbsp; MONIEPOINT DREAMDEV CAPSTONE &nbsp;·&nbsp; 2026
</div>

</div>

<!--
SPEAKER NOTES — title slide (10s):
"I'm [Name]. I built EventNest — a workspace for Lagos's most ungovernable
industry. Let me show you what breaks every December."

Click into the Detty December scenarios.
-->

---

<!-- _class: dark -->

<p class="kicker">Three real stories. Three different victims.</p>

<h2 style="max-width: 1040px;">The Nigerian event industry runs on broken trust.</h2>

<div class="cols-3" style="margin-top: 40px;">

<div class="col-card">
<div class="label">The attendee</div>
<p style="font-size:17px; line-height:1.55;">
<strong style="color:#fff;">BNXN Live, Lagos · 2025.</strong><br/>
Bought a ticket on Twitter. Stood at the gate three hours. <em style="color:rgba(255,255,255,0.55);">The venue was already over capacity.</em>
</p>
</div>

<div class="col-card">
<div class="label">The organiser</div>
<p style="font-size:17px; line-height:1.55;">
<strong style="color:#fff;">Lagos wedding · Lekki, 2024.</strong><br/>
The bride paid <strong style="color:#fff;">₦4M deposit</strong> for catering. Vendor stopped picking up calls four days before the event. <em style="color:rgba(255,255,255,0.55);">No refund. No replacement.</em>
</p>
</div>

<div class="col-card">
<div class="label">The vendor</div>
<p style="font-size:17px; line-height:1.55;">
<strong style="color:#fff;">Corporate event · Ikeja.</strong><br/>
Photographer delivered the gallery. Six months later, still chasing the balance. <em style="color:rgba(255,255,255,0.55);">The promoter blocks her number.</em>
</p>
</div>

</div>

<p style="margin-top: 44px; font-size: 21px; color: rgba(255,255,255,0.7); font-style: italic; max-width: 980px;">
Different roles. Different scams. Same root problem — no system of record.
</p>

<!--
SPEAKER NOTES (60s):
Three stories, three POVs. Gesture at each card.

"Three stories. Three different victims of the same industry.

The attendee — at BNXN's Lagos show in 2025. Stood outside the venue for
hours because the promoter sold more tickets than the venue could hold.
Real money, real ticket, no seat.

The organiser — a bride at a Lekki wedding. Paid four million naira deposit
to a caterer. Caterer disappeared four days before the wedding. No refund.
She had to call every aunty she knew to plate food for 300 guests.

The vendor — a photographer who shot a corporate dinner in Ikeja. Delivered
the gallery. Six months later, she's still chasing the balance. The
promoter blocks her number.

Different roles. Different scams. Same root cause — none of this is on
the record anywhere."
-->

---

<p class="kicker">The problem</p>

<h2>A ₦200B industry, held together with WhatsApp.</h2>

<div class="cols-3" style="margin-top: 36px;">

<div class="col-card">
<div class="label">Organisers</div>
<p style="font-size:18px; line-height:1.7;">
WhatsApp invoices<br/>
Vendor lookups: "my guy"<br/>
Excel for the door list<br/>
Cash floats. Real cash.
</p>
</div>

<div class="col-card">
<div class="label">Attendees</div>
<p style="font-size:18px; line-height:1.7;">
Tickets bought on Twitter<br/>
No idea who's coming<br/>
Walk-up overflow<br/>
Fake QR codes
</p>
</div>

<div class="col-card">
<div class="label">Vendors</div>
<p style="font-size:18px; line-height:1.7;">
"Promoter ghosted"<br/>
Payments in arrears<br/>
No discovery<br/>
<em>"Still waiting for credit alert."</em>
</p>
</div>

</div>

<p style="margin-top: 38px; font-size: 23px; max-width: 920px; color: var(--ink-2); line-height: 1.4;">
This isn't a UX problem. It's a <strong>coordination</strong> problem.<br/>
So I built a coordination layer.
</p>

<!--
SPEAKER NOTES (60s):
"The Nigerian events industry is held together with WhatsApp groups, Paystack
invoices, and your cousin's caterer's friend. Organisers manage attendees in
spreadsheets. Vendors find work through tweets. Attendees buy tickets from
strangers. There's no system of record. So when it breaks — and it always
breaks in December — it breaks loudly. This wasn't a UX problem. This was a
coordination problem."
-->

---

<p class="kicker">The solution</p>

<h2>One platform.<br/>Four roles.<br/><em style="font-family:'Fraunces';color:var(--brand);">Per event.</em></h2>

<div class="cols-2" style="margin-top: 28px; align-items: center;">

<div>
<p style="font-size: 22px; line-height: 1.7;">
The same Lagos resident can be<br/>
<span class="pill green">Organiser</span> for her sister's wedding,<br/>
<span class="pill">Attendee</span> at Felabration tonight,<br/>
<span class="pill amber">Vendor</span> pitching catering in January, and a<br/>
<span class="pill coral">Check-in steward</span> on Saturday.
</p>

<p style="margin-top: 28px; font-size: 19px; color: var(--ink-2); line-height: 1.5;">
Same login. Same workspace. The system knows which hat she's wearing for which event — and routes the UI around it.
</p>
</div>

<div style="background: #0a0f1e; color:#d6e0f5; padding: 26px 30px; border-radius: 14px; font-family: ui-monospace, monospace; font-size: 17px; line-height: 1.9;">
<span style="color:#7a8aa8;">user&nbsp;&nbsp;</span><span style="color:#93B4F4;">"adaeze@…"</span><br/>
<span style="color:#7a8aa8;">├─</span> event_001 &nbsp;→ <span style="color:#5FE0A1; font-weight:700;">ORGANIZER</span><br/>
<span style="color:#7a8aa8;">├─</span> event_017 &nbsp;→ <span style="color:#93B4F4; font-weight:700;">ATTENDEE</span><br/>
<span style="color:#7a8aa8;">├─</span> event_042 &nbsp;→ <span style="color:#F5BC4C; font-weight:700;">VENDOR</span><br/>
<span style="color:#7a8aa8;">└─</span> event_089 &nbsp;→ <span style="color:#FF8A8A; font-weight:700;">CHECKIN_STAFF</span>
</div>

</div>

<!--
SPEAKER NOTES (60s):
"EventNest is the workspace for one event with everyone in it. The same
Lagos resident can be an organiser for her sister's wedding, an attendee at
Felabration tonight, a vendor pitching catering in January, and a check-in
steward on Saturday. Same login. The system knows which hat she's wearing.
That single insight — that roles are per-event, not per-account — is the
architectural decision the rest of the build flows from."
-->

---

<!-- _class: dark no-page -->

<div style="display:flex; flex-direction:column; height:100%; justify-content:center; align-items:center; text-align:center;">

<p class="kicker">Live demo</p>

<h1 style="font-size: 132px; max-width: 1180px; line-height: 0.95;">
Lagos Lit December.<br/>
<span style="color:#93B4F4;">At Eko.</span>
</h1>

<p style="font-size: 24px; margin-top: 36px; max-width: 800px; line-height: 1.5;">
I'll play three people.<br/>
The promoter. The caterer. The attendee.<br/>
<em style="color: rgba(255,255,255,0.6);">Watch the system follow.</em>
</p>

</div>

<!--
DEMO SCRIPT — 4 minutes. Pre-stage 3 browser windows. Don't sign in live.

ACT 1 — Organiser (1:30)
 1. Open /events — "this is what Lagos sees"
 2. Create event → "Lagos Lit December", Eko Convention Centre, 28 Dec,
    Public + Open ticket sales, Regular ₦25k / VIP ₦150k
 3. My events → click the event → walk tabs: Programme (add "Davido —
    Surprise Set, 11:30PM"), Vendors, Budget, Team
 4. Pause on Live dashboard — "this is the war room"

ACT 2 — Vendor (1:00)
 5. Switch browser → vendor account → Vendors → Find opportunities → Lagos Lit
 6. /vendor/apply/:id — pitch as Catering, "Asun + jollof for 800 guests",
    ₦2,400,000
 7. Back to organiser → Vendors tab → Accept

ACT 3 — Attendee + check-in (1:30)
 8. Third browser → /events → Book VIP seat
 9. Watch activity feed light up on organiser dashboard
10. Drop comment: "Lagos go shake on the 28th 🔥"
11. Staff tab → generate check-in token → /checkin → paste → scan QR
12. "Checked in."
-->

---

<p class="kicker">Architecture</p>

<h2 style="margin-bottom: 14px;">Modular monolith. Drawn for the next split.</h2>

<div class="arch-grid">

<div class="arch-node front">
<h5>Frontend</h5>
<small>React 19 · Vite · RTK Query · React Router 7</small>
</div>

<div class="arch-arrow" style="grid-column: 1/-1;">↕ &nbsp;REST &nbsp;·&nbsp; Server-Sent Events &nbsp;·&nbsp; WebSocket / STOMP</div>

<div class="arch-node api">
<h5 style="color:#fff;">Spring Boot 4 · Java 25</h5>
<small>21 feature packages — auth · bookings · events · tickets · payments · comments · chat · budget · programme · vendors · ratings · guestlist · …</small>
</div>

<div class="arch-arrow" style="grid-column: 1/-1;">↓</div>

<div class="arch-node">
<h5>PostgreSQL 16</h5>
<small>System of record · Flyway forward-only migrations</small>
</div>

<div class="arch-node">
<h5>Redis 7</h5>
<small>Rate-limit (Bucket4j) · marketplace cache · JWT blocklist</small>
</div>

<div class="arch-node">
<h5>Apache Kafka</h5>
<small>bookings.confirmed · ticket.checked-in · email.outbound · audit</small>
</div>

</div>

<p style="margin-top: 18px; font-size: 16px; color: var(--ink-3);">
+ Monnify (HMAC-SHA512 webhooks) &nbsp;·&nbsp; MinIO/S3 (storage) &nbsp;·&nbsp; Prometheus + Grafana &nbsp;·&nbsp; GitHub Actions → ECR → EC2
</p>

<!--
SPEAKER NOTES (60s):
"Modular monolith — Spring Boot 4 on Java 25. Every feature is its own
package: controller, service, repo, DTOs. Comments doesn't know about
vendors — they're loosely coupled inside a single deployable.
Postgres is the system of record. Redis runs rate-limiting on auth, caches
the vendor marketplace, and acts as the JWT blocklist on logout. Kafka
decouples the slow stuff — emails, audits, notifications — from the
request thread. SSE pushes the activity feed. WebSocket/STOMP runs the
chat module.
When this needs to scale, the seams to break it into services are already
drawn."
-->

---

<p class="kicker">Stack + delivery</p>

<h2>From <code style="font-size:0.7em;">git push</code> to live in Lagos.</h2>

<div class="cols-2" style="margin-top: 24px;">

<div>
<div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--ink-3); text-transform: uppercase; margin-bottom: 14px;">Backend</div>
<div>
<span class="chip">Spring Boot 4</span><span class="chip">Java 25</span><span class="chip">PostgreSQL 16</span><span class="chip">Redis 7</span><span class="chip">Apache Kafka</span><span class="chip">Flyway</span><span class="chip">Bucket4j</span><span class="chip">JWT (RS256)</span><span class="chip">Lombok</span><span class="chip">MapStruct</span><span class="chip">SpringDoc</span><span class="chip">Monnify</span><span class="chip">MinIO</span><span class="chip">Prometheus</span><span class="chip">Grafana</span>
</div>

<div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--ink-3); text-transform: uppercase; margin: 22px 0 14px;">Frontend</div>
<div>
<span class="chip">React 19</span><span class="chip">Vite</span><span class="chip">RTK Query</span><span class="chip">React Router 7</span>
</div>
</div>

<div>
<div style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--ink-3); text-transform: uppercase; margin-bottom: 14px;">CI / CD pipeline</div>

<div class="pipeline" style="flex-direction: column; align-items: flex-start; gap: 6px;">
<span class="step"><strong>1.</strong> &nbsp;git push → dev</span>
<span class="arrow">↓</span>
<span class="step"><strong>2.</strong> &nbsp;GitHub Actions — lint + 578 tests</span>
<span class="arrow">↓</span>
<span class="step"><strong>3.</strong> &nbsp;Docker build · multi-stage · BuildKit cache</span>
<span class="arrow">↓</span>
<span class="step"><strong>4.</strong> &nbsp;Push image → ECR</span>
<span class="arrow">↓</span>
<span class="step"><strong>5.</strong> &nbsp;SSH → EC2 · docker compose up</span>
<span class="arrow">↓</span>
<span class="step"><strong>6.</strong> &nbsp;Flyway runs the new migrations</span>
<span class="arrow">↓</span>
<span class="step" style="background: var(--green-soft); color: var(--green); border-color: var(--green-soft); font-weight: 700;"><strong>✓</strong> &nbsp;Healthy</span>
</div>
</div>

</div>

<!--
SPEAKER NOTES (45s):
"GitHub Actions on every push. Tests run, image builds, gets pushed to ECR.
Production EC2 pulls and docker compose up does the rest — Flyway
migrations apply on boot, no manual SQL. Multi-stage Docker so the
production image is the JAR and nothing else. BuildKit cache mounts so a
fresh build takes 90 seconds, not 12 minutes. One command from git push to
live in Lagos."
-->

---

<p class="kicker">Code quality</p>

<h2>Findable. Tested. Forward-only.</h2>

<div class="cols-2" style="margin-top: 28px;">

<div>
<div style="font-size: 12px; font-weight: 700; letter-spacing: 0.14em; color: var(--ink-3); text-transform: uppercase; margin-bottom: 14px;">21 feature packages</div>
<div style="line-height: 1.9;">
<span class="chip">auth</span><span class="chip">events</span><span class="chip">bookings</span><span class="chip">tickets</span><span class="chip">tiers</span><span class="chip">payments</span><span class="chip">checkin</span><span class="chip">guestlist</span><span class="chip">programme</span><span class="chip">budget</span><span class="chip">vendor</span><span class="chip">ratings</span><span class="chip">comments</span><span class="chip">chat</span><span class="chip">manager</span><span class="chip">notifications</span><span class="chip">email</span><span class="chip">audit</span><span class="chip">storage</span><span class="chip">sse</span><span class="chip">admin</span>
</div>
<p style="font-size: 15px; color: var(--ink-3); margin-top: 18px; line-height: 1.4;">
Package-by-feature. <strong>Zero cyclic imports</strong> between feature roots — services talk through interfaces, never reach into each other's repositories.
</p>
</div>

<div>

<div class="stat" style="margin-bottom: 32px;">
<div class="big">578</div>
<div class="label">tests · unit + integration · H2-backed</div>
</div>

<div class="stat" style="margin-bottom: 32px;">
<div class="big">28</div>
<div class="label">Flyway migrations · forward-only · version-pinned</div>
</div>

<div class="stat">
<div class="big">524</div>
<div class="label">source files across backend + frontend</div>
</div>

</div>

</div>

<!--
SPEAKER NOTES (30s):
"Tests live next to the code. Migrations are forward-only — no editing
applied SQL. Features don't import each other — if comments needs an event,
it goes through the event service, never reaches into the event repository.
The next developer finds the file in under 30 seconds."
-->

---

<p class="kicker">What's new</p>

<h2 style="margin-bottom: 36px;">Three things Eventbrite doesn't do.</h2>

<div class="num-card">
<span class="num">01</span>
<p class="head">One account, four roles, per event.</p>
<p class="sub">Wizkid's promoter and his caterer log in the same way. The system tracks which hat fits which event — no separate "vendor accounts" to manage.</p>
</div>

<div class="num-card">
<span class="num">02</span>
<p class="head">Vendor marketplace baked in, not bolted on.</p>
<p class="sub">Catering, AV, security — discover, apply, get accepted, get rated. End to end inside the same product an attendee uses to buy a ticket.</p>
</div>

<div class="num-card">
<span class="num">03</span>
<p class="head">A war room, live, during the event.</p>
<p class="sub">Tickets sold, check-ins, comments — Server-Sent Events stream straight to the organiser dashboard. No refresh. No spreadsheet. No drama.</p>
</div>

<!--
SPEAKER NOTES (30s):
"Three things you won't find on Eventbrite.
One — multi-role-per-event accounts.
Two — the vendor side of events is a first-class citizen, not a separate
listing on Instagram.
Three — when the event is running, the organiser has a war-room view that
updates without refreshing. That's what an event coordinator actually needs
at 11:30 PM on December 28th."
-->

---

<p class="kicker">Honest roadmap</p>

<h2 style="margin-bottom: 30px;">What we've shipped — and what's still broken.</h2>

<div class="cols-2" style="gap: 48px;">

<div class="road-col shipped">
<h4>✓ &nbsp; Shipped — what works today</h4>

<div class="road-item">
<span class="marker">✓</span>
<span><strong>Multi-role per event.</strong> One account, organiser + vendor + attendee + check-in staff.</span>
</div>
<div class="road-item">
<span class="marker">✓</span>
<span><strong>Booking + ticketing with QR codes.</strong> Monnify-integrated, HMAC-verified webhooks.</span>
</div>
<div class="road-item">
<span class="marker">✓</span>
<span><strong>Vendor marketplace + verification queue.</strong> Pitch, accept, rate. End to end.</span>
</div>
<div class="road-item">
<span class="marker">✓</span>
<span><strong>Programme · budget · guest list · comments.</strong> The full organiser workspace.</span>
</div>
<div class="road-item">
<span class="marker">✓</span>V
<span><strong>Live activity feed</strong> via SSE during the event itself.</span>
</div>
<div class="road-item">
<span class="marker">✓</span>
<span><strong>578 tests · 28 migrations · deployed on EC2.</strong> Real, running, observable.</span>
</div>
</div>

<div class="road-col next">
<h4>→ &nbsp; Shipping next — what BNXN's promoter still needs</h4>

<div class="road-item">
<span class="marker">→</span>
<span><strong>Cryptographically signed tickets.</strong> Every QR is signed by the organiser's key, verified at scan. <span class="why">Kills the Twitter resale fake-ticket market.</span></span>
</div>
<div class="road-item">
<span class="marker">→</span>
<span><strong>Hard venue-capacity enforcement.</strong> Organiser attests, system blocks the (capacity+1)th sale. <span class="why">No more "5,000 tickets, 3,500-seat venue."</span></span>
</div>
<div class="road-item">
<span class="marker">→</span>
<span><strong>Vendor payment escrow.</strong> Held in trust, released on confirmed delivery. <span class="why">Solves the wedding caterer AND the unpaid photographer in one mechanism.</span></span>
</div>
<div class="road-item">
<span class="marker">→</span>
<span><strong>Offline-first check-in scanner.</strong> Works without venue wifi, syncs when it returns. <span class="why">Concerts have terrible signal.</span></span>
</div>
<div class="road-item">
<span class="marker">→</span>
<span><strong>Official resale + transfer market.</strong> QR re-issuance kills secondary scams. <span class="why">Twitter resales become impossible — only platform-signed tickets scan.</span></span>
</div>
<div class="road-item">
<span class="marker">→</span>
<span><strong>KYC for high-volume organisers.</strong> Identity + bank verification before they can sell at scale.</span>
</div>
</div>

</div>

<!--
SPEAKER NOTES (60s):
"I want to be honest about what this is and isn't.

[Gesture left] Everything in the left column is in the codebase you'll see
in the demo. Multi-role accounts, booking with QR codes, vendor marketplace,
live dashboard. 578 tests across the backend, 28 migrations, deployed and
observable on EC2.

[Gesture right] The right column is what BNXN's promoter still couldn't use
this for — yet. Signed tickets to kill Twitter resales. Hard venue caps to
prevent oversells. Vendor escrow to solve the caterer-ghosting and the
unpaid-photographer problems in one mechanism. Offline scanners because
concerts have bad wifi.

These aren't aspirational — they're scoped, they're sequenced, and three of
them have the data model already in place. The next 90 days closes that
right column."
-->

---

<!-- _class: dark no-page -->

<div style="display:flex; flex-direction:column; height:100%; justify-content:space-between;">

<span class="brand-badge" style="font-size:20px; color:#fff;">EventNest</span>

<div>
<h1 style="font-size: 112px; line-height: 0.95;">
Built for Lagos.<br/>
<span style="color:#93B4F4;">Built to last December.</span>
</h1>
<p style="font-size: 26px; margin-top: 40px; max-width: 920px; line-height: 1.5;">
The system of record for the Nigerian event economy.<br/>
<em style="color: rgba(255,255,255,0.6);">Now ask me anything.</em>
</p>
</div>

<div style="display: flex; gap: 40px; font-size: 14px; color: rgba(255,255,255,0.55); letter-spacing: 0.05em;">
<span>GITHUB.COM/[YOU]/EVENTS-NEST</span>
<span>EVENTNEST.LIVE</span>
<span>[YOUR NAME] · [YOUR EMAIL]</span>
</div>

</div>

<!--
SPEAKER NOTES (10s):
"Detty December shouldn't be a logistics nightmare. EventNest is the
system of record for Lagos events. I'm [Name] — ask me anything."

Then breathe. The next 2 minutes is Q&A. You've rehearsed these:
- Why monolith, not microservices?
- How do you handle payment failures?
- Double-booking the same seat?
- Stateless JWT and logout?
- Scalability story?
- Why did you skip X?
- What's next?
-->
