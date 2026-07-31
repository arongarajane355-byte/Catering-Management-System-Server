const { verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    // decoded = { id, role, email }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = authMiddleware;
