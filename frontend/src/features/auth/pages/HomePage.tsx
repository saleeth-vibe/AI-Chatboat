import { useAuth } from '../useAuth';

export function HomePage() {
  const { user } = useAuth();

  return (
    <section className="page">
      <header className="page-header">
        <h1>Home</h1>
      </header>
      <div className="card">
        <p>
          You are signed in as <strong>{user?.email}</strong>.
        </p>
        <p className="muted">Academic years are available from the sidebar.</p>
      </div>
    </section>
  );
}
