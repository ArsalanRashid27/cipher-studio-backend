// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = "your-secret-key"; // Yeh wahi secret key hai jo index.js mein hai

module.exports = function (req, res, next) {
  // Header se token lein
  const token = req.header('Authorization');

  // Check karein ki token hai ya nahi
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // "Bearer TOKEN_STRING" se "TOKEN_STRING" nikaalein
  const tokenString = token.split(' ')[1];
  if (!tokenString) {
    return res.status(401).json({ message: 'Token format is invalid' });
  }

  // Token ko verify karein
  try {
    const decoded = jwt.verify(tokenString, JWT_SECRET);
    req.user = decoded; // User ki info (userId, username) ko req object mein daal dein
    next(); // Guard ne pass kar diya, ab agle function par jaayein
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};