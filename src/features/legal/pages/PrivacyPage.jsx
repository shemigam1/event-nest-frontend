import LegalPage, { Section } from '../LegalPage';

/* Placeholder Privacy Policy. Replace with reviewed copy before production —
   shipped now to keep the signup T&C link working. */
export default function PrivacyPage() {
    return (
        <LegalPage title="Privacy Policy" lastUpdated="May 2026">
            <p>
                EventNest takes your privacy seriously. This policy explains what
                we collect, how we use it, and the choices you have over your data.
            </p>

            <Section title="1. What we collect">
                <p>
                    When you create an account, we collect your name, email,
                    and a hashed password. As you use EventNest, we also collect
                    events you create or attend, tickets you buy, messages you
                    send, and basic device/usage metadata to keep the service
                    running and secure.
                </p>
            </Section>

            <Section title="2. How we use your data">
                <p>
                    We use your data to operate the platform — authenticating
                    you, delivering tickets, processing payments, sending
                    transactional emails (booking confirmations, password
                    resets), and surfacing relevant events. We don't sell your
                    personal data to advertisers.
                </p>
            </Section>

            <Section title="3. Who we share it with">
                <p>
                    Limited categories of third parties help us run EventNest:
                    payment processors, email delivery, cloud hosting, and
                    error monitoring. They only see what they need to do their
                    job, under contract.
                </p>
                <p>
                    Organisers can see the buyer name and ticket count for their
                    own events. Vendors see only what an organiser explicitly
                    shares with them through a contract.
                </p>
            </Section>

            <Section title="4. Cookies & local storage">
                <p>
                    We use browser storage to keep you signed in and remember
                    your workspace and theme preferences. We don't use
                    advertising cookies.
                </p>
            </Section>

            <Section title="5. Your rights">
                <p>
                    You can update your profile, change your password, and
                    request deletion of your account at any time from Settings.
                    Deleted accounts are removed within 30 days, except where
                    we're legally required to retain records (e.g. tax history
                    of completed transactions).
                </p>
            </Section>

            <Section title="6. Security">
                <p>
                    Passwords are hashed with industry-standard algorithms. We
                    use TLS in transit. No system is perfectly secure, so use
                    a strong, unique password and tell us right away if you
                    suspect your account has been compromised.
                </p>
            </Section>

            <Section title="7. Children">
                <p>
                    EventNest is intended for users 18 and over. If you become
                    aware that a child has provided us with personal data, contact
                    us and we'll delete it.
                </p>
            </Section>

            <Section title="8. Contact">
                <p>
                    For privacy questions or data requests, email{' '}
                    <a href="mailto:privacy@eventnest.example" style={{ color: 'var(--mp-blue)', fontWeight: 600 }}>
                        privacy@eventnest.example
                    </a>.
                </p>
            </Section>
        </LegalPage>
    );
}
