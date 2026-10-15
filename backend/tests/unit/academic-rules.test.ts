import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  allocateCycles,
  canAdvanceStatus,
  oppositeCycle,
  resolveCalendar,
  sectionCode,
  sectionCodes,
  semesterLevel,
  termInsideYear,
} from '../../src/services/academic-rules';

describe('academic rules', () => {
  it('maps a class and term to a semester number', () => {
    assert.equal(semesterLevel(1, 'ODD'), 1);
    assert.equal(semesterLevel(1, 'EVEN'), 2);
    assert.equal(semesterLevel(3, 'ODD'), 5);
    assert.equal(semesterLevel(3, 'EVEN'), 6);
  });

  it('uses the opposite cycle for semester 2', () => {
    assert.equal(oppositeCycle('P'), 'C');
    assert.equal(oppositeCycle('C'), 'P');
  });

  it('names sections from A onward', () => {
    assert.equal(sectionCode(1), 'A');
    assert.deepEqual(sectionCodes(3), ['A', 'B', 'C']);
  });

  it('alternates P and C and gives an odd count one extra P', () => {
    const allocated = allocateCycles(['A', 'B', 'C']);
    assert.deepEqual(
      allocated.map((row) => row.semester1),
      ['P', 'C', 'P'],
    );
    assert.deepEqual(
      allocated.map((row) => row.semester2),
      ['C', 'P', 'C'],
    );
  });

  it('keeps a term inside its academic year', () => {
    assert.equal(termInsideYear('2026-08-01', '2026-12-15', '2026-08-01', '2027-07-31'), true);
    assert.equal(termInsideYear('2026-07-31', '2026-12-15', '2026-08-01', '2027-07-31'), false);
  });

  it('reports a break when the year contains today but no term does', () => {
    const calendar = resolveCalendar(
      '2026-12-20',
      [{ id: 1, name: '2026-27', startDate: '2026-08-01', endDate: '2027-07-31', isActive: true }],
      [{ id: 4, academicYearId: 1, periodType: 'ODD', startDate: '2026-08-01', endDate: '2026-12-15' }],
    );
    assert.equal(calendar.status, 'BREAK');
    assert.equal(calendar.academicYear?.name, '2026-27');
    assert.equal(calendar.academicTerm, null);
  });

  it('reports the term that contains today', () => {
    const calendar = resolveCalendar(
      '2026-09-01',
      [{ id: 1, name: '2026-27', startDate: '2026-08-01', endDate: '2027-07-31', isActive: true }],
      [{ id: 4, academicYearId: 1, periodType: 'ODD', startDate: '2026-08-01', endDate: '2026-12-15' }],
    );
    assert.equal(calendar.status, 'TERM');
    assert.equal(calendar.academicTerm?.periodType, 'ODD');
  });

  it('moves offering status only forward', () => {
    assert.equal(canAdvanceStatus('PLANNED', 'ONGOING'), true);
    assert.equal(canAdvanceStatus('ONGOING', 'COMPLETED'), true);
    assert.equal(canAdvanceStatus('COMPLETED', 'ONGOING'), false);
  });
});
