import type { ApiResponse, Dashboard } from '../types/api';
import { http } from './client';

export async function fetchDashboard(): Promise<Dashboard> {
  const response = await http.get<ApiResponse<Dashboard>>('/dashboard');
  return response.data.data;
}
