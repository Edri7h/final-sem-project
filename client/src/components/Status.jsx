export function Stat({ icon, n, label }) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Badge({ value }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      {value.toLowerCase()}
    </span>
  );
}
