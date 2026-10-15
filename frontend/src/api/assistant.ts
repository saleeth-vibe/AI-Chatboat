import { apiRequest } from './client';

export type AssistantCourse = {
  id: number;
  code: string;
  name: string;
};

export type AnswerSource = {
  documentId: number;
  title: string;
  pageNumber: number | null;
};

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

export function studentCourses(academicTermId: number): Promise<{ classLabel: string | null; courses: AssistantCourse[] }> {
  return apiRequest(`/student/courses?academicTermId=${academicTermId}`);
}

export function listChats(): Promise<{ chats: ChatSummary[] }> {
  return apiRequest('/student/chats');
}

export function createChat(courseId: number, academicTermId: number): Promise<ChatSummary> {
  return apiRequest('/student/chats', {
    method: 'POST',
    body: JSON.stringify({ courseId, academicTermId }),
  });
}

export function getChat(chatId: number): Promise<{ chat: ChatSummary; messages: ChatMessage[] }> {
  return apiRequest(`/student/chats/${chatId}`);
}

export function sendChatMessage(chatId: number, question: string): Promise<{ message: ChatMessage; chat: ChatSummary }> {
  return apiRequest(`/student/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}
