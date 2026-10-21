import { AuthUser, OTPRecord } from '../types/auth'

const AUTH_USER_STORAGE_KEY = 'decome_auth_user'
const USERS_DB_STORAGE_KEY = 'decome_registered_users'
const OTP_STORAGE_KEY = 'decome_active_otps'

interface RegisteredAccount {
  name: string
  email: string
  passwordHash: string
  avatar?: string
}

// Default pre-seeded test accounts
const DEFAULT_ACCOUNTS: RegisteredAccount[] = [
  {
    name: 'Demo Architect',
    email: 'architect@decome.com',
    passwordHash: 'Decome@2026',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  }
]

export function getRegisteredUsers(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_DB_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(USERS_DB_STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS))
      return DEFAULT_ACCOUNTS
    }
    return JSON.parse(raw)
  } catch {
    return DEFAULT_ACCOUNTS
  }
}

export function saveRegisteredUsers(users: RegisteredAccount[]): void {
  try {
    localStorage.setItem(USERS_DB_STORAGE_KEY, JSON.stringify(users))
  } catch (err) {
    console.error('Failed to save registered users to localStorage:', err)
  }
}

/**
 * Checks central server database for active authenticated session across any device
 */
export async function fetchDatabaseSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/session')
    if (res.ok) {
      const data = await res.json()
      if (data.user) {
        setCurrentUser(data.user)
        return data.user
      }
    }
  } catch (err) {
    console.warn('Could not reach backend session endpoint, using cached state:', err)
  }
  return getCurrentUser()
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setCurrentUser(user: AuthUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    } else {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
    }
  } catch (err) {
    console.error('Failed to persist auth user:', err)
  }
}

export function loginWithCredentials(
  emailOrUsername: string,
  passwordAttempt: string
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getRegisteredUsers()
  const cleanQuery = emailOrUsername.trim().toLowerCase()
  const account = users.find(u => u.email.toLowerCase() === cleanQuery || u.name.toLowerCase() === cleanQuery)

  if (!account) {
    return { success: false, error: 'Account not found. Please check your username or register.' }
  }

  if (account.passwordHash !== passwordAttempt) {
    return { success: false, error: 'Incorrect password. Click "Forgot Password" to receive an OTP on your Gmail.' }
  }

  const user: AuthUser = {
    id: `usr_${Date.now()}`,
    name: account.name,
    email: account.email,
    avatar: account.avatar,
    provider: 'email',
    createdAt: new Date().toISOString()
  }

  setCurrentUser(user)
  return { success: true, user }
}

export function loginWithGoogleAccount(googleUser: {
  name: string
  email: string
  avatar: string
}): AuthUser {
  const user: AuthUser = {
    id: `goog_${Date.now()}`,
    name: googleUser.name,
    email: googleUser.email,
    avatar: googleUser.avatar,
    provider: 'google',
    createdAt: new Date().toISOString()
  }

  setCurrentUser(user)
  return user
}

export function loginAsGuest(): AuthUser {
  const guest: AuthUser = {
    id: `guest_${Date.now()}`,
    name: 'Guest Designer',
    email: 'guest@decome.local',
    provider: 'guest',
    createdAt: new Date().toISOString()
  }
  setCurrentUser(guest)
  return guest
}

/**
 * Dispatches 6-digit OTP to mobile phone or Email.
 * Stores directly in the central backend database.
 */
export async function sendAuthOTPAsync(
  target: string, 
  type: 'phone' | 'email'
): Promise<{ 
  success: boolean; 
  message?: string; 
  error?: string; 
  previewUrl?: string; 
  whatsappLink?: string;
  otpHint?: string;
}> {
  const cleanTarget = target.trim()
  if (type === 'email') {
    if (!cleanTarget || !cleanTarget.includes('@')) {
      return { success: false, error: 'Please enter a valid Email address.' }
    }
  } else {
    const digitsOnly = cleanTarget.replace(/[^0-9]/g, '')
    if (digitsOnly.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
    }
  }

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: cleanTarget, type })
    })

    if (res.ok) {
      const data = await res.json()
      return { 
        success: true, 
        message: data.message,
        previewUrl: data.previewUrl,
        whatsappLink: data.whatsappLink,
        otpHint: data.otpHint
      }
    } else {
      const errData = await res.json().catch(() => ({}))
      return { success: false, error: errData.error || 'Failed to dispatch verification code.' }
    }
  } catch (err) {
    console.warn('Backend API request failed, falling back:', err)
  }

  // Fallback for static hosting (Vercel/Netlify static CDN): generates random 6-digit OTP
  const randomOTP = Math.floor(100000 + Math.random() * 900000).toString()
  const record: OTPRecord = {
    target: cleanTarget,
    code: randomOTP,
    expiresAt: Date.now() + 10 * 60 * 1000,
    type
  }
  localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(record))
  return { 
    success: true, 
    message: `Verification code generated: ${randomOTP}`,
    otpHint: randomOTP
  }
}

