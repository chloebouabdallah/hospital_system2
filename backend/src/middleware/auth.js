const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');



// ---- 1. authenticate: verifies the JWT from the HttpOnly cookie ----
function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ---- 2. authorize: restricts a route to specific roles ----
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this.' });
    }
    next();
  };
}

// ---- 3. can: generic permission-check wrapper around a predicate function ----
// Usage: can((req) => req.user.role === 'admin' || req.someCondition)
function can(predicateFn) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    try {
      const allowed = await predicateFn(req);
      if (!allowed) {
        return res.status(403).json({ error: 'You do not have permission to do this.' });
      }
      next();
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ error: 'Something went wrong checking permissions.' });
    }
  };
}

// ---- 4. isSelfOrAdmin: for routes like GET/PATCH /users/:id ----
// Allows the request through if req.user.id matches the :id param, or if user is admin.
function isSelfOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  const targetId = parseInt(req.params.id, 10);
  if (req.user.role === 'admin' || req.user.id === targetId) {
    return next();
  }
  return res.status(403).json({ error: 'You do not have permission to do this.' });
}

// ---- 5. isAssignedDoctorOrAdmin: for routes tied to a specific doctor's own data ----
// Looks up the Doctor record for the logged-in user (if role is doctor) and checks
// it matches the :doctorId (or the doctorId on the resource being accessed).
async function isAssignedDoctorOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'You do not have permission to do this.' });
  }

  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) {
      return res.status(403).json({ error: 'No doctor profile linked to this account.' });
    }

    const targetDoctorId = parseInt(req.params.doctorId || req.params.id, 10);
    if (doctor.id === targetDoctorId) {
      req.doctorRecord = doctor; // handy for the controller to reuse
      return next();
    }
    return res.status(403).json({ error: 'You do not have permission to do this.' });
  } catch (err) {
    console.error('isAssignedDoctorOrAdmin error:', err);
    return res.status(500).json({ error: 'Something went wrong checking permissions.' });
  }
}

module.exports = {
  authenticate,
  authorize,
  can,
  isSelfOrAdmin,
  isAssignedDoctorOrAdmin,
};