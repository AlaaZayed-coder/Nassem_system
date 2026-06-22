import express from 'express';
import bcrypt from 'bcrypt';
import { listUsers, createUser, updateUser, resetPassword } from '../repositories/usersRepository.js';
import { canAdmin } from '../middleware/roleMiddleware.js';
import { audit } from '../services/auditService.js';

export const userRoutes = express.Router();

userRoutes.get('/', canAdmin, (_req, res) => res.json(listUsers()));

userRoutes.post('/', canAdmin, async (req, res, next) => {
  try {
    const { username, display_name, role, password, permissions } = req.body;
    if (!username || !display_name || !role) throw new Error('اسم المستخدم والاسم والدور مطلوبة');
    const hash = await bcrypt.hash(password || 'ChangeMe123!', 10);
    const user = createUser({ username, display_name, password_hash: hash, role, permissions });
    audit({ user: req.user.username, action: 'create user', note: username });
    res.json(user);
  } catch (e) { next(e); }
});

userRoutes.put('/:id', canAdmin, (req, res, next) => {
  try {
    const { display_name, role, is_active, permissions } = req.body;
    const user = updateUser(Number(req.params.id), { display_name, role, is_active, permissions });
    audit({ user: req.user.username, action: 'update user', note: `id=${req.params.id}` });
    res.json(user);
  } catch (e) { next(e); }
});

userRoutes.post('/:id/reset-password', canAdmin, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    const hash = await bcrypt.hash(password, 10);
    const user = resetPassword(Number(req.params.id), hash);
    audit({ user: req.user.username, action: 'reset password', note: `id=${req.params.id}` });
    res.json(user);
  } catch (e) { next(e); }
});
