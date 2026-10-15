import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppError } from '../../src/utils/errors';
import { isEndAfterStart, parseDateOnly, rangesOverlap } from '../../src/utils/dates';
import { parsePagination } from '../../src/utils/pagination';
import { validateCreateAcademicYear } from '../../src/validators/academic-year.validator';

describe('academic year dates', () => {
  it('accepts a real calendar date and rejects an impossible one', () => {
    assert.equal(parseDateOnly('2026-08-01'), '2026-08-01');
    assert.equal(parseDateOnly('2026-02-31'), null);
    assert.equal(parseDateOnly('08/01/2026'), null);
  });

  it('requires the end date to be after the start date', () => {
    assert.equal(isEndAfterStart('2026-08-01', '2027-07-31'), true);
    assert.equal(isEndAfterStart('2026-08-01', '2026-08-01'), false);
    assert.equal(isEndAfterStart('2026-08-02', '2026-08-01'), false);
  });

  it('treats touching dates as an overlap', () => {
    assert.equal(rangesOverlap('2026-08-01', '2027-07-31', '2027-07-31', '2028-07-31'), true);
    assert.equal(rangesOverlap('2026-08-01', '2027-07-31', '2027-08-01', '2028-07-31'), false);
  });

  it('rejects a year whose end date is not after its start date', () => {
    assert.throws(
      () =>
        validateCreateAcademicYear({
          name: '2026-27',
          startDate: '2026-08-01',
          endDate: '2026-08-01',
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.status, 400);
        assert.equal(error.details?.[0]?.field, 'endDate');
        return true;
      },
    );
  });
});

describe('parsePagination', () => {
  it('uses defaults and rejects a page size above 100', () => {
    assert.deepEqual(parsePagination({}), { page: 1, pageSize: 20 });
    assert.throws(
      () => parsePagination({ pageSize: '101' }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.status, 400);
        return true;
      },
    );
  });
});
