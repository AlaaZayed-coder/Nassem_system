import express from 'express';
import bcrypt from 'bcrypt';
import { listUsers, saveUser } from '../repositories/usersRepository.js';
import { canAdmin } from '../middleware/roleMiddleware.js';
import { audit } from '../services/auditService.js';

export const userRoutes = express.Router();
userRoutes.get('/', canAdmin, (req, res) => res.json(listUsers()));
userRoutes.post('/', canAdmin, async (req, res) => {
  const result = saveUser({ ...req.body, password_hash: await bcrypt.hash(req.body.password || 'ChangeMe123!', 10) });
  audit({ user: req.user.username, action: 'user change', note: req.body.username });
  res.json(result);
});
