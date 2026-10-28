const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  // ---------------- Specialties ----------------
  const [gp, neurologist, cardiologist, gastro, pulmonologist] = await Promise.all([
    prisma.specialty.create({ data: { name: 'General Practitioner', description: 'First point of contact for most symptoms.' } }),
    prisma.specialty.create({ data: { name: 'Neurologist', description: 'Nervous system, including headaches and migraines.' } }),
    prisma.specialty.create({ data: { name: 'Cardiologist', description: 'Heart and cardiovascular conditions.' } }),
    prisma.specialty.create({ data: { name: 'Gastroenterologist', description: 'Digestive system and stomach-related conditions.' } }),
    prisma.specialty.create({ data: { name: 'Pulmonologist', description: 'Lungs and respiratory conditions.' } }),
  ]);

  // ---------------- Users (patients) + Doctors ----------------
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const patient1 = await prisma.user.create({
    data: { name: 'Sara Khalil', email: 'sara@example.com', passwordHash, role: 'patient' },
  });
  const patient2 = await prisma.user.create({
    data: { name: 'Omar Haddad', email: 'omar@example.com', passwordHash, role: 'patient' },
  });

  const doctorUser1 = await prisma.user.create({
    data: { name: 'Dr. Layla Fares', email: 'layla.fares@example.com', passwordHash, role: 'doctor' },
  });
  const doctorUser2 = await prisma.user.create({
    data: { name: 'Dr. Karim Nassar', email: 'karim.nassar@example.com', passwordHash, role: 'doctor' },
  });
  const adminUser = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@example.com', passwordHash, role: 'admin' },
  });

  const doctor1 = await prisma.doctor.create({
    data: { userId: doctorUser1.id, specialtyId: neurologist.id, bio: 'Specialist in headache disorders.', yearsExperience: 9 },
  });
  const doctor2 = await prisma.doctor.create({
    data: { userId: doctorUser2.id, specialtyId: gp.id, bio: 'General family medicine.', yearsExperience: 5 },
  });

  await prisma.doctorAvailability.createMany({
    data: [
      { doctorId: doctor1.id, dayOfWeek: 1, startTime: new Date('1970-01-01T09:00:00Z'), endTime: new Date('1970-01-01T13:00:00Z') },
      { doctorId: doctor2.id, dayOfWeek: 3, startTime: new Date('1970-01-01T10:00:00Z'), endTime: new Date('1970-01-01T16:00:00Z') },
    ],
  });

  // ---------------- Symptoms + Questions + Options ----------------
  const symptomDefs = [
    {
      name: 'Headache',
      questions: [
        { text: 'Where is the pain?', type: 'single', options: ['Front of head', 'Back of head', 'One side', 'Around the eyes', 'Entire head'] },
        { text: 'How severe is it?', type: 'single', options: ['Mild', 'Moderate', 'Severe'] },
        { text: 'How long have you had it?', type: 'single', options: ['Less than a day', '1-3 days', 'More than 3 days'] },
        { text: 'Do you also have any of the following?', type: 'multi', options: ['Fever', 'Nausea', 'Vomiting', 'Blurred vision', 'Sensitivity to light'] },
      ],
    },
    {
      name: 'Fever',
      questions: [
        { text: 'What is your temperature range?', type: 'single', options: ['<38C', '38-39C', '>39C'] },
        { text: 'How long have you had it?', type: 'single', options: ['Less than a day', '1-3 days', 'More than 3 days'] },
        { text: 'Do you also have any of the following?', type: 'multi', options: ['Chills', 'Rash', 'Cough', 'Sore throat', 'Body aches'] },
      ],
    },
    {
      name: 'Cough',
      questions: [
        { text: 'What type of cough is it?', type: 'single', options: ['Dry', 'With mucus', 'With blood'] },
        { text: 'How long have you had it?', type: 'single', options: ['Less than a week', '1-2 weeks', 'More than 2 weeks'] },
        { text: 'Do you also have any of the following?', type: 'multi', options: ['Fever', 'Chest pain', 'Shortness of breath', 'Wheezing'] },
      ],
    },
    {
      name: 'Chest Pain',
      questions: [
        { text: 'What does the pain feel like?', type: 'single', options: ['Sharp', 'Dull', 'Pressure'] },
        { text: 'When does it happen?', type: 'single', options: ['At rest', 'On exertion', 'With breathing'] },
        { text: 'Do you also have any of the following?', type: 'multi', options: ['Shortness of breath', 'Sweating', 'Arm or jaw pain', 'Dizziness'] },
      ],
    },
    {
      name: 'Stomach Pain',
      questions: [
        { text: 'Where is the pain located?', type: 'single', options: ['Upper abdomen', 'Lower abdomen', 'Entire abdomen', 'One side'] },
        { text: 'How severe is it?', type: 'single', options: ['Mild', 'Moderate', 'Severe'] },
        { text: 'How long have you had it?', type: 'single', options: ['Less than a day', '1-3 days', 'More than 3 days'] },
        { text: 'Do you also have any of the following?', type: 'multi', options: ['Nausea', 'Vomiting', 'Diarrhea', 'Blood in stool', 'Fever'] },
      ],
    },
  ];

  const symptomsByName = {};

  for (const def of symptomDefs) {
    const symptom = await prisma.symptom.create({ data: { name: def.name } });
    symptomsByName[def.name] = symptom;

    for (let i = 0; i < def.questions.length; i++) {
      const q = def.questions[i];
      const question = await prisma.symptomQuestion.create({
        data: {
          symptomId: symptom.id,
          questionText: q.text,
          questionType: q.type,
          displayOrder: i,
        },
      });
      await prisma.symptomQuestionOption.createMany({
        data: q.options.map((opt) => ({
          questionId: question.id,
          optionText: opt,
          optionValue: opt.toLowerCase().replace(/\s+/g, '_'),
        })),
      });
    }
  }

  // ---------------- Conditions + Condition-Symptom links ----------------
  const migraine = await prisma.condition.create({
    data: {
      name: 'Migraine',
      description: 'A neurological condition causing intense, throbbing headaches.',
      causes: 'Triggers vary by person: stress, certain foods, hormonal changes, lack of sleep.',
      whenToSeekCare: 'If headaches are frequent, severe, or accompanied by vision changes.',
      specialtyId: neurologist.id,
    },
  });
  const tensionHeadache = await prisma.condition.create({
    data: {
      name: 'Tension Headache',
      description: 'The most common type of headache, often related to stress or muscle tension.',
      causes: 'Stress, poor posture, eye strain, dehydration.',
      whenToSeekCare: 'If it persists for several days or worsens.',
      specialtyId: gp.id,
    },
  });
  const commonCold = await prisma.condition.create({
    data: {
      name: 'Common Cold',
      description: 'A mild viral infection of the nose and throat.',
      causes: 'Viral infection, typically spread through contact.',
      whenToSeekCare: 'If symptoms last more than 10 days or worsen.',
      specialtyId: gp.id,
    },
  });
  const angina = await prisma.condition.create({
    data: {
      name: 'Angina',
      description: 'Chest pain caused by reduced blood flow to the heart.',
      causes: 'Underlying coronary artery disease.',
      whenToSeekCare: 'Seek urgent care if pain is severe or accompanied by shortness of breath.',
      specialtyId: cardiologist.id,
    },
  });
  const gastritis = await prisma.condition.create({
    data: {
      name: 'Gastritis',
      description: 'Inflammation of the stomach lining.',
      causes: 'Infection, prolonged use of certain painkillers, excessive alcohol use.',
      whenToSeekCare: 'If pain is severe or there is blood in vomit or stool.',
      specialtyId: gastro.id,
    },
  });

  await prisma.conditionSymptom.createMany({
    data: [
      { conditionId: migraine.id, symptomId: symptomsByName['Headache'].id, relevanceWeight: 0.9 },
      { conditionId: tensionHeadache.id, symptomId: symptomsByName['Headache'].id, relevanceWeight: 0.8 },
      { conditionId: commonCold.id, symptomId: symptomsByName['Cough'].id, relevanceWeight: 0.7 },
      { conditionId: commonCold.id, symptomId: symptomsByName['Fever'].id, relevanceWeight: 0.6 },
      { conditionId: angina.id, symptomId: symptomsByName['Chest Pain'].id, relevanceWeight: 0.95 },
      { conditionId: gastritis.id, symptomId: symptomsByName['Stomach Pain'].id, relevanceWeight: 0.85 },
    ],
  });

  // ---------------- Triage Rules (JSONB conditions) ----------------
  await prisma.triageRule.createMany({
    data: [
      {
        symptomId: symptomsByName['Headache'].id,
        ruleConditions: { severity: 'severe', flags: ['blurred_vision'] },
        matchedConditionIds: [migraine.id],
        recommendedSpecialtyId: neurologist.id,
        urgencyLevel: 'urgent',
      },
      {
        symptomId: symptomsByName['Headache'].id,
        ruleConditions: { severity: 'mild', duration: 'less_than_a_day' },
        matchedConditionIds: [tensionHeadache.id],
        recommendedSpecialtyId: gp.id,
        urgencyLevel: 'low',
      },
      {
        symptomId: symptomsByName['Chest Pain'].id,
        ruleConditions: { flags: ['shortness_of_breath', 'sweating'] },
        matchedConditionIds: [angina.id],
        recommendedSpecialtyId: cardiologist.id,
        urgencyLevel: 'urgent',
      },
      {
        symptomId: symptomsByName['Stomach Pain'].id,
        ruleConditions: { severity: 'moderate' },
        matchedConditionIds: [gastritis.id],
        recommendedSpecialtyId: gastro.id,
        urgencyLevel: 'moderate',
      },
    ],
  });

  console.log('Seed complete:', {
    patients: [patient1.email, patient2.email],
    doctors: [doctorUser1.email, doctorUser2.email],
    admin: adminUser.email,
    symptoms: Object.keys(symptomsByName),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });