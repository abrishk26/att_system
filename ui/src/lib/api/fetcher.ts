import { request } from '../../api';

export async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, options);
}
