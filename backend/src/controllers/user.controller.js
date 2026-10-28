const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

// ---- GET /users/me (already built in Day 3) ----
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /users (admin only, list all) ----
async function getAllUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ users });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- GET /users/:id (self or admin) ----
async function getUserById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- PATCH /users/:id (self or admin) ----
async function updateUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const data = {};

    if (name !== undefined) data.name = name;

    if (email !== undefined && email !== existing.email) {
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      data.email = email;
    }

    if (password !== undefined) {
      const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
      if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters and include a letter and a number.',
        });
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    // Note: 'role' is deliberately never accepted here, even for admins.
    // Role changes (e.g. promoting someone to doctor) go through a separate,
    // more deliberate flow — not a general-purpose profile PATCH.

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(200).json({ user: updated });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

// ---- DELETE /users/:id (admin only) ----
async function deleteUser(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({ message: 'User deleted.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

module.exports = { getMe, getAllUsers, getUserById, updateUser, deleteUser };