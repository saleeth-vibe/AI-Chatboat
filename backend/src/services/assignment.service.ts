import { UniqueConstraintError, type Transaction } from 'sequelize';
import { sequelize } from '../database/connection';
import {
  AcademicClass,
  AcademicTerm,
  AcademicYear,
  Branch,
  ClassCourseOffering,
  ClassCurriculumAssignment,
  Course,
  Curriculum,
  CurriculumCourse,
  Faculty,
  FacultyCourseAssignment,
  FirstYearCycleAllocation,
  User,
} from '../models';
import { canAdvanceStatus, oppositeCycle, semesterLevel, type CycleType, type OfferingStatus } from './academic-rules';
import { classLabel } from './branch.service';
import { notFound, unprocessable } from '../utils/errors';

type Resolution =
  | { ok: true; curriculum: Curriculum; semester: number }
  | { ok: false; reason: string };

export async function generateAssignments(termId: number) {
  return sequelize.transaction(async (transaction) => {
    const term = await AcademicTerm.findByPk(termId, { transaction });
    if (!term) {
      throw notFound('Academic term not found.');
    }
    const classes = await AcademicClass.findAll({ where: { isActive: true }, transaction });
    const branches = await Branch.findAll({ where: { isActive: true }, transaction });
    const branchById = new Map(branches.map((branch) => [Number(branch.id), branch]));

    let createdAssignments = 0;
    let createdOfferings = 0;
    let alreadyAssigned = 0;
    const conflicts: Array<{ classId: number; classLabel: string; reason: string }> = [];

    for (const schoolClass of classes) {
      const branch = branchById.get(Number(schoolClass.branchId));
      if (!branch) {
        continue;
      }
      const label = classLabel(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode);
      const existing = await ClassCurriculumAssignment.findOne({
        where: { classId: schoolClass.id, academicTermId: term.id },
        transaction,
      });
      if (existing) {
        alreadyAssigned += 1;
        continue;
      }

      const resolved = await resolveCurriculum(schoolClass, branch, term, transaction);
      if (!resolved.ok) {
        conflicts.push({ classId: Number(schoolClass.id), classLabel: label, reason: resolved.reason });
        continue;
      }
      const links = await CurriculumCourse.findAll({ where: { curriculumId: resolved.curriculum.id }, transaction });
      if (links.length === 0) {
        conflicts.push({ classId: Number(schoolClass.id), classLabel: label, reason: 'CURRICULUM_HAS_NO_COURSES' });
        continue;
      }

      try {
        const assignment = await ClassCurriculumAssignment.create(
          {
            classId: schoolClass.id,
            academicTermId: term.id,
            curriculumId: resolved.curriculum.id,
            status: 'PLANNED',
          },
          { transaction },
        );
        await ClassCourseOffering.bulkCreate(
          links.map((link) => ({
            classCurriculumAssignmentId: assignment.id,
            courseId: link.courseId,
            assignedFacultyId: null,
            status: 'PLANNED' as const,
          })),
          { transaction },
        );
        createdAssignments += 1;
        createdOfferings += links.length;
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          alreadyAssigned += 1;
          continue;
        }
        throw error;
      }
    }

    return { academicTermId: Number(term.id), createdAssignments, createdOfferings, alreadyAssigned, conflicts };
  });
}

export async function listAssignments(termId: number) {
  const term = await AcademicTerm.findByPk(termId);
  if (!term) {
    throw notFound('Academic term not found.');
  }
  const rows = await ClassCurriculumAssignment.findAll({
    where: { academicTermId: termId },
    order: [['classId', 'ASC']],
  });
  return decorateAssignments(rows, term);
}

export async function getAssignment(id: number) {
  const assignment = await ClassCurriculumAssignment.findByPk(id);
  if (!assignment) {
    throw notFound('Class curriculum assignment not found.');
  }
  const term = await AcademicTerm.findByPk(assignment.academicTermId);
  if (!term) {
    throw notFound('Academic term not found.');
  }
  const [summary] = await decorateAssignments([assignment], term);
  const offerings = await ClassCourseOffering.findAll({
    where: { classCurriculumAssignmentId: id },
    order: [['courseId', 'ASC']],
  });
  const courses = offerings.length ? await Course.findAll({ where: { id: offerings.map((row) => row.courseId) } }) : [];
  const faculty = offerings.some((row) => row.assignedFacultyId)
    ? await Faculty.findAll({ where: { id: offerings.flatMap((row) => (row.assignedFacultyId ? [row.assignedFacultyId] : [])) } })
    : [];
  const courseById = new Map(courses.map((course) => [Number(course.id), course]));
  const facultyById = new Map(faculty.map((member) => [Number(member.id), member.name]));
  const eligible = await eligibleFacultyFor(
    Number(term.id),
    offerings.map((row) => Number(row.courseId)),
  );

  return {
    ...summary,
    offerings: offerings.map((offering) => {
      const course = courseById.get(Number(offering.courseId));
      return {
        id: Number(offering.id),
        courseId: Number(offering.courseId),
        courseCode: course?.code ?? '',
        courseName: course?.name ?? '',
        assignedFacultyId: offering.assignedFacultyId === null ? null : Number(offering.assignedFacultyId),
        assignedFacultyName: offering.assignedFacultyId ? (facultyById.get(Number(offering.assignedFacultyId)) ?? null) : null,
        status: offering.status,
        eligibleFaculty: eligible.get(Number(offering.courseId)) ?? [],
      };
    }),
  };
}

