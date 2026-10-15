// Workshop starter: faculty and student dashboard code is commented out. The admin dashboard stays active.
// import assert from 'node:assert/strict';
// import { existsSync } from 'node:fs';
// import type { Server } from 'node:http';
// import type { AddressInfo } from 'node:net';
// import { after, before, describe, it } from 'node:test';
// import dotenv from 'dotenv';
//
// dotenv.config();
//
// const configured =
//   existsSync('.env') &&
//   Boolean(process.env.DB_NAME && process.env.JWT_SECRET && process.env.DB_USER && process.env.DEMO_PASSWORD);
//
// describe('course assistant access', () => {
//   let baseUrl = '';
//   let server: Server | undefined;
//   let ready = false;
//   let termId = 0;
//   let cseCourseId = 0;
//   let facultyCookie = '';
//   let studentCookie = '';
//   let otherStudentCookie = '';
//   const password = process.env.DEMO_PASSWORD ?? '';
//
//   before(async () => {
//     if (!configured) {
//       return;
//     }
//     const { sequelize } = await import('../../src/database/connection');
//     try {
//       await sequelize.authenticate();
//     } catch {
//       return;
//     }
//     const { setGeminiClient } = await import('../../src/services/gemini.client');
//     const { setPdfExtractor } = await import('../../src/services/pdf-text');
//     const { env } = await import('../../src/config/env');
//     setPdfExtractor(async () => [{ pageNumber: 4, text: 'A stack stores items at one end.' }]);
//     setGeminiClient({
//       async embed(texts) {
//         return texts.map((text) => {
//           if (text === 'leak-probe') {
//             return axis(env.rag.embeddingDimensions, 0);
//           }
//           return axis(env.rag.embeddingDimensions, 1);
//         });
//       },
//       async generate(_system, prompt) {
//         if (prompt.includes('MECH-ONLY-SECRET')) {
//           throw new Error('generate should not run for another course');
//         }
//         return 'A stack stores items at one end.';
//       },
//     });
//
//     const { createApp } = await import('../../src/app');
//     server = createApp().listen(0);
//     await new Promise<void>((resolve) => {
//       server?.once('listening', () => resolve());
//     });
//     const address = server.address() as AddressInfo;
//     baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
//     facultyCookie = await login('p.cycle@university.test');
//     studentCookie = await login('cse.1a@university.test');
//     otherStudentCookie = await login('mech.4c@university.test');
//     const calendar = await fetch(`${baseUrl}/academic-calendar/current`, { headers: { cookie: facultyCookie } });
//     const calendarBody = (await calendar.json()) as { academicTerm?: { id?: number } | null };
//     termId = calendarBody.academicTerm?.id ?? 0;
//     const courses = await fetch(`${baseUrl}/faculty/courses?academicTermId=${termId}`, {
//       headers: { cookie: facultyCookie },
//     });
//     const courseBody = (await courses.json()) as { courses?: Array<{ id: number }> };
//     cseCourseId = courseBody.courses?.[0]?.id ?? 0;
//     if (termId > 0 && cseCourseId > 0 && facultyCookie && studentCookie) {
//       const body = new FormData();
//       body.set('title', 'Stacks notes');
//       body.set('academicTermId', String(termId));
//       body.set('file', new File([Buffer.from('%PDF-1.4\nstubs')], 'stacks.pdf', { type: 'application/pdf' }));
//       const uploaded = await fetch(`${baseUrl}/faculty/courses/${cseCourseId}/documents`, {
//         method: 'POST',
//         headers: { cookie: facultyCookie },
//         body,
//       });
//       const uploadedBody = (await uploaded.json()) as { status?: string };
//       ready = uploaded.ok && uploadedBody.status === 'READY';
//     }
//   });
//
//   after(async () => {
//     const { setGeminiClient } = await import('../../src/services/gemini.client');
//     const { setPdfExtractor } = await import('../../src/services/pdf-text');
//     setGeminiClient(null);
//     setPdfExtractor(null);
//     if (server) {
//       await new Promise<void>((resolve, reject) => {
//         server?.close((error) => (error ? reject(error) : resolve()));
//       });
//     }
//     if (!configured) {
//       return;
//     }
//     const { sequelize } = await import('../../src/database/connection');
//     if (ready) {
//       const { CourseDocument, CourseDocumentChunk, AssistantChat, AssistantMessage } = await import('../../src/models');
//       const documents = await CourseDocument.findAll({ where: { title: ['Stacks notes', 'Mechanical secret'] } });
//       const ids = documents.map((document) => document.id);
//       if (ids.length) {
//         await CourseDocumentChunk.destroy({ where: { documentId: ids } });
//         await CourseDocument.destroy({ where: { id: ids } });
//       }
//       const chats = await AssistantChat.findAll({ where: { title: ['New chat', 'What is a stack?'] } });
//       if (chats.length) {
//         await AssistantMessage.destroy({ where: { chatId: chats.map((chat) => chat.id) } });
//         await AssistantChat.destroy({ where: { id: chats.map((chat) => chat.id) } });
//       }
//     }
//     await sequelize.close();
//   });
//
//   it('rejects a faculty member who does not teach the course', async (t) => {
//     if (!ready) {
//       t.skip('Demo data is not available');
//       return;
//     }
//     const mechCookie = await login('mech.faculty@university.test');
//     const response = await fetch(`${baseUrl}/faculty/courses/${cseCourseId}/documents?academicTermId=${termId}`, {
//       headers: { cookie: mechCookie },
//     });
//     assert.equal(response.status, 403);
//   });
//
//   it('answers from the course material and blocks another student', async (t) => {
//     if (!ready) {
//       t.skip('Demo data is not available');
//       return;
//     }
//     const answer = await fetch(`${baseUrl}/student/courses/${cseCourseId}/questions`, {
//       method: 'POST',
//       headers: { cookie: studentCookie, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ question: 'What is a stack?', academicTermId: termId }),
//     });
//     const answerBody = (await answer.json()) as { answer?: string; sources?: Array<{ title?: string; pageNumber?: number }> };
//     assert.equal(answer.status, 200);
//     assert.match(answerBody.answer ?? '', /stack/i);
//     assert.equal(answerBody.sources?.[0]?.title, 'Stacks notes');
//     assert.equal(answerBody.sources?.[0]?.pageNumber, 4);
//
//     const denied = await fetch(`${baseUrl}/student/courses/${cseCourseId}/questions`, {
//       method: 'POST',
//       headers: { cookie: otherStudentCookie, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ question: 'What is a stack?', academicTermId: termId }),
//     });
//     assert.equal(denied.status, 403);
//   });
//
//   it('does not answer from another course and skips generation when context is missing', async (t) => {
//     if (!ready) {
//       t.skip('Demo data is not available');
//       return;
//     }
//     const { env } = await import('../../src/config/env');
//     const { CourseDocument, CourseDocumentChunk, Faculty, Course } = await import('../../src/models');
//     const mechCourse = await Course.findOne({ where: { code: 'MECH301' } });
//     const faculty = await Faculty.findOne({ where: { employeeNumber: 'MECH-FAC' } });
//     assert.ok(mechCourse && faculty);
//     const secret = await CourseDocument.create({
//       courseId: Number(mechCourse.id),
//       academicTermId: termId,
//       uploadedByFacultyId: Number(faculty.id),
//       title: 'Mechanical secret',
//       originalFilename: 'secret.pdf',
//       mimeType: 'application/pdf',
//       byteSize: 10,
//       pageCount: 1,
//       contentSha256: 'b'.repeat(64),
//       storagePath: 'storage/course-documents/secret.pdf',
//       status: 'READY',
//       errorMessage: null,
//       embeddingModel: env.rag.embeddingModel,
//       embeddingDimensions: env.rag.embeddingDimensions,
//       chunkCount: 1,
//     });
//     await CourseDocumentChunk.create({
//       documentId: Number(secret.id),
//       chunkIndex: 0,
//       pageNumber: 1,
//       content: 'MECH-ONLY-SECRET turbine',
//       embedding: axis(env.rag.embeddingDimensions, 0),
//     });
//
//     const leaked = await fetch(`${baseUrl}/student/courses/${cseCourseId}/questions`, {
//       method: 'POST',
//       headers: { cookie: studentCookie, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ question: 'leak-probe', academicTermId: termId }),
//     });
//     const leakedBody = (await leaked.json()) as { answer?: string; sources?: unknown[] };
//     assert.equal(leaked.status, 200);
//     assert.equal(leakedBody.answer, 'The available course materials do not provide enough information to answer that.');
//     assert.equal(leakedBody.sources?.length, 0);
//     assert.equal(JSON.stringify(leakedBody).includes('MECH-ONLY-SECRET'), false);
//   });
//
//   it('keeps chats private to the student who owns them', async (t) => {
//     if (!ready) {
//       t.skip('Demo data is not available');
//       return;
//     }
//     const created = await fetch(`${baseUrl}/student/chats`, {
//       method: 'POST',
//       headers: { cookie: studentCookie, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ courseId: cseCourseId, academicTermId: termId }),
//     });
//     const createdBody = (await created.json()) as { id?: number };
//     assert.equal(created.status, 201);
//     const chatId = createdBody.id;
//     assert.ok(chatId);
//
//     const empty = await fetch(`${baseUrl}/student/chats/${chatId}/messages`, {
//       method: 'POST',
//       headers: { cookie: studentCookie, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ question: '   ' }),
//     });
//     assert.equal(empty.status, 400);
//
//     const sent = await fetch(`${baseUrl}/student/chats/${chatId}/messages`, {
//       method: 'POST',
//       headers: { cookie: studentCookie, 'Content-Type': 'application/json' },
//       body: JSON.stringify({ question: 'What is a stack?' }),
//     });
//     const sentBody = (await sent.json()) as { message?: { content?: string; sources?: Array<{ pageNumber?: number }> } };
//     assert.equal(sent.status, 200);
//     assert.match(sentBody.message?.content ?? '', /stack/i);
//     assert.equal(sentBody.message?.sources?.[0]?.pageNumber, 4);
//
//     const hidden = await fetch(`${baseUrl}/student/chats/${chatId}`, { headers: { cookie: otherStudentCookie } });
//     assert.equal(hidden.status, 404);
//   });
//
//   async function login(email: string): Promise<string> {
//     const response = await fetch(`${baseUrl}/auth/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ email, password }),
//     });
//     const cookie = response.headers.getSetCookie().find((value) => value.startsWith('campus_token='));
//     return cookie?.split(';')[0] ?? '';
//   }
// });
//
// function axis(dimensions: number, index: number): number[] {
//   return Array.from({ length: dimensions }, (_, position) => (position === index ? 1 : 0));
// }
