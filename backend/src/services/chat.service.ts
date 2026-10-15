import { sequelize } from '../database/connection';
import { AssistantChat, AssistantMessage, Course, Student, User } from '../models';
import type { AnswerSource } from '../models/assistant-message.model';
import { answerCourseQuestion } from './assistant.service';
import { requireStudentCourse } from './course-access.service';
import { AppError, notFound } from '../utils/errors';

const EMPTY_TITLE = 'New chat';

export type ChatSummary = {
  id: number;
  courseId: number;
  courseName: string;
  academicTermId: number;
  title: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: AnswerSource[];
  createdAt: string;
};

export async function listChats(userId: number): Promise<ChatSummary[]> {
  const studentId = await requireStudentId(userId);
  const chats = await AssistantChat.findAll({ where: { studentId }, order: [['updatedAt', 'DESC']] });
  const courses = chats.length ? await Course.findAll({ where: { id: chats.map((chat) => chat.courseId) } }) : [];
  const names = new Map(courses.map((course) => [Number(course.id), course.name]));
  return chats.map((chat) => toSummary(chat, names.get(Number(chat.courseId)) ?? 'Course'));
}

export async function createChat(userId: number, courseId: number, academicTermId: number): Promise<ChatSummary> {
  const studentId = await requireStudentCourse(userId, courseId, academicTermId);
  const course = await Course.findByPk(courseId);
  const chat = await AssistantChat.create({
    studentId,
    courseId,
    academicTermId,
    title: EMPTY_TITLE,
  });
  return toSummary(chat, course?.name ?? 'Course');
}

export async function getChat(userId: number, chatId: number): Promise<{ chat: ChatSummary; messages: ChatMessage[] }> {
  const chat = await ownedChat(userId, chatId);
  await requireStudentCourse(userId, Number(chat.courseId), Number(chat.academicTermId));
  const course = await Course.findByPk(chat.courseId);
  const messages = await AssistantMessage.findAll({ where: { chatId: chat.id }, order: [['id', 'ASC']] });
  return {
    chat: toSummary(chat, course?.name ?? 'Course'),
    messages: messages.map(toMessage),
  };
}

export async function sendChatMessage(
  userId: number,
  chatId: number,
  question: string,
): Promise<{ message: ChatMessage; chat: ChatSummary }> {
  const chat = await ownedChat(userId, chatId);
  await requireStudentCourse(userId, Number(chat.courseId), Number(chat.academicTermId));
  const result = await answerCourseQuestion({
    userId,
    courseId: Number(chat.courseId),
    academicTermId: Number(chat.academicTermId),
    question,
  });
  const title = chat.title === EMPTY_TITLE ? question.replace(/\s+/g, ' ').trim().slice(0, 80) : chat.title;
  const assistant = await sequelize.transaction(async (transaction) => {
    await AssistantMessage.create(
      { chatId: Number(chat.id), role: 'USER', content: question, sources: null },
      { transaction },
    );
    const saved = await AssistantMessage.create(
      { chatId: Number(chat.id), role: 'ASSISTANT', content: result.answer, sources: result.sources },
      { transaction },
    );
    await chat.update({ title, updatedAt: new Date() }, { transaction });
    return saved;
  });
  const course = await Course.findByPk(chat.courseId);
  return { message: toMessage(assistant), chat: toSummary(chat, course?.name ?? 'Course') };
}

async function ownedChat(userId: number, chatId: number): Promise<AssistantChat> {
  const studentId = await requireStudentId(userId);
  const chat = await AssistantChat.findOne({ where: { id: chatId, studentId } });
  if (!chat) {
    throw notFound('Chat not found.');
  }
  return chat;
}

async function requireStudentId(userId: number): Promise<number> {
  const student = await Student.findOne({ where: { userId } });
  const user = await User.findByPk(userId);
  if (!student || !student.isActive || !user?.isActive) {
    throw new AppError(403, 'FORBIDDEN', 'Student access required');
  }
  return Number(student.id);
}

function toSummary(chat: AssistantChat, courseName: string): ChatSummary {
  return {
    id: Number(chat.id),
    courseId: Number(chat.courseId),
    courseName,
    academicTermId: Number(chat.academicTermId),
    title: chat.title,
    updatedAt: chat.updatedAt.toISOString(),
  };
}

function toMessage(message: AssistantMessage): ChatMessage {
  return {
    id: Number(message.id),
    role: message.role,
    content: message.content,
    sources: readSources(message.sources),
    createdAt: message.createdAt.toISOString(),
  };
}

function readSources(value: unknown): AnswerSource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }
    const source = item as { documentId?: unknown; title?: unknown; pageNumber?: unknown };
    if (typeof source.documentId !== 'number' || typeof source.title !== 'string') {
      return [];
    }
    return [
      {
        documentId: source.documentId,
        title: source.title,
        pageNumber: typeof source.pageNumber === 'number' ? source.pageNumber : null,
      },
    ];
  });
}
