import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Stat, Badge } from '../components/Status.jsx';
import { getAdminResource, updateAdminUser, updateAdminVehicle } from '../services/admin.service.js';

export function Admin() {
  const [view, setView] = useState("overview"),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  async function show(v) {
    setView(v);
    setError("");
    try {
      const query =
        v === "users" && search
          ? `?search=${encodeURIComponent(search)}`
          : "";
      const d = await getAdminResource(v, query);
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
      await updateAdminUser(row.id, { isActive: !row.isActive });
      show("users");
    } catch (e) {
      setError(e.message);
    }
  }
  async function toggleVehicle(row) {
    try {
      await updateAdminVehicle(row.vehicle.id, {
        status: row.vehicle.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
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
