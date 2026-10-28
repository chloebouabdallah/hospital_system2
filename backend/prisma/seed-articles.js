

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SOURCE = 'FYP sample content - replace with a cited source';

const ARTICLES = [
  {
    condition: 'Migraine',
    title: 'Understanding migraine',
    content:
      'Migraine is a neurological condition that typically causes moderate to severe throbbing headache, often on one side of the head, and may come with nausea, vomiting, and sensitivity to light or sound. Common triggers include stress, irregular sleep, certain foods, and hormonal changes. Resting in a dark, quiet room and keeping a trigger diary can help. A doctor can advise on treatment and prevention if attacks are frequent.',
  },
  {
    condition: 'Tension Headache',
    title: 'Managing tension headaches',
    content:
      'Tension headaches usually feel like a dull, tight band or pressure around the head and are often linked to stress, poor posture, eye strain, or dehydration. Rest, drinking enough water, regular sleep, and gentle neck and shoulder stretching often help. See a doctor if headaches become frequent, last for several days, or get worse.',
  },
  {
    condition: 'Common Cold',
    title: 'What to do about a common cold',
    content:
      'The common cold is a mild viral infection of the nose and throat. It causes a runny or blocked nose, sore throat, cough, and sometimes a low fever, and usually clears in about 7 to 10 days with rest and fluids. See a doctor if symptoms last longer than 10 days, get worse, or you have difficulty breathing.',
  },
  {
    condition: 'Angina',
    title: 'Angina: warning signs and when to get help',
    content:
      'Angina is chest pain or pressure caused by reduced blood flow to the heart muscle. It is often brought on by physical effort or stress and eases with rest, and it can be a warning sign of coronary artery disease. Chest pain that is severe, lasts more than a few minutes at rest, or comes with shortness of breath, sweating, or pain spreading to the arm or jaw needs emergency care.',
  },
  {
    condition: 'Gastritis',
    title: 'Gastritis and stomach lining inflammation',
    content:
      'Gastritis is inflammation of the stomach lining. It can cause upper abdominal pain, nausea, bloating, and indigestion. Common causes include H. pylori infection, long-term use of anti-inflammatory painkillers, and heavy alcohol use. See a doctor if pain is persistent or severe, and seek urgent care if you vomit blood or notice black or bloody stools.',
  },
];

async function main() {
  for (const a of ARTICLES) {
    const condition = await prisma.condition.findUnique({ where: { name: a.condition } });
    if (!condition) {
      console.log(`Skipped "${a.title}": condition "${a.condition}" not found.`);
      continue;
    }

    const exists = await prisma.medicalArticle.findFirst({
      where: { conditionId: condition.id, title: a.title },
    });
    if (exists) {
      console.log(`Already exists: "${a.title}"`);
      continue;
    }

    await prisma.medicalArticle.create({
      data: { conditionId: condition.id, title: a.title, content: a.content, source: SOURCE },
    });
    console.log(`Created: "${a.title}"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });