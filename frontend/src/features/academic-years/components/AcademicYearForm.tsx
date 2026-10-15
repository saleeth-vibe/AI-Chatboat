import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../../components/common/Alert';
import { TextField } from '../../../components/forms/TextField';
import type { AcademicYear, AcademicYearInput } from '../../../types/academic-year';

type AcademicYearFormProps = {
  year?: AcademicYear | null;
  submitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  onSubmit: (input: AcademicYearInput) => Promise<void>;
};

export function AcademicYearForm({ year, submitting, error, fieldErrors, onSubmit }: AcademicYearFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<AcademicYearInput | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = readInput(event.currentTarget);
    if (year?.isActive && !input.isActive) {
      setPending(input);
      dialogRef.current?.showModal();
      return;
    }
    void onSubmit(input);
  }

  function confirmDeactivate() {
    dialogRef.current?.close();
    if (pending) {
      void onSubmit(pending);
    }
  }

  return (
    <>
      <form className="card form-card" onSubmit={handleSubmit}>
        <p className="muted form-note">The end date must be after the start date, and the dates cannot overlap another academic year.</p>
        {error ? <Alert message={error} /> : null}
        <TextField
          label="Name"
          name="name"
          type="text"
          autoComplete="off"
          defaultValue={year?.name}
          maxLength={20}
          error={fieldErrors.name}
        />
        <TextField
          label="Start date"
          name="startDate"
          type="date"
          autoComplete="off"
          defaultValue={year?.startDate}
          error={fieldErrors.startDate}
        />
        <TextField
          label="End date"
          name="endDate"
          type="date"
          autoComplete="off"
          defaultValue={year?.endDate}
          error={fieldErrors.endDate}
        />
        <div className="field checkbox-field">
          <label htmlFor="field-isActive">
            <input id="field-isActive" name="isActive" type="checkbox" defaultChecked={year?.isActive ?? true} />
            Active
          </label>
        </div>
        <div className="form-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <Link className="button button-secondary" to="/academic-years">
            Cancel
          </Link>
        </div>
      </form>
      <dialog ref={dialogRef} className="confirm-dialog">
        <h2>Deactivate academic year</h2>
        <p>This year stays in the records. You can make it active again later.</p>
        <div className="form-actions">
          <button className="button" type="button" onClick={confirmDeactivate} disabled={submitting}>
            Deactivate
          </button>
          <button className="button button-secondary" type="button" onClick={() => dialogRef.current?.close()} disabled={submitting}>
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}

function readInput(form: HTMLFormElement): AcademicYearInput {
  const data = new FormData(form);
  return {
    name: String(data.get('name') ?? ''),
    startDate: String(data.get('startDate') ?? ''),
    endDate: String(data.get('endDate') ?? ''),
    isActive: data.get('isActive') === 'on',
  };
}
