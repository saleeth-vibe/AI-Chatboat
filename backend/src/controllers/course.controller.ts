import { createCourse, getCourse, listCourses, updateCourse } from '../services/course.service';
import { asyncHandler } from '../utils/async-handler';
import { requireId } from '../utils/request';
import { validateCourseList, validateCreateCourse, validateUpdateCourse } from '../validators/course.validator';

export const list = asyncHandler(async (req, res) => {
  res.json(await listCourses(validateCourseList(req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json(await getCourse(requireId(req.params.id)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await createCourse(validateCreateCourse(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await updateCourse(requireId(req.params.id), validateUpdateCourse(req.body)));
});
