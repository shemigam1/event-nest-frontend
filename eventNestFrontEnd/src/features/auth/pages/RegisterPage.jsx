import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useDispatch } from "react-redux";
import { GoogleLogin } from "@react-oauth/google";
import { useRegisterMutation, useSocialAuthMutation } from "../authApi";
import { setCredentials } from "../authSlice";
import { formStyles as s } from "../../../styles/formStyles";

export default function RegisterPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [formData, setFormData] = useState({ name: "", email: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");

    const [register, { isLoading }] = useRegisterMutation();
    const [socialAuth, { isLoading: isSocialLoading }] = useSocialAuthMutation();

    const isFormValid =
        formData.name.trim() &&
        formData.email.trim() &&
        formData.password.trim();

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;
        try {
            await register(formData).unwrap();
            navigate("/login");
        } catch (err) {
            setErrorMessage(err?.data?.message || "Registration failed. Please try again.");
        }
    };

    const handleGoogleSuccess = async ({ credential }) => {
        try {
            const data = await socialAuth({ token: credential }).unwrap();
            dispatch(setCredentials(data));
            navigate("/dashboard");
        } catch (err) {
            console.error("Google sign-up failed", err);
            setErrorMessage("Google sign-up failed. Please try again.");
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <h1 style={s.title}>Create Account</h1>
                <p style={s.sub}>Register to start booking and managing events</p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Full Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            style={s.input}
                        />
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>Email</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            style={s.input}
                        />
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>Password</label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter password"
                            style={s.input}
                        />
                    </div>

                    {errorMessage && <p style={s.error}>{errorMessage}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || !isFormValid}
                        style={s.btn}
                    >
                        {isLoading ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <div style={s.divider}>
                    <div style={s.dividerLine} />
                    <span>or</span>
                    <div style={s.dividerLine} />
                </div>

                <div style={s.socialWrapper}>
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setErrorMessage("Google sign-up failed. Please try again.")}
                        disabled={isSocialLoading}
                        text="signup_with"
                    />
                </div>

                <div style={s.footer}>
                    <p>Already have an account? <Link to="/login" style={s.link}>Login</Link></p>
                </div>
            </div>
        </div>
    );
}
