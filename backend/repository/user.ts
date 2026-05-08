import { randomUUID } from 'crypto';

/**
 * User interface for TypeScript type checking
 */
export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  username?: string;
  createdAt: Date;
}

/**
 * User model class for MongoDB operations
 */
export class User implements IUser {
  id: string;
  email: string;
  passwordHash: string;
  username?: string;
  createdAt: Date;

  constructor(
    email: string,
    passwordHash: string,
    username?: string,
    id?: string,
    createdAt?: Date
  ) {
    this.id = id || randomUUID();
    this.email = email;
    this.passwordHash = passwordHash;
    this.username = username;
    this.createdAt = createdAt || new Date();
  }

  /**
   * Convert user instance to JSON for API responses
   * Note: excludes passwordHash for security
   */
  toJSON() {
    const { passwordHash, ...userWithoutPassword } = {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      username: this.username,
      createdAt: this.createdAt,
    };
    return userWithoutPassword;
  }
}

/**
 * User data transfer object (DTO) for creation
 */
export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  username?: string;
}

/**
 * User data transfer object (DTO) for responses
 */
export interface UserResponseDTO {
  id: string;
  email: string;
  username?: string;
  createdAt: Date;
}
