import { useEffect, useState, type FormEvent } from 'react';
import { currentCalendar, listCourseDocuments, listTeachingCourses, uploadCourseDocument, type CourseDocument, type TeachingCourse } from '../../api/materials';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/common/Alert';
import { calendarLabel } from '../../components/layout/calendar-label';

export function FacultyHomePage() {
  const [termId, setTermId] = useState<number | null>(null);
  const [termLabel, setTermLabel] = useState('No active term');
  const [courses, setCourses] = useState<TeachingCourse[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    currentCalendar()
      .then((calendar) => {
        if (!active) {
          return;
        }
        setTermLabel(calendarLabel(calendar));
        setTermId(calendar.academicTerm?.id ?? null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load the calendar.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!termId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    listTeachingCourses(termId)
      .then((result) => {
        if (!active) {
          return;
        }
        setCourses(result.courses);
        setCourseId((current) => current ?? result.courses[0]?.id ?? null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load courses.');
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
  }, [termId]);

  useEffect(() => {
    if (!termId || !courseId) {
      setDocuments([]);
      return;
    }
    let active = true;
    listCourseDocuments(courseId, termId)
      .then((result) => {
        if (active) {
          setDocuments(result.documents);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to load documents.');
        }
      });
    return () => {
      active = false;
    };
  }, [courseId, termId]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!termId || !courseId) {
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError('Choose a PDF file.');
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const document = await uploadCourseDocument(courseId, termId, title, file);
      setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)]);
      setTitle('');
      formElement.reset();
      setNotice(document.status === 'READY' ? 'The PDF is ready for questions.' : document.errorMessage || 'Processing failed.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to upload the PDF.');
    } finally {
      setUploading(false);
    }
  }

  const readyCount = documents.filter((document) => document.status === 'READY').length;
  const processingCount = documents.filter((document) => document.status === 'PENDING' || document.status === 'PROCESSING').length;

  return (
    <section className="faculty-page">
      <header className="faculty-hero">
        <div>
          <p className="eyebrow">Teaching workspace</p>
          <h1>Course materials</h1>
          <p className="faculty-hero-copy">Build a trusted library for your students. Upload course PDFs and track them as they become ready for questions.</p>
        </div>
        <span className="term-badge"><span className="term-dot" />{termLabel}</span>
      </header>
      {error ? <Alert message={error} /> : null}
      {notice ? <Alert message={notice} tone="success" /> : null}
      {loading ? <div className="faculty-loading"><span className="loading-spinner" />Loading your teaching courses...</div> : null}
      {!loading && courses.length === 0 ? (
        <div className="faculty-empty-state"><span className="empty-mark">▤</span><h2>No assigned courses</h2><p>No courses are assigned to you for this academic term.</p></div>
      ) : null}
      {courses.length > 0 ? (
        <>
          <div className="faculty-metrics" aria-label="Course material summary">
            <div className="faculty-metric"><span className="metric-icon blue">▤</span><div><strong>{courses.length}</strong><span>Assigned courses</span></div></div>
            <div className="faculty-metric"><span className="metric-icon green">✓</span><div><strong>{readyCount}</strong><span>Ready documents</span></div></div>
            <div className="faculty-metric"><span className="metric-icon amber">◷</span><div><strong>{processingCount}</strong><span>Processing</span></div></div>
          </div>

          <div className="faculty-content-grid">
            <form className="faculty-card upload-card" onSubmit={onUpload}>
              <div className="section-heading">
                <div><p className="section-kicker">Add to your library</p><h2>Upload course material</h2></div>
                <span className="upload-heading-icon" aria-hidden="true">↑</span>
              </div>
              <p className="section-description">PDFs are securely stored and processed into searchable course knowledge.</p>
              <label className="faculty-field">
                <span>Course</span>
                <select name="courseId" value={courseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value))}>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}
                </select>
              </label>
              <label className="faculty-field">
                <span>Document title</span>
                <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, Week 1 lecture notes" required maxLength={200} />
              </label>
              <label className="faculty-field">
                <span>PDF file</span>
                <input className="faculty-file-input" name="file" type="file" accept="application/pdf,.pdf" required />
                <small className="field-help">Choose a readable PDF for this course. You can track processing below.</small>
              </label>
              <button className="faculty-upload-button" type="submit" disabled={uploading || !title.trim()}>
                {uploading ? <><span className="loading-spinner light" />Processing document...</> : <><span aria-hidden="true">↑</span> Upload PDF</>}
              </button>
              <div className="privacy-note"><span aria-hidden="true">🔒</span> Material is available only to students authorized for this course.</div>
            </form>

            <section className="faculty-card library-card">
              <div className="section-heading library-heading">
                <div><p className="section-kicker">Your selected course</p><h2>Document library</h2></div>
                <label className="library-course-select"><span className="visually-hidden">Choose course library</span>
                  <select aria-label="Choose course library" value={courseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value))}>
                    {courses.map((course) => <option key={course.id} value={course.id}>{course.code}</option>)}
                  </select>
                </label>
              </div>
              <p className="section-description">{courses.find((course) => course.id === courseId)?.name ?? 'Course materials'} · {documents.length} {documents.length === 1 ? 'document' : 'documents'}</p>
              {documents.length === 0 ? (
                <div className="library-empty"><span className="empty-mark">▤</span><strong>Your library is ready for its first PDF</strong><span>Upload notes, slides, or a study guide to get started.</span></div>
              ) : (
                <div className="document-list">
                  {documents.map((document) => (
                    <article className="document-row" key={document.id}>
                      <span className="pdf-icon">PDF</span>
                      <div className="document-copy"><strong>{document.title}</strong><span>{document.pageCount ?? '—'} pages <span aria-hidden="true">·</span> {document.chunkCount} searchable sections</span>
                        {document.status === 'FAILED' && document.errorMessage ? <small className="document-error">{document.errorMessage}</small> : null}
                      </div>
                      <span className={`document-status status-${document.status.toLowerCase()}`}><i />{document.status === 'PROCESSING' ? 'Processing' : document.status[0] + document.status.slice(1).toLowerCase()}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
