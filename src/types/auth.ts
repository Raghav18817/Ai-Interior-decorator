export interface AuthUser {
  id: string
  name: string
  email?: string
  phoneNumber?: string
  avatar?: string
  provider: 'email' | 'phone' | 'google' | 'guest'
  createdAt: string
}

export type AuthMode = 'otp_request' | 'otp_verify'

export interface OTPRecord {
  target: string
  type: 'phone' | 'email'
  code: string
  expiresAt: number
}

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
}

