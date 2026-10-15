import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../../src/utils/errors';
import { validateLoginBody } from '../../src/validators/auth.validator';

describe('validateLoginBody', () => {
  it('returns a trimmed lowercase email and the original password', () => {
    const input = validateLoginBody({
      email: '  Admin@University.EDU ',
      password: 'admin12345',
    });

    assert.deepEqual(input, {
      email: 'admin@university.edu',
      password: 'admin12345',
    });
  });

  it('rejects a missing email and password together', () => {
    assert.throws(
      () => validateLoginBody({}),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.status, 400);
        assert.deepEqual(
          error.details?.map((detail) => detail.field),
          ['email', 'password'],
        );
        return true;
      },
    );
  });

  it('rejects an email that is not an email address', () => {
    assert.throws(
      () => validateLoginBody({ email: 'not-an-email', password: 'admin12345' }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.details?.[0]?.field, 'email');
        return true;
      },
    );
  });

  it('rejects a body that is not an object', () => {
    assert.throws(
      () => validateLoginBody(null),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.status, 400);
        return true;
      },
    );
  });
});
