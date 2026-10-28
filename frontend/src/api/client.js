const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // some endpoints may have no JSON body
  }

  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // ---------- Auth ----------
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/users/me'),

  // ---------- Public reads ----------
  getSpecialties: () => request('/specialties'),
  getHospitals: () => request('/hospitals'),
  getDoctors: () => request('/doctors'),
  getSymptoms: () => request('/symptoms'),
  getConditions: () => request('/conditions'),
  getDoctors: (params = '') => request(`/doctors${params}`),
  getDoctorReviews: (doctorId) => request(`/doctors/${doctorId}/reviews`),

  // ---------- Admin: overview ----------
  getAdminOverview: () => request('/admin/overview'),

  // ---------- Appointments ----------
  getAppointments: (params = '') => request(`/appointments${params}`),
  createAppointment: (payload) => request('/appointments', { method: 'POST', body: payload }),
  confirmAppointment: (id) => request(`/appointments/${id}/confirm`, { method: 'PATCH' }),
  completeAppointment: (id) => request(`/appointments/${id}/complete`, { method: 'PATCH' }),
  cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: 'PATCH' }),

  getAppointments: (params = '') => request(`/appointments${params}`),
cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: 'PATCH' }),

// Reviews (patient side)
getReviewForAppointment: (id) => request(`/appointments/${id}/review`),
createReview: (id, payload) => request(`/appointments/${id}/review`, { method: 'POST', body: payload }),
updateReview: (id, payload) => request(`/appointments/${id}/review`, { method: 'PUT', body: payload }),
deleteReview: (id) => request(`/appointments/${id}/review`, { method: 'DELETE' }),

  // ---------- Available slots ----------
  getAvailableSlots: (doctorId, date, hospitalId) =>
    request(`/doctors/${doctorId}/available-slots?date=${date}&hospitalId=${hospitalId}`),

  // ---------- Patients lookup ----------
  getPatients: () => request('/users?role=patient'),

  // ---------- Doctors (admin CRUD; reads are public) ----------
  getDoctorById: (id) => request(`/doctors/${id}`),
  createDoctor: (payload) => request('/doctors', { method: 'POST', body: payload }),
  updateDoctor: (id, payload) => request(`/doctors/${id}`, { method: 'PATCH', body: payload }),
  deleteDoctor: (id) => request(`/doctors/${id}`, { method: 'DELETE' }),

  // ---------- Hospitals (admin CRUD; reads are public) ----------
  getHospitalById: (id) => request(`/hospitals/${id}`),
  createHospital: (payload) => request('/hospitals', { method: 'POST', body: payload }),
  updateHospital: (id, payload) => request(`/hospitals/${id}`, { method: 'PUT', body: payload }),
  deleteHospital: (id) => request(`/hospitals/${id}`, { method: 'DELETE' }),
  getHospitalsNearby: (params) => request(`/hospitals/nearby?${params}`),
  getDoctorReviews: (doctorId) => request(`/doctors/${doctorId}/reviews`),
  getHospitalById: (id, params = '') => request(`/hospitals/${id}${params}`),



  // ---------- Doctor availability / schedules ----------
  getAvailability: (params = '') => request(`/doctor-availability${params}`),
  createAvailability: (payload) => request('/doctor-availability', { method: 'POST', body: payload }),
  updateAvailability: (id, payload) => request(`/doctor-availability/${id}`, { method: 'PUT', body: payload }),
  deleteAvailability: (id) => request(`/doctor-availability/${id}`, { method: 'DELETE' }),

  // ---------- Specialties (admin CRUD; reads are public) ----------
  getSpecialtyById: (id) => request(`/specialties/${id}`),
  createSpecialty: (payload) => request('/specialties', { method: 'POST', body: payload }),
  updateSpecialty: (id, payload) => request(`/specialties/${id}`, { method: 'PATCH', body: payload }),
  deleteSpecialty: (id) => request(`/specialties/${id}`, { method: 'DELETE' }),

  // ---------- Symptoms (admin CRUD) ----------
  getSymptomById: (id) => request(`/symptoms/${id}`),
  createSymptom: (payload) => request('/symptoms', { method: 'POST', body: payload }),
  updateSymptom: (id, payload) => request(`/symptoms/${id}`, { method: 'PUT', body: payload }),
  deleteSymptom: (id) => request(`/symptoms/${id}`, { method: 'DELETE' }),

  // ---------- Questions ----------
  getSymptomQuestions: (symptomId) => request(`/symptoms/${symptomId}/questions`),
  getQuestions: (params = '') => request(`/symptom-questions${params}`),
  createQuestion: (payload) => request('/symptom-questions', { method: 'POST', body: payload }),
  updateQuestion: (id, payload) => request(`/symptom-questions/${id}`, { method: 'PUT', body: payload }),
  deleteQuestion: (id) => request(`/symptom-questions/${id}`, { method: 'DELETE' }),

  // ---------- Options ----------
  getOptions: (params = '') => request(`/symptom-question-options${params}`),
  createOption: (payload) => request('/symptom-question-options', { method: 'POST', body: payload }),
  updateOption: (id, payload) => request(`/symptom-question-options/${id}`, { method: 'PUT', body: payload }),
  deleteOption: (id) => request(`/symptom-question-options/${id}`, { method: 'DELETE' }),

  // ---------- Conditions ----------
  getConditionById: (id) => request(`/conditions/${id}`),
  createCondition: (payload) => request('/conditions', { method: 'POST', body: payload }),
  updateCondition: (id, payload) => request(`/conditions/${id}`, { method: 'PUT', body: payload }),
  deleteCondition: (id) => request(`/conditions/${id}`, { method: 'DELETE' }),

  // ---------- Triage rules ----------
  getTriageRules: (params = '') => request(`/triage-rules${params}`),
  createTriageRule: (payload) => request('/triage-rules', { method: 'POST', body: payload }),
  updateTriageRule: (id, payload) => request(`/triage-rules/${id}`, { method: 'PUT', body: payload }),
  deleteTriageRule: (id) => request(`/triage-rules/${id}`, { method: 'DELETE' }),

  // ---------- Reviews (moderation) ----------
  // ---------- Reviews (moderation) ----------
