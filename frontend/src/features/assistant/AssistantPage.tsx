import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createChat,
  getChat,
  listChats,
  sendChatMessage,
  studentCourses,
  type AssistantCourse,
  type ChatMessage,
  type ChatSummary,
} from '../../api/assistant';
import { currentCalendar } from '../../api/materials';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/common/Alert';
import { calendarLabel } from '../../components/layout/calendar-label';
import { useAuth } from '../auth/useAuth';

export function AssistantPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [termId, setTermId] = useState<number | null>(null);
  const [termLabel, setTermLabel] = useState('');
  const [classLabel, setClassLabel] = useState<string | null>(null);
  const [courses, setCourses] = useState<AssistantCourse[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    currentCalendar()
      .then(async (calendar) => {
        if (!active) {
          return;
        }
        setTermLabel(calendarLabel(calendar));
        const nextTermId = calendar.academicTerm?.id ?? null;
        setTermId(nextTermId);
        if (!nextTermId) {
          return;
        }
        const [courseResult, chatResult] = await Promise.all([studentCourses(nextTermId), listChats()]);
        if (!active) {
          return;
        }
        setClassLabel(courseResult.classLabel);
        setCourses(courseResult.courses);
        setCourseId(null);
        setChats(chatResult.chats);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load the assistant.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function startNewChat() {
    setActiveChat(null);
    setMessages([]);
    setCourseId(null);
    setError(null);
    setDraft('');
  }

  async function openChat(chatId: number) {
    setError(null);
    setMessages([]);
    try {
      const result = await getChat(chatId);
      setActiveChat(result.chat);
      setMessages(result.messages);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to open that chat.');
    }
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sending) {
      return;
    }
    setSending(true);
    setError(null);
    const optimistic: ChatMessage = {
      id: Date.now(),
      role: 'USER',
      content: question,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setDraft('');
    try {
      let chat = activeChat;
      if (!chat) {
        if (!termId || !courseId) {
          throw new ApiError(400, 'Choose a course first.');
        }
        chat = await createChat(courseId, termId);
        setActiveChat(chat);
        setChats((current) => [chat!, ...current.filter((item) => item.id !== chat!.id)]);
      }
      const result = await sendChatMessage(chat.id, question);
      setActiveChat(result.chat);
      setMessages((current) => [...current, result.message]);
      setChats((current) => [result.chat, ...current.filter((item) => item.id !== result.chat.id)]);
    } catch (caught) {
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setDraft(question);
      setError(caught instanceof ApiError ? caught.message : 'Unable to send that question.');
    } finally {
      setSending(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch {
      setError('Could not log out. Try again.');
      setLoggingOut(false);
    }
  }

  const courseName = activeChat?.courseName ?? courses.find((course) => course.id === courseId)?.name ?? 'Course';
  const visibleChats = chats.filter((chat) => `${chat.courseName} ${chat.title}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const suggestions = [
    'Explain a key concept from my course notes.',
    'Give me a short summary of an important topic.',
    'Create a practice question from the course materials.',
  ];

  return (
    <div className="chat-shell app-chat-shell">
      <aside className="chat-list app-chat-sidebar">
        <div className="chat-brand"><span className="brand-mark" aria-hidden="true">✦</span><span><strong>Campus AI</strong><small>Study workspace</small></span></div>
        <button className="button chat-new app-new-chat" type="button" onClick={startNewChat}>
          <span aria-hidden="true">＋</span> New chat
        </button>
        <label className="history-search"><span className="search-glyph" aria-hidden="true">⌕</span><span className="visually-hidden">Search conversations</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search conversations" /></label>
        <div className="history-label">Recent conversations</div>
        <div className="chat-history">
          {loading ? <p className="history-hint">Loading your conversations...</p> : null}
          {!loading && chats.length === 0 ? <p className="history-hint">Your course conversations will appear here.</p> : null}
          {!loading && chats.length > 0 && visibleChats.length === 0 ? <p className="history-hint">No conversations match that search.</p> : null}
          {visibleChats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className={activeChat?.id === chat.id ? 'chat-link active' : 'chat-link'}
              onClick={() => void openChat(chat.id)}
            >
              <span className="chat-history-icon" aria-hidden="true">◷</span>
              <strong>{chat.courseName}</strong>
              <span className="chat-history-title">{chat.title === 'New chat' ? 'New conversation' : chat.title}</span>
            </button>
          ))}
        </div>
        <div className="student-profile">
          <span className="profile-avatar">{user?.email?.slice(0, 1).toUpperCase() ?? 'S'}</span>
          <span className="profile-copy"><strong>{user?.email}</strong><small>Student</small></span>
          <button className="profile-logout" type="button" onClick={() => void onLogout()} disabled={loggingOut} aria-label="Log out" title="Log out">↗</button>
        </div>
      </aside>
      <section className="chat-main app-chat-main">
        <header className="student-topbar">
          <div className="student-topbar-title"><span className="topbar-dot" />{classLabel ? `${classLabel} · ` : ''}{termLabel || 'Student workspace'}</div>
          <span className="student-topbar-role">Student</span>
        </header>
        <div className="chat-course app-course-bar">
          {activeChat ? (
            <div className="active-course-label"><span className="course-book-icon" aria-hidden="true">▤</span><div><small>Conversation course</small><strong>{courseName}</strong></div><span className="fixed-course-pill">Fixed for this chat</span></div>
          ) : (
            <label className="new-course-select">
              <span>Choose a course for your new chat</span>
              <select value={courseId ?? ''} onChange={(event) => setCourseId(event.target.value ? Number(event.target.value) : null)}>
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={`chat-transcript app-chat-transcript ${messages.length === 0 ? 'transcript-empty' : ''}`}>
          {error ? <div className="chat-error-wrap"><Alert message={error} /></div> : null}
          {loading ? <p className="status">Loading your courses and conversations...</p> : null}
          {!loading && courses.length === 0 ? <div className="chat-welcome"><span className="welcome-orb">✦</span><h1>No courses available</h1><p>There are no courses connected to your student account for this term.</p></div> : null}
          {!loading && courses.length > 0 && messages.length === 0 ? (
            <div className="chat-welcome">
              <span className="welcome-orb">✦</span>
              <p className="welcome-kicker">Your course study assistant</p>
              <h1>{courseId ? `What would you like to learn about ${courseName}?` : 'What would you like to learn today?'}</h1>
              <p className="welcome-description">Ask questions about your uploaded course materials. Answers include document and page sources when available.</p>
              {courseId ? <div className="suggestion-grid">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setDraft(suggestion)}>{suggestion}<span aria-hidden="true">↗</span></button>)}</div> : <div className="course-required-note">Select a course above to start a conversation.</div>}
            </div>
          ) : null}
          {messages.map((message) => (
            <article key={message.id} className={message.role === 'USER' ? 'chat-row user app-chat-row' : 'chat-row assistant app-chat-row'}>
              <span className={message.role === 'USER' ? 'message-avatar user-avatar' : 'message-avatar assistant-avatar'} aria-hidden="true">{message.role === 'USER' ? user?.email?.slice(0, 1).toUpperCase() ?? 'S' : '✦'}</span>
              <div className={message.role === 'USER' ? 'chat-bubble user app-message-bubble' : 'chat-bubble assistant app-message-bubble'}>
                <span className="message-role">{message.role === 'USER' ? 'You' : 'Course assistant'}</span>
                {message.role === 'USER' ? <p>{message.content}</p> : <AnswerContent text={message.content} />}
                {message.sources.length > 0 ? (
                  <div className="source-list"><span className="source-heading">Sources</span><ul className="chat-sources">
                    {message.sources.map((source) => <li key={`${source.documentId}-${source.pageNumber ?? 'na'}`}><span className="source-file-icon">PDF</span><span>{source.title}{source.pageNumber ? ` · page ${source.pageNumber}` : ''}</span></li>)}
                  </ul></div>
                ) : null}
              </div>
            </article>
          ))}
          {sending ? <div className="thinking-indicator"><span className="message-avatar assistant-avatar">✦</span><div><span className="thinking-dots"><i /><i /><i /></span><small>Searching course materials and preparing an answer</small></div></div> : null}
        </div>
        <form className="chat-composer app-chat-composer" onSubmit={(event) => void onSend(event)}>
          <textarea
            name="question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={courseId ? `Message about ${courseName}...` : 'Select a course to start a chat...'}
            maxLength={2000}
            disabled={!courseId || sending || loading}
            rows={1}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="composer-bottom"><span className="composer-hint">Course answers are grounded in your class materials. <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for a new line.</span>
          <button className="composer-send" type="submit" disabled={sending || loading || !draft.trim() || !courseId} aria-label={sending ? 'Sending message' : 'Send message'}>
            {sending ? '…' : '↑'}
          </button>
          </div>
        </form>
        <footer className="student-footer">AI responses can make mistakes. Check important details against your course materials.</footer>
      </section>
    </div>
  );
}

function AnswerContent({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blocks: Array<{ type: 'paragraph' | 'heading' | 'ul' | 'ol'; lines: string[] }> = [];
  for (const line of lines) {
    const listMatch = line.match(/^([-*•]|\d+[.)])\s+(.+)$/);
    const type = /^#{1,3}\s+/.test(line) || /^\*\*.+\*\*$/.test(line) ? 'heading' : listMatch ? (/^\d/.test(line) ? 'ol' : 'ul') : 'paragraph';
    const content = listMatch ? listMatch[2] : line.replace(/^#{1,3}\s+/, '').replace(/^\*\*(.+)\*\*$/, '$1');
    const last = blocks[blocks.length - 1];
    if (last?.type === type && (type === 'ul' || type === 'ol')) last.lines.push(content);
    else blocks.push({ type, lines: [content] });
  }

  return <div className="answer-content">{blocks.map((block, index) => {
    if (block.type === 'heading') return <h3 key={index}>{renderInline(block.lines[0])}</h3>;
    if (block.type === 'ul' || block.type === 'ol') {
      const List = block.type === 'ul' ? 'ul' : 'ol';
      return <List key={index}>{block.lines.map((line, itemIndex) => <li key={itemIndex}>{renderInline(line)}</li>)}</List>;
    }
    return <p key={index}>{renderInline(block.lines[0])}</p>;
  })}</div>;
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <span key={index}>{part}</span>;
  });
}
