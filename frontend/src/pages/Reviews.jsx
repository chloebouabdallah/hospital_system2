import { useAuth } from '../context/AuthContext';
import AdminReviews from './admin/AdminReviews';
import DoctorReviews from './doctor/DoctorReviews';

export default function Reviews() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'admin') return <AdminReviews />;
  return <DoctorReviews />;
}