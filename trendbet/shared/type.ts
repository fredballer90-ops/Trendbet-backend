// shared/types.ts
export interface IUser {
  _id: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  balance: number;
  role: 'user' | 'admin';
  createdAt: Date;
  totalWagered: number;
  totalWinnings: number;
}

export interface IOTP {
  emailOrPhone: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
}
