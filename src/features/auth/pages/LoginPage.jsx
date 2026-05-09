import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../authApi";
import { setCredentials } from "../authSlice";
import { userFromToken } from "@/utils/decodeJwt";
import AuthLayout from "@/components/ui/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Icons } from "@/components/ui/Icon";

export default function LoginPage() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [login, { isLoading }] = useLoginMutation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const isFormValid = formData.email && formData.password;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errorMessage) setErrorMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;
        try {
            const data = await login(formData).unwrap();
            dispatch(setCredentials(data));
            const tokenUser = userFromToken(data.accessToken);
            const isAdmin   = tokenUser?.roles?.includes('ROLE_ADMIN') ?? false;
            const defaultDest = isAdmin ? '/admin/moderation' : '/dashboard';
            const destination = location.state?.from ?? defaultDest;
            navigate(destination, { replace: true });
        } catch {
            setErrorMessage("Invalid email or password.");
        }
    };

    return (
        <AuthLayout>
            <h1 className="mp-h2" style={{ margin: 0, color: 'var(--text-1)' }}>
                Welcome back
            </h1>
            <p className="body" style={{ color: 'var(--text-2)', margin: '8px 0 28px' }}>
                Sign in to view your events and tickets.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    autoComplete="current-password"
                />

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
                    {isLoading ? 'Signing in…' : 'Sign in'}
                </Button>

                <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
                    No account?{' '}
                    <Link to="/register" style={{ color: 'var(--mp-blue)', fontWeight: 600 }}>
                        Register
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
