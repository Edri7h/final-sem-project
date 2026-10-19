import { useState } from 'react';
import { updateProfile, changePassword } from '../services/user.service.js';

export function ProfileSettings({ user, onSave }) {
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
      const d = await updateProfile({ fullName: name, phone: "+91" + phone });
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
      await changePassword({ currentPassword, newPassword });
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
