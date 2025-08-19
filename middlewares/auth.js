import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }
  next();
};

export const isOwnerOrAdmin = (req, res, next) => {
  const isMatch = req.user.id == req.params.userId;
  if (isMatch || req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({ 
      message: 'Forbidden. You do not have access to this resource. ID mismatch.' 
  });
};