import mongoose from 'mongoose';
import logger from './logger.js';

/**
 * Explicit 5-outcome contract for transaction execution.
 * Callers must switch on these outcomes and handle each explicitly.
 */
export const TransactionOutcome = Object.freeze({
  COMMITTED: 'COMMITTED',
  CONFIRMED_ABORTED: 'CONFIRMED_ABORTED',
  RETRYABLE_BODY_FAILURE: 'RETRYABLE_BODY_FAILURE',
  DUPLICATE_KEY_CONFLICT: 'DUPLICATE_KEY_CONFLICT',
  INDETERMINATE_COMMIT: 'INDETERMINATE_COMMIT',
});

/**
 * Checks if an error indicates a transient body failure that is safe to retry from the start.
 */
export function isTransientError(error) {
  if (!error) return false;
  if (typeof error.hasErrorLabel === 'function') {
    if (error.hasErrorLabel('TransientTransactionError')) return true;
  }
  // Code 112: WriteConflict
  if (error.code === 112) return true;
  return false;
}

/**
 * Checks if an error is a duplicate key conflict (E11000).
 */
export function isDuplicateKeyError(error) {
  if (!error) return false;
  if (error.code === 11000 || error.code === 11001) return true;
  if (typeof error.message === 'string' && error.message.includes('E11000')) return true;
  return false;
}

/**
 * Checks if a commit error has an unknown commit outcome.
 */
export function isUnknownCommitResult(error) {
  if (!error) return false;
  if (typeof error.hasErrorLabel === 'function') {
    if (error.hasErrorLabel('UnknownTransactionCommitResult')) return true;
  }
  if (error.name === 'MongoNetworkError' || error.name === 'MongoNetworkTimeoutError') {
    return true;
  }
  return false;
}

/**
 * Helper sleep with backoff
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a transaction function with explicit 5-outcome semantics.
 *
 * @param {Function} txnFunction - async function(session) -> result
 * @param {Object} options
 * @param {Object} [options.clientOrMongoose=mongoose] - Mongoose or MongoClient instance
 * @param {number} [options.maxBodyRetries=3] - Max retries for TransientTransactionError in body
 * @param {number} [options.maxCommitRetries=3] - Max retries for UnknownTransactionCommitResult
 * @param {Function} [options.reconciliationFn=null] - Optional async function(session) -> { confirmedCommitted: boolean, result: any }
 * @param {string} [options.operationName='Transaction'] - For logging
 * @returns {Promise<{ outcome: string, result?: any, error?: Error, attempts?: number }>}
 */
