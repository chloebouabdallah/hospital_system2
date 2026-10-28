import { useAuth } from '../context/AuthContext';
import AdminAppointments from './admin/AdminAppointments';
import MyAppointments from './patient/MyAppointments';
import DoctorAppointments from './doctor/DoctorAppointments';

export default function Appointments() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'admin') return <AdminAppointments />;
  if (user.role === 'doctor') return <DoctorAppointments />;
  return <MyAppointments />;
}