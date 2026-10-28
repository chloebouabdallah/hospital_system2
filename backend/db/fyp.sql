


-- 1. USERS
-- Base table for all accounts (patient / doctor / admin).


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE specialties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);


CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty_id INTEGER REFERENCES specialties(id),
  bio TEXT,
  years_experience INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_doctors_specialty ON doctors(specialty_id);


CREATE TABLE doctor_availability (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  CHECK (end_time > start_time)
);
CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);


CREATE TABLE symptoms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);


CREATE TABLE symptom_questions (
  id SERIAL PRIMARY KEY,
  symptom_id INTEGER REFERENCES symptoms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('single', 'multi')),
  display_order INTEGER DEFAULT 0
);
CREATE INDEX idx_questions_symptom ON symptom_questions(symptom_id);


CREATE TABLE symptom_question_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES symptom_questions(id) ON DELETE CASCADE,
  option_text VARCHAR(150) NOT NULL,
  option_value VARCHAR(100) NOT NULL
);
CREATE INDEX idx_options_question ON symptom_question_options(question_id);


CREATE TABLE conditions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  causes TEXT,
  when_to_seek_care TEXT,
  specialty_id INTEGER REFERENCES specialties(id)
);
CREATE INDEX idx_conditions_specialty ON conditions(specialty_id);


CREATE TABLE condition_symptoms (
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  symptom_id INTEGER REFERENCES symptoms(id) ON DELETE CASCADE,
  relevance_weight NUMERIC(3, 2) DEFAULT 1.0,
  PRIMARY KEY (condition_id, symptom_id)
);


CREATE TABLE triage_rules (
  id SERIAL PRIMARY KEY,
  symptom_id INTEGER REFERENCES symptoms(id) ON DELETE CASCADE,
  rule_conditions JSONB NOT NULL,
  matched_condition_ids INTEGER[],
  recommended_specialty_id INTEGER REFERENCES specialties(id),
  urgency_level VARCHAR(10) NOT NULL CHECK (urgency_level IN ('low', 'moderate', 'urgent')),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_triage_symptom ON triage_rules(symptom_id);
CREATE INDEX idx_triage_conditions_gin ON triage_rules USING GIN (rule_conditions);


CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  date_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_datetime ON appointments(date_time);


CREATE TABLE consultation_notes (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notes_doctor ON consultation_notes(doctor_id);


CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- e.g. 'appointment_confirmed', 'appointment_cancelled', 'reminder'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);


CREATE TABLE medical_articles (
  id SERIAL PRIMARY KEY,
  condition_id INTEGER REFERENCES conditions(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(200)
);
CREATE INDEX idx_articles_condition ON medical_articles(condition_id);






