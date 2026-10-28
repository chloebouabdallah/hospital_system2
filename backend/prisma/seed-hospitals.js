
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const HOSPITALS = [
  { name: 'American University of Beirut Medical Center', city: 'Beirut', address: 'Hamra, Beirut', latitude: 33.9, longitude: 35.482 },
  { name: 'Saint George Hospital University Medical Center', city: 'Beirut', address: 'Achrafieh, Beirut', latitude: 33.897, longitude: 35.517 },
  { name: 'Hotel-Dieu de France Hospital', city: 'Beirut', address: 'Achrafieh, Beirut', latitude: 33.889, longitude: 35.516 },
];

// doctor email -> hospital names. Dr. Layla works at TWO hospitals to demonstrate many-to-many.
const LINKS = {
  'layla.fares@example.com': ['American University of Beirut Medical Center', 'Saint George Hospital University Medical Center'],
  'karim.nassar@example.com': ['Hotel-Dieu de France Hospital'],
};

// Existing seeded schedules get attached to a hospital the doctor works at.
const BACKFILL = {
  'layla.fares@example.com': 'American University of Beirut Medical Center',
  'karim.nassar@example.com': 'Hotel-Dieu de France Hospital',
};

const time = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);

async function main() {
  const hospitalByName = {};
  for (const h of HOSPITALS) {
    const row = await prisma.hospital.upsert({
      where: { name_city: { name: h.name, city: h.city } },
      update: {},
      create: h,
    });
    hospitalByName[h.name] = row;
    console.log(`Hospital ok: ${row.name} (id ${row.id})`);
  }

  const doctorByEmail = {};
  for (const email of Object.keys(LINKS)) {
    const doctor = await prisma.doctor.findFirst({ where: { user: { email } } });
    if (!doctor) {
      console.log(`Skipped ${email}: no doctor found (run seed.js first).`);
      continue;
    }
    doctorByEmail[email] = doctor;

    for (const name of LINKS[email]) {
      const hospital = hospitalByName[name];
      await prisma.doctorHospital.upsert({
        where: { doctorId_hospitalId: { doctorId: doctor.id, hospitalId: hospital.id } },
        update: {},
        create: { doctorId: doctor.id, hospitalId: hospital.id },
      });
      console.log(`Linked doctor ${doctor.id} -> ${name}`);
    }
  }

  // Attach pre-existing availability rows (hospital_id is NULL) to a hospital.
  for (const [email, hospitalName] of Object.entries(BACKFILL)) {
    const doctor = doctorByEmail[email];
    if (!doctor) continue;
    const { count } = await prisma.doctorAvailability.updateMany({
      where: { doctorId: doctor.id, hospitalId: null },
      data: { hospitalId: hospitalByName[hospitalName].id },
    });
    if (count > 0) console.log(`Backfilled ${count} availability row(s) for ${email} -> ${hospitalName}`);
  }

  // A second schedule for Dr. Layla at her other hospital (per-hospital schedules demo).
  const layla = doctorByEmail['layla.fares@example.com'];
  if (layla) {
    const saintGeorge = hospitalByName['Saint George Hospital University Medical Center'];
    const exists = await prisma.doctorAvailability.findFirst({
      where: { doctorId: layla.id, hospitalId: saintGeorge.id },
    });
    if (!exists) {
      await prisma.doctorAvailability.create({
        data: { doctorId: layla.id, hospitalId: saintGeorge.id, dayOfWeek: 3, startTime: time('14:00'), endTime: time('18:00') },
      });
      console.log('Created Wednesday 14:00-18:00 schedule for Dr. Layla at Saint George.');
    }
  }

  console.log('\nDone. Remember: the hospital coordinates are approximate, verify them before your demo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });