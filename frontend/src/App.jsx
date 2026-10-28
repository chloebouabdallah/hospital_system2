import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DashboardPlaceholder from './pages/DashboardPlaceholder';
import './pages/DashboardHome.css';

import AdminAppointments from './pages/admin/AdminAppointments';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminHospitals from './pages/admin/AdminHospitals';
import AdminSchedules from './pages/admin/AdminSchedules';
import AdminSpecialties from './pages/admin/AdminSpecialties';
import AdminSymptoms from './pages/admin/AdminSymptoms';
import AdminUsers from './pages/admin/AdminUsers';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminConditions from './pages/admin/AdminConditions';
import AdminTriageRules from './pages/admin/AdminTriageRules';

import SymptomChecker from './pages/patient/SymptomChecker';
import FindDoctors from './pages/patient/FindDoctors';
import MyAppointments from './pages/patient/MyAppointments';
import DoctorDetail from './pages/patient/DoctorDetail';

import MySchedule from './pages/doctor/MySchedule';

import Appointments from './pages/Appointments';
import Reviews from './pages/Reviews';
import HospitalsPage from './pages/Hospitals';
import Profile from './pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />

            {/* Patient-only */}
            <Route path="symptom-checker" element={<SymptomChecker />} />
            <Route path="find-doctors" element={<FindDoctors />} />
            <Route path="doctors/:id" element={<DoctorDetail />} />

            {/* Doctor-only */}
            <Route path="schedule" element={<MySchedule />} />
            <Route path="patients" element={<DashboardPlaceholder title="My patients" description="People you've seen." />} />

            {/* Admin-only */}
            <Route path="users" element={<AdminUsers />} />
            <Route path="doctors" element={<AdminDoctors />} />
            <Route path="schedules" element={<AdminSchedules />} />
            <Route path="specialties" element={<AdminSpecialties />} />
            <Route path="symptoms" element={<AdminSymptoms />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="conditions" element={<AdminConditions />} />
            <Route path="rules" element={<AdminTriageRules />} />

            {/* Shared, role-aware — decided inside each component */}
            <Route path="appointments" element={<Appointments />} />
            <Route path="hospitals" element={<HospitalsPage />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}