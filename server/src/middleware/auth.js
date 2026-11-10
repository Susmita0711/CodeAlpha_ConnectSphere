import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, name: user.name, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired.' });
  }
}

export function socketUser(token) {
  if (!token) throw new Error('Authentication required.');
  return jwt.verify(token, config.jwtSecret);
}
