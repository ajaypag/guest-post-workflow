export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface Client {
  id: string;
  name: string;
  website: string;
  targetPages: TargetPage[];
  assignedUsers: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID
  clientType?: 'prospect' | 'client';
  convertedFromProspectAt?: Date;
  conversionNotes?: string;
}

export interface TargetPage {
  id: string;
  url: string;
  domain: string;
  status: 'active' | 'inactive' | 'completed';
  notes?: string;
  keywords?: string; // Comma-separated list of AI-generated keywords
  description?: string; // AI-generated description
  addedAt: Date;
  completedAt?: Date;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}