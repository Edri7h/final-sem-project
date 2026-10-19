import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldAlert, CheckCircle, Car, MapPin, Phone, ArrowUpRight } from 'lucide-react';
import { Logo } from '../components/Brand.jsx';
import { getEmergencyCard, createEmergencyAlert, searchNearbyHospitals } from '../services/emergency.service.js';

export function PublicEmergency() {
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
    getEmergencyCard(token)
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
      const d = await createEmergencyAlert(token, {
        type,
        description,
        confirmed,
        ...coords,
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
      const d = await searchNearbyHospitals(q);
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
