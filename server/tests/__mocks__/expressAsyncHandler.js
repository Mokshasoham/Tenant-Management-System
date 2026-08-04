/**
 * tests/__mocks__/expressAsyncHandler.js
 *
 * Jest module name mapper shim for express-async-handler.
 * Provides a transparent passthrough so the controller works correctly
 * in the test environment without requiring the real package to be installed
 * as a devDependency.
 *
 * asyncHandler(fn) → async (req, res, next) => { try { await fn(...) } catch(e) { next(e) } }
 */

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

export default asyncHandler;
