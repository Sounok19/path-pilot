import { careers, resources } from './catalog.js';
const average = (values) =>
  values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
export function analytics(profile, attempts) {
  const done = attempts
    .filter((a) => a.status === 'submitted')
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const buckets = {};
  for (const a of done)
    a.questions.forEach((q, i) => {
      const b = (buckets[q.skill] ??= { correct: 0, total: 0 });
      b.total++;
      if (a.answers[i] === q.correctIndex) b.correct++;
    });
  return {
    attempts: done.length,
    averageScore: average(done.map((a) => a.score)),
    bestScore: done.length ? Math.max(...done.map((a) => a.score)) : 0,
    topicProgress: average(profile.topics.map((t) => t.progress)),
    learningHours: Math.round(profile.topics.reduce((n, t) => n + t.hours, 0) * 10) / 10,
    completedTopics: profile.topics.filter((t) => t.progress === 100).length,
    trend: done
      .slice(-10)
      .map((a) => ({ id: a._id, date: a.submittedAt, score: a.score, title: a.title })),
    bySkill: Object.entries(buckets).map(([skill, b]) => ({
      skill,
      ...b,
      score: Math.round((b.correct / b.total) * 100),
    })),
  };
}
export function guidance(profile, attempts) {
  const stats = analytics(profile, attempts);
  const ranked = careers
    .map((c) => {
      const gaps = Object.entries(c.skills).map(([skill, target]) => {
        const self = profile.skills.find((s) => s.name === skill)?.level ?? 0;
        const topics = profile.topics.filter((t) => t.skill === skill);
        const progress = topics.length ? average(topics.map((t) => t.progress)) : null;
        const assessed = stats.bySkill.find((s) => s.skill === skill);
        // Renormalize weights when learning or test evidence is absent.
        let sum = self * 0.5,
          weight = 0.5;
        if (progress !== null) {
          sum += progress * 0.2;
          weight += 0.2;
        }
        if (assessed) {
          sum += assessed.score * 0.3;
          weight += 0.3;
        }
        const current = Math.round(sum / weight);
        return {
          skill,
          target,
          current,
          gap: Math.max(0, target - current),
          self,
          progress,
          testScore: assessed?.score ?? null,
          resource: resources.find((r) => r.skill === skill),
        };
      });
      const readiness = Math.round(
        (gaps.reduce((n, g) => n + Math.min(g.current / g.target, 1), 0) / gaps.length) * 100,
      );
      const isGoal = profile.goals.some((g) => g.careerId === c.id && g.status === 'active');
      const interested = profile.interests.includes(c.id);
      return {
        ...c,
        gaps: gaps.sort((a, b) => b.gap - a.gap),
        readiness,
        isGoal,
        interested,
        rank: readiness + (isGoal ? 25 : 0) + (interested ? 10 : 0),
      };
    })
    .sort((a, b) => b.rank - a.rank);
  const focus = ranked.find(c => c.id === profile.careerFocus);
  const goals = ranked.filter(c => c.isGoal), interests = ranked.filter(c => c.interested);
  const selected = focus || (goals.length === 1 ? goals[0] : goals.length === 0 && interests.length === 1 ? interests[0] : null);
  // A tie, especially an empty profile, is not evidence of a career preference.
  const first = selected || (ranked[0]?.rank > 0 && ranked[0].rank > (ranked[1]?.rank ?? 0) ? ranked[0] : null);
  const actions = [];
  if (!profile.skills.length)
    actions.push('Add your current skills to make these estimates more useful.');
  if (!profile.goals.some((g) => g.status === 'active'))
    actions.push('Choose an active career goal so your learning plan has a clear direction.');
  if (!stats.attempts)
    actions.push('Take a mock test to add assessment evidence to your self-reported skills.');
  if (profile.year <= 2)
    actions.push(
      'Build foundations first: choose one small project and keep a weekly learning log.',
    );
  else
    actions.push(
      'Prepare a portfolio project and practise explaining your decisions before internship interviews.',
    );
  if (profile.cgpa > 0 && profile.cgpa < 6)
    actions.push('Reserve time for academic fundamentals alongside career preparation.');
  if (first)
    first.gaps
      .filter((g) => g.gap > 0)
      .slice(0, 3)
      .forEach((g) =>
        actions.push(
          `For ${first.title}, focus on ${g.skill}: estimated ${g.current}/100 versus a learning target of ${g.target}/100.`,
        ),
      );
  return {
    selectedCareerId: selected?.id || null,
    recommendedCareerId: first?.id || null,
    careers: ranked,
    actions,
    method:
      'Rule-based learning guidance, not a hiring prediction. Skills contribute 50%, topic progress 20%, and test evidence 30%; available weights are normalized. Active goals add 25 ranking points and interests add 10. Targets are illustrative curriculum values.',
  };
}
