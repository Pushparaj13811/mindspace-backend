import type { User as UserType, UserRole, Permission } from '../../types/index.js';

/**
 * User domain entity with business logic
 * Contains all user-related business rules and validations
 */
export class User {
  private constructor(private data: UserType) {}

  static create(userData: Omit<UserType, '$id' | 'createdAt' | 'updatedAt'>): User {
    // Business validation rules
    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new Error('Valid email is required');
    }

    if (!userData.name || userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    if (!userData.role) {
      throw new Error('User role is required');
    }

    // Set defaults
    const userWithDefaults: UserType = {
      $id: '', // Will be set by persistence layer
      ...userData,
      emailVerified: userData.emailVerified ?? false,
      isActive: userData.isActive ?? true,
      permissions: userData.permissions ?? [],
      subscription: userData.subscription ?? { tier: 'free' },
      preferences: userData.preferences ?? {
        theme: 'auto',
        notifications: true,
        preferredAIModel: 'gpt-4',
        language: 'en'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new User(userWithDefaults);
  }

  static fromData(data: UserType): User {
    return new User(data);
  }

  // Getters
  get id(): string { return this.data.$id; }
  get email(): string { return this.data.email; }
  get name(): string { return this.data.name; }
  get role(): UserRole { return this.data.role; }
  get companyId(): string | undefined { return this.data.companyId; }
  get permissions(): Permission[] { return this.data.permissions; }
  get isActive(): boolean { return this.data.isActive; }
  get emailVerified(): boolean { return this.data.emailVerified; }
  get subscription() { return this.data.subscription; }
  get preferences() { return this.data.preferences; }
  get lastLogin(): string | undefined { return this.data.lastLogin; }
  get createdAt(): string { return this.data.createdAt; }
  get updatedAt(): string { return this.data.updatedAt; }

  // Business methods
  updateProfile(updates: { name?: string; avatar?: string }): void {
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }
      this.data.name = updates.name.trim();
    }

    if (updates.avatar !== undefined) {
      this.data.avatar = updates.avatar;
    }

    this.data.updatedAt = new Date().toISOString();
  }

  updatePreferences(preferences: Partial<UserType['preferences']>): void {
    this.data.preferences = { ...this.data.preferences, ...preferences };
    this.data.updatedAt = new Date().toISOString();
  }

  changeRole(newRole: UserRole, companyId?: string): void {
    // Business rules for role changes
    if (newRole === 'INDIVIDUAL_USER' || newRole === 'SUPER_ADMIN') {
      this.data.companyId = undefined;
    } else {
      if (!companyId) {
        throw new Error('Company ID is required for company roles');
      }
      this.data.companyId = companyId;
    }

    this.data.role = newRole;
    this.data.updatedAt = new Date().toISOString();
  }

  assignPermissions(permissions: Permission[]): void {
    const uniquePermissions = Array.from(new Set([...this.data.permissions, ...permissions]));
    this.data.permissions = uniquePermissions;
    this.data.updatedAt = new Date().toISOString();
  }

  revokePermissions(permissions: Permission[]): void {
    this.data.permissions = this.data.permissions.filter(p => !permissions.includes(p));
    this.data.updatedAt = new Date().toISOString();
  }

  verifyEmail(): void {
    this.data.emailVerified = true;
    this.data.emailVerifiedAt = new Date().toISOString();
    this.data.updatedAt = new Date().toISOString();
  }

  recordLogin(): void {
    this.data.lastLogin = new Date().toISOString();
    this.data.updatedAt = new Date().toISOString();
  }

  deactivate(): void {
    this.data.isActive = false;
    this.data.updatedAt = new Date().toISOString();
  }

  activate(): void {
    this.data.isActive = true;
    this.data.updatedAt = new Date().toISOString();
  }

  updateSubscription(tier: 'free' | 'premium' | 'enterprise', validUntil?: string): void {
    this.data.subscription = { tier, validUntil };
    this.data.updatedAt = new Date().toISOString();
  }

  // Validation methods
  canBeAssignedRole(newRole: UserRole): boolean {
    // Individual users can't be assigned company roles without proper setup
    if ((newRole !== 'INDIVIDUAL_USER' && newRole !== 'SUPER_ADMIN') && !this.data.companyId) {
      return false;
    }
    return true;
  }

  belongsToCompany(companyId: string): boolean {
    return this.data.companyId === companyId;
  }

  hasRole(role: UserRole): boolean {
    return this.data.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.data.role);
  }

  isCompanyMember(): boolean {
    return this.data.companyId !== undefined;
  }

  isIndividualUser(): boolean {
    return this.data.role === 'INDIVIDUAL_USER';
  }

  isSuperAdmin(): boolean {
    return this.data.role === 'SUPER_ADMIN';
  }

  isCompanyAdmin(): boolean {
    return this.data.role === 'COMPANY_ADMIN';
  }

  // Export data
  toData(): UserType {
    return { ...this.data };
  }

  toPublicData(): Omit<UserType, 'permissions' | 'subscription'> {
    const { permissions, subscription, ...publicData } = this.data;
    return publicData;
  }

  // Static validation methods
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidRole(role: string): role is UserRole {
    const validRoles: UserRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_USER', 'INDIVIDUAL_USER'];
    return validRoles.includes(role as UserRole);
  }

  static validateUserData(data: Partial<UserType>): string[] {
    const errors: string[] = [];

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (data.name && data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (data.role && !this.isValidRole(data.role)) {
      errors.push('Invalid user role');
    }

    return errors;
  }
}