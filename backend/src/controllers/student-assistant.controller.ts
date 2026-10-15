import { createChat, getChat, listChats, sendChatMessage } from '../services/chat.service';
import { studentCourseContext } from '../services/course-access.service';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/errors';
import { requireId } from '../utils/request';
import { validateChatMessage, validateCreateChat, validateTermQuery } from '../validators/assistant.validator';

export const courses = asyncHandler(async (req, res) => {
  const query = validateTermQuery(req.query);
  res.json(await studentCourseContext(requireUserId(req.user?.id), query.academicTermId));
});

export const chats = asyncHandler(async (req, res) => {
  res.json({ chats: await listChats(requireUserId(req.user?.id)) });
});

export const openChat = asyncHandler(async (req, res) => {
  const input = validateCreateChat(req.body);
  res.status(201).json(await createChat(requireUserId(req.user?.id), input.courseId, input.academicTermId));
});

export const showChat = asyncHandler(async (req, res) => {
  res.json(await getChat(requireUserId(req.user?.id), requireId(req.params.chatId, 'chatId')));
});

export const message = asyncHandler(async (req, res) => {
  const input = validateChatMessage(req.body);
  res.json(await sendChatMessage(requireUserId(req.user?.id), requireId(req.params.chatId, 'chatId'), input.question));
});

function requireUserId(userId: number | undefined): number {
  if (!userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return userId;
}
