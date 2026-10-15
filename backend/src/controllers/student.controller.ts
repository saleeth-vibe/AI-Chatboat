import {
  classHistory,
  createStudent,
  getStudent,
  listClassStudents,
  listStudents,
  promoteStudents,
  updateStudent,
} from '../services/student.service';
import { asyncHandler } from '../utils/async-handler';
import { requireId } from '../utils/request';
import {
  validateClassStudentQuery,
  validateCreateStudent,
  validatePromotion,
  validateStudentList,
  validateUpdateStudent,
} from '../validators/student.validator';

export const list = asyncHandler(async (req, res) => {
  res.json(await listStudents(validateStudentList(req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json(await getStudent(requireId(req.params.id)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await createStudent(validateCreateStudent(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await updateStudent(requireId(req.params.id), validateUpdateStudent(req.body)));
});

export const history = asyncHandler(async (req, res) => {
  res.json(await classHistory(requireId(req.params.id)));
});

export const promote = asyncHandler(async (req, res) => {
  res.json(await promoteStudents(validatePromotion(req.body)));
});

export const classStudents = asyncHandler(async (req, res) => {
  res.json(await listClassStudents(requireId(req.params.id), validateClassStudentQuery(req.query)));
});
