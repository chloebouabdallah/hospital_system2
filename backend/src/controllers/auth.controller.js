const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const SALT_ROUNDS = 10;

// Cookie options shared between login (set) and logout (clear).
const COOKIE_NAME = 'token';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production', // must be true in prod (HTTPS)
  maxAge: 7 * 24 * 60 * 60 * 1000,               // 7 days, matches JWT expiry
  path: '/',
};

async function register(req, res) {
  try {
    let { name, email, password } = req.body;

    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include a letter and a number.',
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: 'patient' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function login(req, res) {
  try {
    let { email, password } = req.body;
    email = (email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie(COOKIE_NAME, token, cookieOptions);

    // Never send the token in the response body — it lives only in the HttpOnly cookie.
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res.status(200).json({ message: 'Logged out.' });
}

module.exports = { register, login, logout };