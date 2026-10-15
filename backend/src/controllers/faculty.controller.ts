import {
  addEligibility,
  createFaculty,
  getFaculty,
  listEligibility,
  listFaculty,
  removeEligibility,
  updateFaculty,
} from '../services/faculty.service';
import { asyncHandler } from '../utils/async-handler';
import { requireId } from '../utils/request';
import { validateCreateFaculty, validateEligibility, validateFacultyList, validateUpdateFaculty } from '../validators/faculty.validator';

export const list = asyncHandler(async (req, res) => {
  res.json(await listFaculty(validateFacultyList(req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json(await getFaculty(requireId(req.params.id)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await createFaculty(validateCreateFaculty(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await updateFaculty(requireId(req.params.id), validateUpdateFaculty(req.body)));
});

export const assignments = asyncHandler(async (req, res) => {
  res.json(await listEligibility(requireId(req.params.id)));
});

export const addAssignment = asyncHandler(async (req, res) => {
  res.status(201).json(await addEligibility(requireId(req.params.id), validateEligibility(req.body)));
});

export const removeAssignment = asyncHandler(async (req, res) => {
  res.json(await removeEligibility(requireId(req.params.id), requireId(req.params.assignmentId, 'assignmentId')));
});
