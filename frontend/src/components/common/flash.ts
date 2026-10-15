export function flashMessage(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('message' in state)) {
    return null;
  }
  return typeof state.message === 'string' ? state.message : null;
}
