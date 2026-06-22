import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'local-pricing-secret';

export function signUser(user) {
  return jwt.sign({ username: user.username, display_name: user.display_name, role: user.role }, secret, { expiresIn: '12h' });
}

export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'الرجاء تسجيل الدخول' });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى' });
  }
}
