import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
  },
  { timestamps: true },
);
const profileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    college: { type: String, default: '' },
    degree: { type: String, default: '' },
    year: { type: Number, default: 1 },
    cgpa: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    interests: { type: [String], default: [] },
    careerFocus: { type: String, default: '' },
    skills: [{ _id: false, name: String, level: Number, development: String }],
    topics: [
      { _id: false, id: String, title: String, skill: String, progress: Number, hours: Number },
    ],
    goals: [
      {
        _id: false,
        id: String,
        careerId: String,
        targetDate: String,
        status: { type: String, enum: ['active', 'completed'] },
        notes: String,
      },
    ],
  },
  { timestamps: true, optimisticConcurrency: true },
);
const questionSchema = new Schema(
  {
    key: { type: String, unique: true, sparse: true },
    skill: String,
    prompt: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const attemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: String,
    source: String,
    notice: String,
    questions: [
      {
        _id: false,
        skill: String,
        prompt: String,
        options: [String],
        correctIndex: Number,
        explanation: String,
      },
    ],
    answers: [Number],
    score: Number,
    correct: Number,
    total: Number,
    submittedAt: Date,
    status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress' },
  },
  { timestamps: true },
);
attemptSchema.index({ user: 1, createdAt: -1 });
export const User = model('User', userSchema);
export const Profile = model('Profile', profileSchema);
export const Question = model('Question', questionSchema);
export const Attempt = model('Attempt', attemptSchema);

const enrollmentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  number: { type: String, required: true, unique: true },
  enrolledAt: { type: Date, required: true },
}, { timestamps: true });
const paymentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['premium'], default: 'premium' },
  provider: { type: String, required: true },
  mode: { type: String, enum: ['test', 'simulation'], default: 'test' },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  durationDays: { type: Number, required: true },
  status: { type: String, enum: ['creating', 'pending', 'paid', 'refunded', 'failed', 'cancelled'], default: 'creating' },
  open: { type: Boolean, default: true },
  providerOrderId: { type: String },
  providerPaymentId: { type: String },
  paidAt: Date,
  startsAt: Date,
  expiresAt: Date,
  refundedAt: Date,
  lastFailureAt: Date,
}, { timestamps: true });
// At most one checkout can remain open per student. Retry reuses that order.
paymentSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { open: true } });
paymentSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ user: 1, status: 1, expiresAt: -1 });
export const Enrollment = model('Enrollment', enrollmentSchema);
export const Payment = model('Payment', paymentSchema);

const skillRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  normalizedName: { type: String, required: true, unique: true },
  domain: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewNote: { type: String, default: '' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
}, { timestamps: true });
export const SkillRequest = model('SkillRequest', skillRequestSchema);
