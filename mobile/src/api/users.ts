import type { ApiResponse, Role, UserProfile } from '../types/api';
import { http } from './client';

export async function fetchMe(): Promise<UserProfile> {
  const response = await http.get<ApiResponse<UserProfile>>('/users/me');
  return response.data.data;
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const response = await http.get<ApiResponse<UserProfile[]>>('/users');
  return response.data.data;
}

export async function updateUserRole(uid: string, role: Role): Promise<UserProfile> {
  const response = await http.patch<ApiResponse<UserProfile>>(`/users/${uid}/role`, { role });
  return response.data.data;
}
