import { useEffect } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser } from './services/auth.service.js';
import { clearSessionToken } from './api.js';
import { clearUser, setAuthUnavailable, setUser } from './store.js';
import { Logo } from './components/Brand.jsx';
import { Landing } from './pages/Landing.jsx';
import { Auth } from './pages/Auth.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Admin } from './pages/Admin.jsx';
import { PublicEmergency } from './pages/PublicEmergency.jsx';

function App() {
  const dispatch = useDispatch(),
    user = useSelector((s) => s.session.user),
    ready = useSelector((s) => s.session.ready),
    unavailable = useSelector((s) => s.session.unavailable);
  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((d) => {
        if (active) dispatch(setUser(d.user));
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          clearSessionToken();
          dispatch(clearUser());
        } else {
          dispatch(setAuthUnavailable());
        }
      });
    return () => {
      active = false;
    };
  }, [dispatch]);
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<Landing user={user} ready={ready} unavailable={unavailable} />}
        />
        <Route
          path="/login"
          element={ready && user ? <Navigate to="/dashboard" replace /> : <Auth mode="login" />}
        />
        <Route
          path="/register"
          element={ready && user ? <Navigate to="/dashboard" replace /> : <Auth mode="register" />}
        />
        <Route path="/emergency/:token" element={<PublicEmergency />} />
        <Route
          path="/dashboard"
          element={
            !ready ? <AuthLoading /> : unavailable ? <AuthUnavailable /> : user ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/admin"
          element={
            !ready ? <AuthLoading /> : unavailable ? <AuthUnavailable /> : !user ? <Navigate to="/login" replace /> : user.role === "ADMIN" ? <Admin /> : <Navigate to="/dashboard" replace />
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function AuthLoading() {
  return <main className="authpage"><p role="status">Checking your session…</p></main>;
}

function AuthUnavailable() {
  return (
    <main className="authpage">
      <p role="alert">Unable to check your session. Check your connection and refresh.</p>
      <button className="button dark" onClick={() => window.location.reload()}>Try again</button>
    </main>
  );
}

function NotFound() {
  return (
    <main className="publicpage">
      <Logo />
      <div className="publicerror">
        <span className="eyebrow">BEACON / PAGE NOT FOUND</span>
        <h1>This page isn’t available.</h1>
        <p className="muted">Check the address or return to the home page.</p>
        <Link className="button dark" to="/">Go to home</Link>
      </div>
    </main>
  );
}

export default App;
