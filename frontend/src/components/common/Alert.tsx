type AlertProps = {
  message: string;
  tone?: 'error' | 'success';
};

export function Alert({ message, tone = 'error' }: AlertProps) {
  return (
    <p className={tone === 'success' ? 'alert alert-success' : 'alert'} role={tone === 'success' ? 'status' : 'alert'}>
      {message}
    </p>
  );
}
