import { useEffect, useState } from 'react';
import { VehicleRow, VehicleList, ContactList, AlertList, Modal } from '../components/DashboardLists.jsx';
import { Admin } from './Admin.jsx';
import { ProfileSettings } from './ProfileSettings.jsx';
import { Stat, Badge } from '../components/Status.jsx';
import { useDispatch, useSelector } from 'react-redux';
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
} from 'lucide-react';
import { setUser, clearUser } from '../store.js';
import { Logo } from '../components/Brand.jsx';
import { downloadQrCard, printQrCard } from '../qr-card.js';
import { logout as logoutRequest, resendAccountCode, verifyAccountPhone } from '../services/auth.service.js';
import { getVehicles, createVehicle, updateVehicle, regenerateVehicleQr } from '../services/vehicle.service.js';
import { getContacts, addContact } from '../services/contact.service.js';
import { getAlerts, updateAlertStatus } from '../services/alert.service.js';
import { clearSessionToken } from '../api.js';

export function Dashboard() {
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
        getVehicles(),
        getAlerts(),
        getContacts(),
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
      await verifyAccountPhone(verifyCode);
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
      if (editingVehicle) await updateVehicle(editingVehicle.id, vf);
      else await createVehicle(vf);
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
      const d = await addContact(showContact, {
        ...cf,
        phone: "+91" + cf.phone,
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
      await regenerateVehicleQr(qrDialog.vehicle.id);
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
      const match = url.match(/^\/api\/(vehicles|alerts)\/([^/]+)$/);
      if (!match) throw new Error("This action is not available.");
      if (match[1] === "vehicles") {
        const details = JSON.parse(options.body || "{}");
        await updateVehicle(match[2], details);
      } else {
        const details = JSON.parse(options.body || "{}");
        await updateAlertStatus(match[2], details);
      }
      setMessage("Changes saved.");
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function logout() {
    try {
      await logoutRequest();
    } finally {
      clearSessionToken();
      dispatch(clearUser());
    }
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
                  resendAccountCode()
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
