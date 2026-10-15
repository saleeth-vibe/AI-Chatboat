import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const configured = existsSync('.env') && Boolean(process.env.DB_NAME && process.env.JWT_SECRET && process.env.DB_USER);

describe('academic setup endpoints', () => {
  let baseUrl = '';
  let server: Server | undefined;
  let ready = false;
  let cookie = '';
  const suffix = Date.now().toString().slice(-6);
  const adminEmail = `setup-admin-${suffix}@university.test`;
  const branchCode = `B${suffix.slice(-4)}`;
  const courseCode = `C${suffix.slice(-4)}`;
  const yearName = `Y${suffix.slice(-4)}A`;
  const nextYearName = `Y${suffix.slice(-4)}B`;
  const studentEmails = [1, 2, 3, 4].map((index) => `student-${suffix}-${index}@university.test`);

  before(async () => {
    if (!configured) {
      return;
    }
    const { sequelize } = await import('../../src/database/connection');
    try {
      await sequelize.authenticate();
    } catch {
      return;
    }
    const { User } = await import('../../src/models');
    await User.unscoped().create({
      email: adminEmail,
      passwordHash: await bcrypt.hash('test-password-1', 10),
      role: 'ADMIN',
      isActive: true,
    });
    const { createApp } = await import('../../src/app');
    server = createApp().listen(0);
    await new Promise<void>((resolve) => {
      server?.once('listening', () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'test-password-1' }),
    });
    cookie = loginResponse.headers.getSetCookie().find((value) => value.startsWith('campus_token='))?.split(';')[0] ?? '';
    ready = loginResponse.status === 200 && cookie.length > 0;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (!configured) {
      return;
    }
    const { sequelize } = await import('../../src/database/connection');
    if (ready) {
      const {
        AcademicClass,
        AcademicTerm,
        AcademicYear,
        Branch,
        ClassCourseOffering,
        ClassCurriculumAssignment,
        Course,
        Curriculum,
        CurriculumCourse,
        FirstYearCycleAllocation,
        Student,
        StudentClassEnrolment,
        User,
      } = await import('../../src/models');
      const branch = await Branch.findOne({ where: { code: branchCode } });
      const years = await AcademicYear.findAll({ where: { name: [yearName, nextYearName] } });
      const yearIds = years.map((year) => year.id);
      const terms = yearIds.length ? await AcademicTerm.findAll({ where: { academicYearId: yearIds } }) : [];
      const classes = branch ? await AcademicClass.findAll({ where: { branchId: branch.id } }) : [];
      const classIds = classes.map((schoolClass) => schoolClass.id);
      const assignments = classIds.length ? await ClassCurriculumAssignment.findAll({ where: { classId: classIds } }) : [];
      if (assignments.length) {
        await ClassCourseOffering.destroy({ where: { classCurriculumAssignmentId: assignments.map((row) => row.id) } });
        await ClassCurriculumAssignment.destroy({ where: { id: assignments.map((row) => row.id) } });
      }
      if (yearIds.length) {
        await FirstYearCycleAllocation.destroy({ where: { cohortAcademicYearId: yearIds } });
      }
      const accounts = await User.unscoped().findAll({ where: { email: studentEmails } });
      const students = accounts.length ? await Student.findAll({ where: { userId: accounts.map((account) => account.id) } }) : [];
      if (students.length) {
        await StudentClassEnrolment.destroy({ where: { studentId: students.map((student) => student.id) } });
        await Student.destroy({ where: { id: students.map((student) => student.id) } });
      }
      await User.unscoped().destroy({ where: { email: [adminEmail, ...studentEmails] } });
      const curricula = await Curriculum.findAll({ where: { name: [`P ${suffix}`, `C ${suffix}`, `S3 ${suffix}`, `S4 ${suffix}`] } });
      if (curricula.length) {
        await CurriculumCourse.destroy({ where: { curriculumId: curricula.map((row) => row.id) } });
        await Curriculum.destroy({ where: { id: curricula.map((row) => row.id) } });
      }
      await Course.destroy({ where: { code: courseCode } });
      if (classIds.length) {
        await AcademicClass.destroy({ where: { id: classIds } });
      }
      if (branch) {
        await Branch.destroy({ where: { id: branch.id } });
      }
      if (terms.length) {
        const termAssignments = await ClassCurriculumAssignment.findAll({ where: { academicTermId: terms.map((term) => term.id) } });
        if (termAssignments.length) {
          await ClassCourseOffering.destroy({ where: { classCurriculumAssignmentId: termAssignments.map((row) => row.id) } });
          await ClassCurriculumAssignment.destroy({ where: { id: termAssignments.map((row) => row.id) } });
        }
        await AcademicTerm.destroy({ where: { id: terms.map((term) => term.id) } });
      }
      if (yearIds.length) {
        await AcademicYear.destroy({ where: { id: yearIds } });
      }
    }
    await sequelize.close();
  });

  it('generates classes, fills sections in order, promotes, allocates cycles once, and generates assignments once', async (t) => {
    if (!ready) {
      t.skip('MySQL is not configured or not running');
      return;
    }

    const branchResponse = await request('/branches', {
      method: 'POST',
      body: JSON.stringify({
        name: `Branch ${suffix}`,
        code: branchCode,
        durationYears: 2,
        sectionsPerYear: 2,
        classCapacity: 1,
        supportsFirstYearCycles: true,
        isActive: true,
      }),
    });
    assert.equal(branchResponse.status, 201);
    const branch = (await branchResponse.json()) as { id: number; classes: Array<{ label: string }> };
    assert.deepEqual(
      branch.classes.map((schoolClass) => schoolClass.label),
      [`${branchCode} 1A`, `${branchCode} 1B`, `${branchCode} 2A`, `${branchCode} 2B`],
    );

    const year = await createYear(yearName, '2096-08-01', '2097-07-31');
    const nextYear = await createYear(nextYearName, '2097-08-01', '2098-07-31');
    const odd = await request(`/academic-years/${year.id}/terms`, {
      method: 'POST',
      body: JSON.stringify({ periodType: 'ODD', startDate: '2096-08-01', endDate: '2096-12-15' }),
    });
    assert.equal(odd.status, 201);
    const oddTerm = (await odd.json()) as { id: number };
    const outside = await request(`/academic-years/${year.id}/terms`, {
      method: 'POST',
      body: JSON.stringify({ periodType: 'EVEN', startDate: '2096-07-01', endDate: '2096-12-20' }),
    });
    assert.equal(outside.status, 422);
    const even = await request(`/academic-years/${year.id}/terms`, {
      method: 'POST',
      body: JSON.stringify({ periodType: 'EVEN', startDate: '2097-01-06', endDate: '2097-05-15' }),
    });
    assert.equal(even.status, 201);

    const course = await request('/courses', {
      method: 'POST',
      body: JSON.stringify({ code: courseCode, name: `Course ${suffix}`, departmentId: null, description: null, isActive: true }),
    });
    assert.equal(course.status, 201);
    const courseBody = (await course.json()) as { id: number };

    const pCurriculum = await saveCurriculum(`P ${suffix}`, 'GLOBAL_CYCLE', null, null, 'P');
    const cCurriculum = await saveCurriculum(`C ${suffix}`, 'GLOBAL_CYCLE', null, null, 'C');
    await saveCurriculum(`S3 ${suffix}`, 'BRANCH', branch.id, 3, null);
    await saveCurriculum(`S4 ${suffix}`, 'BRANCH', branch.id, 4, null);
    for (const curriculum of [pCurriculum, cCurriculum]) {
      if (!curriculum.created) {
        continue;
      }
      const replaced = await request(`/curricula/${curriculum.id}/courses`, {
        method: 'PUT',
        body: JSON.stringify({ courseIds: [courseBody.id] }),
      });
      assert.equal(replaced.status, 200);
    }
    const semesterCurricula = await request('/curricula?pageSize=100');
    const curriculumRows = (await semesterCurricula.json()) as { data: Array<{ id: number; name: string }> };
    for (const name of [`S3 ${suffix}`, `S4 ${suffix}`]) {
      const row = curriculumRows.data.find((item) => item.name === name);
      assert.ok(row);
      assert.equal((await request(`/curricula/${row.id}/courses`, { method: 'PUT', body: JSON.stringify({ courseIds: [courseBody.id] }) })).status, 200);
    }

    const admitted = [];
    for (const email of studentEmails.slice(0, 3)) {
      const response = await request('/students', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name: email,
          branchId: branch.id,
          entryYearLevel: 1,
          academicYearId: year.id,
        }),
      });
      admitted.push({ status: response.status, body: (await response.json()) as { currentClass?: { label: string }; error?: { message: string } } });
    }
    assert.equal(admitted[0]?.status, 201);
    assert.equal(admitted[0]?.body.currentClass?.label, `${branchCode} 1A`);
    assert.equal(admitted[1]?.status, 201);
    assert.equal(admitted[1]?.body.currentClass?.label, `${branchCode} 1B`);
    assert.equal(admitted[2]?.status, 422);

    const senior = await request('/students', {
      method: 'POST',
      body: JSON.stringify({
        email: studentEmails[3],
        name: 'Senior',
        branchId: branch.id,
        entryYearLevel: 2,
        academicYearId: year.id,
      }),
    });
    assert.equal(senior.status, 201);
    const seniorBody = (await senior.json()) as { id: number; currentClass: { label: string } };
    assert.equal(seniorBody.currentClass.label, `${branchCode} 2A`);

    const firstStudent = await request(`/students?search=${encodeURIComponent(studentEmails[0] ?? '')}`);
    const firstRows = (await firstStudent.json()) as { data: Array<{ id: number }> };
    const promotion = await request('/students/promotions', {
      method: 'POST',
      body: JSON.stringify({ academicYearId: nextYear.id, studentIds: [firstRows.data[0]?.id, seniorBody.id] }),
    });
    assert.equal(promotion.status, 200);
    const promotionBody = (await promotion.json()) as { results: Array<{ outcome: string; toClass: string | null }> };
    assert.equal(promotionBody.results.find((row) => row.outcome === 'PROMOTED')?.toClass, `${branchCode} 2A`);
    assert.equal(promotionBody.results.some((row) => row.outcome === 'GRADUATED'), true);

    const allocation = await request(`/academic-years/${year.id}/first-year-cycle-allocation`, { method: 'POST' });
    assert.equal(allocation.status, 201);
    const allocationBody = (await allocation.json()) as {
      allocations: Array<{ label: string; branchCode: string; semester1CycleType: string }>;
    };
    const ordered = allocationBody.allocations.filter((row) => row.branchCode === branchCode);
    assert.equal(ordered.length, 2);
    const firstIndex = allocationBody.allocations.findIndex((row) => row.branchCode === branchCode);
    assert.equal(allocationBody.allocations[firstIndex]?.semester1CycleType, firstIndex % 2 === 0 ? 'P' : 'C');
    assert.equal(allocationBody.allocations[firstIndex + 1]?.semester1CycleType, (firstIndex + 1) % 2 === 0 ? 'P' : 'C');
    assert.equal((await request(`/academic-years/${year.id}/first-year-cycle-allocation`, { method: 'POST' })).status, 409);

    const generated = await request(`/academic-terms/${oddTerm.id}/generate-class-curriculum-assignments`, { method: 'POST' });
    assert.equal(generated.status, 200);
    const generatedBody = (await generated.json()) as { conflicts: Array<{ classLabel: string }> };
    assert.equal(generatedBody.conflicts.filter((row) => row.classLabel.startsWith(`${branchCode} `)).length, 0);
    const listed = await request(`/academic-terms/${oddTerm.id}/class-curriculum-assignments`);
    const listedBody = (await listed.json()) as Array<{ classLabel: string }>;
    assert.equal(listedBody.filter((row) => row.classLabel.startsWith(`${branchCode} `)).length, 4);
    const again = await request(`/academic-terms/${oddTerm.id}/generate-class-curriculum-assignments`, { method: 'POST' });
    const againBody = (await again.json()) as { createdAssignments: number };
    assert.equal(againBody.createdAssignments, 0);
    const listedAgain = (await (await request(`/academic-terms/${oddTerm.id}/class-curriculum-assignments`)).json()) as Array<{ classLabel: string }>;
    assert.equal(listedAgain.filter((row) => row.classLabel.startsWith(`${branchCode} `)).length, 4);
  });

  async function createYear(name: string, startDate: string, endDate: string) {
    const response = await request('/academic-years', {
      method: 'POST',
      body: JSON.stringify({ name, startDate, endDate, isActive: true }),
    });
    assert.equal(response.status, 201);
    return (await response.json()) as { id: number };
  }

  async function saveCurriculum(
    name: string,
    scopeType: 'GLOBAL_CYCLE' | 'BRANCH',
    branchId: number | null,
    semesterLevel: number | null,
    cycleType: 'P' | 'C' | null,
  ) {
    const response = await request('/curricula', {
      method: 'POST',
      body: JSON.stringify({ name, scopeType, branchId, semesterLevel, cycleType, isActive: true }),
    });
    if (response.status === 409 && scopeType === 'GLOBAL_CYCLE' && cycleType) {
      const listed = await request('/curricula?pageSize=100');
      const body = (await listed.json()) as { data: Array<{ id: number; scopeType: string; cycleType: 'P' | 'C' | null }> };
      const existing = body.data.find((row) => row.scopeType === 'GLOBAL_CYCLE' && row.cycleType === cycleType);
      assert.ok(existing);
      return { id: existing.id, created: false };
    }
    assert.equal(response.status, 201, await response.clone().text());
    return { id: ((await response.json()) as { id: number }).id, created: true };
  }

  function request(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set('cookie', cookie);
    if (options.body) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(`${baseUrl}${path}`, { ...options, headers });
  }
});
