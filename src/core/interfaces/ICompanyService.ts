import type { Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyAnalytics, CompanyUserInvite } from '../../types/index.js';

/**
 * Company service interface for managing company operations
 */
export interface ICompanyService {
  /**
   * Create a new company
   */
  createCompany(data: CreateCompanyRequest): Promise<Company>;

  /**
   * Get a company by ID
   */
  getCompany(id: string): Promise<Company>;

  /**
   * Update company details
   */
  updateCompany(id: string, data: UpdateCompanyRequest): Promise<Company>;

  /**
   * Delete a company
   */
  deleteCompany(id: string): Promise<void>;

  /**
   * List companies with optional filters
   */
  listCompanies(filters?: CompanyListFilters): Promise<CompanyListResponse>;

  /**
   * Invite user to company
   */
  inviteUser(companyId: string, invite: CompanyUserInvite): Promise<string>;

  /**
   * Accept company invitation
   */
  acceptInvitation(token: string, userData: InviteAcceptanceData): Promise<void>;

  /**
   * Get company users
   */
  getCompanyUsers(companyId: string, filters?: UserListFilters): Promise<CompanyUsersResponse>;

  /**
   * Update user role in company
   */
  updateUserRole(companyId: string, userId: string, role: string): Promise<void>;

  /**
   * Remove user from company
   */
  removeUser(companyId: string, userId: string): Promise<void>;

  /**
   * Get company analytics
   */
  getAnalytics(companyId: string, period?: string): Promise<CompanyAnalytics>;

  /**
   * Check if user has access to company
   */
  checkUserAccess(userId: string, companyId: string): Promise<boolean>;
}

export interface CompanyListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CompanyListResponse {
  companies: Company[];
  total: number;
  page: number;
  limit: number;
}

export interface UserListFilters {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export interface CompanyUsersResponse {
  users: any[];
  total: number;
  page: number;
  limit: number;
}

export interface InviteAcceptanceData {
  name: string;
  password: string;
}