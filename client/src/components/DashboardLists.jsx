import { useState } from 'react';
import { Car, HeartPulse, CheckCircle, ShieldAlert, MapPin, Plus, X, ArrowUpRight } from 'lucide-react';
import { Badge } from './Status.jsx';
import { verifyContact as verifyContactRequest, resendContactVerification, removeContact } from '../services/contact.service.js';

export function VehicleRow({ v }) {
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

export function VehicleList({
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

export function ContactList({ items, onChange }) {
  const [codes, setCodes] = useState({}),
    [resending, setResending] = useState({}),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function verifyContact(id) {
    try {
      await verifyContactRequest(id, codes[id] || "");
      setError("");
      onChange();
    } catch (e) {
      setError(e.message);
    }
  }
  async function resend(id) {
    setError("");
    setMessage("");
    setResending((current) => ({ ...current, [id]: true }));
    try {
      const d = await resendContactVerification(id);
      if (d.developmentCode) setCodes({ ...codes, [id]: d.developmentCode });
      setMessage(
        d.developmentCode
          ? "Local development code is shown in the verification field."
          : "A new verification code was sent.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setResending((current) => ({ ...current, [id]: false }));
    }
  }
  return (
    <div className="panel">
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
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
                  <small>
                    Enter the code sent when you added this contact. Resend only
                    if you did not receive it or it expired.
                  </small>
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
                  <button onClick={() => verifyContact(c.id)}>Verify</button>
                  <button
                    onClick={() => resend(c.id)}
                    disabled={!!resending[c.id]}
                  >
                    {resending[c.id] ? "Sending…" : "Resend code"}
                  </button>
                </div>
              )}
            </div>
            <button
              className="contactremove"
              onClick={async () => {
                if (window.confirm("Remove this contact?")) {
                  try {
                    await removeContact(c.id);
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

export function AlertList({ items, act }) {
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

export function Modal({ title, close, children }) {
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
