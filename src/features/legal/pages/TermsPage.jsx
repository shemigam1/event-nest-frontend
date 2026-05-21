import LegalPage, { Section } from '../LegalPage';

/* Placeholder Terms & Conditions copy. Replace with real, lawyer-reviewed
   content before going to production — this is just enough to ship the
   signup flow's T&C link without 404'ing. */
export default function TermsPage() {
    return (
        <LegalPage title="Terms and Conditions" lastUpdated="May 2026">
            <p>
                Welcome to EventNest. By creating an account or using our platform,
                you agree to the following terms. Please read them carefully — if
                anything is unclear, reach out to us before signing up.
            </p>

            <Section title="1. Your account">
                <p>
                    You're responsible for everything that happens under your
                    account, including keeping your password secure and the actions
                    of anyone you invite to co-manage your events. One person,
                    one account: don't share login credentials.
                </p>
            </Section>

            <Section title="2. Hosting events">
                <p>
                    As an organiser, you're solely responsible for the events you
                    host — accurate descriptions, honest pricing, delivering what
                    you sold tickets for, and complying with the law (including
                    age, safety, and licensing requirements where applicable).
                    EventNest is a facilitator; we don't run your event.
                </p>
            </Section>

            <Section title="3. Buying tickets">
                <p>
                    Tickets are issued by the organiser and bound to the buyer's
                    account. Refund and transfer rules are set per-event by the
                    organiser and shown on the event page before you check out.
                    Fraudulent chargebacks may result in account suspension.
                </p>
            </Section>

            <Section title="4. Payments and escrow">
                <p>
                    Payments flow through our payment partner. For vendor
                    contracts, funds are held in escrow and released to vendors
                    as milestones are confirmed. Disputes are reviewed by
                    EventNest admins — see the Escrow disputes section of your
                    contract for the full process.
                </p>
            </Section>

            <Section title="5. Acceptable use">
                <p>
                    Don't use EventNest for illegal events, harassment, spam,
                    misleading promotion, or to scrape our platform. We may
                    suspend or terminate accounts that breach these rules.
                </p>
            </Section>

            <Section title="6. Liability">
                <p>
                    EventNest is provided "as is". We do our best to keep the
                    service available, but we're not liable for losses arising
                    from event cancellations, third-party actions, or service
                    interruptions beyond our reasonable control.
                </p>
            </Section>

            <Section title="7. Changes to these terms">
                <p>
                    We may update these terms as the product evolves. We'll
                    notify you of material changes before they take effect. By
                    continuing to use EventNest after a change, you accept the
                    updated terms.
                </p>
            </Section>

            <Section title="8. Contact">
                <p>
                    Questions or concerns? Email{' '}
                    <a href="mailto:support@eventnest.example" style={{ color: 'var(--mp-blue)', fontWeight: 600 }}>
                        support@eventnest.example
                    </a>.
                </p>
            </Section>
        </LegalPage>
    );
}
