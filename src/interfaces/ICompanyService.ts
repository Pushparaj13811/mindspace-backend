import type { 
  Company, 
  User,
  CreateCompanyRequest, 
  UpdateCompanyRequest,
  CompanyUserInvite,
  CompanyAnalytics,
  PlatformAnalytics
} from '../types/index.js';

export interface ICompanyService {
  // Company management
  createCompany(companyData: CreateCompanyRequest, adminUserId: string): Promise<Company>;
  updateCompany(companyId: string, updates: UpdateCompanyRequest): Promise<Company>;
  deleteCompany(companyId: string): Promise<void>;
  getCompany(companyId: string): Promise<Company | null>;
  listCompanies(page?: number, limit?: number): Promise<{ companies: Company[]; total: number }>;
  
  // User management within company
  inviteUser(companyId: string, invite: CompanyUserInvite): Promise<{ inviteId: string; inviteUrl: string }>;
  acceptInvite(inviteToken: string, userData: { name: string; password: string }): Promise<{ user: User; company: Company }>;
  removeUserFromCompany(companyId: string, userId: string): Promise<void>;
  updateUserRole(companyId: string, userId: string, newRole: 'COMPANY_ADMIN' | 'COMPANY_MANAGER' | 'COMPANY_USER'): Promise<User>;
  getCompanyUsers(companyId: string, page?: number, limit?: number): Promise<{ users: User[]; total: number }>;
  
  // Auto-assignment based on email domain
  assignUserToCompanyByDomain(email: string): Promise<Company | null>;
  
  // Analytics
  getCompanyAnalytics(companyId: string): Promise<CompanyAnalytics>;
  getPlatformAnalytics(): Promise<PlatformAnalytics>;
  
  // Health check
  healthCheck(): Promise<boolean>;
}