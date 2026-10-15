import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { sequelize } from '../database/connection';
import {
  AcademicClass,
  AcademicYear,
  Branch,
  Student,
  StudentClassEnrolment,
  User,
} from '../models';
import { classLabel } from './branch.service';
import { asDateOnly } from '../utils/dates';
import { notFound, rethrowUnique, unprocessable } from '../utils/errors';
import { generatePassword, hashPassword } from '../utils/password';
import { escapeLike, type ListQuery } from '../utils/request';
import { pageMeta } from '../utils/pagination';

export type StudentInput = {
  email: string;
  name: string;
  branchId: number;
  entryYearLevel: number;
  academicYearId: number;
};

export type StudentPatch = {
  name?: string;
  email?: string;
  isActive?: boolean;
};

export type PromotionInput = {
  academicYearId: number;
  studentIds: number[];
};

export async function listStudents(query: ListQuery & { branchId?: number }) {
  const where: WhereOptions<Student> = {};
  if (query.branchId !== undefined) {
    where.branchId = query.branchId;
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }
  if (query.search) {
    const like = `%${escapeLike(query.search)}%`;
    const users = await User.findAll({ where: { email: { [Op.like]: like }, role: 'STUDENT' } });
    const matches: WhereOptions<Student>[] = [{ name: { [Op.like]: like } }, { universityId: { [Op.like]: like } }];
    if (users.length > 0) {
      matches.push({ userId: users.map((user) => user.id) });
    }
    Object.assign(where, { [Op.or]: matches });
  }
  const { rows, count } = await Student.findAndCountAll({
    where,
    order: [['universityId', 'ASC']],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  return { data: await mapStudents(rows), meta: pageMeta(query.page, query.pageSize, count) };
}

export async function getStudent(id: number) {
  const student = await Student.findByPk(id);
  if (!student) {
    throw notFound('Student not found.');
  }
  const [dto] = await mapStudents([student]);
  return dto;
}

export async function createStudent(input: StudentInput) {
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  try {
    return await sequelize.transaction(async (transaction) => {
      const branch = await Branch.findByPk(input.branchId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!branch || !branch.isActive) {
        throw unprocessable('Choose an active branch.', 'branchId');
      }
      if (input.entryYearLevel < 1 || input.entryYearLevel > Number(branch.durationYears)) {
        throw unprocessable(`Entry year must be from 1 to ${branch.durationYears}.`, 'entryYearLevel');
      }
      const academicYear = await AcademicYear.findByPk(input.academicYearId, { transaction });
      if (!academicYear || !academicYear.isActive) {
        throw unprocessable('Choose an active academic year.', 'academicYearId');
      }

      const classes = await AcademicClass.findAll({
        where: { branchId: branch.id, yearLevel: input.entryYearLevel, isActive: true },
        order: [['sectionCode', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      let chosen: AcademicClass | null = null;
      for (const schoolClass of classes) {
        const occupied = await StudentClassEnrolment.count({
          where: { classId: schoolClass.id, status: 'ACTIVE' },
          transaction,
        });
        if (occupied < Number(schoolClass.capacity)) {
          chosen = schoolClass;
          break;
        }
      }
      if (!chosen) {
        throw unprocessable('Every section at this year level is full.');
      }

      const user = await User.create(
        {
          email: input.email,
          passwordHash,
          role: 'STUDENT',
          isActive: true,
          mustChangePassword: true,
          initialPassword: password,
        },
        { transaction },
      );
      const student = await Student.create(
        {
          userId: user.id,
          universityId: await nextUniversityId(branch.code, asDateOnly(academicYear.startDate), transaction),
          name: input.name,
          branchId: branch.id,
          entryYearLevel: input.entryYearLevel,
          isActive: true,
        },
        { transaction },
      );
      const alreadyActive = await StudentClassEnrolment.count({
        where: { studentId: student.id, status: 'ACTIVE' },
        transaction,
      });
      if (alreadyActive > 0) {
        throw unprocessable('This student already has an active class.');
      }
      await StudentClassEnrolment.create(
        {
          studentId: student.id,
          classId: chosen.id,
          startAcademicYearId: academicYear.id,
          endAcademicYearId: null,
          status: 'ACTIVE',
        },
        { transaction },
      );
      const [dto] = await mapStudents([student], transaction);
      return dto;
    });
  } catch (error) {
    rethrowUnique(error, 'An account with this email already exists.', 'email');
  }
}

export async function updateStudent(id: number, input: StudentPatch) {
  const student = await Student.findByPk(id);
  if (!student) {
    throw notFound('Student not found.');
  }
  const user = await User.unscoped().findByPk(student.userId);
  if (!user) {
    throw notFound('Student account not found.');
  }
  try {
    await sequelize.transaction(async (transaction) => {
      const userChanges: { email?: string; isActive?: boolean } = {};
      if (input.email) {
        userChanges.email = input.email;
      }
      if (input.isActive !== undefined) {
        userChanges.isActive = input.isActive;
      }
      if (Object.keys(userChanges).length > 0) {
        await user.update(userChanges, { transaction });
      }
      await student.update(
        { name: input.name ?? student.name, isActive: input.isActive ?? student.isActive },
        { transaction },
      );
    });
  } catch (error) {
    rethrowUnique(error, 'An account with this email already exists.', 'email');
  }
  return getStudent(id);
}

export async function classHistory(studentId: number) {
  const student = await Student.findByPk(studentId);
  if (!student) {
    throw notFound('Student not found.');
  }
  const enrolments = await StudentClassEnrolment.findAll({
    where: { studentId },
    order: [['id', 'ASC']],
  });
  return mapHistory(enrolments);
}

export async function listClassStudents(classId: number, status?: 'ACTIVE' | 'COMPLETED' | 'TRANSFERRED') {
  const schoolClass = await AcademicClass.findByPk(classId);
  if (!schoolClass) {
    throw notFound('Class not found.');
  }
  const enrolments = await StudentClassEnrolment.findAll({
    where: { classId, ...(status ? { status } : { status: 'ACTIVE' }) },
  });
  const students = enrolments.length
    ? await Student.findAll({ where: { id: enrolments.map((row) => row.studentId) } })
    : [];
  return mapStudents(students);
}

export async function promoteStudents(input: PromotionInput) {
  const studentIds = [...new Set(input.studentIds)];
  return sequelize.transaction(async (transaction) => {
    const destination = await AcademicYear.findByPk(input.academicYearId, { transaction });
    if (!destination) {
      throw unprocessable('Choose an academic year.', 'academicYearId');
    }

    const students = await Student.findAll({
      where: { id: studentIds },
      order: [['id', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (students.length !== studentIds.length) {
      throw notFound('One or more students were not found.');
    }

    const plans = [];
    for (const student of students) {
      const enrolment = await StudentClassEnrolment.findOne({
        where: { studentId: student.id, status: 'ACTIVE' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!enrolment) {
        throw unprocessable(`${student.name} does not have an active class.`);
      }
      if (Number(enrolment.startAcademicYearId) === Number(destination.id)) {
        throw unprocessable(`${student.name} is already enrolled in that academic year.`);
      }
      const currentYear = await AcademicYear.findByPk(enrolment.startAcademicYearId, { transaction });
      if (currentYear && asDateOnly(destination.startDate) <= asDateOnly(currentYear.startDate)) {
        throw unprocessable('Choose an academic year that starts after the current enrolment.', 'academicYearId');
      }
      const schoolClass = await AcademicClass.findByPk(enrolment.classId, { transaction });
      const branch = await Branch.findByPk(student.branchId, { transaction });
      if (!schoolClass || !branch) {
        throw unprocessable('The current class could not be found.');
      }
      const fromLabel = classLabel(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode);
      if (Number(schoolClass.yearLevel) >= Number(branch.durationYears)) {
        plans.push({ student, enrolment, schoolClass, branch, target: null, fromLabel });
        continue;
      }
      const target = await AcademicClass.findOne({
        where: {
          branchId: branch.id,
          yearLevel: Number(schoolClass.yearLevel) + 1,
          sectionCode: schoolClass.sectionCode,
          isActive: true,
        },
        transaction,
      });
      if (!target) {
        throw unprocessable(`No active class ${branch.code} ${Number(schoolClass.yearLevel) + 1}${schoolClass.sectionCode} exists.`);
      }
      plans.push({ student, enrolment, schoolClass, branch, target, fromLabel });
    }

    const targetIds = [...new Set(plans.flatMap((plan) => (plan.target ? [Number(plan.target.id)] : [])))].sort((a, b) => a - b);
    for (const targetId of targetIds) {
      const target = await AcademicClass.findByPk(targetId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!target) {
        throw unprocessable('The target class could not be found.');
      }
      const incoming = plans.filter((plan) => plan.target && Number(plan.target.id) === targetId).length;
      const leaving = plans.filter((plan) => Number(plan.schoolClass.id) === targetId).length;
      const occupied = await StudentClassEnrolment.count({
        where: { classId: targetId, status: 'ACTIVE' },
        transaction,
      });
      if (occupied - leaving + incoming > Number(target.capacity)) {
        const branch = plans.find((plan) => plan.target && Number(plan.target.id) === targetId)?.branch;
        throw unprocessable(
          `${classLabel(branch?.code ?? '', Number(target.yearLevel), target.sectionCode)} does not have enough free seats.`,
        );
      }
    }

    const results = [];
    for (const plan of plans) {
      await plan.enrolment.update(
        { status: 'COMPLETED', endAcademicYearId: plan.enrolment.startAcademicYearId },
        { transaction },
      );
      if (!plan.target) {
        results.push({ studentId: Number(plan.student.id), outcome: 'GRADUATED' as const, fromClass: plan.fromLabel, toClass: null });
        continue;
      }
      const stillActive = await StudentClassEnrolment.count({
        where: { studentId: plan.student.id, status: 'ACTIVE' },
        transaction,
      });
      if (stillActive > 0) {
        throw unprocessable(`${plan.student.name} already has an active class.`);
      }
      await StudentClassEnrolment.create(
        {
          studentId: plan.student.id,
          classId: plan.target.id,
          startAcademicYearId: destination.id,
          endAcademicYearId: null,
          status: 'ACTIVE',
        },
        { transaction },
      );
      results.push({
        studentId: Number(plan.student.id),
        outcome: 'PROMOTED' as const,
        fromClass: plan.fromLabel,
        toClass: classLabel(plan.branch.code, Number(plan.target.yearLevel), plan.target.sectionCode),
      });
    }
    return { results };
  });
}

async function nextUniversityId(code: string, startDate: string, transaction: Transaction) {
  const prefix = `${startDate.slice(0, 4)}${code}`;
  const rows = await Student.findAll({
    where: { universityId: { [Op.like]: `${escapeLike(prefix)}%` } },
    transaction,
  });
  const sequences = rows
    .map((row) => row.universityId)
    .filter((value) => value.startsWith(prefix) && /^\d{4}$/.test(value.slice(prefix.length)))
    .map((value) => Number(value.slice(prefix.length)));
  const next = (sequences.length === 0 ? 0 : Math.max(...sequences)) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function mapStudents(rows: Student[], transaction?: Transaction) {
  const users = rows.length
    ? await User.findAll({ where: { id: rows.map((row) => row.userId) }, transaction })
    : [];
  const branches = rows.length
    ? await Branch.findAll({ where: { id: rows.map((row) => row.branchId) }, transaction })
    : [];
  const enrolments = rows.length
    ? await StudentClassEnrolment.findAll({ where: { studentId: rows.map((row) => row.id), status: 'ACTIVE' }, transaction })
    : [];
  const classes = enrolments.length
    ? await AcademicClass.findAll({ where: { id: enrolments.map((row) => row.classId) }, transaction })
    : [];
  const years = enrolments.length
    ? await AcademicYear.findAll({ where: { id: enrolments.map((row) => row.startAcademicYearId) }, transaction })
    : [];
  const userById = new Map(users.map((user) => [Number(user.id), user]));
  const branchById = new Map(branches.map((branch) => [Number(branch.id), branch]));
  const enrolmentByStudent = new Map(enrolments.map((row) => [Number(row.studentId), row]));
  const classById = new Map(classes.map((schoolClass) => [Number(schoolClass.id), schoolClass]));
  const yearById = new Map(years.map((year) => [Number(year.id), year.name]));

  return rows.map((student) => {
    const branch = branchById.get(Number(student.branchId));
    const account = userById.get(Number(student.userId));
    const enrolment = enrolmentByStudent.get(Number(student.id));
    const schoolClass = enrolment ? classById.get(Number(enrolment.classId)) : undefined;
    return {
      id: Number(student.id),
      email: account?.email ?? '',
      initialPassword: account?.mustChangePassword ? (account.initialPassword ?? null) : null,
      universityId: student.universityId,
      name: student.name,
      branchId: Number(student.branchId),
      branchCode: branch?.code ?? '',
      entryYearLevel: Number(student.entryYearLevel),
      isActive: Boolean(student.isActive),
      currentClass: schoolClass && branch
        ? {
            id: Number(schoolClass.id),
            yearLevel: Number(schoolClass.yearLevel),
            sectionCode: schoolClass.sectionCode,
            label: classLabel(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode),
            academicYearId: enrolment ? Number(enrolment.startAcademicYearId) : null,
            academicYearName: enrolment ? (yearById.get(Number(enrolment.startAcademicYearId)) ?? '') : '',
          }
        : null,
    };
  });
}

async function mapHistory(enrolments: StudentClassEnrolment[]) {
  const classes = enrolments.length
    ? await AcademicClass.findAll({ where: { id: enrolments.map((row) => row.classId) } })
    : [];
  const branches = classes.length ? await Branch.findAll({ where: { id: classes.map((row) => row.branchId) } }) : [];
  const yearIds = enrolments.flatMap((row) => [row.startAcademicYearId, row.endAcademicYearId].filter((id): id is number => id !== null));
  const years = yearIds.length ? await AcademicYear.findAll({ where: { id: yearIds } }) : [];
  const classById = new Map(classes.map((schoolClass) => [Number(schoolClass.id), schoolClass]));
  const branchById = new Map(branches.map((branch) => [Number(branch.id), branch.code]));
  const yearById = new Map(years.map((year) => [Number(year.id), year.name]));
  return enrolments.map((enrolment) => {
    const schoolClass = classById.get(Number(enrolment.classId));
    const code = schoolClass ? (branchById.get(Number(schoolClass.branchId)) ?? '') : '';
    return {
      id: Number(enrolment.id),
      classLabel: schoolClass ? classLabel(code, Number(schoolClass.yearLevel), schoolClass.sectionCode) : '',
      startYear: yearById.get(Number(enrolment.startAcademicYearId)) ?? '',
      endYear: enrolment.endAcademicYearId ? (yearById.get(Number(enrolment.endAcademicYearId)) ?? null) : null,
      status: enrolment.status,
    };
  });
}