/**
 * Retrieves the currently active OTP from the server database
 */
export async function fetchLatestDatabaseOTP(
  target: string, 
  type: 'phone' | 'email'
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const res = await fetch(`/api/auth/latest-otp?target=${encodeURIComponent(target.trim())}&type=${type}`)
    if (res.ok) {
      const data = await res.json()
      return { success: true, code: data.code }
    }
    const err = await res.json().catch(() => ({}))
    return { success: false, error: err.error || 'No active OTP found in database.' }
  } catch {
    return { success: false, error: 'Failed to contact database server.' }
  }
}

export function sendAuthOTP(target: string, type: 'phone' | 'email'): { success: boolean; code?: string; error?: string } {
  const cleanTarget = target.trim()
  if (type === 'email') {
    if (!cleanTarget || !cleanTarget.includes('@')) {
      return { success: false, error: 'Please enter a valid Email address.' }
    }
  } else {
    const digitsOnly = cleanTarget.replace(/[^0-9]/g, '')
    if (digitsOnly.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
    }
  }

  // Fire-and-forget backend sync
  sendAuthOTPAsync(cleanTarget, type).catch(() => {})

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const record: OTPRecord = {
    target: cleanTarget,
    type,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000
  }

  try {
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(record))
  } catch (e) {
    console.error('Failed to store OTP:', e)
  }

  return { success: true, code }
}

/**
 * Validates 6-digit OTP against central persistent server database.
 */
export async function verifyAuthOTPAsync(
  target: string, 
  codeAttempt: string, 
  type: 'phone' | 'email'
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: target.trim(), code: codeAttempt.trim(), type })
    })

    if (res.ok) {
      const data = await res.json()
      if (data.user) {
        setCurrentUser(data.user)
        return { success: true, user: data.user }
      }
    } else {
      const errData = await res.json().catch(() => ({}))
      if (errData.error) {
        return { success: false, error: errData.error }
      }
    }
  } catch (err) {
    console.warn('Backend verification fallback to local DB:', err)
  }

  return verifyAuthOTP(target, codeAttempt, type)
}

export function verifyAuthOTP(target: string, codeAttempt: string, type: 'phone' | 'email'): { success: boolean; user?: AuthUser; error?: string } {
  try {
    const raw = localStorage.getItem(OTP_STORAGE_KEY)
    if (!raw) return { success: false, error: 'No active OTP found. Please request a new code.' }

    const record: OTPRecord = JSON.parse(raw)
    const normTarget = type === 'phone' ? target.replace(/[^0-9]/g, '').slice(-10) : target.trim().toLowerCase()
    const recordNorm = type === 'phone' ? record.target.replace(/[^0-9]/g, '').slice(-10) : record.target.trim().toLowerCase()

    if (recordNorm !== normTarget) {
      return { success: false, error: 'OTP request does not match this contact.' }
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, error: 'This OTP has expired. Please request a new code.' }
    }

    if (record.code !== codeAttempt.trim()) {
      return { success: false, error: 'Invalid 6-digit verification code. Please try again.' }
    }

    localStorage.removeItem(OTP_STORAGE_KEY)

    const displayName = type === 'email' 
      ? target.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ') 
      : `Member ${normTarget.slice(-4)}`

    const user: AuthUser = {
      id: `usr_${Date.now()}`,
      name: displayName || 'DECOME Member',
      email: type === 'email' ? target : undefined,
      phoneNumber: type === 'phone' ? target : undefined,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=059669&color=fff&bold=true`,
      provider: type,
      createdAt: new Date().toISOString()
    }

    setCurrentUser(user)
    return { success: true, user }
  } catch {
    return { success: false, error: 'Failed to verify OTP. Please try again.' }
  }
}

export function sendPasswordResetOTP(email: string): { success: boolean; code?: string; error?: string } {
  return sendAuthOTP(email, 'email')
}

export function verifyPasswordResetOTP(email: string, codeAttempt: string): { success: boolean; error?: string } {
  const res = verifyAuthOTP(email, codeAttempt, 'email')
  return { success: res.success, error: res.error }
}

export function updateAccountPassword(
  email: string,
  newPassword: string
): { success: boolean; user?: AuthUser; error?: string } {
  const users = getRegisteredUsers()
  const cleanEmail = email.trim().toLowerCase()
  const index = users.findIndex(u => u.email.toLowerCase() === cleanEmail)

  if (index === -1) {
    return { success: false, error: 'User account not found.' }
  }

  users[index].passwordHash = newPassword
  saveRegisteredUsers(users)

  const user: AuthUser = {
    id: `usr_${Date.now()}`,
    name: users[index].name,
    email: users[index].email,
    avatar: users[index].avatar,
    provider: 'email',
    createdAt: new Date().toISOString()
  }

  setCurrentUser(user)
  return { success: true, user }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Ignore network errors
  }
  setCurrentUser(null)
}
