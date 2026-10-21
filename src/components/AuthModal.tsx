import { useState } from 'react'
import { AuthUser } from '../types/auth'
import { sendAuthOTPAsync, verifyAuthOTPAsync } from '../services/authService'
import { 
  Phone, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Home, 
  RefreshCw, 
  Sparkles,
  ArrowLeft,
  ExternalLink
} from 'lucide-react'

interface AuthModalProps {
  onSuccess: (user: AuthUser) => void
  onCancel?: () => void
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [authType, setAuthType] = useState<'phone' | 'email'>('phone')
  const [targetContact, setTargetContact] = useState('')
  const [step, setStep] = useState<'input' | 'verify'>('input')
  const [otpCode, setOtpCode] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1: Send OTP to Phone or Email (dispatches through backend API)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessNotice(null)
    setWhatsappLink(null)
    setPreviewUrl(null)

    if (!targetContact.trim()) {
      setErrorMsg(authType === 'phone' ? 'Please enter your mobile number.' : 'Please enter your email address.')
      return
    }

    setIsLoading(true)
    const res = await sendAuthOTPAsync(targetContact, authType)
    setIsLoading(false)

    if (res.success) {
      if (res.whatsappLink) setWhatsappLink(res.whatsappLink)
      if (res.previewUrl) setPreviewUrl(res.previewUrl)
      setOtpCode('') // Keep input clean and empty so user enters the code received in their account
      setSuccessNotice(
        authType === 'phone'
          ? `6-digit security code dispatched to +91 ${targetContact}. Check your messages and enter it below.`
          : `6-digit security code dispatched to ${targetContact}. Check your inbox and enter it below.`
      )
      setStep('verify')
    } else {
      setErrorMsg(res.error || 'Failed to dispatch OTP code. Please check your number/email.')
    }
  }

  // Step 2: Verify 6-digit OTP against persistent database
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit OTP code.')
      return
    }

    setIsLoading(true)
    const res = await verifyAuthOTPAsync(targetContact, otpCode, authType)
    setIsLoading(false)

    if (res.success && res.user) {
      onSuccess(res.user)
    } else {
      setErrorMsg(res.error || 'Invalid OTP code. Please verify and try again.')
    }
  }

  return (
    <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 animate-in fade-in zoom-in-95">
      {/* Brand Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
          <Home className="w-3.5 h-3.5" />
          <span>DECOME Security Portal</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center space-x-2">
          <span>DECOME</span>
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </h2>
        <p className="text-xs text-slate-400">decorate your home with us</p>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* STEP 1: MOBILE NUMBER OR EMAIL SELECTION & INPUT */}
      {/* ================================================================= */}
      {step === 'input' && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          {/* Toggle Phone / Email */}
          <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthType('phone')
                setTargetContact('')
                setErrorMsg(null)
              }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center space-x-2 ${
                authType === 'phone'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile OTP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthType('email')
                setTargetContact('')
                setErrorMsg(null)
              }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center space-x-2 ${
                authType === 'email'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email OTP</span>
            </button>
          </div>

          {/* Phone Input Mode */}
          {authType === 'phone' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Mobile Number</span>
                <span className="text-[10px] text-slate-400 font-normal">SMS OTP Verification</span>
              </label>
              <div className="relative flex">
                <div className="flex items-center px-3 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl text-xs font-bold text-slate-300">
                  +91
                </div>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={targetContact}
                  onChange={(e) => setTargetContact(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full pl-3 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-r-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          ) : (
            /* Email Input Mode */
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Email Address</span>
                <span className="text-[10px] text-slate-400 font-normal">Email OTP Verification</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={targetContact}
                  onChange={(e) => setTargetContact(e.target.value)}
                  placeholder="architect@decome.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Send 6-Digit OTP</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider">or instant demo</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              const guestUser: AuthUser = {
                id: `usr_${Date.now()}`,
                name: 'Guest Designer',
                provider: 'guest',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                createdAt: new Date().toISOString()
              }
              onSuccess(guestUser)
            }}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Continue as Guest (Instant Access)</span>
          </button>
        </form>
      )}

      {/* ================================================================= */}
      {/* STEP 2: VERIFY 6-DIGIT OTP */}
      {/* ================================================================= */}
      {step === 'verify' && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <button
              type="button"
              onClick={() => {
                setStep('input')
                setOtpCode('')
                setErrorMsg(null)
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change {authType === 'phone' ? 'Number' : 'Email'}</span>
            </button>
            <span className="text-xs font-semibold text-slate-300">Security Check</span>
            <div className="w-10" />
          </div>

          <div className="space-y-2 text-center py-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Enter 6-digit verification code:
            </label>
            <div className="text-sm font-bold text-emerald-400">
              {authType === 'phone' ? `+91 ${targetContact}` : targetContact}
            </div>
            <p className="text-[11px] text-slate-400">
              {authType === 'phone'
                ? 'Check your SMS / WhatsApp messages for the code.'
                : 'Check your Gmail / Email inbox for the code.'}
            </p>
            <input
              type="text"
              maxLength={6}
              required
              autoFocus
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="• • • • • •"
              className="w-full py-3 text-center font-mono text-2xl tracking-widest bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner mt-2"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setIsLoading(true)
                setErrorMsg(null)
                const res = await sendAuthOTPAsync(targetContact, authType)
                setIsLoading(false)
                if (res.success) {
                  if (res.whatsappLink) setWhatsappLink(res.whatsappLink)
                  if (res.previewUrl) setPreviewUrl(res.previewUrl)
                  setOtpCode('')
                  setSuccessNotice(`A fresh 6-digit code has been dispatched to your ${authType === 'phone' ? 'phone' : 'email'}.`)
                }
              }}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Resend Code</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('input')
                setOtpCode('')
                setErrorMsg(null)
              }}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              Change Contact
            </button>
          </div>

          {/* Direct WhatsApp / Gmail Delivery Access Links */}
          {whatsappLink && authType === 'phone' && (
            <div className="text-center pt-1">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors"
              >
                <span>📲 Receive code via WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {authType === 'email' && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span>Open Gmail Inbox</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors"
                >
                  <span>View Dispatched Email</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Verify OTP & Enter DECOME</span>
          </button>
        </form>
      )}
    </div>
  )
}
