import { z } from 'zod';
import { careers, skillNames } from './catalog.js';
const text = (max) => z.string().trim().max(max);
// Database approval is checked by routes after structural validation.
const skill = text(60).min(2);
export const credentials = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(10)
      .max(72)
      .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password must fit in 72 UTF-8 bytes'),
  })
  .strict();
export const registration = credentials.extend({ name: text(80).min(2) });
export const profileInput = z
  .object({
    version: z.number().int().min(0),
    college: text(120),
    degree: text(100),
    year: z.number().int().min(1).max(8),
    cgpa: z.number().min(0).max(10),
    bio: text(800),
    interests: z.array(z.enum(careers.map((c) => c.id))).max(5),
    careerFocus: z.union([z.enum(careers.map(c => c.id)), z.literal('')]).default(''),
    skills: z
      .array(
        z
          .object({ name: skill, level: z.number().int().min(0).max(100), development: text(300) })
          .strict(),
      )
      .max(30),
    topics: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            title: text(150).min(2),
            skill,
            progress: z.number().int().min(0).max(100),
            hours: z.number().min(0).max(10000),
          })
          .strict(),
      )
      .max(100),
    goals: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            careerId: z.enum(careers.map((c) => c.id)),
            targetDate: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .refine(
                (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().startsWith(v),
                'Invalid date',
              ),
            status: z.enum(['active', 'completed']),
            notes: text(500),
          })
          .strict(),
      )
      .max(20),
  })
  .strict()
  .superRefine((p, ctx) => {
    for (const [key, values] of [
      ['skills', p.skills.map((s) => s.name)],
      ['topics', p.topics.map((t) => t.id)],
      ['goals', p.goals.map((g) => g.id)],
    ]) {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', path: [key], message: 'Duplicate entries are not allowed' });
    }
  });
export const questionInput = z
  .object({
    skill,
    prompt: text(600).min(10),
    options: z
      .array(text(250).min(1))
      .length(4)
      .refine((a) => new Set(a).size === 4, 'Options must be distinct'),
    correctIndex: z.number().int().min(0).max(3),
    explanation: text(1000).min(5),
    active: z.boolean(),
  })
  .strict();
export const startInput = z
  .object({
    source: z.enum(['local', 'external']),
    skill: z.union([skill, z.literal('Mixed')]).default('Mixed'),
  })
  .strict();
export const answerInput = z
  .object({ answers: z.array(z.number().int().min(0).max(3)).min(1).max(10) })
  .strict();
export function parse(schema, value) {
  return schema.parse(value);
}
