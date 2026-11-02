import { create } from 'zustand';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string | null;
  roleId: number;
  role: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const isAdminOrManager = (user: User | null): boolean => {
  if (!user) return false;
  const roleName = (user.role || '').toLowerCase();
  return (
    roleName.includes('admin') ||
    roleName.includes('manager') ||
    user.roleId === 1 ||
    user.roleId === 2 ||
    user.roleId === 8
  );
};

export const hasPermission = (
  user: User | null,
  requiredPermission?: string | string[]
): boolean => {
  if (!user) return false;
  // Role Admin & Manager memiliki hak akses penuh ke seluruh fitur sistem
  if (isAdminOrManager(user)) return true;
  if (!requiredPermission) return true;
  if (!user.permissions || !Array.isArray(user.permissions)) return false;

  const requiredList = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  return requiredList.some((req) => {
    // 1. Exact match
    if (user.permissions!.includes(req)) return true;

    // 2. Module wildcard / prefix fallback (e.g. 'telur:read' matches any 'telur_...:read' or 'telur:read')
    if (req.endsWith(':read')) {
      const mod = req.split(':')[0];
      return user.permissions!.some(
        (p) => p.startsWith(mod + '_') || p.startsWith(mod + ':')
      );
    }

    return false;
  });
};

export const useAuthStore = create<AuthState>((set) => {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  let parsedUser: User | null = null;
  try {
    parsedUser = savedUser ? JSON.parse(savedUser) : null;
  } catch {
    parsedUser = null;
  }

  return {
    token: savedToken,
    user: parsedUser,
    isAuthenticated: !!savedToken,
    login: (token: string, user: User) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    setUser: (user: User) => {
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
