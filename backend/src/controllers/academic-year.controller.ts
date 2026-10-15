import {
  createAcademicYear,
  getAcademicYear,
  listAcademicYears,
  updateAcademicYear,
} from '../services/academic-year.service';
import { asyncHandler } from '../utils/async-handler';
import {
  parseRouteId,
  validateAcademicYearListQuery,
  validateCreateAcademicYear,
  validateUpdateAcademicYear,
} from '../validators/academic-year.validator';

export const list = asyncHandler(async (req, res) => {
  const query = validateAcademicYearListQuery(req.query);
  res.json(await listAcademicYears(query));
});

export const getOne = asyncHandler(async (req, res) => {
  const id = parseRouteId(routeParam(req.params.id));
  res.json(await getAcademicYear(id));
});

export const create = asyncHandler(async (req, res) => {
  const input = validateCreateAcademicYear(req.body);
  res.status(201).json(await createAcademicYear(input));
});

export const update = asyncHandler(async (req, res) => {
  const id = parseRouteId(routeParam(req.params.id));
  const input = validateUpdateAcademicYear(req.body);
  res.json(await updateAcademicYear(id, input));
});

function routeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
