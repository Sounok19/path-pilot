import { randomInt } from 'node:crypto';
import { Question } from './models.js';
import { questionInput } from './validation.js';
export function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export async function getQuestions(
  source,
  skill,
  { fetchFn = fetch, externalEnabled = true } = {},
) {
  let notice = '';
  if (source === 'external' && externalEnabled) {
    try {
      const response = await fetchFn(
        'https://opentdb.com/api.php?amount=5&category=18&type=multiple&encode=url3986',
        { signal: AbortSignal.timeout(4500) },
      );
      if (!response.ok) throw new Error('Provider unavailable');
      const body = await response.json();
      if (body.response_code !== 0 || !Array.isArray(body.results) || body.results.length !== 5)
        throw new Error('Provider returned no questions');
      const questions = body.results.map((q) => {
        const correct = decodeURIComponent(q.correct_answer);
        const options = shuffle([correct, ...q.incorrect_answers.map(decodeURIComponent)]);
        return questionInput.parse({
          skill: 'Data Structures',
          prompt: decodeURIComponent(q.question),
          options,
          correctIndex: options.indexOf(correct),
          explanation: `Open Trivia DB answer: ${correct}.`,
          active: true,
        });
      });
      // Broad computer trivia is kept separate from specific skill evidence.
      return {
        questions: questions.map((q) => ({ ...q, skill: 'Computer fundamentals' })),
        source: 'Open Trivia DB',
        notice:
          'Computer trivia supplied by Open Trivia DB (CC BY-SA 4.0); it is excluded from career-specific skill scoring.',
      };
    } catch {
      notice = 'The external quiz service is unavailable. A local practice test is ready instead.';
    }
  } else if (source === 'external')
    notice = 'External quizzes are disabled. A local practice test is ready instead.';
  const questions = await Question.find({
    active: true,
    ...(skill !== 'Mixed' ? { skill } : {}),
  }).lean();
  return { questions: shuffle(questions).slice(0, 5), source: 'Local question bank', notice };
}
