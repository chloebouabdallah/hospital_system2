BEGIN;

CREATE TABLE doctor_reviews (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_doctor_status ON doctor_reviews(doctor_id, status);
CREATE INDEX idx_reviews_patient ON doctor_reviews(patient_id);

COMMIT;