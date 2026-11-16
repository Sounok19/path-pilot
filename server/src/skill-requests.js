import mongoose from 'mongoose';
import { z } from 'zod';
import { SkillRequest, Question } from './models.js';
import { skillNames, careers } from './catalog.js';
import { requireSubscription } from './enrollment.js';
const fail = (status, message) => Object.assign(new Error(message), { status });
export const skillDomains = [...new Set(careers.map(c => c.field))];
const input = z.object({
  name: z.string().trim().min(2).max(60).transform(s => s.replace(/\s+/g, ' ')),
  domain: z.enum(skillDomains), reason: z.string().trim().min(10).max(500),
}).strict();
const review = z.object({ status: z.enum(['approved', 'rejected']), reviewNote: z.string().trim().max(300).default('') }).strict();
export async function approvedSkillNames() {
  const approved = await SkillRequest.find({ status: 'approved' }).sort({ name: 1 }).select('name').lean();
  return [...skillNames, ...approved.map(s => s.name)];
}
export async function validateApprovedSkills(names) {
  const allowed = new Set(await approvedSkillNames());
  if (names.some(name => !allowed.has(name))) throw fail(400, 'Choose an approved skill. Request a new skill and wait for admin approval before using it.');
}
async function withTestAvailability(records) {
  const counts = await Question.aggregate([{ $match: { active: true, skill: { $in: records.map(r => r.name) } } }, { $group: { _id: '$skill', count: { $sum: 1 } } }]);
  return records.map(r => ({ ...r, questionCount: r.status === 'approved' ? counts.find(c => c._id === r.name)?.count || 0 : 0 }));
}
export function mountSkillRequests(app, { auth, student, admin }) {
  app.get('/api/skill-requests', auth, student, requireSubscription, async (req, res) => {
    res.json(await withTestAvailability(await SkillRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200).lean()));
  });
  app.post('/api/skill-requests', auth, student, requireSubscription, async (req, res) => {
    const data = input.parse(req.body), normalizedName = data.name.toLowerCase();
    if (['mixed', ...skillNames.map(s => s.toLowerCase())].includes(normalizedName)) throw fail(409, 'This skill already exists. Choose it from the provided skill list.');
    await SkillRequest.init();
    if (await SkillRequest.exists({ normalizedName })) throw fail(409, 'This skill has already been requested or reviewed. Check your requests or the approved skill list.');
    try { res.status(201).json(await SkillRequest.create({ ...data, normalizedName, user: req.user._id })); }
    catch (error) { if (error.code === 11000) throw fail(409, 'This skill has already been requested.'); throw error; }
  });
  app.get('/api/admin/skill-requests', auth, admin, async (req, res) => {
    const page = z.coerce.number().int().min(1).max(100000).default(1).parse(req.query.page);
    const [rows, total] = await Promise.all([
      SkillRequest.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).populate('user', 'name email').lean(),
      SkillRequest.countDocuments(),
    ]);
    res.json({ rows: await withTestAvailability(rows), total, page, pageSize: 20 });
  });
  app.put('/api/admin/skill-requests/:id', auth, admin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(400, 'Invalid request identifier.');
    const data = review.parse(req.body);
    const result = await SkillRequest.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { $set: { ...data, reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true });
    if (!result) throw fail(409, 'This request has already been reviewed or no longer exists. Refresh the list.');
    res.json(result);
  });
}
