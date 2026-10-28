-- Week 3.5: hospitals
-- Run once against your database (psql, pgAdmin, DBeaver...), then update schema.prisma
-- and run `npx prisma generate`. It is wrapped in a transaction: all or nothing.
-- Existing data is untouched; the new hospital_id columns start as NULL.

BEGIN;

-- 1. HOSPITALS
-- latitude/longitude power the "nearby hospitals" search.
CREATE TABLE hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (name, city)
);
CREATE INDEX idx_hospitals_city ON hospitals(city);


-- 2. DOCTOR <-> HOSPITAL (many-to-many: a doctor can work at several hospitals)
-- Removing a doctor or a hospital removes the link.
CREATE TABLE doctor_hospitals (
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, hospital_id)
);
CREATE INDEX idx_doctor_hospitals_hospital ON doctor_hospitals(hospital_id);


-- 3. PER-HOSPITAL SCHEDULES
-- A schedule row now says WHERE the doctor is available. Nullable only so existing rows
-- survive the migration; the API will require it for every new row.
ALTER TABLE doctor_availability
  ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id) ON DELETE CASCADE;
CREATE INDEX idx_availability_hospital ON doctor_availability(hospital_id);


-- 4. APPOINTMENTS KNOW THEIR HOSPITAL (used by Week 4 booking)
-- No cascade on purpose: a hospital with appointment history cannot be deleted by accident.
ALTER TABLE appointments
  ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id);
CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);

COMMIT;
