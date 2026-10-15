import { createAllocation, getAllocation, resetAllocation } from '../services/cycle-allocation.service';
import {
  classCurriculum,
  classOfferings,
  configurationStatus,
  generateAssignments,
  getAssignment,
  listAssignments,
  updateOffering,
} from '../services/assignment.service';
import { listTermChoices } from '../services/dashboard.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { requireId } from '../utils/request';
import { validateOfferingPatch, validateTermQuery } from '../validators/assignment.validator';

export const terms = asyncHandler(async (_req, res) => {
  res.json(await listTermChoices());
});

export const allocation = asyncHandler(async (req, res) => {
  res.json(await getAllocation(requireId(req.params.id, 'academicYearId')));
});

export const saveAllocation = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  res.status(201).json(await createAllocation(requireId(req.params.id, 'academicYearId'), req.user.id));
});

export const clearAllocation = asyncHandler(async (req, res) => {
  res.json(await resetAllocation(requireId(req.params.id, 'academicYearId')));
});

export const generate = asyncHandler(async (req, res) => {
  res.json(await generateAssignments(requireId(req.params.id)));
});

export const assignments = asyncHandler(async (req, res) => {
  res.json(await listAssignments(requireId(req.params.id)));
});

export const configuration = asyncHandler(async (req, res) => {
  res.json(await configurationStatus(requireId(req.params.id)));
});

export const assignment = asyncHandler(async (req, res) => {
  res.json(await getAssignment(requireId(req.params.id)));
});

export const curriculumForClass = asyncHandler(async (req, res) => {
  res.json(await classCurriculum(requireId(req.params.id), validateTermQuery(req.query)));
});

export const offeringsForClass = asyncHandler(async (req, res) => {
  res.json(await classOfferings(requireId(req.params.id), validateTermQuery(req.query)));
});

export const patchOffering = asyncHandler(async (req, res) => {
  res.json(await updateOffering(requireId(req.params.id), validateOfferingPatch(req.body)));
});
