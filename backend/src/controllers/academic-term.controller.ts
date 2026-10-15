import { createTerm, listTerms, updateTerm, currentCalendar } from '../services/academic-term.service';
import { asyncHandler } from '../utils/async-handler';
import { requireId } from '../utils/request';
import { validateCreateTerm, validateUpdateTerm } from '../validators/academic-term.validator';

export const list = asyncHandler(async (req, res) => {
  res.json(await listTerms(requireId(req.params.id, 'academicYearId')));
});

export const create = asyncHandler(async (req, res) => {
  const term = await createTerm(requireId(req.params.id, 'academicYearId'), validateCreateTerm(req.body));
  res.status(201).json(term);
});

export const update = asyncHandler(async (req, res) => {
  res.json(await updateTerm(requireId(req.params.id), validateUpdateTerm(req.body)));
});

export const current = asyncHandler(async (_req, res) => {
  res.json(await currentCalendar());
});
