import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { User, Profile, Question, Attempt } from './models.js';
import { initialQuestions } from './catalog.js';
import { migrateEnrollments } from './enrollment.js';
export async function seed(password = 'PilotLab2026!') {
  if (password.length < 10 || Buffer.byteLength(password) > 72)
    throw new Error('Demo password must be 10-72 bytes.');
  for (const q of initialQuestions)
    await Question.updateOne({ key: q.key }, { $setOnInsert: q }, { upsert: true });
  for (const data of [
    { name: 'Aarav Student', email: 'student@pathpilot.local', role: 'student' },
    { name: 'Lab Administrator', email: 'admin@pathpilot.local', role: 'admin' },
  ]) {
    if (await User.exists({ email: data.email })) continue;
    const user = await User.create({ ...data, passwordHash: await bcrypt.hash(password, 12) });
    if (data.role !== 'student') continue;
    await Profile.create({
      user: user._id,
      college: 'IEM, Kolkata',
      degree: 'B.Tech · Computer Science',
      year: 3,
      cgpa: 8.2,
      bio: 'Building my first full-stack project and preparing for internships.',
      interests: ['full-stack'],
      skills: [
        { name: 'JavaScript', level: 65, development: 'Practise asynchronous programming' },
        { name: 'Angular', level: 40, development: 'Build reusable components' },
        { name: 'Node.js', level: 50, development: 'Design and test REST APIs' },
        { name: 'MongoDB', level: 45, development: 'Learn indexes and aggregation' },
        { name: 'Communication', level: 70, development: 'Explain design decisions' },
      ],
      topics: [
        {
          id: randomUUID(),
          title: 'JavaScript fundamentals',
          skill: 'JavaScript',
          progress: 100,
          hours: 8,
        },
        {
          id: randomUUID(),
          title: 'Angular components & services',
          skill: 'Angular',
          progress: 55,
          hours: 5,
        },
        {
          id: randomUUID(),
          title: 'Building a REST API',
          skill: 'Node.js',
          progress: 40,
          hours: 4,
        },
      ],
      goals: [
        {
          id: randomUUID(),
          careerId: 'full-stack',
          targetDate: '2027-06-30',
          status: 'active',
          notes: 'Build and present a complete MEAN-stack project.',
        },
      ],
    });
    const questions = initialQuestions
      .filter((q) => ['JavaScript', 'Angular', 'Node.js', 'MongoDB'].includes(q.skill))
      .slice(0, 5);
    for (let i = 0; i < 3; i++) {
      const answers = questions.map((q, j) =>
        j < i + 2 ? q.correctIndex : (q.correctIndex + 1) % 4,
      );
      const date = new Date(Date.now() - (14 - i * 5) * 86400000);
      await Attempt.create({
        user: user._id,
        title: 'Mixed practice (sample)',
        source: 'Local question bank',
        questions,
        answers,
        total: 5,
        correct: i + 2,
        score: (i + 2) * 20,
        status: 'submitted',
        createdAt: date,
        submittedAt: date,
      });
    }
  }
  await migrateEnrollments();
}
