import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLoginMutation } from "../authApi";
import { formStyles as s } from "../../../styles/formStyles";

export default function LoginPage() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [login, { isLoading }] = useLoginMutation();
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState("");

    const isFormValid = formData.email && formData.password;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) {
            setErrorMessage("Please fill in all fields.");
            return;
        }
        try {
            await login(formData).unwrap();
            navigate("/dashboard");
        } catch (err) {
            console.error("Failed to login", err);
            setErrorMessage("Invalid email or password.");
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <h1 style={s.title}>Login</h1>
                <p style={s.sub}>Enter your email and password to continue</p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Email</label>
                        <input
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your Email"
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
                            placeholder="Enter your password"
                            style={s.input}
                        />
                    </div>

                    {errorMessage && <p style={s.error}>{errorMessage}</p>}

                    <button type="submit" disabled={isLoading || !isFormValid} style={s.btn}>
                        {isLoading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <div style={s.footer}>
                    <p>Not registered? <Link to="/register" style={s.link}>Register</Link></p>
                </div>
            </div>
        </div>
    );
}
