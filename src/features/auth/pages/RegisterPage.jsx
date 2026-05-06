import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useRegisterMutation } from "../authApi";
import { formStyles as s } from "../../../styles/formStyles";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "" });
    const [errorMessage, setErrorMessage] = useState("");
    const [register, { isLoading }] = useRegisterMutation();

    const isFormValid =
        formData.firstName.trim() &&
        formData.lastName.trim() &&
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

    return (
        <div style={s.page}>
            <div style={s.card}>
                <h1 style={s.title}>Create Account</h1>
                <p style={s.sub}>Register to start booking and managing events</p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.row}>
                        <div style={s.field}>
                            <label style={s.label}>First Name</label>
                            <input
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                placeholder="John"
                                style={s.input}
                            />
                        </div>

                        <div style={s.field}>
                            <label style={s.label}>Last Name</label>
                            <input
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                placeholder="Doe"
                                style={s.input}
                            />
                        </div>
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

                    <button type="submit" disabled={isLoading || !isFormValid} style={s.btn}>
                        {isLoading ? "Creating Account..." : "Register"}
                    </button>
                </form>

                <div style={s.footer}>
                    <p>Already have an account? <Link to="/login" style={s.link}>Login</Link></p>
                </div>
            </div>
        </div>
    );
}
