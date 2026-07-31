// Usage: roleMiddleware("admin"), roleMiddleware("admin", "staff")
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "You do not have access to this resource." });
    }
    next();
  };
}

module.exports = roleMiddleware;
