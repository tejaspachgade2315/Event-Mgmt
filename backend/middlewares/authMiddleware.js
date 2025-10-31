const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).send('A token is required for authentication');
  }

  try {
    const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send('Invalid Token');
  }

  return next();
}

const verifyAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).send('Admin privileges required');
  }
  return next();
}

const errorHandler = (err, req, res, next) => {
  if (err && err.isJoi) {
    const details = err.details ? err.details.map(d => ({ message: d.message, path: d.path })) : [];
    return res.status(400).json({ error: 'Validation failed', details });
  }
  if (err && err.status && err.message) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal Server Error' });
};

const rateLimiter = (req, res, next) => {
  
  next();
}

module.exports = { verifyToken, verifyAdmin, errorHandler };


