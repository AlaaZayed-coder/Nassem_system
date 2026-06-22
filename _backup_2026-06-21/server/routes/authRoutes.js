import express from 'express';
import bcrypt from 'bcrypt';
import { findUser } from '../repositories/usersRepository.js';
import { signUser } from '../middleware/authMiddleware.js';

export const authRoutes = express.Router();

authRoutes.post('/login', async (req, res) => {
  const user = findUser(req.body.username);
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
  res.json({ token: signUser(user), user: { username: user.username, display_name: user.display_name, role: user.role } });
});
