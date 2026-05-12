import { randomUUID } from "crypto";

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  username?: string;
  createdAt: Date;
}

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

  toJSON(): UserResponseDTO {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      createdAt: this.createdAt,
    };
  }
}

export interface CreateUserDTO {
  email: string;
  passwordHash: string;
  username?: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  username?: string;
  createdAt: Date;
}
