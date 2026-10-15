import { dashboard } from '../services/dashboard.service';
import { asyncHandler } from '../utils/async-handler';

export const show = asyncHandler(async (_req, res) => {
  res.json(await dashboard());
});