export async function runTransactionWithRetry(txnFunction, options = {}) {
  const {
    clientOrMongoose = mongoose,
    maxBodyRetries = 3,
    maxCommitRetries = 3,
    reconciliationFn = null,
    operationName = 'Transaction',
  } = options;

  let bodyAttempt = 0;

  while (bodyAttempt < maxBodyRetries) {
    bodyAttempt++;
    let session = null;

    try {
      if (typeof clientOrMongoose.startSession === 'function') {
        session = await clientOrMongoose.startSession();
      } else {
        throw new Error('Provided clientOrMongoose does not support startSession');
      }

      session.startTransaction({
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
      });

      let bodyResult;
      try {
        bodyResult = await txnFunction(session);
      } catch (bodyError) {
        // Handle body-phase failures
        logger.warn(`[${operationName}] Body failed on attempt ${bodyAttempt}: ${bodyError.message}`);

        try {
          if (session.inTransaction()) {
            await session.abortTransaction();
          }
        } catch (abortErr) {
          logger.warn(`[${operationName}] Error aborting transaction after body failure: ${abortErr.message}`);
        }

        if (isDuplicateKeyError(bodyError)) {
          return {
            outcome: TransactionOutcome.DUPLICATE_KEY_CONFLICT,
            error: bodyError,
            attempts: bodyAttempt,
          };
        }

        if (isTransientError(bodyError)) {
          if (bodyAttempt < maxBodyRetries) {
            const backoffMs = Math.min(100 * Math.pow(2, bodyAttempt - 1), 1000);
            await sleep(backoffMs);
            continue; // Retry whole transaction body
          }
          return {
            outcome: TransactionOutcome.RETRYABLE_BODY_FAILURE,
            error: bodyError,
            attempts: bodyAttempt,
          };
        }

        // Non-transient application/validation failure: Confirmed Abort
        return {
          outcome: TransactionOutcome.CONFIRMED_ABORTED,
          error: bodyError,
          attempts: bodyAttempt,
        };
      }

      // Commit phase
      let commitAttempt = 0;
      let commitSucceeded = false;
      let lastCommitError = null;

      while (commitAttempt < maxCommitRetries) {
        commitAttempt++;
        try {
          await session.commitTransaction();
          commitSucceeded = true;
          break;
        } catch (commitErr) {
          lastCommitError = commitErr;
          logger.warn(`[${operationName}] Commit attempt ${commitAttempt} failed: ${commitErr.message}`);

          if (isUnknownCommitResult(commitErr)) {
            // MongoDB rule: retry commitTransaction on the SAME session. DO NOT ABORT!
            const backoffMs = Math.min(150 * Math.pow(2, commitAttempt - 1), 1500);
            await sleep(backoffMs);
            continue;
          }

          // If commit failed with TransientTransactionError during commit, entire transaction aborted by server
          if (isTransientError(commitErr)) {
            try {
              if (session.inTransaction()) {
                await session.abortTransaction();
              }
            } catch (_) {}
            break; // Break inner loop to retry body from start
          }

          // Other non-retryable commit error
          try {
            if (session.inTransaction()) {
              await session.abortTransaction();
            }
          } catch (_) {}

          return {
            outcome: TransactionOutcome.CONFIRMED_ABORTED,
            error: commitErr,
            attempts: bodyAttempt,
          };
        }
      }

      if (commitSucceeded) {
        return {
          outcome: TransactionOutcome.COMMITTED,
          result: bodyResult,
          attempts: bodyAttempt,
        };
      }

      // If commit failed due to transient error during commit, retry outer body loop if attempts left
      if (lastCommitError && isTransientError(lastCommitError) && bodyAttempt < maxBodyRetries) {
        const backoffMs = Math.min(100 * Math.pow(2, bodyAttempt - 1), 1000);
        await sleep(backoffMs);
        continue;
      }

      // If commit outcome remains unknown after retries:
      if (lastCommitError && isUnknownCommitResult(lastCommitError)) {
        logger.error(`[${operationName}] Unknown commit outcome after ${maxCommitRetries} commit retries on same session.`);

        // Read-only majority reconciliation attempt if provided
        if (typeof reconciliationFn === 'function') {
          try {
            const reconResult = await reconciliationFn(session);
            if (reconResult && reconResult.confirmedCommitted) {
              logger.info(`[${operationName}] Reconciliation confirmed transaction was committed!`);
              return {
                outcome: TransactionOutcome.COMMITTED,
                result: reconResult.result || bodyResult,
                attempts: bodyAttempt,
              };
            }
          } catch (reconErr) {
            logger.warn(`[${operationName}] Reconciliation check error: ${reconErr.message}`);
          }
        }

        // Return INDETERMINATE_COMMIT. Caller MUST NOT report success or auto-retry body!
        return {
          outcome: TransactionOutcome.INDETERMINATE_COMMIT,
          error: lastCommitError,
          attempts: bodyAttempt,
        };
      }

      return {
        outcome: TransactionOutcome.CONFIRMED_ABORTED,
        error: lastCommitError || new Error('Transaction commit failed'),
        attempts: bodyAttempt,
      };

    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch (endErr) {
          logger.warn(`[${operationName}] Error ending session: ${endErr.message}`);
        }
      }
    }
  }

  return {
    outcome: TransactionOutcome.RETRYABLE_BODY_FAILURE,
    error: new Error(`Exceeded max body retries (${maxBodyRetries}) for ${operationName}`),
    attempts: bodyAttempt,
  };
}
