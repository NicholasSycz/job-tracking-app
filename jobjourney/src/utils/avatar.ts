import { AuthUser } from '../types';
import { API_BASE_URL } from '../config';

export function getAvatarUrl(user: AuthUser): string {
  if (user.avatarUrl) {
    return `${API_BASE_URL}${user.avatarUrl}`;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`;
}
