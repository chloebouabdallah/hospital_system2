import { useAuth } from '../context/AuthContext';
import AdminHospitals from './admin/AdminHospitals';
import Hospitals from './patient/Hospitals';

export default function HospitalsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'admin' ? <AdminHospitals /> : <Hospitals />;
}