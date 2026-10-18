export const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRoles = Array.isArray(user.roles) ? user.roles : [];

    // Vérifier si au moins un des rôles de l'utilisateur est dans la liste
    const hasRole = userRoles.some((r) => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};

export default roleMiddleware;