export async function classCurriculum(classId: number, academicTermId: number) {
  const assignment = await ClassCurriculumAssignment.findOne({ where: { classId, academicTermId } });
  if (!assignment) {
    throw notFound('This class has no curriculum for that term.');
  }
  return getAssignment(Number(assignment.id));
}

export async function classOfferings(classId: number, academicTermId: number) {
  const detail = await classCurriculum(classId, academicTermId);
  return detail.offerings;
}

export async function updateOffering(id: number, input: { assignedFacultyId?: number | null; status?: OfferingStatus }) {
  const offering = await ClassCourseOffering.findByPk(id);
  if (!offering) {
    throw notFound('Course offering not found.');
  }
  const assignment = await ClassCurriculumAssignment.findByPk(offering.classCurriculumAssignmentId);
  if (!assignment) {
    throw notFound('Class curriculum assignment not found.');
  }
  if (input.status && !canAdvanceStatus(offering.status, input.status)) {
    throw unprocessable('Status can only move from planned, to ongoing, to completed.', 'status');
  }
  if (input.assignedFacultyId) {
    const linked = await CurriculumCourse.findOne({
      where: { curriculumId: assignment.curriculumId, courseId: offering.courseId },
    });
    if (!linked) {
      throw unprocessable('This course is not part of the assigned curriculum.');
    }
    const faculty = await Faculty.findByPk(input.assignedFacultyId);
    const user = faculty ? await User.findByPk(faculty.userId) : null;
    if (!faculty || !faculty.isActive || !user?.isActive) {
      throw unprocessable('Choose an active faculty member.', 'assignedFacultyId');
    }
    const eligibility = await FacultyCourseAssignment.findOne({
      where: {
        facultyId: faculty.id,
        courseId: offering.courseId,
        academicTermId: assignment.academicTermId,
        status: 'ACTIVE',
      },
    });
    if (!eligibility) {
      throw unprocessable('This faculty member is not eligible for the course in this term.', 'assignedFacultyId');
    }
  }

  await offering.update({
    assignedFacultyId: input.assignedFacultyId === undefined ? offering.assignedFacultyId : input.assignedFacultyId,
    status: input.status ?? offering.status,
  });
  return getAssignment(Number(assignment.id));
}

export async function configurationStatus(termId: number) {
  const term = await AcademicTerm.findByPk(termId);
  if (!term) {
    throw notFound('Academic term not found.');
  }
  const classes = await AcademicClass.findAll({ where: { isActive: true } });
  const branches = await Branch.findAll({ where: { isActive: true } });
  const branchById = new Map(branches.map((branch) => [Number(branch.id), branch]));
  const assignments = await ClassCurriculumAssignment.findAll({ where: { academicTermId: termId } });
  const assignedClassIds = new Set(assignments.map((row) => Number(row.classId)));

  const cycleClasses = classes.filter((schoolClass) => {
    const branch = branchById.get(Number(schoolClass.branchId));
    return branch?.supportsFirstYearCycles && Number(schoolClass.yearLevel) === 1;
  });
  const allocations = cycleClasses.length
    ? await FirstYearCycleAllocation.findAll({
        where: { cohortAcademicYearId: term.academicYearId, classId: cycleClasses.map((schoolClass) => schoolClass.id) },
      })
    : [];
  const allocatedIds = new Set(allocations.map((row) => Number(row.classId)));
  const missingFirstYearAllocation = cycleClasses.some((schoolClass) => !allocatedIds.has(Number(schoolClass.id)));

  const classesMissingCurriculum = [];
  for (const schoolClass of classes) {
    const branch = branchById.get(Number(schoolClass.branchId));
    if (!branch || assignedClassIds.has(Number(schoolClass.id))) {
      continue;
    }
    const resolved = await resolveCurriculum(schoolClass, branch, term);
    classesMissingCurriculum.push({
      classId: Number(schoolClass.id),
      classLabel: classLabel(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode),
      reason: resolved.ok ? 'NOT_GENERATED' : resolved.reason,
    });
  }

  const offerings = assignments.length
    ? await ClassCourseOffering.findAll({
        where: { classCurriculumAssignmentId: assignments.map((row) => row.id), assignedFacultyId: null },
      })
    : [];
  const courses = offerings.length ? await Course.findAll({ where: { id: offerings.map((row) => row.courseId) } }) : [];
  const courseById = new Map(courses.map((course) => [Number(course.id), course.code]));
  const assignmentById = new Map(assignments.map((row) => [Number(row.id), row]));
  const classById = new Map(classes.map((schoolClass) => [Number(schoolClass.id), schoolClass]));
  const offeringsMissingFaculty = offerings.map((offering) => {
    const assignment = assignmentById.get(Number(offering.classCurriculumAssignmentId));
    const schoolClass = assignment ? classById.get(Number(assignment.classId)) : undefined;
    const branch = schoolClass ? branchById.get(Number(schoolClass.branchId)) : undefined;
    return {
      offeringId: Number(offering.id),
      assignmentId: Number(offering.classCurriculumAssignmentId),
      classLabel: schoolClass && branch ? classLabel(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode) : '',
      courseCode: courseById.get(Number(offering.courseId)) ?? '',
    };
  });

  return {
    academicTermId: Number(term.id),
    missingFirstYearAllocation,
    classesMissingCurriculum,
    offeringsMissingFaculty,
  };
}

