import {
  createCurriculum,
  getCurriculum,
  listCurricula,
  replaceCurriculumCourses,
  updateCurriculum,
} from '../services/curriculum.service';
import { asyncHandler } from '../utils/async-handler';
import { requireId } from '../utils/request';
import {
  validateCreateCurriculum,
  validateCurriculumCourses,
  validateCurriculumList,
  validateUpdateCurriculum,
} from '../validators/curriculum.validator';

export const list = asyncHandler(async (req, res) => {
  res.json(await listCurricula(validateCurriculumList(req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json(await getCurriculum(requireId(req.params.id)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await createCurriculum(validateCreateCurriculum(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await updateCurriculum(requireId(req.params.id), validateUpdateCurriculum(req.body)));
});

export const replaceCourses = asyncHandler(async (req, res) => {
  res.json(await replaceCurriculumCourses(requireId(req.params.id), validateCurriculumCourses(req.body)));
});
