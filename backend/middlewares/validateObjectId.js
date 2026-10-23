import mongoose from 'mongoose';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Pure validation helper for MongoDB ObjectIds.
 * Verifies both canonical 24-character hexadecimal format and Mongoose validity.
 *
 * @param {*} id
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return OBJECT_ID_REGEX.test(id) && mongoose.Types.ObjectId.isValid(id);
};

/**
 * Express middleware to validate route parameters as valid MongoDB ObjectIds.
 * Prevents unhandled CastErrors and potential NoSQL injection through route params.
 *
 * @param {string} paramName - Name of the route parameter to validate (default: 'id')
 */
export const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const paramValue = req.params[paramName];
    if (!isValidObjectId(paramValue)) {
      return res.status(400).json({
        error: `Invalid resource identifier format for '${paramName}'`,
        success: false,
      });
    }
    next();
  };
};

export default validateObjectIdParam;