async function resolveCurriculum(
  schoolClass: AcademicClass,
  branch: Branch,
  term: AcademicTerm,
  transaction?: Transaction,
): Promise<Resolution> {
  const semester = semesterLevel(Number(schoolClass.yearLevel), term.periodType);
  if (Number(schoolClass.yearLevel) === 1 && branch.supportsFirstYearCycles) {
    const allocation = await FirstYearCycleAllocation.findOne({
      where: { cohortAcademicYearId: term.academicYearId, classId: schoolClass.id },
      transaction,
    });
    if (!allocation) {
      return { ok: false, reason: 'MISSING_FIRST_YEAR_ALLOCATION' };
    }
    const cycle: CycleType = term.periodType === 'ODD' ? allocation.semester1CycleType : oppositeCycle(allocation.semester1CycleType);
    const curriculum = await Curriculum.findOne({
      where: { scopeType: 'GLOBAL_CYCLE', cycleType: cycle, isActive: true },
      transaction,
    });
    if (!curriculum) {
      return { ok: false, reason: 'MISSING_CURRICULUM' };
    }
    return { ok: true, curriculum, semester };
  }

  const curriculum = await Curriculum.findOne({
    where: { scopeType: 'BRANCH', branchId: branch.id, semesterLevel: semester, isActive: true },
    transaction,
  });
  if (!curriculum) {
    return { ok: false, reason: 'MISSING_CURRICULUM' };
  }
  return { ok: true, curriculum, semester };
}

async function decorateAssignments(rows: ClassCurriculumAssignment[], term: AcademicTerm) {
  const classes = rows.length ? await AcademicClass.findAll({ where: { id: rows.map((row) => row.classId) } }) : [];
  const branches = classes.length ? await Branch.findAll({ where: { id: classes.map((row) => row.branchId) } }) : [];
  const curricula = rows.length ? await Curriculum.findAll({ where: { id: rows.map((row) => row.curriculumId) } }) : [];
  const year = await AcademicYear.findByPk(term.academicYearId);
  const classById = new Map(classes.map((schoolClass) => [Number(schoolClass.id), schoolClass]));
  const branchById = new Map(branches.map((branch) => [Number(branch.id), branch]));
  const curriculumById = new Map(curricula.map((curriculum) => [Number(curriculum.id), curriculum]));
  return rows.map((row) => {
    const schoolClass = classById.get(Number(row.classId));
    const branch = schoolClass ? branchById.get(Number(schoolClass.branchId)) : undefined;
    const curriculum = curriculumById.get(Number(row.curriculumId));
    return {
      id: Number(row.id),
      classId: Number(row.classId),
      classLabel: schoolClass && branch ? classLabel(branch.code, Number(schoolClass.yearLevel), schoolClass.sectionCode) : '',
      academicTermId: Number(row.academicTermId),
      academicYearName: year?.name ?? '',
      periodType: term.periodType,
      curriculumId: Number(row.curriculumId),
      curriculumName: curriculum?.name ?? '',
      semesterLevel: schoolClass ? semesterLevel(Number(schoolClass.yearLevel), term.periodType) : null,
      status: row.status,
    };
  });
}

async function eligibleFacultyFor(termId: number, courseIds: number[]) {
  const grouped = new Map<number, Array<{ id: number; name: string }>>();
  if (courseIds.length === 0) {
    return grouped;
  }
  const rows = await FacultyCourseAssignment.findAll({
    where: { academicTermId: termId, courseId: courseIds, status: 'ACTIVE' },
  });
  const faculty = rows.length ? await Faculty.findAll({ where: { id: rows.map((row) => row.facultyId), isActive: true } }) : [];
  const users = faculty.length ? await User.findAll({ where: { id: faculty.map((member) => member.userId), isActive: true } }) : [];
  const activeUserIds = new Set(users.map((user) => Number(user.id)));
  const facultyById = new Map(faculty.filter((member) => activeUserIds.has(Number(member.userId))).map((member) => [Number(member.id), member]));
  for (const row of rows) {
    const member = facultyById.get(Number(row.facultyId));
    if (!member) {
      continue;
    }
    const courseId = Number(row.courseId);
    const list = grouped.get(courseId) ?? [];
    list.push({ id: Number(member.id), name: member.name });
    grouped.set(courseId, list);
  }
  return grouped;
}
