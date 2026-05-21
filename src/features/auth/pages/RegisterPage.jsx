import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useDispatch } from "react-redux";
import { useRegisterMutation } from "../authApi";
import { setUser } from "../authSlice";
import AuthLayout from "@/components/ui/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icon";

export default function RegisterPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "" });
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTermsError, setShowTermsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [register, { isLoading }] = useRegisterMutation();

    // Submit is gated on both field validity AND terms acceptance — the
    // button is disabled until everything's green. The terms-error message
    // only flashes if the user somehow bypasses the disabled state (e.g.
    // pressing Enter mid-form).
    const isFormValid =
        formData.firstName.trim() &&
        formData.lastName.trim() &&
        formData.email.trim() &&
        formData.password.length >= 8 &&
        acceptedTerms;

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (errorMessage) setErrorMessage("");
    };

    const handleTermsChange = (e) => {
        setAcceptedTerms(e.target.checked);
        if (e.target.checked) setShowTermsError(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!acceptedTerms) {
            setShowTermsError(true);
            return;
        }
        if (!isFormValid) return;
        try {
            // Don't ship the local-only acceptedTerms flag — backend doesn't
            // know about it (auditing the consent client-side is enough for
            // now; we can persist a server-side record later if needed).
            const created = await register(formData).unwrap();
            dispatch(setUser(created));
            navigate("/login");
        } catch (err) {
            setErrorMessage(err?.data?.message || "Registration failed. Please try again.");
        }
    };

    return (
        <AuthLayout>
            <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                Create your account
            </h1>
            <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                Anyone can create events. Bookings come with assigned seats.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="mp-grid-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Input
                        label="First name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="Adaeze"
                        autoComplete="given-name"
                    />
                    <Input
                        label="Last name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Okonkwo"
                        autoComplete="family-name"
                    />
                </div>

                <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    icon={<Icons.mail size={18} />}
                    autoComplete="email"
                />

                <Input
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    icon={<Icons.lock size={18} />}
                    hint="Minimum 8 characters."
                    autoComplete="new-password"
                />

                {/* Terms & conditions — required. Submit button is disabled
                    until this is ticked; an inline error appears only if the
                    user trips the gate (e.g. Enter pressed without ticking). */}
                <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--text-2)',
                    lineHeight: 1.5,
                    userSelect: 'none',
                }}>
                    <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={handleTermsChange}
                        aria-invalid={showTermsError || undefined}
                        style={{
                            width: 18,
                            height: 18,
                            marginTop: 2,
                            accentColor: 'var(--mp-blue)',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    />
                    <span>
                        I agree to the{' '}
                        <Link to="/terms" target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--mp-blue)', fontWeight: 600 }}>
                            Terms and Conditions
                        </Link>
                        {' '}and{' '}
                        <Link to="/privacy" target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--mp-blue)', fontWeight: 600 }}>
                            Privacy Policy
                        </Link>.
                    </span>
                </label>
                {showTermsError && !acceptedTerms && (
                    <span role="alert" style={{ fontSize: 12, color: 'var(--error)', marginTop: -8 }}>
                        Please accept the Terms and Conditions to continue.
                    </span>
                )}

                {errorMessage && (
                    <div role="alert" style={{
                        background: 'var(--error-bg)',
                        color: 'var(--error)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                    }}>
                        {errorMessage}
                    </div>
                )}

                <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    disabled={isLoading || !isFormValid}
                    style={{ marginTop: 4 }}
                >
                    {isLoading ? 'Creating account…' : 'Create account'}
                </Button>

                <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
                    Have one already?{' '}
                    <Link to="/login" style={{ color: 'var(--mp-blue)', fontWeight: 600 }}>
                        Sign in
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
