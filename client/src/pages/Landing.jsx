import { Link } from 'react-router-dom';
import { ArrowUpRight, Car, ShieldAlert, MapPin } from 'lucide-react';
import { Logo } from '../components/Brand.jsx';

export function Landing({ user, ready, unavailable }) {
  return (
    <main className="landing">
      <nav className="top">
        <Logo />
        <div className="navlinks">
          <a href="#how">How it works</a>
          {unavailable ? (
            <button className="textbutton" onClick={() => window.location.reload()}>
              Retry session check
            </button>
          ) : ready && user ? (
            <Link to="/dashboard">Dashboard</Link>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
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

export function Step({ n, title, text }) {
  return (
    <div className="step">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
