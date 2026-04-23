/**
 * Async Handler to wrap controller functions and catch errors
 * @param {Function} fn - The async function to wrap
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
