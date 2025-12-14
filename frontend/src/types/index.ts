export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  dateJoined: string;
  lastLogin?: string;
}

export interface UserProfile {
  id: string;
  user: User;
  educationLevel: string;
  major: string;
  mathLevel: number; // 1-5
  programmingLevel: number; // 1-5
  preferences: Record<string, any>;
  researchInterests: string[];
  documentsRead: number;
  studyHours: number;
  notesCreated: number;
  flashcardsCreated: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status: number;
}

// Agent相关类型 / Agent related types
export * from './agent';