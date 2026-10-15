import { createBranch, getBranch, getClass, listBranches, listClasses, updateBranch, updateClass } from '../services/branch.service';
import { asyncHandler } from '../utils/async-handler';
import { requireId } from '../utils/request';
import { validateBranchList, validateCreateBranch, validateUpdateBranch, validateUpdateClass } from '../validators/branch.validator';

export const list = asyncHandler(async (req, res) => {
  res.json(await listBranches(validateBranchList(req.query)));
});

export const getOne = asyncHandler(async (req, res) => {
  res.json(await getBranch(requireId(req.params.id)));
});

export const create = asyncHandler(async (req, res) => {
  res.status(201).json(await createBranch(validateCreateBranch(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  res.json(await updateBranch(requireId(req.params.id), validateUpdateBranch(req.body)));
});

export const classes = asyncHandler(async (req, res) => {
  res.json(await listClasses(requireId(req.params.id)));
});

export const getClassOne = asyncHandler(async (req, res) => {
  res.json(await getClass(requireId(req.params.id)));
});

export const updateClassOne = asyncHandler(async (req, res) => {
  res.json(await updateClass(requireId(req.params.id), validateUpdateClass(req.body)));
});
