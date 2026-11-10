import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';
import { authenticate, signToken } from '../middleware/auth.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72)
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
});
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });

router.use((_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'MongoDB is unavailable. Start MongoDB or configure MONGODB_URI.' });
  }
  return next();
});

router.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' });
  try {
    const { name, email, password } = parsed.data;
    if (await User.exists({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password.' });
  try {
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
