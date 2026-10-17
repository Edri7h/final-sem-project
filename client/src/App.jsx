import { downloadQrCard, printQrCard } from "./qr-card.js";
import { api, hasSessionToken } from "./api.js";
import React, { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser, clearUser } from "./store.js";
import {
  ShieldAlert,
  Car,
  HeartPulse,
  MapPin,
  LogOut,
  Plus,
  Phone,
  CheckCircle,
  Activity,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
function App() {
  const dispatch = useDispatch(),
    user = useSelector((s) => s.session.user),
    ready = useSelector((s) => s.session.ready);
  useEffect(() => {
    if (!hasSessionToken()) {
      dispatch(clearUser());
      return;
    }
    api("/api/auth/me")
      .then((d) => dispatch(setUser(d.user)))
      .catch(() => dispatch(clearUser()));
  }, []);
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/emergency/:token" element={<PublicEmergency />} />
        <Route
          path="/dashboard"
          element={ready && user ? <Dashboard /> : <Auth mode="login" />}
        />
        <Route
          path="/admin"
          element={user?.role === "ADMIN" ? <Admin /> : <Dashboard />}
        />
        <Route path="*" element={<Landing />} />
      </Routes>
    </>
  );
}
function Landing() {
  return (
    <main className="landing">
      <nav className="top">
        <Logo />
        <div className="navlinks">
          <a href="#how">How it works</a>
          <Link to="/login">Sign in</Link>
          <Link className="button dark small" to="/register">
            Get started <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div className="eyebrow">
          <span className="pulse" /> Safety, made reachable
        </div>
        <h1>
          When seconds
          <br />
          matter, <em>connect.</em>
        </h1>
        <p className="lead">
          A simple scan gives a bystander a direct way to alert the people who
          can help—without an app, an account, or an accidental call.
        </p>
        <div className="heroactions">
          <Link className="button dark" to="/register">
            Set up your vehicle <ArrowUpRight size={17} />
          </Link>
          <a className="quiet" href="#how">
            See how it works <span>↓</span>
          </a>
        </div>
        <div className="note">
          <ShieldAlert size={16} /> An alert is never sent automatically. Every
          report needs your confirmation.
        </div>
      </section>
      <div className="hero-art">
        <div className="orb"></div>
        <div className="art-card">
          <div className="art-top">
            <span className="tiny-logo">B</span>
            <span>BEACON / ROAD SAFETY</span>
            <span className="art-live">READY</span>
          </div>
          <div className="carline">
            <div className="carbadge">
              <Car size={27} />
            </div>
            <div>
              <strong>Vehicle emergency card</strong>
              <small>Scan to request help</small>
            </div>
          </div>
          <div className="qr-preview">
            {Array.from({ length: 81 }, (_, i) => (
              <i
                key={i}
                style={{
                  opacity: Math.sin(i * 17) * Math.cos(i * 5) > 0.05 ? 1 : 0.06,
                }}
              />
            ))}
          </div>
          <div className="artfoot">
            <MapPin size={14} /> Private information stays private{" "}
            <span>●</span>
          </div>
        </div>
        <div className="floating-alert">
          <span className="green-dot" />
          Emergency alert delivered
        </div>
      </div>
      <section id="how" className="steps">
        <div className="steps-title">
          <span>BUILT FOR REAL MOMENTS</span>
          <h2>Help is a few clear steps away.</h2>
        </div>
        <div className="stepgrid">
          <Step
            n="01"
            title="Register your vehicle"
            text="Add your details and the people who should be contacted."
          />
          <Step
            n="02"
            title="Place your QR"
            text="Print your secure, unique code and put it where it can be found."
          />
          <Step
            n="03"
            title="Someone scans"
            text="They share their location, choose what happened, and confirm."
          />
          <Step
            n="04"
            title="Your people know"
            text="Verified contacts receive an SMS with the alert and map link."
          />
        </div>
      </section>
      <footer>
        <Logo />
        <span>For emergencies, every second and every choice matters.</span>
      </footer>
    </main>
  );
}
function Logo() {
  return (
    <Link to="/" className="brand">
      <span className="brandmark">
        <Activity size={18} />
      </span>
      beacon<span className="branddot">.</span>
    </Link>
  );
}
function Step({ n, title, text }) {
  return (
    <div className="step">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Auth({ mode }) {
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
      const d = await api("/api/auth/" + (register ? "register" : "login"), {
        method: "POST",
        body: JSON.stringify(
          register
            ? { ...form, phone: "+91" + form.phone }
            : { email: form.email, password: form.password },
        ),
      });
      if (d.sessionToken)
        sessionStorage.setItem("beacon.sessionToken", d.sessionToken);
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
function Dashboard() {
  const dispatch = useDispatch(),
    user = useSelector((s) => s.session.user);
  const [tab, setTab] = useState("Overview"),
    [vehicles, setVehicles] = useState([]),
    [alerts, setAlerts] = useState([]),
    [contacts, setContacts] = useState([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [showVehicle, setShowVehicle] = useState(false),
    [editingVehicle, setEditingVehicle] = useState(null),
    [showContact, setShowContact] = useState(null),
    [qrDialog, setQrDialog] = useState(null),
    [qrBusy, setQrBusy] = useState(false),
    [verifyCode, setVerifyCode] = useState("");
  const [vf, setVf] = useState({
      registrationNumber: "",
      make: "",
      model: "",
      color: "",
      description: "",
    }),
    [cf, setCf] = useState({ name: "", phone: "", relationship: "" });
  async function load() {
    try {
      const [v, a, c] = await Promise.all([
        api("/api/vehicles"),
        api("/api/alerts"),
        api("/api/contacts"),
      ]);
      setVehicles(v.data);
      setAlerts(a.data);
      setContacts(c.data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (user?.phoneVerified) load();
  }, [user]);
  async function verifyPhone(e) {
    e.preventDefault();
    try {
      await api("/api/auth/verify-phone", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode }),
      });
      const { developmentCode, ...verifiedUser } = user;
      dispatch(setUser({ ...verifiedUser, phoneVerified: true }));
      setMessage("Phone verified. You can now set up your vehicle.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function addVehicle(e) {
    e.preventDefault();
    try {
      if (editingVehicle)
        await api(`/api/vehicles/${editingVehicle.id}`, {
          method: "PATCH",
          body: JSON.stringify(vf),
        });
      else
        await api("/api/vehicles", {
          method: "POST",
          body: JSON.stringify(vf),
        });
      setShowVehicle(false);
      setEditingVehicle(null);
      setVf({
        registrationNumber: "",
        make: "",
        model: "",
        color: "",
        description: "",
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function addContact(e) {
    e.preventDefault();
    try {
      const d = await api(`/api/vehicles/${showContact}/contacts`, {
        method: "POST",
        body: JSON.stringify({ ...cf, phone: "+91" + cf.phone }),
      });
      setMessage(
        d.developmentCode
          ? `Contact added. Local development OTP: ${d.developmentCode}`
          : `Contact added. A verification code was sent to ${d.contact.phone}.`,
      );
      setShowContact(null);
      setCf({ name: "", phone: "", relationship: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function replaceQr() {
    if (!qrDialog) return;
    setQrBusy(true);
    setError("");
    try {
      await api(`/api/vehicles/${qrDialog.vehicle.id}/qr/regenerate`, {
        method: "POST",
      });
      setQrDialog({ ...qrDialog, replaced: true });
      load();
    } catch (e) {
      setError(e.message);
      setQrDialog(null);
    } finally {
      setQrBusy(false);
    }
  }
  async function act(url, options) {
    setError("");
    try {
      await api(url, options);
      setMessage("Changes saved.");
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    sessionStorage.removeItem("beacon.sessionToken");
    dispatch(clearUser());
  }
  return (
    <main className="dash">
      <header className="dashnav">
        <Logo />
        <div className="dashuser">
          <span className="avatar">{user?.fullName?.[0]}</span>
          <span>{user?.fullName}</span>
          <button className="iconbtn" aria-label="Log out" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <div className="dashbody">
        <aside className="sidebar">
          <div className="welcome">
            <span className="eyebrow">YOUR SPACE</span>
            <h2>
              Good to see you,
              <br />
              {user?.fullName?.split(" ")[0]}.
            </h2>
            <p>Stay ready. Stay connected.</p>
          </div>
          {[
            "Overview",
            "Vehicles",
            "Emergency contacts",
            "Alert history",
            "Account settings",
            ...(user?.role === "ADMIN" ? ["Admin"] : []),
          ].map((x) => (
            <button
              className={"sideitem " + (tab === x ? "selected" : "")}
              key={x}
              onClick={() => setTab(x)}
            >
              {x === "Overview" ? (
                <Activity size={17} />
              ) : x === "Vehicles" ? (
                <Car size={17} />
              ) : x === "Emergency contacts" ? (
                <HeartPulse size={17} />
              ) : x === "Admin" ? (
                <ShieldAlert size={17} />
              ) : (
                <MapPin size={17} />
              )}{" "}
              {x}
            </button>
          ))}
          <div className="sidehelp">
            <ShieldAlert size={18} />
            <strong>Need help?</strong>
            <p>Beacon sends an alert only after a bystander confirms.</p>
          </div>
        </aside>
        <section className="dashcontent">
          {error && (
            <div className="error banner" onClick={() => setError("")}>
              {error}
              <button>×</button>
            </div>
          )}
          {message && (
            <div className="success banner">
              {message}
              <button onClick={() => setMessage("")}>×</button>
            </div>
          )}
          {!user?.phoneVerified &&
          ["Vehicles", "Emergency contacts", "Admin"].includes(tab) ? (
            <div className="verify-card">
              <div className="verify-icon">
                <Phone />
              </div>
              <span className="eyebrow">ONE MORE STEP</span>
              <h1>Verify your phone</h1>
              <p>
                We sent a one-time code to <b>{user?.phone}</b>. Verify to
                activate vehicle and contact management.
              </p>
              {user?.developmentCode && (
                <div className="devcode">
                  Local development OTP: <b>{user.developmentCode}</b>
                </div>
              )}
              <form className="inlineform" onSubmit={verifyPhone}>
                <input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  placeholder="6 digit code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  required
                />
                <button className="button dark">
                  Verify number <ArrowUpRight size={16} />
                </button>
              </form>
              <button
                className="textbutton"
                onClick={() =>
                  api("/api/auth/resend-code", { method: "POST" })
                    .then((d) =>
                      setMessage(
                        d.developmentCode
                          ? `Local development OTP: ${d.developmentCode}`
                          : "A new code was sent.",
                      ),
                    )
                    .catch((e) => setError(e.message))
                }
              >
                Resend code
              </button>
            </div>
          ) : (
            <>
              <div className="content-heading">
                <div>
                  <span className="eyebrow">BEACON / {tab.toUpperCase()}</span>
                  <h1>
                    {tab === "Overview" ? "Your safety, at a glance." : tab}
                  </h1>
                  <p className="muted">
                    {tab === "Overview"
                      ? "Keep your emergency details current and ready."
                      : `Manage your ${tab.toLowerCase()} in one place.`}
                  </p>
                </div>
                {tab === "Vehicles" && (
                  <button
                    className="button dark"
                    onClick={() => setShowVehicle(true)}
                  >
                    <Plus size={17} /> Add vehicle
                  </button>
                )}
              </div>
              {tab === "Admin" ? (
                <Admin />
              ) : tab === "Vehicles" ? (
                <VehicleList
                  items={vehicles}
                  contacts={contacts}
                  setShowContact={setShowContact}
                  act={act}
                  onReplaceQr={(vehicle) =>
                    setQrDialog({ vehicle, replaced: false })
                  }
                  onPrintQr={(vehicle) =>
                    printQrCard(vehicle).catch((e) => setError(e.message))
                  }
                  onDownloadQr={(vehicle) =>
                    downloadQrCard(vehicle).catch((e) =>
                      setError(e.message),
                    )
                  }
                  onEdit={(v) => {
                    setEditingVehicle(v);
                    setVf({
                      registrationNumber: v.registrationNumber,
                      make: v.make,
                      model: v.model,
                      color: v.color,
                      description: v.description || "",
                    });
                    setShowVehicle(true);
                  }}
                />
              ) : tab === "Emergency contacts" ? (
                <ContactList items={contacts} onChange={load} />
              ) : tab === "Alert history" ? (
                <AlertList items={alerts} act={act} />
              ) : tab === "Account settings" ? (
                <ProfileSettings
                  user={user}
                  onSave={(u) => dispatch(setUser(u))}
                />
              ) : (
                <>
                  <div className="stats">
                    <Stat
                      icon={<Car />}
                      n={vehicles.length}
                      label="Registered vehicles"
                    />
                    <Stat
                      icon={<HeartPulse />}
                      n={contacts.filter((c) => c.verified).length}
                      label="Verified contacts"
                    />
                    <Stat
                      icon={<ShieldAlert />}
                      n={alerts.length}
                      label="Emergency alerts"
                    />
                  </div>
                  <div className="dashgrid">
                    <div className="panel">
                      <div className="panelhead">
                        <div>
                          <span className="eyebrow">YOUR VEHICLES</span>
                          <h3>Ready when needed</h3>
                        </div>
                        <button
                          className="linkbutton"
                          onClick={() => setTab("Vehicles")}
                        >
                          View all →
                        </button>
                      </div>
                      {vehicles.length ? (
                        vehicles
                          .slice(0, 3)
                          .map((v) => <VehicleRow key={v.id} v={v} />)
                      ) : (
                        <div className="empty">
                          <Car size={25} />
                          <p>No vehicles added yet.</p>
                          <button
                            className="textbutton"
                            onClick={() => setShowVehicle(true)}
                          >
                            Add your first vehicle →
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="panel alerts-panel">
                      <span className="eyebrow">LATEST ALERTS</span>
                      <h3>Recent activity</h3>
                      {alerts.length ? (
                        alerts.slice(0, 4).map((a) => (
                          <div className="alert-row" key={a.id}>
                            <span className="alert-dot" />
                            <div>
                              <b>{a.type.toLowerCase()}</b>
                              <small>
                                {new Date(a.createdAt).toLocaleString()}
                              </small>
                            </div>
                            <Badge value={a.status} />
                          </div>
                        ))
                      ) : (
                        <div className="empty">
                          <CheckCircle size={25} />
                          <p>No alerts. We hope it stays that way.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
      {showVehicle && (
        <Modal
          title={editingVehicle ? "Edit vehicle details" : "Add a vehicle"}
          close={() => {
            setShowVehicle(false);
            setEditingVehicle(null);
          }}
        >
          <form onSubmit={addVehicle}>
            <label>
              Registration number
              <input
                required
                value={vf.registrationNumber}
                onChange={(e) =>
                  setVf({ ...vf, registrationNumber: e.target.value })
                }
              />
            </label>
            <div className="formrow">
              <label>
                Make
                <input
                  required
                  value={vf.make}
                  onChange={(e) => setVf({ ...vf, make: e.target.value })}
                />
              </label>
              <label>
                Model
                <input
                  required
                  value={vf.model}
                  onChange={(e) => setVf({ ...vf, model: e.target.value })}
                />
              </label>
            </div>
            <label>
              Color
              <input
                required
                value={vf.color}
                onChange={(e) => setVf({ ...vf, color: e.target.value })}
              />
            </label>
            <label>
              Description <small>Optional</small>
              <input
                value={vf.description}
                onChange={(e) => setVf({ ...vf, description: e.target.value })}
              />
            </label>
            <button className="button dark full">Save vehicle</button>
          </form>
        </Modal>
      )}
      {qrDialog && (
        <Modal
          title={qrDialog.replaced ? "QR replaced" : "Replace this QR?"}
          close={() => setQrDialog(null)}
        >
          {qrDialog.replaced ? (
            <>
              <p className="muted">
                The old QR no longer works. Print or download the new QR and
                place it on your vehicle.
              </p>
              <div className="qr-modal-actions">
                <button
                  className="button dark"
                  onClick={() =>
                    printQrCard(qrDialog.vehicle).catch((e) =>
                      setError(e.message),
                    )
                  }
                >
                  Print card
                </button>
                <button
                  className="button light"
                  onClick={() =>
                    downloadQrCard(qrDialog.vehicle).catch((e) =>
                      setError(e.message),
                    )
                  }
                >
                  Download card
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                Replacing takes effect immediately. Any existing printed copy
                will stop working, so make sure you can print or download the
                new QR.
              </p>
              <div className="qr-modal-actions">
                <button
                  className="button light"
                  onClick={() => setQrDialog(null)}
                  disabled={qrBusy}
                >
                  Cancel
                </button>
                <button
                  className="button dark"
                  onClick={replaceQr}
                  disabled={qrBusy}
                >
                  {qrBusy ? "Replacing…" : "Replace QR"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
      {showContact && (
        <Modal
          title="Add an emergency contact"
          close={() => setShowContact(null)}
        >
          <p className="muted">
            They’ll need to verify their mobile number before receiving alerts.
          </p>
          <form onSubmit={addContact}>
            <label>
              Contact name
              <input
                required
                minLength="2"
                maxLength="120"
                value={cf.name}
                onChange={(e) => setCf({ ...cf, name: e.target.value })}
              />
            </label>
            <label>
              Mobile number
              <input
                required
                type="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength="10"
                title="Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9"
                placeholder="98765 43210"
                value={cf.phone}
                onChange={(e) =>
                  setCf({
                    ...cf,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
              />
            </label>
            <label>
              Relationship (optional)
              <input
                value={cf.relationship}
                onChange={(e) => setCf({ ...cf, relationship: e.target.value })}
              />
            </label>
            <button className="button dark full">Add contact</button>
          </form>
        </Modal>
      )}
    </main>
  );
}
function Stat({ icon, n, label }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}
function Badge({ value }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      {value.toLowerCase()}
    </span>
  );
}
function VehicleRow({ v }) {
  return (
    <div className="vehiclerow">
      <span className="caricon">
        <Car size={20} />
      </span>
      <div>
        <b>
          {v.make} {v.model}
        </b>
        <small>
          {v.registrationNumber} · {v.color}
        </small>
      </div>
      <Badge value={v.status} />
    </div>
  );
}
function VehicleList({
  items,
  contacts,
  setShowContact,
  act,
  onEdit,
  onReplaceQr,
  onPrintQr,
  onDownloadQr,
}) {
  const [expanded, setExpanded] = useState({});
  return (
    <div className="vehiclegrid">
      {items.map((v) => {
        const linkedContacts = contacts.filter((c) => c.vehicleId === v.id);
        const isExpanded = !!expanded[v.id];
        return (
          <article className="vehiclecard" key={v.id}>
            <div className="vehiclecardtop">
              <div className="caricon">
                <Car />
              </div>
              <Badge value={v.status} />
            </div>
            <span className="eyebrow">{v.registrationNumber}</span>
            <h3>
              {v.make} {v.model}
            </h3>
            <p>
              {v.color}
              {v.description ? ` · ${v.description}` : ""}
            </p>
            <div className="contactcount">
              <HeartPulse size={15} />
              <span>{linkedContacts.length} of 2 contacts</span>
              <button
                className="inline-action"
                aria-expanded={isExpanded}
                aria-controls={`vehicle-contacts-${v.id}`}
                onClick={() =>
                  setExpanded({ ...expanded, [v.id]: !isExpanded })
                }
              >
                {isExpanded ? "Hide contacts" : "View contacts"}
              </button>
            </div>
            {isExpanded && (
              <div
                className="vehicle-contact-list"
                id={`vehicle-contacts-${v.id}`}
              >
                {linkedContacts.length ? (
                  linkedContacts.map((c) => (
                    <div className="vehicle-contact" key={c.id}>
                      <span>
                        <b>{c.name}</b>
                        <small>{c.phone}</small>
                      </span>
                      <Badge value={c.verified ? "VERIFIED" : "PENDING"} />
                    </div>
                  ))
                ) : (
                  <p>No contacts added to this vehicle yet.</p>
                )}
              </div>
            )}
            <div className="vehicleactions">
              <button
                className="action-primary"
                onClick={() => setShowContact(v.id)}
                disabled={linkedContacts.length >= 2}
              >
                <Plus size={15} />
                Add contact
              </button>
              <button onClick={() => onEdit(v)}>Edit details</button>
              <button onClick={() => onPrintQr(v)}>Print card</button>
              <button onClick={() => onDownloadQr(v)}>
                Download card <ArrowUpRight size={15} />
              </button>
              <button
                title="Replaces this QR and invalidates the old one"
                onClick={() => onReplaceQr(v)}
              >
                Replace QR
              </button>
              <button
                className={v.status === "ACTIVE" ? "action-danger" : ""}
                onClick={() =>
                  act(`/api/vehicles/${v.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      status: v.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                    }),
                  })
                }
              >
                {v.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </article>
        );
      })}
      {!items.length && (
        <div className="empty wide">
          <Car />
          <h3>No vehicles registered</h3>
          <p>Add a vehicle to create its secure emergency QR.</p>
        </div>
      )}
    </div>
  );
}
function ContactList({ items, onChange }) {
  const [ids, setIds] = useState({}),
    [codes, setCodes] = useState({}),
    [error, setError] = useState("");
  async function verifyContact(id) {
    try {
      await api(`/api/contacts/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ code: codes[id] || "" }),
      });
      setError("");
      onChange();
    } catch (e) {
      setError(e.message);
    }
  }
  async function resend(id) {
    try {
      const d = await api(`/api/contacts/${id}/resend-verify`, {
        method: "POST",
      });
      setIds({ ...ids, [id]: true });
      if (d.developmentCode) setCodes({ ...codes, [id]: d.developmentCode });
      setError(
        d.developmentCode
          ? "Local development code is now in the verification field."
          : "A new verification code was sent.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="panel">
      {error && <div className="error">{error}</div>}
      {items.length ? (
        items.map((c) => (
          <div className="contactrow" key={c.id}>
            <span className="avatar soft">
              <HeartPulse size={17} />
            </span>
            <div>
              <b>{c.name}</b>
              <small>
                {c.phone}{" "}
                {c.vehicleRegistration ? `· ${c.vehicleRegistration}` : ""}
              </small>
              {!c.verified && (
                <div className="contactverify">
                  {ids[c.id] && (
                    <>
                      <input
                        aria-label="Contact verification code"
                        inputMode="numeric"
                        maxLength="6"
                        placeholder="6 digit code"
                        value={codes[c.id] || ""}
                        onChange={(e) =>
                          setCodes({ ...codes, [c.id]: e.target.value })
                        }
                      />
                      <button onClick={() => verifyContact(c.id)}>
                        Verify
                      </button>
                    </>
                  )}
                  <button onClick={() => resend(c.id)}>
                    {ids[c.id] ? "Resend code" : "Send verification code"}
                  </button>
                </div>
              )}
            </div>
            <button
              className="contactremove"
              onClick={async () => {
                if (window.confirm("Remove this contact?")) {
                  try {
                    await api("/api/contacts/" + c.id, { method: "DELETE" });
                    onChange();
                  } catch (e) {
                    setError(e.message);
                  }
                }
              }}
            >
              Remove
            </button>
            <Badge value={c.verified ? "VERIFIED" : "PENDING"} />
          </div>
        ))
      ) : (
        <div className="empty">
          <HeartPulse />
          <p>No emergency contacts yet. Add contacts from a vehicle card.</p>
        </div>
      )}
    </div>
  );
}
function AlertList({ items, act }) {
  return (
    <div className="panel">
      {items.length ? (
        items.map((a) => (
          <div className="alert-item" key={a.id}>
            <div className="alert-type">
              <ShieldAlert size={19} />
            </div>
            <div className="alert-main">
              <b>
                {a.type} · {a.vehicle.make} {a.vehicle.model}
              </b>
              <small>
                {a.vehicle.registrationNumber} ·{" "}
                {new Date(a.createdAt).toLocaleString()}
              </small>
              {a.description && <p>{a.description}</p>}
              {a.latitude && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`}
                  className="maplink"
                >
                  <MapPin size={14} /> Open location in Maps
                </a>
              )}
            </div>
            <div className="alert-controls">
              <Badge value={a.status} />
              {a.status === "OPEN" && (
                <button
                  onClick={() =>
                    act(`/api/alerts/${a.id}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "ACKNOWLEDGED" }),
                    })
                  }
                >
                  Acknowledge
                </button>
              )}
              {a.status !== "RESOLVED" && (
                <button
                  onClick={() =>
                    act(`/api/alerts/${a.id}/status`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "RESOLVED" }),
                    })
                  }
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="empty">
          <CheckCircle />
          <p>No alerts have been reported.</p>
        </div>
      )}
    </div>
  );
}
function Modal({ title, close, children }) {
  return (
    <div
      className="modalback"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section className="modal">
        <div className="modalhead">
          <h2>{title}</h2>
          <button aria-label="Close" className="iconbtn" onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function PublicEmergency() {
  const { token } = useParams();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [loc, setLoc] = useState("Waiting for permission"),
    [coords, setCoords] = useState(null),
    [confirmed, setConfirmed] = useState(false),
    [type, setType] = useState("ACCIDENT"),
    [description, setDescription] = useState(""),
    [result, setResult] = useState(null),
    [hospitals, setHospitals] = useState([]),
    [hospitalError, setHospitalError] = useState("");
  useEffect(() => {
    api(`/api/emergency/${token}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);
  function locate() {
    setLoc("Requesting your location…");
    if (!navigator.geolocation) {
      setLoc("This browser does not support location access.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          locationAccuracy: p.coords.accuracy,
        };
        setCoords(c);
        setLoc(
          `Location captured · accuracy ±${Math.round(c.locationAccuracy)} m`,
        );
      },
      (e) => {
        setCoords(null);
        setLoc(
          e.code === 1
            ? "Location permission was denied. You can still send an alert."
            : "Could not get your location. You can still send an alert.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  async function submit(e) {
    e.preventDefault();
    if (!confirmed) return;
    setSending(true);
    setError("");
    try {
      const d = await api(`/api/emergency/${token}/alerts`, {
        method: "POST",
        body: JSON.stringify({ type, description, confirmed, ...coords }),
      });
      setResult(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }
  async function findHospitals() {
    if (!coords) return;
    setHospitalError("");
    try {
      const q = new URLSearchParams({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      const d = await api("/api/hospitals?" + q);
      setHospitals(d.data);
    } catch (e) {
      setHospitalError("Nearby hospital search is temporarily unavailable.");
    }
  }
  if (error)
    return (
      <main className="publicpage">
        <Logo />
        <div className="publicerror">
          <div className="error-icon">
            <ShieldAlert />
          </div>
          <span className="eyebrow">BEACON / EMERGENCY ACCESS</span>
          <h1>This QR code is unavailable.</h1>
          <p>{error}</p>
          <p className="muted">
            If someone may be in immediate danger, contact your local emergency
            services.
          </p>
        </div>
      </main>
    );
  if (!data)
    return (
      <main className="publicpage loading">
        <Logo />
        <div className="spinner" />
        Checking emergency card…
      </main>
    );
  return (
    <main className="publicpage">
      <header className="publicnav">
        <Logo />
        <span>
          <span className="green-dot" /> EMERGENCY CARD
        </span>
      </header>
      <div className="publicbody">
        {result ? (
          <section className="resultcard">
            <div className="resultcheck">
              <CheckCircle size={30} />
            </div>
            <span className="eyebrow">ALERT RECORDED</span>
            <h1>
              {result.notificationStatus === "SENT"
                ? "Help is on the way."
                : "Alert recorded."}
            </h1>
            <p className="lead">{result.message}</p>
            <div className="resultvehicle">
              <Car />
              <div>
                <b>
                  {data.vehicle.make} {data.vehicle.model}
                </b>
                <small>{data.vehicle.registrationNumber}</small>
              </div>
            </div>
            {coords && (
              <a
                className="button light full"
                target="_blank"
                rel="noreferrer"
                href={`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`}
              >
                <MapPin size={17} /> Open reported location
              </a>
            )}
            <div className="postactions">
              <h3>What you can do next</h3>
              <p>
                Find nearby hospitals using your shared location, or call a
                listed contact.
              </p>
              <button
                className="button dark full"
                onClick={findHospitals}
                disabled={!coords}
              >
                <MapPin size={17} /> Find nearby hospitals
              </button>
              {hospitalError && (
                <p className="error inlineerror">{hospitalError}</p>
              )}
              {hospitals.map((h, i) => (
                <a
                  key={i}
                  className="hospitalrow"
                  href={h.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    <b>{h.name}</b>
                    <small>
                      {h.address || "Nearby"} ·{" "}
                      {(h.distanceMeters / 1000).toFixed(1)} km
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </a>
              ))}
              {result.contacts?.map((c, i) => (
                <a
                  key={i}
                  className="button outline full"
                  href={`tel:${c.phone}`}
                >
                  <Phone size={17} /> Call {c.name}
                </a>
              ))}
            </div>
            <p className="privacy-note">
              If someone is in immediate danger, contact your local emergency
              services.
            </p>
          </section>
        ) : (
          <>
            <section className="publicintro">
              <div className="publicicon">
                <ShieldAlert size={23} />
              </div>
              <span className="eyebrow">BEACON / EMERGENCY ASSISTANCE</span>
              <h1>
                Someone can help.
                <br />
                <em>Let them know.</em>
              </h1>
              <p>
                Share what happened and your location with this vehicle’s
                emergency contacts.
              </p>
            </section>
            <section className="vehiclepublic">
              <div className="publicvehicleicon">
                <Car size={25} />
              </div>
              <div>
                <span className="eyebrow">VEHICLE IDENTIFIED</span>
                <h2>
                  {data.vehicle.make} {data.vehicle.model}
                </h2>
                <p>
                  {data.vehicle.color} · Registration{" "}
                  {data.vehicle.registrationNumber}
                </p>
              </div>
            </section>
            <form className="emergencyform" onSubmit={submit}>
              <label>
                What kind of emergency?
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="ACCIDENT">Vehicle accident</option>
                  <option value="MEDICAL">Medical emergency</option>
                  <option value="FIRE">Fire</option>
                  <option value="BREAKDOWN">Vehicle breakdown</option>
                  <option value="OTHER">Other emergency</option>
                </select>
              </label>
              <label>
                Anything else to share?{" "}
                <small>Optional · 500 characters max</small>
                <textarea
                  maxLength="500"
                  rows="3"
                  placeholder="A short description can help people respond…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="locationbox">
                <div className="locationtop">
                  <span className="locationicon">
                    <MapPin size={19} />
                  </span>
                  <div>
                    <b>Your location</b>
                    <small>{loc}</small>
                  </div>
                </div>
                {!coords && (
                  <button
                    type="button"
                    className="locationbutton"
                    onClick={locate}
                  >
                    Allow location access <ArrowUpRight size={15} />
                  </button>
                )}
                {coords && (
                  <button type="button" className="textbutton" onClick={locate}>
                    Refresh location
                  </button>
                )}
              </div>
              <label className="confirmcheck">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I confirm that I want to send an emergency alert for this
                  vehicle.
                </span>
              </label>
              {error && <div className="error">{error}</div>}
              <button
                className="button urgent full"
                disabled={!confirmed || sending}
              >
                <ShieldAlert size={18} />
                {sending ? "Sending alert…" : "Send emergency alert"}
              </button>
              <p className="formfoot">
                The alert is sent only when you press the button above. Location
                is optional.
              </p>
            </form>
            <section className="publichelp">
              <span className="green-dot" /> Emergency contacts are notified by
              SMS when available.
            </section>
          </>
        )}
      </div>
      <footer className="publicfooter">
        <Logo />
        <span>In immediate danger? Contact your local emergency services.</span>
      </footer>
    </main>
  );
}
function Admin() {
  const [view, setView] = useState("overview"),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  async function show(v) {
    setView(v);
    setError("");
    try {
      const d = await api(
        "/api/admin/" +
          v +
          (v === "users" && search
            ? "?search=" + encodeURIComponent(search)
            : ""),
      );
      setData(v === "overview" ? d : d.data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    show("overview");
  }, []);
  async function toggleUser(row) {
    try {
      await api("/api/admin/users/" + row.id, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      show("users");
    } catch (e) {
      setError(e.message);
    }
  }
  async function toggleVehicle(row) {
    try {
      await api("/api/admin/vehicles/" + row.vehicle.id, {
        method: "PATCH",
        body: JSON.stringify({
          status: row.vehicle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      });
      show("vehicles");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="adminpanel">
      <span className="eyebrow">ADMIN CONSOLE</span>
      <h2>Operations overview</h2>
      <p className="muted">
        Monitor accounts, vehicles, emergency reports, and delivery issues.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="adminnav">
        {[
          "overview",
          "users",
          "vehicles",
          "alerts",
          "notifications",
          "audit-logs",
        ].map((v) => (
          <button
            className={view === v ? "active" : ""}
            key={v}
            onClick={() => show(v)}
          >
            {v.replace("-", " ")}
          </button>
        ))}
      </div>
      {view === "users" && (
        <form
          className="adminsearch"
          onSubmit={(e) => {
            e.preventDefault();
            show("users");
          }}
        >
          <input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="button dark small">Search</button>
        </form>
      )}
      {view === "overview" ? (
        <div className="stats adminstats">
          {[
            ["Users", "users"],
            ["Vehicles", "vehicles"],
            ["Alerts", "alerts"],
            ["Failed SMS", "failedNotifications"],
          ].map(([l, k]) => (
            <Stat key={k} icon={<Activity />} n={data?.[k] ?? "—"} label={l} />
          ))}
        </div>
      ) : (
        <div className="adminlist">
          {Array.isArray(data) &&
            data.map((row, i) => (
              <article
                className="adminrecord"
                key={row.id || row.alert?.id || i}
              >
                {view === "users" ? (
                  <>
                    <div>
                      <b>{row.fullName}</b>
                      <small>
                        {row.email} · {row.phone}
                      </small>
                    </div>
                    <Badge value={row.isActive ? "ACTIVE" : "INACTIVE"} />
                    <button onClick={() => toggleUser(row)}>
                      {row.isActive ? "Disable" : "Enable"}
                    </button>
                  </>
                ) : view === "vehicles" ? (
                  <>
                    <div>
                      <b>
                        {row.vehicle.make} {row.vehicle.model}
                      </b>
                      <small>
                        {row.vehicle.registrationNumber} · Owner {row.ownerName}{" "}
                        ({row.ownerEmail})
                      </small>
                    </div>
                    <Badge value={row.vehicle.status} />
                    <button onClick={() => toggleVehicle(row)}>
                      {row.vehicle.status === "ACTIVE"
                        ? "Deactivate"
                        : "Reactivate"}
                    </button>
                  </>
                ) : view === "alerts" ? (
                  <>
                    <div>
                      <b>
                        {row.alert.type} · {row.vehicle.registrationNumber}
                      </b>
                      <small>
                        {new Date(row.alert.createdAt).toLocaleString()} ·{" "}
                        {row.alert.description || "No description"}
                      </small>
                    </div>
                    <Badge value={row.alert.status} />
                    {row.alert.latitude && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://maps.google.com/?q=${row.alert.latitude},${row.alert.longitude}`}
                      >
                        Map
                      </a>
                    )}
                  </>
                ) : view === "notifications" ? (
                  <>
                    <div>
                      <b>
                        {row.destination} ·{" "}
                        {row.providerSid || "No provider reference"}
                      </b>
                      <small>{row.error || row.createdAt}</small>
                    </div>
                    <Badge value={row.status} />
                  </>
                ) : (
                  <>
                    <div>
                      <b>
                        {row.action} · {row.entity || "system"}
                      </b>
                      <small>
                        {row.entityId || ""} ·{" "}
                        {new Date(row.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <pre>{JSON.stringify(row.metadata || {})}</pre>
                  </>
                )}
              </article>
            ))}
        </div>
      )}
    </div>
  );
}
export default App;

function ProfileSettings({ user, onSave }) {
  const [name, setName] = useState(user.fullName),
    [phone, setPhone] = useState(user.phone?.replace(/^\+91/, "") || ""),
    [currentPassword, setCurrent] = useState(""),
    [newPassword, setNew] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const d = await api("/api/users/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: name, phone: "+91" + phone }),
      });
      onSave(
        d.developmentCode
          ? { ...d.user, developmentCode: d.developmentCode }
          : d.user,
      );
      setNotice(
        d.user.phoneVerified
          ? "Profile saved."
          : "Phone changed; verify your new number to continue.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function change(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await api("/api/users/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrent("");
      setNew("");
      setNotice("Password changed successfully.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="settingsgrid">
      <section className="panel">
        <span className="eyebrow">PERSONAL DETAILS</span>
        <h3>Profile information</h3>
        <p className="muted">
          Your mobile number must be verified before vehicle management is
          enabled.
        </p>
        {notice && <div className="success banner">{notice}</div>}
        {error && <div className="error">{error}</div>}
        <form onSubmit={save}>
          <label>
            Full name
            <input
              required
              minLength="2"
              maxLength="120"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Email address
            <input value={user.email} disabled />
          </label>
          <label>
            Mobile number
            <input
              required
              type="tel"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength="10"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
            />
          </label>
          <p>
            Phone status:{" "}
            <Badge value={user.phoneVerified ? "VERIFIED" : "PENDING"} />
          </p>
          <button className="button dark">Save profile</button>
        </form>
      </section>
      <section className="panel">
        <span className="eyebrow">ACCOUNT SECURITY</span>
        <h3>Change password</h3>
        <p className="muted">
          Choose at least 12 characters with upper and lowercase letters, a
          number, and a symbol.
        </p>
        <form onSubmit={change}>
          <label>
            Current password
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            New password
            <input
              type="password"
              minLength="12"
              required
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
          </label>
          <button className="button dark">Update password</button>
        </form>
      </section>
    </div>
  );
}