getAllReviews: () => request('/admin/reviews'),
hideReview: (id, hidden) => request(`/doctor-reviews/${id}/hide`, { method: 'PATCH', body: { hidden } }),

  getUsers: (params = '') => request(`/users${params}`),
getUserById: (id) => request(`/users/${id}`),
updateUser: (id, payload) => request(`/users/${id}`, { method: 'PATCH', body: payload }),
deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),


getSymptoms: () => request('/symptoms'),
getQuestions: (params = '') => request(`/symptom-questions${params}`),
createQuestion: (payload) => request('/symptom-questions', { method: 'POST', body: payload }),
updateQuestion: (id, payload) => request(`/symptom-questions/${id}`, { method: 'PUT', body: payload }),
deleteQuestion: (id) => request(`/symptom-questions/${id}`, { method: 'DELETE' }),

getOptions: (params = '') => request(`/symptom-question-options${params}`),
createOption: (payload) => request('/symptom-question-options', { method: 'POST', body: payload }),
updateOption: (id, payload) => request(`/symptom-question-options/${id}`, { method: 'PUT', body: payload }),
deleteOption: (id) => request(`/symptom-question-options/${id}`, { method: 'DELETE' }),

getSymptoms: () => request('/symptoms'),
getSymptomQuestions: (symptomId) => request(`/symptoms/${symptomId}/questions`),
submitChecker: (payload) => request('/symptom-checker/submit', { method: 'POST', body: payload }),
getHospitalsNearby: (params) => request(`/hospitals/nearby?${params}`),

// ---------- Patient ----------
getPatientOverview: () => request('/patient/overview'),

getMe: () => request('/users/me'),
updateUser: (id, payload) => request(`/users/${id}`, { method: 'PATCH', body: payload }),

// ---------- Doctor ----------
getDoctorOverview: () => request('/doctor/overview'),

getMyDoctorProfile: () => request('/doctors/me'),
getAvailability: (params = '') => request(`/doctor-availability${params}`),
createAvailability: (payload) => request('/doctor-availability', { method: 'POST', body: payload }),
updateAvailability: (id, payload) => request(`/doctor-availability/${id}`, { method: 'PUT', body: payload }),
deleteAvailability: (id) => request(`/doctor-availability/${id}`, { method: 'DELETE' }),

getUrgencyBookingRules: () => request('/urgency-booking-rules'),
};