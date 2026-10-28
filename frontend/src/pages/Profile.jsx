import { useAuth } from '../context/AuthContext';
import PatientProfile from './patient/Profile';
import DoctorProfile from './doctor/Profile';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'doctor' ? <DoctorProfile /> : <PatientProfile />;
}