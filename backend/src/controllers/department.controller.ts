import { createDepartment, getDepartment, listDepartments, updateDepartment } from '../services/department.service';
import { asyncHandler } from '../utils/async-handler';
import { requireId } from '../utils/request';
import { validateCreateDepartment, validateDepartmentList, validateUpdateDepartment } from '../validators/department.validator';

export const list = asyncHandler(async (req, res) => {
  res.json(await listDepartments(validateDepartmentList(req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json(await getDepartment(requireId(req.params.id)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await createDepartment(validateCreateDepartment(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await updateDepartment(requireId(req.params.id), validateUpdateDepartment(req.body)));
});
