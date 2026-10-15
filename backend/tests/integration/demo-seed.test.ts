import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import dotenv from 'dotenv';

dotenv.config();

const configured = existsSync('.env') && Boolean(process.env.DB_NAME && process.env.JWT_SECRET && process.env.DB_USER);

describe('demo academic seed', () => {
  let ready = false;

  before(async () => {
    if (!configured || !process.env.DEMO_PASSWORD || !process.env.ADMIN_EMAIL) {
      return;
    }
    const { sequelize } = await import('../../src/database/connection');
    try {
      await sequelize.authenticate();
    } catch {
      return;
    }
    const loaded = (await import('../../src/seeders/20261014010000-demo-academic-data.ts')) as {
      up?: (queryInterface: unknown) => Promise<void>;
      default?: { up?: (queryInterface: unknown) => Promise<void> };
    };
    const seed = loaded.up ?? loaded.default?.up;
    assert.equal(typeof seed, 'function');
    await seed!(sequelize.getQueryInterface());
    ready = true;
  });

  after(async () => {
    if (!configured) {
      return;
    }
    const { sequelize } = await import('../../src/database/connection');
    await sequelize.close();
  });

  it('creates both branches, every class, and assigned offerings', async (t) => {
    if (!ready) {
      t.skip('MySQL or the demo password is not configured');
      return;
    }
    const {
      AcademicClass,
      AcademicTerm,
      AcademicYear,
      Branch,
      ClassCourseOffering,
      ClassCurriculumAssignment,
      StudentClassEnrolment,
    } = await import('../../src/models');
    const { configurationStatus } = await import('../../src/services/assignment.service');
    const branches = await Branch.findAll({ where: { code: ['CSE', 'MECH'] } });
    assert.equal(branches.length, 2);
    const classes = await AcademicClass.findAll({ where: { branchId: branches.map((branch) => branch.id) } });
    assert.equal(classes.length, 24);
    assert.ok(classes.every((row) => Number(row.capacity) === 60));
    const enrolments = await StudentClassEnrolment.count({
      where: { classId: classes.map((row) => row.id), status: 'ACTIVE' },
    });
    assert.equal(enrolments, 24);
    const year = await AcademicYear.findOne({ where: { name: '2026-27' } });
    assert.ok(year);
    const terms = await AcademicTerm.findAll({ where: { academicYearId: year.id } });
    assert.equal(terms.length, 2);
    const assignments = await ClassCurriculumAssignment.count({
      where: { classId: classes.map((row) => row.id), academicTermId: terms.map((term) => term.id) },
    });
    assert.equal(assignments, 48);
    const unassigned = await ClassCourseOffering.count({
      where: { assignedFacultyId: null },
      include: [
        {
          model: ClassCurriculumAssignment,
          required: true,
          where: { classId: classes.map((row) => row.id), academicTermId: terms.map((term) => term.id) },
        },
      ],
    });
    assert.equal(unassigned, 0);
    const odd = terms.find((term) => term.periodType === 'ODD');
    assert.ok(odd);
    const status = await configurationStatus(Number(odd.id));
    assert.equal(status.missingFirstYearAllocation, false);
    assert.equal(status.classesMissingCurriculum.length, 0);
    assert.equal(status.offeringsMissingFaculty.length, 0);
  });
});
