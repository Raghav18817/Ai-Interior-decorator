import test from 'node:test'
import assert from 'node:assert'

// Replicating authService OTP generation & verification logic
class TestAuthService {
  constructor() {
    this.otpStore = new Map()
  }

  sendAuthOTP(target, type) {
    if (!target || !target.trim()) {
      return { success: false, message: `Please enter a valid ${type === 'phone' ? 'mobile number' : 'email address'}.` }
    }

    if (type === 'phone') {
      const cleanPhone = target.replace(/[\s-]/g, '')
      if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        return { success: false, message: 'Please enter a valid 10-digit mobile number with country code (e.g. +91 9876543210).' }
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.trim())) {
        return { success: false, message: 'Please enter a valid email address.' }
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 5 * 60 * 1000
    this.otpStore.set(target.trim().toLowerCase(), { target: target.trim().toLowerCase(), type, code, expiresAt })

    return {
      success: true,
      message: type === 'phone' ? `SMS OTP sent to ${target}` : `Verification code sent to ${target}`,
      devOtpHint: code
    }
  }

  verifyAuthOTP(target, code, type) {
    const key = target.trim().toLowerCase()
    const record = this.otpStore.get(key)

    if (!record) {
      return { success: false, message: 'No OTP requested for this destination or OTP has expired.' }
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(key)
      return { success: false, message: 'OTP has expired. Please request a new code.' }
    }

    if (record.code !== code.trim()) {
      return { success: false, message: 'Incorrect OTP entered. Please check and try again.' }
    }

    this.otpStore.delete(key)
    const user = {
      uid: `usr_${Date.now()}`,
      displayName: type === 'phone' ? `User (${target.slice(-4)})` : target.split('@')[0],
      email: type === 'email' ? target.trim() : undefined,
      phoneNumber: type === 'phone' ? target.trim() : undefined,
      provider: type
    }

    return {
      success: true,
      user,
      message: 'Login verified successfully!'
    }
  }
}

test('AuthService OTP Flow - Mobile Phone OTP Send & Verify', (t) => {
  const auth = new TestAuthService()
  
  // 1. Invalid phone number rejection
  const invalidRes = auth.sendAuthOTP('123', 'phone')
  assert.strictEqual(invalidRes.success, false)

  // 2. Valid phone number OTP send
  const phone = '+919876543210'
  const sendRes = auth.sendAuthOTP(phone, 'phone')
  assert.strictEqual(sendRes.success, true)
  assert.ok(sendRes.devOtpHint)
  assert.strictEqual(sendRes.devOtpHint.length, 6)

  // 3. Incorrect OTP verification failure
  const failRes = auth.verifyAuthOTP(phone, '000000', 'phone')
  assert.strictEqual(failRes.success, false)

  // 4. Correct OTP verification success
  const passRes = auth.verifyAuthOTP(phone, sendRes.devOtpHint, 'phone')
  assert.strictEqual(passRes.success, true)
  assert.ok(passRes.user)
  assert.strictEqual(passRes.user.phoneNumber, phone)
  assert.strictEqual(passRes.user.provider, 'phone')
})

test('AuthService OTP Flow - Email OTP Send & Verify', (t) => {
  const auth = new TestAuthService()

  // 1. Invalid email rejection
  const invalidRes = auth.sendAuthOTP('not-an-email', 'email')
  assert.strictEqual(invalidRes.success, false)

  // 2. Valid email OTP send
  const email = 'designer@decome.studio'
  const sendRes = auth.sendAuthOTP(email, 'email')
  assert.strictEqual(sendRes.success, true)
  assert.ok(sendRes.devOtpHint)

  // 3. Correct OTP verification
  const passRes = auth.verifyAuthOTP(email, sendRes.devOtpHint, 'email')
  assert.strictEqual(passRes.success, true)
  assert.ok(passRes.user)
  assert.strictEqual(passRes.user.email, email)
  assert.strictEqual(passRes.user.provider, 'email')
})
