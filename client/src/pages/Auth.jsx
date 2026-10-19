import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ArrowUpRight } from 'lucide-react';
import { setUser } from '../store.js';
import { login, register as registerAccount } from '../services/auth.service.js';
import { setSessionToken } from '../api.js';
import { Logo } from '../components/Brand.jsx';

export function Auth({ mode }) {
  const register = mode === "register",
    dispatch = useDispatch(),
    nav = useNavigate();
  const [form, setForm] = useState({
      fullName: "",
      email: "",
      phone: "",
      password: "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const credentials = register
        ? { ...form, phone: "+91" + form.phone }
        : { email: form.email, password: form.password };
      const d = register ? await registerAccount(credentials) : await login(credentials);
      setSessionToken(d.sessionToken);
      dispatch(
        setUser(
          register && d.developmentCode
            ? { ...d.user, developmentCode: d.developmentCode }
            : d.user,
        ),
      );
      nav("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="authpage">
      <div className="authvisual">
        <Logo />
        <div>
          <span className="eyebrow">VEHICLE SAFETY PLATFORM</span>
          <h1>
            A little preparation.
            <br />A powerful difference.
          </h1>
          <p>Keep the right people one scan away.</p>
        </div>
        <div className="authquote">
          “A safer journey starts with being ready.”
        </div>
      </div>
      <section className="authform">
        <Link className="back" to="/">
          ← Back to Beacon
        </Link>
        <div className="formwrap">
          <span className="eyebrow">
            {register ? "GET STARTED" : "WELCOME BACK"}
          </span>
          <h2>{register ? "Create your account" : "Sign in to Beacon"}</h2>
          <p className="muted">
            {register
              ? "Set up emergency access for your vehicle."
              : "Manage vehicles, contacts, and alerts."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input
                  required
                  minLength="2"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            {register && (
              <label>
                Mobile number
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength="10"
                  placeholder="98765 43210"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value
                        .replace(/\D/g, "")
                        .replace(/^91(?=\d{10}$)/, "")
                        .replace(/^0(?=\d{10}$)/, "")
                        .slice(0, 10),
                    })
                  }
                />
              </label>
            )}
            <label>
              Password
              <input
                required
                type="password"
                minLength={register ? 12 : 1}
                autoComplete={register ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {register && (
                <small>
                  12+ characters, uppercase, lowercase, number and symbol.
                </small>
              )}
            </label>
            {error && <div className="error">{error}</div>}
            <button className="button dark full" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}{" "}
              <ArrowUpRight size={16} />
            </button>
          </form>
          <p className="switch">
            {register ? "Already have an account?" : "New to Beacon?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
