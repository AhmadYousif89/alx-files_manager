/**
 * Wraps an async function to catch errors and pass them to the next middleware
 * @param {(req: Request, res: Response, next: Function) => Promise<void>} fn
 * @returns {(req: Request, res: Response, next: Function) => Promise<void>}
 */
const asyncWrapper = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

export default asyncWrapper;
