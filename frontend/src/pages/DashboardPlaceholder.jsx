import './DashboardHome.css';

export default function DashboardPlaceholder({ title, description }) {
  return (
    <div>
      <header className="pg-head">
        <h1>{title}</h1>
        <p className="pg-sub">{description}</p>
      </header>
      <div className="pg-card" style={{ maxWidth: 560 }}>
        <div className="pg-card-icon">🚧</div>
        <h3>Coming soon</h3>
        <p>This page will be wired to the live API in a later step.</p>
      </div>
    </div>
  );
}