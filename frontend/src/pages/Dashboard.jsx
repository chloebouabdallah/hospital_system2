import { useAuth } from '../context/AuthContext';
import AdminOverview from './admin/AdminOverview';
import PatientOverview from './patient/PatientOverview';
import DoctorOverview from './doctor/DoctorOverview';

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'admin') return <AdminOverview />;
  if (user.role === 'doctor') return <DoctorOverview />;
  return <PatientOverview />;
}

function PatientHome({ user }) {
  return (
    <div>
      <header className="pg-head">
        <h1>Hi, {user.name.split(' ')[0]}.</h1>
        <p className="pg-sub">Here's what you can do today.</p>
      </header>

      <div className="pg-cards">
        <a href="/dashboard/symptom-checker" className="pg-card">
          <div className="pg-card-icon">🩺</div>
          <h3>Check your symptoms</h3>
          <p>Answer a few questions and get a recommendation for what kind of care you need.</p>
        </a>
        <a href="/dashboard/find-care" className="pg-card">
          <div className="pg-card-icon">📍</div>
          <h3>Find care nearby</h3>
          <p>See hospitals near you and which specialists work there.</p>
        </a>
        <a href="/dashboard/appointments" className="pg-card">
          <div className="pg-card-icon">📅</div>
          <h3>My appointments</h3>
          <p>See your upcoming and past visits.</p>
        </a>
      </div>
    </div>
  );
}

