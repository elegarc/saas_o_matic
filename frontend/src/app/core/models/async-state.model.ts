export type AsyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

