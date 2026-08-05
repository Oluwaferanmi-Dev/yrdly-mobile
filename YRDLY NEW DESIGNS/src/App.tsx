import { useState, useRef, useEffect } from 'react'
import logoSrc from './imports/logo.png'

// ─── Tokens ───────────────────────────────────────────────────────────────────
// Simulates server-injected role. In production this comes from the auth token / user record.
const IS_ADMIN = true

const G = '#82DB7E'
const GLOW = 'rgba(130,219,126,0.26)'
const DARK = '#050505'
const GLASS_BG = 'rgba(8,8,8,0.74)'
const GLASS_BORDER = 'rgba(255,255,255,0.09)'
const SURFACE = 'rgba(255,255,255,0.055)'
const LABEL = 'rgba(255,255,255,0.38)'
const MUTED = 'rgba(255,255,255,0.55)'

type Page =
  | 'splash' | 'onboarding'
  | 'signup' | 'login'
  | 'forgot' | 'reset'
  | 'verify-email'
  | 'phone' | 'otp'
  | 'profile1' | 'profile2'
  | 'permissions' | 'feed' | 'profile' | 'settings'
  | 'transactions' | 'payouts' | 'bank-account'
  | 'privacy-disc' | 'location-settings'
  | 'notifications-settings' | 'darkmode-settings'
  | 'guidelines' | 'help-center' | 'report-issue'
  | 'edit-profile'
  | 'messages' | 'new-message' | 'chat'
  | 'explore'
  | 'item-detail' | 'event-detail' | 'place-detail'
  | 'community' | 'tickets' | 'my-events' | 'my-business'
  | 'create-post' | 'create-for-sale' | 'create-event'
  | 'ticket-purchase' | 'ticket-qr' | 'scan-tickets' | 'event-manage'
  | 'checkout' | 'checkout-success' | 'order-detail' | 'dispute' | 'review-seller'
  | 'withdraw' | 'withdraw-confirm' | 'withdraw-success' | 'bank-verify'
  | 'business-hub' | 'business-edit' | 'business-add-item'
  | 'alerts' | 'alert-detail' | 'create-alert'
  | 'admin-disputes' | 'admin-dispute-detail'
  | 'map' | 'public-profile' | 'network' | 'post-detail' | 'invite' | 'followers-list'

// ─── Onboarding data ──────────────────────────────────────────────────────────
const SLIDES = [
  { headline: 'Welcome to Your\nNeighbourhood', description: 'Stay connected with the people, places, and conversations that make your neighbourhood feel like home.', imageId: '1752622176337-5d9315e2df6e', imgPos: 'center 50%', cta: 'Continue' },
  { headline: 'Everything You Need,\nClose to Home', description: 'Discover trusted neighbours, support local businesses, and find great deals just around the corner.', imageId: '1579998120708-682dd8a5624f', imgPos: 'center 30%', cta: 'Continue' },
  { headline: "Something's Always\nHappening Nearby", description: "From community gatherings to weekend markets, there's always something worth showing up for.", imageId: '1673280401347-309363111070', imgPos: 'center 20%', cta: 'Continue' },
  { headline: 'Meet the People\nAround You', description: 'Build meaningful relationships with the people who live, work and create around you.', imageId: '1758525225816-8dd1901ef6ec', imgPos: 'center 30%', cta: 'Welcome Home' },
]

// ─── Shared primitives ────────────────────────────────────────────────────────
function Logo({ size = 44 }: { size?: number }) {
  return <img src={logoSrc} alt="YRDLY" style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0 }} draggable={false} />
}

function SceneBg({ photoId, alt, pos = 'center center', gradientStart = '45%' }: { photoId: string; alt: string; pos?: string; gradientStart?: string }) {
  return (
    <>
      <img src={`https://images.unsplash.com/photo-${photoId}?w=800&h=900&fit=crop&auto=format&q=85`} alt={alt} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: pos }} draggable={false} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.0) ${gradientStart}, rgba(5,5,5,0.85) 75%, rgba(5,5,5,0.98) 100%)` }} />
    </>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative z-10 mx-5 mb-6 flex flex-col gap-5 px-6 py-7 ${className}`} style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, borderRadius: '32px', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>
      {children}
    </div>
  )
}

function PrimaryBtn({ label, onClick, icon, disabled }: { label: string; onClick: () => void; icon?: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn-primary w-full flex items-center justify-center gap-2 font-bold" style={{ height: '62px', borderRadius: '20px', background: disabled ? 'rgba(130,219,126,0.35)' : G, color: DARK, fontSize: '16px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, boxShadow: disabled ? 'none' : `0 8px 28px ${GLOW}, 0 2px 6px rgba(0,0,0,0.35)` }}>
      {icon}{label}
    </button>
  )
}

function SecondaryBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-center" style={{ height: '52px', borderRadius: '20px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: MUTED, fontSize: '15px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
      {label}
    </button>
  )
}

function GlassInput({ type = 'text', placeholder, value, onChange, icon, right }: { type?: string; placeholder: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode; right?: React.ReactNode }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex items-center gap-3 px-4" style={{ height: '56px', borderRadius: '18px', background: SURFACE, border: `1px solid ${focused ? 'rgba(130,219,126,0.4)' : GLASS_BORDER}`, transition: 'border-color 0.2s' }}>
      {icon && <span style={{ color: focused ? G : LABEL, transition: 'color 0.2s', flexShrink: 0 }}>{icon}</span>}
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} className="flex-1 bg-transparent outline-none" style={{ color: '#fff', fontSize: '15px', fontFamily: 'Inter, sans-serif' }} />
      {right && <span style={{ flexShrink: 0 }}>{right}</span>}
    </div>
  )
}

function PasswordStrength({ value }: { value: string }) {
  const score = Math.min([/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(value)).length, 4)
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', '#FF5C5C', '#FFB648', G, G]
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex gap-1 flex-1">
        {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: '3px', borderRadius: '99px', background: i <= score ? colors[score] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />)}
      </div>
      <span style={{ fontSize: '11px', color: score > 0 ? colors[score] : LABEL, fontFamily: 'Inter, sans-serif', fontWeight: 600, minWidth: '36px', textAlign: 'right' }}>{labels[score]}</span>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1" style={{ height: '1px', background: GLASS_BORDER }} />
      <span style={{ color: LABEL, fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <div className="flex-1" style={{ height: '1px', background: GLASS_BORDER }} />
    </div>
  )
}

function SocialRow() {
  return (
    <div className="flex gap-3">
      {[['Google', <GoogleIcon />], ['Apple', <AppleIcon />]].map(([label, icon]) => (
        <button key={label as string} className="flex-1 flex items-center justify-center gap-2" style={{ height: '50px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontSize: '14px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          {icon as React.ReactNode}{label as string}
        </button>
      ))}
    </div>
  )
}

function BackBtn({ onClick, light }: { onClick: () => void; light?: boolean }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5" style={{ color: light ? 'rgba(255,255,255,0.5)' : LABEL, fontSize: '14px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
      <ChevronLeftIcon /><span>Back</span>
    </button>
  )
}

function ProgressPills({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: '3px', borderRadius: '99px', background: i === current ? G : 'rgba(255,255,255,0.22)', width: i === current ? '24px' : '8px', transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)' }} />
      ))}
    </div>
  )
}

function StepBar({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: G, fontWeight: 600, letterSpacing: '0.08em' }}>STEP {step} OF {total}</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{label}</span>
      </div>
      <div style={{ height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ height: '100%', borderRadius: '99px', background: G, width: `${(step / total) * 100}%`, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  )
}

function StatusBar({ dark }: { dark?: boolean }) {
  const color = dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)'
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-7 z-20" style={{ paddingTop: '14px', height: '50px' }}>
      <span style={{ fontSize: '13px', fontWeight: 600, color, fontFamily: 'Inter, sans-serif' }}>9:41</span>
      <div style={{ width: '118px', height: '34px', background: dark ? 'rgba(255,255,255,0.05)' : DARK, borderRadius: '0 0 20px 20px', position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }} />
      <div className="flex items-center gap-1.5">
        <svg width="15" height="11" viewBox="0 0 15 11" fill={color}><rect x="0" y="7" width="2.5" height="4" rx="0.8"/><rect x="4" y="4.5" width="2.5" height="6.5" rx="0.8"/><rect x="8" y="2" width="2.5" height="9" rx="0.8"/><rect x="12" y="0" width="2.5" height="11" rx="0.8"/></svg>
        <svg width="15" height="11" viewBox="0 0 14 11" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round"><path d="M1 4C3 2 5 1 7 1s4 1 6 3"/><path d="M2.8 6.2C4.2 4.8 5.6 4 7 4s2.8.8 4.2 2.2"/><path d="M4.8 8.3C5.6 7.5 6.3 7 7 7s1.4.5 2.2 1.3"/><circle cx="7" cy="10" r="0.9" fill={color} stroke="none"/></svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="0.5" y="0.5" width="18" height="10" rx="3" stroke={dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)'}/><rect x="2" y="2" width="13" height="7" rx="1.5" fill={color}/><path d="M20 3.5v4a1.8 1.8 0 0 0 0-4z" fill={dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)'}/></svg>
      </div>
    </div>
  )
}

// ─── 1. SPLASH ────────────────────────────────────────────────────────────────
function SplashScreen({ go }: { go: (p: Page) => void }) {
  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1594538756542-8c88bda491c5" alt="Aerial Nigerian cityscape" pos="center 40%" gradientStart="30%" />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pb-8" style={{ paddingTop: '60px' }}>
        <div className="illustration-float flex flex-col items-center gap-5">
          <Logo size={88} />
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '32px', color: '#fff', letterSpacing: '0.05em' }}>YRDLY</span>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif', marginTop: '-8px', letterSpacing: '0.02em' }}>Your Neighbourhood, Connected.</p>
        </div>
      </div>
      <div className="relative z-10 px-6 pb-10 flex flex-col gap-3">
        <PrimaryBtn label="Get Started" onClick={() => go('onboarding')} icon={<ArrowRightIcon />} />
        <SecondaryBtn label="Already have an account? Sign in" onClick={() => go('login')} />
      </div>
    </div>
  )
}

// ─── 2. ONBOARDING ────────────────────────────────────────────────────────────
function OnboardingFlow({ go }: { go: (p: Page) => void }) {
  const [idx, setIdx] = useState(0)
  const [key, setKey] = useState(0)
  const s = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1
  const advance = () => { if (!isLast) { setIdx(i => i + 1); setKey(k => k + 1) } else go('signup') }
  return (
    <div key={key} className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId={s.imageId} alt={s.headline} pos={s.imgPos} gradientStart="40%" />
      <div className="relative z-10 flex items-center justify-between px-6 flex-shrink-0" style={{ paddingTop: '60px' }}>
        <ProgressPills total={SLIDES.length} current={idx} />
        {!isLast && <button onClick={() => go('signup')} style={{ color: LABEL, fontSize: '14px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Skip</button>}
      </div>
      <div className="flex-1" />
      <div className="relative z-10 px-6 pb-10 flex flex-col gap-4">
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '32px', color: '#fff', lineHeight: 1.15, whiteSpace: 'pre-line' }}>{s.headline}</h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{s.description}</p>
        <div style={{ marginTop: '4px' }}>
          <PrimaryBtn label={s.cta} onClick={advance} icon={isLast ? <HomeIcon /> : <ArrowRightIcon />} />
        </div>
      </div>
    </div>
  )
}

// ─── 3. SIGN UP ───────────────────────────────────────────────────────────────
function SignUpScreen({ go }: { go: (p: Page) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1571346746462-d4e51c41072f" alt="Nigerian woman with coffee, warm morning light" pos="center 20%" gradientStart="40%" />
      <div className="relative z-10 flex items-center px-6 flex-shrink-0" style={{ paddingTop: '60px' }}><Logo size={36} /></div>
      <div className="flex-1" />
      <GlassCard>
        <div><h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '26px', color: '#fff', marginBottom: '4px' }}>Join your neighbourhood</h2><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>Create your account — it only takes a moment</p></div>
        <div className="flex flex-col gap-3">
          <GlassInput placeholder="Full name" value={name} onChange={setName} icon={<UserIcon />} />
          <GlassInput type="email" placeholder="Email address" value={email} onChange={setEmail} icon={<MailIcon />} />
          <GlassInput type="password" placeholder="Create a password" value={pw} onChange={setPw} icon={<LockIcon />} />
          {pw.length > 0 && <PasswordStrength value={pw} />}
        </div>
        <PrimaryBtn label="Create Account" onClick={() => go('verify-email')} />
        <Divider label="or continue with" />
        <SocialRow />
        <p className="text-center" style={{ fontSize: '13px', color: LABEL, fontFamily: 'Inter, sans-serif' }}>
          Already have an account? <button onClick={() => go('login')} style={{ color: G, fontWeight: 600 }}>Sign in</button>
        </p>
      </GlassCard>
    </div>
  )
}

// ─── 4. LOGIN ─────────────────────────────────────────────────────────────────
function LoginScreen({ go }: { go: (p: Page) => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1707011017057-e80acf66ddeb" alt="Lagos at night, warm city lights" pos="center 30%" gradientStart="35%" />
      <div className="relative z-10 flex items-center px-6 flex-shrink-0" style={{ paddingTop: '60px' }}><Logo size={36} /></div>
      <div className="flex-1" />
      <GlassCard>
        <div><h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '26px', color: '#fff', marginBottom: '4px' }}>Welcome back</h2><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>Sign in to your neighbourhood</p></div>
        <div className="flex flex-col gap-3">
          <GlassInput type="email" placeholder="Email address" value={email} onChange={setEmail} icon={<MailIcon />} />
          <GlassInput type="password" placeholder="Password" value={pw} onChange={setPw} icon={<LockIcon />} />
          <button onClick={() => go('forgot')} style={{ alignSelf: 'flex-end', fontSize: '13px', color: G, fontFamily: 'Inter, sans-serif', fontWeight: 500, marginTop: '-4px' }}>Forgot password?</button>
        </div>
        <PrimaryBtn label="Sign In" onClick={() => go('verify-email')} />
        <Divider label="or continue with" />
        <SocialRow />
        <p className="text-center" style={{ fontSize: '14px', color: LABEL, fontFamily: 'Inter, sans-serif' }}>
          Don't have an account? <button onClick={() => go('signup')} style={{ color: G, fontWeight: 600 }}>Sign up</button>
        </p>
      </GlassCard>
    </div>
  )
}

// ─── 5. FORGOT PASSWORD ───────────────────────────────────────────────────────
function ForgotScreen({ go }: { go: (p: Page) => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1707011017057-e80acf66ddeb" alt="Lagos evening warm city lights" pos="center 60%" gradientStart="30%" />
      <div className="relative z-10 flex items-center px-6 flex-shrink-0" style={{ paddingTop: '60px' }}><BackBtn onClick={() => go('login')} light /></div>
      <div className="flex-1" />
      <GlassCard>
        {/* Key icon */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center justify-center" style={{ width: '68px', height: '68px', borderRadius: '22px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)', marginBottom: '4px', boxShadow: `0 0 32px ${GLOW}` }}>
            <KeyIcon />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff' }}>Forgot your password?</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.6, maxWidth: '270px' }}>No worries! Enter your account email and we'll send you a reset link.</p>
        </div>
        {!sent ? (
          <>
            <GlassInput type="email" placeholder="Email address" value={email} onChange={setEmail} icon={<MailIcon />} />
            <PrimaryBtn label="Send Reset Link" onClick={() => setSent(true)} />
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(130,219,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon />
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6 }}>Reset link sent to <span style={{ color: '#fff', fontWeight: 600 }}>{email || 'your email'}</span>. Check your inbox.</p>
          </div>
        )}
        <button onClick={() => go('login')} style={{ textAlign: 'center', fontSize: '14px', fontFamily: 'Inter, sans-serif', color: LABEL }}>
          ← Back to Sign In
        </button>
      </GlassCard>
    </div>
  )
}

// ─── 6. RESET PASSWORD ────────────────────────────────────────────────────────
function ResetScreen({ go }: { go: (p: Page) => void }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1707011017057-e80acf66ddeb" alt="Lagos warm city lights" pos="center 55%" gradientStart="30%" />
      <div className="relative z-10 flex items-center px-6 flex-shrink-0" style={{ paddingTop: '60px' }}><BackBtn onClick={() => go('forgot')} light /></div>
      <div className="flex-1" />
      <GlassCard>
        <div><h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff', marginBottom: '4px' }}>Create new password</h2><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.55 }}>Your new password must be different from previous passwords.</p></div>
        <div className="flex flex-col gap-3">
          <GlassInput type={show1 ? 'text' : 'password'} placeholder="New password" value={pw} onChange={setPw} icon={<LockIcon />} right={<button onClick={() => setShow1(s => !s)} style={{ color: LABEL, paddingLeft: '4px' }}>{show1 ? <EyeOffIcon /> : <EyeIcon />}</button>} />
          {pw.length > 0 && <PasswordStrength value={pw} />}
          <GlassInput type={show2 ? 'text' : 'password'} placeholder="Confirm new password" value={confirm} onChange={setConfirm} icon={<LockIcon />} right={<button onClick={() => setShow2(s => !s)} style={{ color: LABEL, paddingLeft: '4px' }}>{show2 ? <EyeOffIcon /> : <EyeIcon />}</button>} />
        </div>
        <PrimaryBtn label="Reset Password" onClick={() => setDone(true)} />
        {done && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckSmIcon />
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: G, fontWeight: 500 }}>Password updated successfully!</p>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// ─── 7. EMAIL VERIFICATION ────────────────────────────────────────────────────
function VerifyEmailScreen({ go }: { go: (p: Page) => void }) {
  const [countdown, setCountdown] = useState(0)
  const [resent, setResent] = useState(false)
  const handleResend = () => { setResent(true); setCountdown(45); const t = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000); }
  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1768244016593-8ca75b15bc92" alt="Smiling African woman with smartphone" pos="center 25%" gradientStart="42%" />
      <div className="relative z-10 flex items-center px-6 flex-shrink-0" style={{ paddingTop: '60px' }}><BackBtn onClick={() => go('login')} light /></div>
      <div className="flex-1" />
      <GlassCard>
        <div className="flex flex-col items-center text-center gap-3">
          <div style={{ width: '68px', height: '68px', borderRadius: '22px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
            <EnvelopeIcon />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff' }}>Check your inbox</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.6, maxWidth: '260px' }}>We sent a verification link to <span style={{ color: MUTED, fontWeight: 500 }}>your@email.com</span>. Tap it to confirm your account.</p>
        </div>
        <PrimaryBtn label="Open Email App" onClick={() => go('phone')} icon={<EnvelopeSmIcon />} />
        <div className="flex flex-col items-center gap-3">
          <button onClick={!countdown ? handleResend : undefined} style={{ fontSize: '14px', fontFamily: 'Inter, sans-serif', color: countdown > 0 ? LABEL : G, fontWeight: 600, opacity: countdown > 0 ? 0.6 : 1 }}>
            {countdown > 0 ? `Resend in ${countdown}s` : resent ? 'Resend again' : 'Resend email'}
          </button>
          <button style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: LABEL }}>Change email address</button>
        </div>
      </GlassCard>
    </div>
  )
}

// ─── 8. PHONE INPUT ───────────────────────────────────────────────────────────
function PhoneScreen({ go }: { go: (p: Page) => void }) {
  const [phone, setPhone] = useState('')
  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1654762550505-7c58277e0fac" alt="Nigerian community street, bikes and neighbours" pos="center 35%" gradientStart="40%" />
      <div className="relative z-10 flex items-center px-6 flex-shrink-0" style={{ paddingTop: '60px' }}><BackBtn onClick={() => go('verify-email')} light /></div>
      <div className="flex-1" />
      <GlassCard>
        <div><h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff', marginBottom: '4px' }}>Verify your phone number</h2><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.6 }}>YRDLY is a verified community. We use your number to keep buyers and sellers safe in your neighbourhood.</p></div>
        {/* Phone field */}
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3" style={{ height: '56px', borderRadius: '18px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, flexShrink: 0 }}>
            <span style={{ fontSize: '18px' }}>🇳🇬</span>
            <span style={{ color: '#fff', fontSize: '14px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>+234</span>
            <ChevronDownIcon />
          </div>
          <div className="flex-1">
            <GlassInput placeholder="801 234 5678" value={phone} onChange={v => setPhone(v.replace(/\D/g, '').slice(0, 10))} />
          </div>
        </div>
        {/* Trust badge */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}` }}>
          <ShieldIcon />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, lineHeight: 1.5 }}>Your number is never shared publicly with other users.</p>
        </div>
        <PrimaryBtn label="Send Verification Code" onClick={() => go('otp')} />
      </GlassCard>
    </div>
  )
}

// ─── 9. OTP ENTRY ─────────────────────────────────────────────────────────────
function OTPScreen({ go }: { go: (p: Page) => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(45)
  const [method, setMethod] = useState<'sms' | null>(null)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000)
    return () => clearInterval(t)
  }, [])

  const handleDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = d; setDigits(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const filled = digits.every(d => d !== '')

  return (
    <div className="screen-enter relative w-full h-full flex flex-col">
      <StatusBar />
      <SceneBg photoId="1654762550505-7c58277e0fac" alt="Nigerian neighbourhood street warm daylight" pos="center 30%" gradientStart="40%" />
      <div className="relative z-10 flex items-center px-6 flex-shrink-0" style={{ paddingTop: '60px' }}><BackBtn onClick={() => go('phone')} light /></div>
      <div className="flex-1" />
      <GlassCard>
        <div><h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff', marginBottom: '4px' }}>Enter 6-digit code</h2><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>We sent a code via SMS to <span style={{ color: MUTED, fontWeight: 500 }}>+234 801 *** *678</span></p></div>
        {/* OTP boxes */}
        <div className="flex gap-2 justify-between">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              className="text-center outline-none"
              style={{
                width: '46px', height: '58px',
                borderRadius: '16px',
                background: d ? 'rgba(130,219,126,0.1)' : SURFACE,
                border: `1.5px solid ${d ? 'rgba(130,219,126,0.5)' : GLASS_BORDER}`,
                color: '#fff', fontSize: '22px', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                transition: 'all 0.15s',
              }}
            />
          ))}
        </div>
        {/* Countdown */}
        <div className="flex flex-col items-center gap-2">
          <p style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: countdown > 0 ? LABEL : G }}>
            {countdown > 0 ? `Resend SMS in 0:${String(countdown).padStart(2, '0')}` : <button style={{ color: G, fontWeight: 600 }}>Resend Code</button>}
          </p>
          <button style={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', color: LABEL, lineHeight: 1.5 }}>
            Didn't receive SMS? Try <span style={{ color: MUTED }}>WhatsApp</span> or <span style={{ color: MUTED }}>Voice Call</span>
          </button>
        </div>
        <PrimaryBtn label="Verify & Continue" onClick={() => go('profile1')} disabled={!filled} />
      </GlassCard>
    </div>
  )
}

// ─── 10. PROFILE STEP 1 ───────────────────────────────────────────────────────
const AVATARS = ['👩🏾', '👨🏾', '👩🏿', '👨🏿', '👩🏽', '👨🏽']

function Profile1Screen({ go }: { go: (p: Page) => void }) {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState<number | null>(null)
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#0e0e0e' }}>
      <StatusBar dark />
      {/* Warm light bg */}
      <SceneBg photoId="1764921587464-f3cdd46fb4c9" alt="People in a warm-lit African living room" pos="center 20%" gradientStart="25%" />
      <div className="relative z-10 flex-shrink-0 px-6" style={{ paddingTop: '60px' }}>
        <StepBar step={1} total={2} label="Personalize" />
      </div>
      <div className="flex-1" />
      <GlassCard>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>Tell us about yourself</h2>
        {/* Avatar ring */}
        <div className="flex flex-col items-center gap-3">
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `2.5px dashed ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', background: avatar !== null ? 'rgba(130,219,126,0.08)' : SURFACE }}>
            {avatar !== null ? (
              <span style={{ fontSize: '36px' }}>{AVATARS[avatar]}</span>
            ) : (
              <CameraIcon />
            )}
            <div style={{ position: 'absolute', bottom: '0', right: '0', width: '24px', height: '24px', borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusIcon />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <GlassInput placeholder="Display name (e.g. Amina Bello)" value={name} onChange={setName} icon={<UserIcon />} />
          <GlassInput placeholder="@username" value={handle} onChange={v => setHandle(v.startsWith('@') ? v : '@' + v)} icon={<AtIcon />} />
          <div style={{ position: 'relative' }}>
            <textarea
              placeholder="Short bio (optional)"
              value={bio}
              onChange={e => e.target.value.length <= 140 && setBio(e.target.value)}
              style={{ width: '100%', minHeight: '72px', borderRadius: '18px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontSize: '15px', fontFamily: 'Inter, sans-serif', padding: '14px 16px', outline: 'none', resize: 'none' }}
            />
            <span style={{ position: 'absolute', bottom: '10px', right: '12px', fontSize: '11px', color: LABEL, fontFamily: 'Inter, sans-serif' }}>{bio.length}/140</span>
          </div>
        </div>
        <PrimaryBtn label="Next: Choose Neighbourhood →" onClick={() => go('profile2')} />
      </GlassCard>
    </div>
  )
}

// ─── 11. PROFILE STEP 2 ───────────────────────────────────────────────────────
function Profile2Screen({ go }: { go: (p: Page) => void }) {
  const [location, setLocation] = useState('')
  const [selected, setSelected] = useState(false)
  const suggestions = ['Victoria Island, Lagos', 'Lekki Phase 1, Lagos', 'Surulere, Lagos', 'Ikeja GRA, Lagos']
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#0e0e0e' }}>
      <StatusBar dark />
      <SceneBg photoId="1594538756542-8c88bda491c5" alt="Aerial Nigerian neighbourhood" pos="center 50%" gradientStart="30%" />
      <div className="relative z-10 flex-shrink-0 px-6" style={{ paddingTop: '60px' }}>
        <StepBar step={2} total={2} label="Your Neighbourhood" />
      </div>
      <div className="flex-1" />
      <GlassCard>
        <div><h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', marginBottom: '4px' }}>Where do you live?</h2><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.55 }}>Enter your address or estate to join your local neighbourhood group.</p></div>
        {/* Search input */}
        <div className="relative">
          <GlassInput placeholder="Search your neighbourhood…" value={location} onChange={v => { setLocation(v); setSelected(false) }} icon={<PinIcon />} right={<button style={{ background: G, borderRadius: '10px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}><GPSIcon /><span style={{ fontSize: '11px', color: DARK, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>GPS</span></button>} />
          {location.length > 0 && !selected && (
            <div style={{ position: 'absolute', top: '60px', left: 0, right: 0, background: 'rgba(15,15,15,0.96)', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px', overflow: 'hidden', zIndex: 50 }}>
              {suggestions.filter(s => s.toLowerCase().includes(location.toLowerCase())).map(s => (
                <button key={s} onClick={() => { setLocation(s); setSelected(true) }} className="w-full flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                  <PinIcon />{s}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Privacy note */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}` }}>
          <LockSmIcon />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, lineHeight: 1.55 }}>Exact house numbers are kept private. Neighbours only see your general neighbourhood area.</p>
        </div>
        <PrimaryBtn label={`Complete Setup & Join${selected ? ' ' + location.split(',')[0] : ''}`} onClick={() => go('permissions')} />
      </GlassCard>
    </div>
  )
}

// ─── 12. PERMISSIONS ─────────────────────────────────────────────────────────
function PermissionsScreen({ go }: { go: (p: Page) => void }) {
  const [perms, setPerms] = useState({ location: false, notifications: false, camera: false })
  const toggle = (k: keyof typeof perms) => setPerms(p => ({ ...p, [k]: !p[k] }))
  const items = [
    { key: 'location' as const, emoji: '📍', title: 'Location Access', desc: 'To show you nearby neighbours, events & marketplace items' },
    { key: 'notifications' as const, emoji: '🔔', title: 'Push Notifications', desc: 'To alert you when neighbours message or post nearby' },
    { key: 'camera' as const, emoji: '📷', title: 'Camera & Photos', desc: 'To list items in marketplace and post community photos' },
  ]
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="relative z-10 flex flex-col flex-1 px-6" style={{ paddingTop: '70px' }}>
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <Logo size={56} />
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff', marginTop: '8px' }}>Enable permissions for the best experience</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, maxWidth: '260px', lineHeight: 1.6 }}>YRDLY works best with these on. You can change them anytime in Settings.</p>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          {items.map(item => (
            <div key={item.key} className="flex items-center gap-4 px-5 py-4" style={{ background: '#111', border: `1px solid ${perms[item.key] ? 'rgba(130,219,126,0.25)' : GLASS_BORDER}`, borderRadius: '24px', transition: 'border-color 0.2s' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: perms[item.key] ? 'rgba(130,219,126,0.1)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0, transition: 'background 0.2s' }}>
                {item.emoji}
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '15px', color: '#fff', marginBottom: '2px' }}>{item.title}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
              {/* Toggle */}
              <button onClick={() => toggle(item.key)} style={{ width: '48px', height: '28px', borderRadius: '99px', background: perms[item.key] ? G : 'rgba(255,255,255,0.1)', position: 'relative', flexShrink: 0, transition: 'background 0.25s', border: 'none' }}>
                <div style={{ position: 'absolute', top: '3px', left: perms[item.key] ? 'calc(100% - 25px)' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 pb-10 mt-6">
          <PrimaryBtn label="Allow Selected & Continue" onClick={() => go('feed')} />
        </div>
      </div>
    </div>
  )
}

// ─── Shared tab bar ───────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, string> = { Welcome: G, Neighbour: '#82B4DB', Marketplace: '#FFB648', Events: '#DB82C4' }

// ─── Nav icons — outline/fill pairs ──────────────────────────────────────────
function IconHome({ fill }: { fill: boolean }) {
  return fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
}
function IconCompass({ fill }: { fill: boolean }) {
  return fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm3.24-12.24l-6.36 2.12-2.12 6.36 6.36-2.12 2.12-6.36z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>
}
function IconMsg({ fill }: { fill: boolean }) {
  return fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function IconProfile({ fill }: { fill: boolean }) {
  return fill
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-7 8a7 7 0 0 1 14 0H5z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
}

// ─── Create category sheet ────────────────────────────────────────────────────
function CreateSheet({ onClose, go }: { onClose: () => void; go: (p: Page) => void }) {
  const [pressed, setPressed] = useState<number | null>(null)
  const OPTIONS: { icon: React.ReactNode; label: string; sub: string; accent: string; page: Page }[] = [
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, label: 'General Post', sub: 'Share something with your neighbourhood', accent: '#6C8EFF', page: 'create-post' },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, label: 'Item for Sale', sub: 'Sell something locally · set your price in ₦', accent: '#FFB648', page: 'create-for-sale' },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, label: 'Event', sub: 'Create an event with free or paid tickets', accent: G, page: 'create-event' },
  ]
  const nav = (page: Page) => { go(page); onClose() }
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(10px)' }} onClick={onClose}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderRadius: '28px 28px 0 0', border: '1px solid rgba(255,255,255,0.08)', paddingBottom: '44px' }} onClick={e => e.stopPropagation()}>
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '16px auto 0' }} />
        <div className="px-5 pt-5 pb-4">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', marginBottom: '4px' }}>Create</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>What would you like to share with your neighbourhood?</p>
        </div>
        <div className="px-5 flex flex-col gap-3">
          {OPTIONS.map((opt, i) => (
            <button key={i}
              onMouseDown={() => setPressed(i)} onMouseUp={() => setPressed(null)} onMouseLeave={() => setPressed(null)}
              onTouchStart={() => setPressed(i)} onTouchEnd={() => setPressed(null)}
              onClick={() => nav(opt.page)}
              className="flex items-center gap-4 px-4 py-4"
              style={{ background: '#111111', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: '20px', transform: pressed === i ? 'scale(0.97)' : 'scale(1)', transition: 'transform 0.15s cubic-bezier(0.22,1,0.36,1)', textAlign: 'left' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `${opt.accent}14`, border: `1px solid ${opt.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: opt.accent, flexShrink: 0 }}>{opt.icon}</div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '2px' }}>{opt.label}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, lineHeight: 1.45 }}>{opt.sub}</p>
              </div>
              <ChevronRightIcon />
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ display: 'block', width: '100%', marginTop: '18px', paddingTop: '12px', fontFamily: 'Inter, sans-serif', fontSize: '15px', color: LABEL }}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Global TabBar ────────────────────────────────────────────────────────────
function TabBar({ active, go }: { active: 'feed' | 'explore' | 'messages' | 'profile'; go: (p: Page) => void }) {
  const [pressed, setPressed] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0)
  const INACT = 'rgba(255,255,255,0.42)'

  const renderTab = (key: string, label: string, page: Page, icon: React.ReactNode) => {
    const isActive = active === key
    const isPressed = pressed === key
    return (
      <button key={key}
        onMouseDown={() => setPressed(key)} onMouseUp={() => setPressed(null)} onMouseLeave={() => setPressed(null)}
        onTouchStart={() => setPressed(key)} onTouchEnd={() => setPressed(null)}
        onClick={() => go(page)}
        className="flex flex-col items-center gap-1"
        style={{ color: isActive ? G : INACT, minWidth: '52px', transform: isPressed ? 'scale(0.88)' : 'scale(1)', transition: 'transform 0.15s cubic-bezier(0.22,1,0.36,1)', flexShrink: 0 }}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          {icon}
          {key === 'messages' && totalUnread > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-7px', minWidth: '16px', height: '16px', borderRadius: '8px', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit, sans-serif', fontSize: '9px', fontWeight: 800, color: DARK, paddingLeft: '3px', paddingRight: '3px', border: '1.5px solid #050505' }}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </span>
        <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: isActive ? 600 : 400 }}>{label}</span>
      </button>
    )
  }

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0" style={{ background: 'rgba(12,12,12,0.97)', borderTop: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}>
        <div className="flex items-end justify-around px-2" style={{ paddingBottom: '28px', paddingTop: '10px' }}>
          {renderTab('feed', 'Home', 'feed', <IconHome fill={active === 'feed'} />)}
          {renderTab('explore', 'Explore', 'explore', <IconCompass fill={active === 'explore'} />)}

          {/* Floating Create FAB */}
          <button
            onMouseDown={() => setPressed('create')} onMouseUp={() => setPressed(null)} onMouseLeave={() => setPressed(null)}
            onTouchStart={() => setPressed('create')} onTouchEnd={() => setPressed(null)}
            onClick={() => setShowCreate(true)}
            style={{ width: '52px', height: '52px', borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: '6px', transform: pressed === 'create' ? 'scale(0.88)' : 'scale(1)', transition: 'transform 0.15s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 4px 20px rgba(130,219,126,0.35), 0 2px 8px rgba(0,0,0,0.5)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>

          {renderTab('messages', 'Messages', 'messages', <IconMsg fill={active === 'messages'} />)}
          {renderTab('profile', 'Profile', 'profile', <IconProfile fill={active === 'profile'} />)}
        </div>
      </div>

      {showCreate && <CreateSheet onClose={() => setShowCreate(false)} go={go} />}
    </>
  )
}

// ─── FEED DATA & TYPES ───────────────────────────────────────────────────────
type FeedPost = {
  id: number
  authorName: string; authorHandle: string; authorAvatarId: string
  verified?: boolean
  isOwn?: boolean; dist?: string; area?: string; time: string
  text?: string; type: 'text' | 'image' | 'marketplace' | 'event' | 'place'
  photoId?: string; likes: number; commentCount: number
  listing?: { title: string; price: string; cond: string; photoId: string }
  event?: { title: string; date: string; time: string; free: boolean; price?: string; photoId: string; area: string; soldOut?: boolean }
  place?: { name: string; category: string; photoId: string; rating: number; open: boolean }
}

const FEED_DATA: FeedPost[] = [
  { id: 1, authorName: 'Amina Bello', authorHandle: '@amina_vi', authorAvatarId: '1563132337-f159f484226c', verified: true, isOwn: true, area: 'Victoria Island', time: 'Just now', type: 'text', text: "Good morning Victoria Island! ☀️ Headed to the Adeola Odeku farmers market — anyone want me to pick up tomatoes or peppers while I'm there? Drop a comment!", likes: 0, commentCount: 0 },
  { id: 2, authorName: 'Chidi Okeke', authorHandle: '@chidi_vi', authorAvatarId: '1649502913092-fb7f0e8fc632', dist: '0.6 km', area: 'Victoria Island', time: '8m ago', type: 'text', text: 'Does anyone know a reliable plumber around VI or Ikoyi? My kitchen pipe has been leaking since yesterday evening 🔧 Will pay well. Please DM or drop a number in the comments. Urgent!', likes: 3, commentCount: 7 },
  { id: 3, authorName: 'Ngozi Adeyemi', authorHandle: '@ngozi_lekki', authorAvatarId: '1758525225816-8dd1901ef6ec', verified: true, dist: '1.8 km', area: 'Lekki Phase 1', time: '22m ago', type: 'image', photoId: '1579998120708-682dd8a5624f', text: 'Fresh chin-chin and puff-puff from my home kitchen this morning. First batch of the week — smells incredible right now 🍞 DM to order, delivery within Lekki only today.', likes: 31, commentCount: 14 },
  { id: 4, authorName: 'Emeka Obi', authorHandle: '@emeka_vi', authorAvatarId: '1649502913092-fb7f0e8fc632', dist: '0.4 km', area: 'Victoria Island', time: '45m ago', type: 'marketplace', text: "Finally listing this — barely used it twice. Hate to let it go but I'm moving. Serious buyers only 🙏", likes: 12, commentCount: 4, listing: { title: 'Nike Air Max 90', price: '₦85,000', cond: 'Like New', photoId: '1654762550505-7c58277e0fac' } },
  { id: 5, authorName: 'Lagos Culture Co.', authorHandle: '@lagos_culture', authorAvatarId: '1673280401347-309363111070', verified: true, dist: '1.2 km', area: 'Lekki', time: '1h ago', type: 'event', text: "We're bringing music back to the neighbourhood this Sunday. Come enjoy live sets, local food, and great vibes at Lekki Phase 1. Tag someone who needs to be there! 🎶", likes: 58, commentCount: 22, event: { title: 'Lekki Music Festival', date: 'Sun, Aug 9', time: '2:00 PM', free: false, price: '₦5,000', photoId: '1673280401347-309363111070', area: 'Lekki' } },
  { id: 6, authorName: 'Tunde Fashola', authorHandle: '@tunde_vi', authorAvatarId: '1572816225927-d08fb138f2b2', verified: true, dist: '0.8 km', area: 'Victoria Island', time: '2h ago', type: 'text', text: "The water supply is back on in most of VI 💧 For those still affected on Adeola Odeku side — I was told the engineers are still working on the secondary line. Should be fully restored by this evening.", likes: 47, commentCount: 19 },
  { id: 7, authorName: 'Adaeze Nwosu', authorHandle: '@ada_vi', authorAvatarId: '1758525225816-8dd1901ef6ec', dist: '0.3 km', area: 'Victoria Island', time: '3h ago', type: 'place', text: "Found my new favourite spot in VI. Best jollof rice I have had outside my mum's kitchen, and the ambience is everything. Highly recommend for a weekday lunch!", likes: 24, commentCount: 11, place: { name: "Mama Titi's Kitchen", category: 'Restaurant · Victoria Island', photoId: '1579998120708-682dd8a5624f', rating: 4.9, open: true } },
  { id: 8, authorName: 'Babajide Adewale', authorHandle: '@babs_lekki', authorAvatarId: '1654762550505-7c58277e0fac', dist: '1.9 km', area: 'Lekki Phase 1', time: '4h ago', type: 'image', photoId: '1752622176337-5d9315e2df6e', text: 'Morning run along the Lekki coastline 🌊 Honestly the best way to start a day. Who else runs this route?', likes: 89, commentCount: 33 },
]

const FEED_COMMENTS = [
  { id: 1, name: 'Emeka Obi', handle: '@emeka_vi', avatarId: '1649502913092-fb7f0e8fc632', text: 'On it! Sharing this with the VI WhatsApp group right now 💪', time: '5m ago', likes: 4 },
  { id: 2, name: 'Ngozi Adeyemi', handle: '@ngozi_lekki', avatarId: '1758525225816-8dd1901ef6ec', text: 'Great initiative! This is exactly what YRDLY is for 🙌', time: '12m ago', likes: 2 },
  { id: 3, name: 'Tunde Fashola', handle: '@tunde_vi', avatarId: '1572816225927-d08fb138f2b2', text: "I'll send a contact for a reliable plumber who did my place last month. Very affordable.", time: '18m ago', likes: 7 },
]

// ─── FEED COMPONENTS ──────────────────────────────────────────────────────────
function CommentsSheet({ post, onClose, go }: { post: FeedPost; onClose: () => void; go?: (p: Page) => void }) {
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [items, setItems] = useState(FEED_COMMENTS.map(c => ({ ...c, liked: false })))

  const send = () => {
    if (!comment.trim()) return
    setItems(cs => [...cs, { id: Date.now(), name: 'Amina Bello', handle: '@amina_vi', avatarId: '1563132337-f159f484226c', text: replyTo ? `@${replyTo} ${comment}` : comment, time: 'now', likes: 0, liked: false }])
    setComment('')
    setReplyTo(null)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} onClick={onClose}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#1a1a1a', borderRadius: '24px 24px 0 0', maxHeight: '75%', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Handle + title */}
        <div style={{ flexShrink: 0, padding: '10px 16px 0' }}>
          <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 14px' }} />
          <div className="flex items-center justify-center" style={{ position: 'relative', marginBottom: '12px' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Comments</p>
            <button onClick={onClose} style={{ position: 'absolute', right: 0, color: 'rgba(255,255,255,0.5)', padding: '4px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginLeft: '-16px', marginRight: '-16px' }} />
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 16px 8px' }}>
          {items.map((c, i) => (
            <div key={c.id} className="flex gap-3" style={{ marginBottom: '20px' }}>
              <button onClick={() => go && (ACTIVE_PROFILE_ID = 1, go('public-profile'))} style={{ flexShrink: 0, marginTop: '2px' }}>
                <img src={`https://images.unsplash.com/photo-${c.avatarId}?w=80&h=80&fit=crop&auto=format&q=70`} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
              </button>
              <div className="flex-1">
                {/* Name + text inline like Instagram */}
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff', lineHeight: 1.5 }}>
                  <button onClick={() => go && (ACTIVE_PROFILE_ID = 1, go('public-profile'))} style={{ fontWeight: 700, marginRight: '6px', display: 'inline', color: '#fff', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>{c.name}</button>
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{c.text}</span>
                </p>
                {/* Meta row */}
                <div className="flex items-center gap-4 mt-1.5">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{c.time}</span>
                  {c.likes > 0 && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{c.likes} likes</span>}
                  <button onClick={() => setReplyTo(c.name)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Reply</button>
                </div>
              </div>
              {/* Heart */}
              <button onClick={() => setItems(cs => cs.map((cc, ci) => ci === i ? { ...cc, liked: !cc.liked, likes: cc.liked ? cc.likes - 1 : cc.likes + 1 } : cc))}
                style={{ flexShrink: 0, padding: '4px', marginTop: '2px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={c.liked ? '#ef4444' : 'none'} stroke={c.liked ? '#ef4444' : 'rgba(255,255,255,0.35)'} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {replyTo && (
            <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Replying to <span style={{ color: '#fff', fontWeight: 600 }}>{replyTo}</span></span>
              <button onClick={() => setReplyTo(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          <div className="flex items-center gap-3" style={{ padding: '10px 16px 32px' }}>
            <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=80&h=80&fit=crop&auto=format" alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div className="flex-1 flex items-center" style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '22px', paddingLeft: '14px', paddingRight: comment.trim() ? '8px' : '14px', height: '38px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={replyTo ? `Reply to ${replyTo}…` : 'Add a comment…'}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
              {comment.trim() && (
                <button onClick={send} style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: G, padding: '4px 6px', flexShrink: 0 }}>Post</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostOptionsSheet({ isOwn, onClose }: { isOwn: boolean; onClose: () => void }) {
  const ownOpts = [
    { icon: <PenIcon />, label: 'Edit Post', danger: false },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>, label: 'Delete Post', danger: true },
  ]
  const otherOpts = [
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>, label: 'Save Post', danger: false },
    { icon: <ShareIcon />, label: 'Share Post', danger: false },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>, label: 'Hide Post', danger: false },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>, label: 'Report Post', danger: true },
    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>, label: 'Block User', danger: true },
  ]
  const opts = isOwn ? ownOpts : otherOpts
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderRadius: '28px 28px 0 0', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px 8px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 16px' }} />
        </div>
        <div style={{ background: '#111', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', margin: '0 16px', overflow: 'hidden' }}>
          {opts.map((opt, i) => (
            <div key={opt.label}>
              <button onClick={onClose} className="w-full flex items-center gap-4 px-5 py-4">
                <span style={{ color: opt.danger ? '#FF5C5C' : G }}>{opt.icon}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: opt.danger ? '#FF5C5C' : '#fff', fontWeight: 500 }}>{opt.label}</span>
              </button>
              {i < opts.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '20px' }} />}
            </div>
          ))}
        </div>
        <div style={{ height: '36px' }} />
      </div>
    </div>
  )
}

function FeedPostCard({ post, go, onComment }: { post: FeedPost; go: (p: Page) => void; onComment: () => void }) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const TRUNCATE_AT = 180

  return (
    <div style={{ position: 'relative' }}>
      <div className="flex flex-col" style={{ paddingTop: '18px', paddingBottom: '4px', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        {/* Author header */}
        <div className="flex items-start justify-between px-5 mb-3">
          <button className="flex items-start gap-3" onClick={() => post.isOwn ? go('profile') : (ACTIVE_PROFILE_ID = 1, go('public-profile'))}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${post.isOwn ? G : 'rgba(255,255,255,0.1)'}` }}>
              <img src={`https://images.unsplash.com/photo-${post.authorAvatarId}?w=100&h=100&fit=crop&auto=format&q=70`} alt={post.authorName} className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{post.authorName}</span>
                {post.verified && <VerifiedBadge size={15} />}
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{post.authorHandle}</span>
                {post.dist && <><span style={{ color: LABEL, fontSize: '10px' }}>·</span><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{post.dist}</span></>}
                <span style={{ color: LABEL, fontSize: '10px' }}>·</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{post.time}</span>
              </div>
            </div>
          </button>
          <button onClick={() => setShowOptions(true)} style={{ color: LABEL, padding: '4px', marginTop: '2px' }}><DotsIcon /></button>
        </div>

        {/* Text content */}
        {post.text && (
          <div style={{ paddingLeft: '20px', paddingRight: '20px', marginBottom: (post.photoId || post.listing || post.event || post.place) ? '14px' : '0' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>
              {post.text.length > TRUNCATE_AT && !expanded ? post.text.slice(0, TRUNCATE_AT) + '…' : post.text}
            </p>
            {post.text.length > TRUNCATE_AT && (
              <button onClick={() => setExpanded(e => !e)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: MUTED, marginTop: '4px' }}>
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Image media */}
        {post.type === 'image' && post.photoId && (
          <div style={{ marginLeft: '20px', marginRight: '20px', borderRadius: '16px', overflow: 'hidden', aspectRatio: '4/3' }}>
            <img src={`https://images.unsplash.com/photo-${post.photoId}?w=700&h=525&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Marketplace embed */}
        {post.type === 'marketplace' && post.listing && (
          <button onClick={() => { ACTIVE_ITEM_ID = 1; go('item-detail') }} style={{ marginLeft: '20px', marginRight: '20px', borderRadius: '16px', overflow: 'hidden', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', textAlign: 'left' }}>
            <div style={{ width: '80px', height: '80px', flexShrink: 0, overflow: 'hidden' }}>
              <img src={`https://images.unsplash.com/photo-${post.listing.photoId}?w=160&h=160&fit=crop&auto=format&q=70`} alt="" className="w-full h-full object-cover" />
            </div>
            <div style={{ flex: 1, padding: '12px 14px' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '3px' }}>{post.listing.title}</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: G, marginBottom: '3px' }}>{post.listing.price}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{post.listing.cond}</p>
            </div>
            <div className="flex items-center pr-3">
              <div style={{ height: '30px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '15px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: G }}>View</span>
              </div>
            </div>
          </button>
        )}

        {/* Event embed */}
        {post.type === 'event' && post.event && (
          <button onClick={() => { ACTIVE_EVENT_ID = 1; go('event-detail') }} style={{ marginLeft: '20px', marginRight: '20px', borderRadius: '16px', overflow: 'hidden', background: '#111', border: `1px solid ${GLASS_BORDER}`, textAlign: 'left' }}>
            <div style={{ position: 'relative', height: '110px' }}>
              <img src={`https://images.unsplash.com/photo-${post.event.photoId}?w=700&h=300&fit=crop&auto=format&q=75`} alt="" className="w-full h-full object-cover" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(5,5,5,0.8))' }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{post.event.title}</p>
                <div style={{ padding: '3px 8px', borderRadius: '7px', background: post.event.free ? 'rgba(130,219,126,0.2)' : 'rgba(255,255,255,0.12)', border: `1px solid ${post.event.free ? 'rgba(130,219,126,0.3)' : 'rgba(255,255,255,0.15)'}` }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: post.event.free ? G : '#fff' }}>{post.event.free ? 'FREE' : post.event.price}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{post.event.date} · {post.event.time}</span>
                <div className="flex items-center gap-1"><PinSmIcon /><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{post.event.area}</span></div>
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: G }}>View →</span>
            </div>
          </button>
        )}

        {/* Place embed */}
        {post.type === 'place' && post.place && (
          <button onClick={() => { ACTIVE_PLACE_ID = 1; go('place-detail') }} style={{ marginLeft: '20px', marginRight: '20px', borderRadius: '16px', overflow: 'hidden', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', textAlign: 'left' }}>
            <div style={{ width: '80px', height: '80px', flexShrink: 0, overflow: 'hidden' }}>
              <img src={`https://images.unsplash.com/photo-${post.place.photoId}?w=160&h=160&fit=crop&auto=format&q=70`} alt="" className="w-full h-full object-cover" />
            </div>
            <div style={{ flex: 1, padding: '12px 14px' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '3px' }}>{post.place.name}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '5px' }}>{post.place.category}</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1"><StarFillIcon /><span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: '#fff' }}>{post.place.rating}</span></div>
                <div style={{ padding: '2px 7px', borderRadius: '5px', background: post.place.open ? 'rgba(130,219,126,0.1)' : 'rgba(255,92,92,0.1)', border: `1px solid ${post.place.open ? 'rgba(130,219,126,0.2)' : 'rgba(255,92,92,0.2)'}` }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: post.place.open ? G : '#FF5C5C' }}>{post.place.open ? 'OPEN' : 'CLOSED'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center pr-3">
              <div style={{ height: '30px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '15px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: G }}>View</span>
              </div>
            </div>
          </button>
        )}

        {/* Action toolbar */}
        <div className="flex items-center px-4 pt-3 pb-1">
          <button onClick={() => setLiked(l => !l)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ color: liked ? G : LABEL, transition: 'all 0.15s', background: liked ? 'rgba(130,219,126,0.08)' : 'transparent' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? G : 'none'} stroke={liked ? G : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: liked ? 700 : 400 }}>{post.likes + (liked ? 1 : 0)}</span>
          </button>
          <button onClick={onComment} className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ color: LABEL }}>
            <CommentIcon />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>{post.commentCount}</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ color: LABEL }}>
            <ShareIcon />
          </button>
          <button onClick={() => setSaved(s => !s)} className="ml-auto px-3 py-2 rounded-xl" style={{ color: saved ? G : LABEL, transition: 'all 0.15s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? G : 'none'} stroke={saved ? G : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>

      {showOptions && <PostOptionsSheet isOwn={!!post.isOwn} onClose={() => setShowOptions(false)} />}
    </div>
  )
}

// ─── NOTIFICATIONS DATA & SHEET ──────────────────────────────────────────────
type Notif = { id: number; type: 'like' | 'comment' | 'connect' | 'marketplace' | 'event' | 'system' | 'alert'; avatarId?: string; title: string; body: string; time: string; read: boolean; cta?: string }

const NOTIFS_DATA: Notif[] = [
  { id: 1, type: 'alert', title: 'Community Alert', body: 'Water supply disruption expected in parts of VI tonight from 10 PM. Store water ahead of time.', time: 'Just now', read: false },
  { id: 2, type: 'connect', avatarId: '1649502913092-fb7f0e8fc632', title: 'Emeka Obi wants to connect', body: 'He lives 0.4 km away in Victoria Island.', time: '5m ago', read: false, cta: 'Accept' },
  { id: 3, type: 'like', avatarId: '1758525225816-8dd1901ef6ec', title: 'Ngozi Adeyemi liked your post', body: '"Good morning Victoria Island! ☀️ Headed to the farmers market…"', time: '12m ago', read: false },
  { id: 4, type: 'comment', avatarId: '1572816225927-d08fb138f2b2', title: 'Tunde Fashola commented', body: '"I\'ll send you a contact for a reliable plumber who did my place last month."', time: '18m ago', read: false },
  { id: 5, type: 'marketplace', avatarId: '1563132337-f159f484226c', title: 'New message from Amaka Johnson', body: 'About your listing: Solid Oak Dining Table · ₦95,000', time: '34m ago', read: false, cta: 'Reply' },
  { id: 6, type: 'like', avatarId: '1654762550505-7c58277e0fac', title: 'Babajide Adewale liked your post', body: '"Good morning Victoria Island! ☀️ Headed to the farmers market…"', time: '1h ago', read: true },
  { id: 7, type: 'event', title: 'Event reminder: VI Community Cleanup', body: 'Tomorrow at 7:00 AM · Victoria Island. You\'re going.', time: '2h ago', read: true, cta: 'View' },
  { id: 8, type: 'connect', avatarId: '1673280401347-309363111070', title: 'Adaeze Nwosu accepted your connection', body: 'You\'re now connected with Adaeze. Say hi! 👋', time: '3h ago', read: true },
  { id: 9, type: 'comment', avatarId: '1649502913092-fb7f0e8fc632', title: 'Emeka Obi replied to your comment', body: '"Haha! The suya spot on Ajose is absolutely 🔥🔥"', time: '5h ago', read: true },
  { id: 10, type: 'system', title: 'Your neighbourhood is growing', body: '12 new neighbours joined Victoria Island this week. Explore who\'s nearby.', time: 'Yesterday', read: true, cta: 'Explore' },
  { id: 11, type: 'marketplace', avatarId: '1758525225816-8dd1901ef6ec', title: 'Ngozi Adeyemi viewed your listing', body: 'Nike Air Max 90 · ₦85,000 — 24 views so far.', time: 'Yesterday', read: true },
  { id: 12, type: 'like', avatarId: '1572816225927-d08fb138f2b2', title: 'Tunde Fashola and 8 others liked your post', body: '"The water supply is back on in most of VI 💧…"', time: 'Mon', read: true },
]

function NotificationsSheet({ onClose, goAlerts }: { onClose: () => void; goAlerts?: () => void }) {
  const [notifs, setNotifs] = useState(NOTIFS_DATA)
  const [activeFilter, setActiveFilter] = useState('All')
  const unreadCount = notifs.filter(n => !n.read).length
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })))
  const activeAlerts = ALERTS_DATA.filter(a => a.status === 'active')

  const typeIcon = (type: Notif['type']) => {
    const sz = { width: '16px', height: '16px' }
    switch (type) {
      case 'like': return <svg {...sz} viewBox="0 0 24 24" fill={G} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      case 'comment': return <svg {...sz} viewBox="0 0 24 24" fill="none" stroke="#82B4DB" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      case 'connect': return <svg {...sz} viewBox="0 0 24 24" fill="none" stroke="#FFB648" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      case 'marketplace': return <svg {...sz} viewBox="0 0 24 24" fill="none" stroke="#FFB648" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      case 'event': return <svg {...sz} viewBox="0 0 24 24" fill="none" stroke="#DB82C4" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
      case 'alert': return <svg {...sz} viewBox="0 0 24 24" fill="none" stroke="#FF5C5C" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      default: return <svg {...sz} viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    }
  }

  const iconBg = (type: Notif['type']) => {
    switch (type) {
      case 'like': return 'rgba(130,219,126,0.12)'
      case 'comment': return 'rgba(130,180,219,0.12)'
      case 'connect': return 'rgba(255,182,72,0.12)'
      case 'marketplace': return 'rgba(255,182,72,0.12)'
      case 'event': return 'rgba(219,130,196,0.12)'
      case 'alert': return 'rgba(255,92,92,0.12)'
      default: return 'rgba(255,255,255,0.06)'
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60, backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#050505', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <StatusBar />
        {/* Header */}
        <div className="flex items-center justify-between px-5 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>Notifications</h1>
            {unreadCount > 0 && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '2px' }}>{unreadCount} unread</p>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: MUTED, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500 }}>Mark all read</button>
            )}
            <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 px-5 flex-shrink-0 mb-3 pb-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['All', 'Alerts', 'Community', 'Unread', 'Marketplace', 'Events'].map((f) => {
            const isActive = activeFilter === f
            const isAlerts = f === 'Alerts'
            const isCommunity = f === 'Community'
            const accentColor = isAlerts ? '#EF4444' : isCommunity ? '#FFB74D' : G
            const communityAlerts = ALERTS_DATA.filter(a => a.type === 'COMMUNITY INFO' || a.type === 'AMBER ALERT')
            const hasDot = (isAlerts && activeAlerts.filter(a => a.type === 'SAFETY ALERT').length > 0 && !isActive) ||
                           (isCommunity && communityAlerts.some(a => a.status === 'active') && !isActive)
            return (
              <button key={f} onClick={() => setActiveFilter(f)} style={{ height: '30px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '15px', flexShrink: 0, background: isActive ? accentColor : 'rgba(255,255,255,0.05)', border: `1px solid ${isActive ? accentColor : GLASS_BORDER}`, display: 'flex', alignItems: 'center', gap: '5px' }}>
                {hasDot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />}
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: isActive ? 700 : 400, color: isActive ? ((isAlerts || isCommunity) ? '#fff' : DARK) : LABEL }}>{f}</span>
              </button>
            )
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {/* Safety alerts section (shown in All and Alerts tabs) */}
          {(activeFilter === 'All' || activeFilter === 'Alerts' || activeFilter === 'Community') && (() => {
            const communityAlerts = ALERTS_DATA.filter(a => a.type === 'COMMUNITY INFO' || a.type === 'AMBER ALERT')
            const safetyAlerts = activeAlerts.filter(a => a.type === 'SAFETY ALERT')
            const showAlerts = activeFilter === 'All' ? activeAlerts
              : activeFilter === 'Alerts' ? safetyAlerts
              : communityAlerts
            if (showAlerts.length === 0) return (
              <div className="flex flex-col items-center justify-center" style={{ padding: '60px 32px', gap: '12px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: MUTED, textAlign: 'center' }}>No alerts right now</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, textAlign: 'center' }}>Your neighbourhood is all clear.</p>
              </div>
            )
            return (
              <div>
                {activeFilter === 'All' && (
                  <div className="flex items-center justify-between px-5 py-2">
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Active Alerts</span>
                    {goAlerts && <button onClick={goAlerts} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: G }}>See all</button>}
                  </div>
                )}
                {showAlerts.map(alert => {
                  const sc = SEVERITY_COLORS[alert.severity]
                  return (
                    <div key={alert.id} onClick={() => { ACTIVE_ALERT_ID = alert.id; goAlerts && goAlerts() }} style={{ margin: '0 16px 10px', padding: '14px', borderRadius: '16px', background: sc.bg, border: `1px solid ${sc.border}`, cursor: 'pointer' }}>
                      <div className="flex items-start gap-3">
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${sc.icon}18`, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={sc.icon} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: sc.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{alert.type}</span>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>{alert.time}</span>
                          </div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff', marginBottom: '3px' }}>{alert.title}</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>{alert.area}</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </div>
                  )
                })}
                {activeFilter === 'All' && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0 8px' }} />}
              </div>
            )
          })()}
          {/* Regular notifications */}
          {activeFilter !== 'Alerts' && activeFilter !== 'Community' && notifs
            .filter(n => {
              if (activeFilter === 'Unread') return !n.read
              if (activeFilter === 'Marketplace') return n.type === 'marketplace'
              if (activeFilter === 'Events') return n.type === 'event'
              return true
            })
            .map((n) => (
            <div key={n.id} onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))} style={{ padding: '14px 20px', background: n.read ? 'transparent' : 'rgba(130,219,126,0.03)', borderBottom: `1px solid rgba(255,255,255,0.04)`, cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              {/* Avatar or icon */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {n.avatarId ? (
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src={`https://images.unsplash.com/photo-${n.avatarId}?w=100&h=100&fit=crop&auto=format&q=70`} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: iconBg(n.type), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {typeIcon(n.type)}
                  </div>
                )}
                {n.avatarId && (
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '18px', height: '18px', borderRadius: '6px', background: iconBg(n.type), border: '2px solid #050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {typeIcon(n.type)}
                  </div>
                )}
                {!n.read && (
                  <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '8px', height: '8px', borderRadius: '50%', background: G, border: '2px solid #050505' }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: n.read ? 400 : 600, color: n.read ? 'rgba(255,255,255,0.72)' : '#fff', lineHeight: 1.45, marginBottom: '3px' }}>
                  <span style={{ fontWeight: n.read ? 500 : 700 }}>{n.title}</span>
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, lineHeight: 1.5, marginBottom: n.cta ? '8px' : '0' }}>{n.body}</p>
                {n.cta && (
                  <div style={{ display: 'inline-flex', height: '28px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '14px', background: n.type === 'alert' ? 'rgba(255,92,92,0.1)' : 'rgba(130,219,126,0.1)', border: `1px solid ${n.type === 'alert' ? 'rgba(255,92,92,0.25)' : 'rgba(130,219,126,0.22)'}`, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: n.type === 'alert' ? '#FF5C5C' : G }}>{n.cta}</span>
                  </div>
                )}
              </div>

              {/* Time */}
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, flexShrink: 0, marginTop: '2px' }}>{n.time}</span>
            </div>
          ))}
          <div style={{ height: '48px' }} />
        </div>
      </div>
    </div>
  )
}

// ─── HOME FEED SCREEN ─────────────────────────────────────────────────────────
function FeedScreen({ go }: { go: (p: Page) => void }) {
  const [showCreate, setShowCreate] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showLocationSheet, setShowLocationSheet] = useState(false)
  const [locationFilter, setLocationFilter] = useState<'nigeria' | 'state' | 'lga' | 'ward'>('lga')
  const [activeCommentPost, setActiveCommentPost] = useState<FeedPost | null>(null)
  const unread = NOTIFS_DATA.filter(n => !n.read).length

  const LOCATION_OPTIONS = [
    { key: 'nigeria' as const, label: 'All Nigeria' },
    { key: 'state' as const, label: 'Lagos State' },
    { key: 'lga' as const, label: 'Eti-Osa' },
    { key: 'ward' as const, label: 'Lekki Phase 1' },
  ]
  const activeLabel = LOCATION_OPTIONS.find(o => o.key === locationFilter)?.label ?? 'Lekki Phase 1'

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Header — YRDLY wordmark | LocationChip | Map + Bell */}
      <div className="flex-shrink-0 flex items-center justify-between px-5" style={{ paddingTop: '54px', paddingBottom: '12px' }}>
        {/* Wordmark */}
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: G, letterSpacing: '-0.5px', flexShrink: 0 }}>YRDLY</p>

        {/* Location chip */}
        <button onClick={() => setShowLocationSheet(true)}
          className="flex items-center gap-1"
          style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', maxWidth: '160px', overflow: 'hidden' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill={G} style={{ flexShrink: 0 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeLabel}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        {/* Right icons */}
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          {/* Map */}
          <button onClick={() => go('map')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </button>
          {/* Bell — opens unified notifications panel */}
          <button onClick={() => setShowNotifs(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <BellIcon />
            {unread > 0 && (
              <div style={{ position: 'absolute', top: '-3px', right: '-6px', minWidth: '18px', height: '18px', borderRadius: '9px', background: '#EF4444', border: '1.5px solid #050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{unread > 99 ? '99+' : unread}</span>
              </div>
            )}
          </button>
          {/* Avatar */}
          <button onClick={() => go('profile')} style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${G}`, flexShrink: 0, padding: 0 }}>
            <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=100&h=100&fit=crop&auto=format" alt="Amina" className="w-full h-full object-cover" />
          </button>
        </div>
      </div>

      {/* Location filter sheet */}
      {showLocationSheet && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, backdropFilter: 'blur(6px)' }} onClick={() => setShowLocationSheet(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#111', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.09)', padding: '24px 24px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', textAlign: 'center', marginBottom: '20px' }}>View Area</p>
            {LOCATION_OPTIONS.map((opt, i) => (
              <button key={opt.key} onClick={() => { setLocationFilter(opt.key); setShowLocationSheet(false) }}
                className="w-full flex items-center justify-between"
                style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: i < LOCATION_OPTIONS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#fff' }}>{opt.label}</span>
                {locationFilter === opt.key && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                )}
              </button>
            ))}
            <button onClick={() => setShowLocationSheet(false)}
              style={{ width: '100%', marginTop: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#fff' }}>
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* Quick post box */}
      <div className="mx-5 mb-3 flex-shrink-0">
        <button onClick={() => setShowCreate(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px', textAlign: 'left' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${G}` }}>
            <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=80&h=80&fit=crop&auto=format" alt="" className="w-full h-full object-cover" />
          </div>
          <span style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.28)' }}>{"What's happening in your neighbourhood?"}</span>
          <div style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', background: G, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: DARK }}>Post</span>
          </div>
        </button>
      </div>

      {/* Safety alert banner */}
      <div className="mx-5 mb-3 flex-shrink-0">
        <button onClick={() => { ACTIVE_ALERT_ID = 1; go('alert-detail') }} className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
          style={{ background: 'rgba(230,81,0,0.08)', border: '1px solid rgba(230,81,0,0.28)', borderRadius: '18px', backdropFilter: 'blur(12px)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB74D" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px', color: '#FFB74D', letterSpacing: '0.05em' }}>SAFETY ALERT</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>· Lekki Phase 1 · 1h ago</span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#fff', lineHeight: 1.45 }}>Road closure at Admiralty Way due to flooding. Avoid the area until further notice.</p>
          </div>
          <div role="button" tabIndex={0} onClick={e => e.stopPropagation()} onKeyDown={e => e.key === 'Enter' && e.stopPropagation()} style={{ color: LABEL, flexShrink: 0, marginTop: '1px', padding: '2px', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto pb-28">
        {FEED_DATA.map(post => (
          <FeedPostCard key={post.id} post={post} go={go} onComment={() => setActiveCommentPost(post)} />
        ))}
      </div>

      <TabBar active="feed" go={go} />

      {showCreate && <CreateSheet onClose={() => setShowCreate(false)} go={go} />}
      {showNotifs && <NotificationsSheet onClose={() => setShowNotifs(false)} goAlerts={() => { setShowNotifs(false); go('alerts') }} />}
      {activeCommentPost && <CommentsSheet post={activeCommentPost} onClose={() => setActiveCommentPost(null)} go={go} />}
    </div>
  )
}

// ─── Shared detail screen header ─────────────────────────────────────────────
function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-4 px-5 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '20px' }}>
      <button onClick={onBack} style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#111111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
        <ChevronLeftIcon />
      </button>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>{title}</h1>
    </div>
  )
}

// ─── Settings primitives ──────────────────────────────────────────────────────
function SettingRow({ icon, label, sub, value, danger, toggle, toggled, onToggle, onPress, chevron = true }: { icon: React.ReactNode; label: string; sub?: string; value?: string; danger?: boolean; toggle?: boolean; toggled?: boolean; onToggle?: () => void; onPress?: () => void; chevron?: boolean }) {
  return (
    <button onClick={toggle ? onToggle : onPress} className="w-full flex items-center gap-4 px-5" style={{ paddingTop: sub ? '14px' : '16px', paddingBottom: sub ? '14px' : '16px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: danger ? 'rgba(255,92,92,0.1)' : 'rgba(130,219,126,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: danger ? '#FF5C5C' : G }}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 500, color: danger ? '#FF5C5C' : '#fff', lineHeight: 1.3 }}>{label}</p>
        {sub && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '2px', lineHeight: 1.4 }}>{sub}</p>}
      </div>
      {value && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, flexShrink: 0 }}>{value}</span>}
      {toggle && (
        <div style={{ width: '44px', height: '26px', borderRadius: '99px', background: toggled ? G : 'rgba(255,255,255,0.1)', position: 'relative', flexShrink: 0, transition: 'background 0.25s' }}>
          <div style={{ position: 'absolute', top: '3px', left: toggled ? 'calc(100% - 23px)' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        </div>
      )}
      {chevron && !toggle && <ChevronRightIcon />}
    </button>
  )
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col mb-5">
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.12em', paddingLeft: '4px', paddingBottom: '8px', textTransform: 'uppercase' }}>{title}</span>
      <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function SettingDivider() {
  return <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '68px' }} />
}

// ─── 14. USER PROFILE ─────────────────────────────────────────────────────────
const GRID_PHOTOS = [
  '1673280401347-309363111070',
  '1579998120708-682dd8a5624f',
  '1758525225816-8dd1901ef6ec',
  '1654762550505-7c58277e0fac',
  '1572816225927-d08fb138f2b2',
  '1649502913092-fb7f0e8fc632',
]

function ProfileScreen({ go }: { go: (p: Page) => void }) {
  const [activeTab, setActiveTab] = useState(0)
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Nav bar */}
      <div className="flex items-center justify-between px-5 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '8px' }}>
        <div style={{ width: '38px' }} />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>Profile</span>
        <button onClick={() => go('settings')} style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#111111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
          <SettingsIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Identity — no cover, social-feed style */}
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar with dashed green ring */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', padding: '3px', background: `conic-gradient(${G} 0deg 300deg, transparent 300deg 360deg)`, boxSizing: 'border-box' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#050505' }}>
                  <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=200&h=200&fit=crop&auto=format" alt="Amina Bello" className="w-full h-full object-cover" />
                </div>
              </div>
              {/* Camera badge */}
              <div style={{ position: 'absolute', bottom: '0', right: '0', width: '24px', height: '24px', borderRadius: '50%', background: G, border: '2px solid #050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CameraSmIcon />
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>Amina Bello</h2>
                <VerifiedBadge />
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '6px' }}>@amina_vi</p>
              <div className="flex items-center gap-1.5">
                <PinSmIcon />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>Victoria Island, Lagos</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.65, marginBottom: '16px' }}>Architect & baker in VI. Loving local markets and community cleanups 🌿 Always down for a good suya spot.</p>

          {/* Edit Profile — subtle glass pill */}
          <button onClick={() => go('edit-profile')} style={{ height: '36px', paddingLeft: '20px', paddingRight: '20px', borderRadius: '18px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${GLASS_BORDER}`, color: MUTED, fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>Edit Profile</button>
        </div>

        {/* Stats bar */}
        <div className="flex mx-5 mb-5" style={{ borderTop: `1px solid ${GLASS_BORDER}`, borderBottom: `1px solid ${GLASS_BORDER}`, paddingTop: '16px', paddingBottom: '16px' }}>
          {[{ v: '24', l: 'Posts' }, { v: '142', l: 'Followers' }, { v: '38', l: 'Following' }].map((s, i) => (
            <button key={s.l} className="flex-1 flex flex-col items-center gap-0.5"
              style={{ borderRight: i < 2 ? `1px solid ${GLASS_BORDER}` : 'none' }}
              onClick={() => {
                if (s.l === 'Followers') { ACTIVE_LIST_TYPE = 'followers'; go('followers-list') }
                else if (s.l === 'Following') { ACTIVE_LIST_TYPE = 'following'; go('followers-list') }
              }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>{s.v}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{s.l}</span>
            </button>
          ))}
        </div>

        {/* Quick access 2×2 grid */}
        <div className="px-5 mb-5">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Quick Access</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {([
              { label: 'Community', sub: 'Connections & people', page: 'community' as Page, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { label: 'Tickets', sub: '2 upcoming', page: 'tickets' as Page, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>, badge: '2 upcoming' },
              { label: 'My Events', sub: 'Events you run', page: 'my-events' as Page, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
              { label: 'My Business', sub: 'Business presence', page: 'my-business' as Page, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
            ] as { label: string; sub: string; page: Page; icon: React.ReactNode; badge?: string }[]).map(item => (
              <button key={item.label} onClick={() => go(item.page)}
                className="flex flex-col gap-2 p-4 text-left"
                style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', transition: 'transform 0.15s cubic-bezier(0.22,1,0.36,1)' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G }}>{item.icon}</div>
                <div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '2px' }}>{item.label}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: item.badge ? G : LABEL }}>{item.badge ?? item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Posts / Saved tabs */}
        <div className="px-5">
          <div className="flex gap-6 mb-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
            {['Posts', 'Saved'].map((t, i) => (
              <button key={t} onClick={() => setActiveTab(i)} className="pb-3 relative" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: activeTab === i ? 700 : 500, fontSize: '14px', color: activeTab === i ? '#fff' : LABEL, transition: 'color 0.2s' }}>
                {t}
                {activeTab === i && <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', borderRadius: '99px', background: G }} />}
              </button>
            ))}
          </div>

          {activeTab === 0 && (
            <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {GRID_PHOTOS.map((id, i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#111' }}>
                  <img src={`https://images.unsplash.com/photo-${id}?w=250&h=250&fit=crop&auto=format&q=70`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 1 && (
            <div className="flex flex-col items-center py-14 gap-3">
              <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔖</div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>No saved posts yet</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, textAlign: 'center', maxWidth: '220px', lineHeight: 1.55 }}>Bookmark posts from your neighbourhood to find them here.</p>
            </div>
          )}
        </div>
      </div>

      <TabBar active="profile" go={go} />
    </div>
  )
}

// ─── 15. SETTINGS ─────────────────────────────────────────────────────────────
function SettingsScreen({ go }: { go: (p: Page) => void }) {
  const [darkMode, setDarkMode] = useState(true)

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Settings" onBack={() => go('profile')} />

      <div className="flex-1 overflow-y-auto px-5 pb-10">

        <SettingSection title="Account & Identity">
          <SettingRow icon={<UserIcon />} label="Edit Profile" sub="Update your name, photo and bio" onPress={() => go('edit-profile')} />
          <SettingDivider />
          <SettingRow icon={<span style={{ fontSize: '15px' }}>🇳🇬</span>} label="Phone Number" sub="+234 801 *** *678 · Verified" onPress={() => {}} />
          <SettingDivider />
          <SettingRow icon={<MailIcon />} label="Email Address" sub="amina@gmail.com" onPress={() => {}} />
        </SettingSection>

        <SettingSection title="Commerce">
          <SettingRow icon={<ShopIcon />} label="Transactions" sub="Track your orders & marketplace activity" onPress={() => go('transactions')} />
          <SettingDivider />
          <SettingRow icon={<WalletIcon />} label="Payouts" sub="Manage your earnings & balances" onPress={() => go('payouts')} />
          <SettingDivider />
          <SettingRow icon={<BankIcon />} label="Bank Account" sub="Manage your linked payout account" onPress={() => go('bank-account')} />
        </SettingSection>

        <SettingSection title="Privacy & Location">
          <SettingRow icon={<LockIcon />} label="Privacy & Discoverability" sub="Manage location sharing and visibility" onPress={() => go('privacy-disc')} />
          <SettingDivider />
          <SettingRow icon={<PinIcon />} label="Location" sub="Your neighbourhood & location alerts" onPress={() => go('location-settings')} />
          <SettingDivider />
          <SettingRow icon={<ShieldIcon />} label="Blocked Users" sub="Manage who can't see or contact you" value="2" onPress={() => {}} />
        </SettingSection>

        <SettingSection title="Preferences">
          <SettingRow icon={<BellIcon />} label="Notifications" sub="Choose what you want to hear" onPress={() => go('notifications-settings')} />
          <SettingDivider />
          <SettingRow icon={<MoonIcon />} label="Dark Mode" sub="Keep it easy on your eyes" toggle toggled={darkMode} onToggle={() => setDarkMode(v => !v)} chevron={false} onPress={() => go('darkmode-settings')} />
        </SettingSection>

        <SettingSection title="Community & Support">
          <SettingRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>} label="Invite Neighbours" sub="8 neighbours joined — invite more" value="Invite" onPress={() => go('invite')} />
          <SettingDivider />
          <SettingRow icon={<BookIcon />} label="Neighbourhood Guidelines" sub="What we stand for in every community" onPress={() => go('guidelines')} />
          <SettingDivider />
          <SettingRow icon={<HelpIcon />} label="Help Center" sub="FAQs, tutorials and getting support" onPress={() => go('help-center')} />
          <SettingDivider />
          <SettingRow icon={<FlagIcon />} label="Report an Issue" sub="Flag a problem or inappropriate content" onPress={() => go('report-issue')} />
        </SettingSection>

        {IS_ADMIN && (
          <div style={{ marginBottom: '24px' }}>
            {/* Admin portal banner */}
            <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.18)', marginBottom: '12px' }}>
              <div className="flex items-center gap-3">
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: G }}>Admin Portal</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>You have administrator privileges</p>
                </div>
                <div style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(130,219,126,0.15)', border: '1px solid rgba(130,219,126,0.25)' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ADMIN</span>
                </div>
              </div>
            </div>
            <SettingSection title="Admin Tools">
              <SettingRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} label="Dispute Resolution" sub="Review and resolve marketplace disputes" onPress={() => go('admin-disputes')} />
              <SettingDivider />
              <SettingRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} label="Safety Alerts" sub="Create and manage community safety alerts" onPress={() => go('create-alert')} />
              <SettingDivider />
              <SettingRow icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>} label="Safety Alerts Feed" sub="View all active and past alerts" onPress={() => go('alerts')} />
            </SettingSection>
          </div>
        )}

        <SettingSection title="Account">
          <SettingRow icon={<LogOutIcon />} label="Sign Out" sub="Log out of your YRDLY account" danger onPress={() => go('splash')} chevron={false} />
          <SettingDivider />
          <SettingRow icon={<TrashIcon />} label="Request Account Deletion" sub="We'll process your request within 30 days" danger onPress={() => {}} chevron={false} />
        </SettingSection>

        <p style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginTop: '4px' }}>YRDLY v1.0.0 · Made with 💚 for Nigerian communities</p>
      </div>
    </div>
  )
}

// ─── 16. TRANSACTIONS ────────────────────────────────────────────────────────
const TX_DATA = {
  purchases: [
    { id: 1, photo: '1579998120708-682dd8a5624f', title: 'Arched Floor Lamp', party: 'From @emeka_vi', amount: '₦45,000', status: 'In Escrow' as const, statusColor: '#FFB648', date: 'Aug 2, 2026' },
    { id: 2, photo: '1673280401347-309363111070', title: 'Vintage Record Player', party: 'From @ngozi.bakes', amount: '₦120,000', status: 'Delivered' as const, statusColor: G, date: 'Jul 28, 2026' },
    { id: 3, photo: '1654762550505-7c58277e0fac', title: 'Sourdough Starter Kit', party: 'From @tolu_fashola', amount: '₦8,500', status: 'Completed' as const, statusColor: G, date: 'Jul 15, 2026' },
    { id: 4, photo: '1758525225816-8dd1901ef6ec', title: 'Handwoven Basket Set', party: 'From @amara_eze_vi', amount: '₦22,000', status: 'Refunded' as const, statusColor: '#FF5C5C', date: 'Jul 3, 2026' },
  ],
  sales: [
    { id: 5, photo: '1523275335684-37898b6baf30', title: 'iPhone 13 Pro Max', party: 'To @kunle_dev', amount: '₦340,000', status: 'Completed' as const, statusColor: G, date: 'Aug 1, 2026' },
    { id: 6, photo: '1585386959984-a4155224a1ad', title: 'Perfume Collection (5pc)', party: 'To @ada_obi', amount: '₦35,000', status: 'In Escrow' as const, statusColor: '#FFB648', date: 'Aug 3, 2026' },
    { id: 7, photo: '1556742049-0cfed4f6a45d', title: 'Nike Running Shoes', party: 'To @bolu_eko', amount: '₦55,000', status: 'Shipped' as const, statusColor: '#CE93D8', date: 'Jul 30, 2026' },
  ],
}
let ACTIVE_ORDER_ID = 1
let ACTIVE_ORDER_ROLE: 'buyer' | 'seller' = 'buyer'
let ACTIVE_POST_ID = 1
let ACTIVE_PROFILE_ID = 1
let ACTIVE_LIST_TYPE: 'followers' | 'following' = 'followers'

function TransactionsScreen({ go }: { go: (p: Page) => void }) {
  const [roleTab, setRoleTab] = useState<'purchases' | 'sales'>('purchases')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'disputed'>('all')

  const rows = TX_DATA[roleTab].filter(tx => {
    if (filter === 'all') return true
    if (filter === 'active') return tx.status === 'In Escrow' || tx.status === 'Shipped'
    if (filter === 'completed') return tx.status === 'Completed' || tx.status === 'Delivered'
    if (filter === 'disputed') return tx.status === 'Refunded'
    return true
  })

  const STATUS_ICONS: Record<string, string> = { 'In Escrow': '🔒', 'Shipped': '📦', 'Delivered': '✅', 'Completed': '✅', 'Refunded': '↩️' }

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Transactions" onBack={() => go('settings')} />

      {/* Role tabs */}
      <div className="flex gap-1 mx-5 mb-3" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '4px' }}>
        {(['purchases', 'sales'] as const).map(t => (
          <button key={t} onClick={() => setRoleTab(t)} className="flex-1 py-2 capitalize"
            style={{ borderRadius: '11px', background: roleTab === t ? '#fff' : 'transparent', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: roleTab === t ? DARK : MUTED, transition: 'all 0.2s' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 px-5 mb-4 flex-shrink-0" style={{ overflowX: 'auto' }}>
        {([['all', 'All'], ['active', 'Active'], ['completed', 'Completed'], ['disputed', 'Disputed']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', background: filter === key ? G : '#111', border: `1px solid ${filter === key ? G : GLASS_BORDER}`, color: filter === key ? DARK : MUTED, fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: filter === key ? 700 : 500, flexShrink: 0, transition: 'all 0.2s' }}>{label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-10">
        {rows.map(tx => (
          <button key={tx.id} onClick={() => { ACTIVE_ORDER_ID = tx.id; ACTIVE_ORDER_ROLE = roleTab === 'purchases' ? 'buyer' : 'seller'; go('order-detail') }}
            className="flex items-center gap-4 px-4 py-4 w-full text-left"
            style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0 }}>
              <img src={`https://images.unsplash.com/photo-${tx.photo}?w=120&h=120&fit=crop&auto=format&q=70`} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '2px' }}>{tx.title}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{tx.party}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginTop: '1px' }}>{tx.date}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{tx.amount}</span>
              <div style={{ padding: '2px 8px', borderRadius: '8px', background: `${tx.statusColor}18`, border: `1px solid ${tx.statusColor}30`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '9px' }}>{STATUS_ICONS[tx.status]}</span>
                <span style={{ fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 700, color: tx.statusColor }}>{tx.status.toUpperCase()}</span>
              </div>
            </div>
          </button>
        ))}
        {rows.length === 0 && (
          <div className="flex flex-col items-center py-14 gap-2">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>No transactions</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>Nothing here yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 17. PAYOUTS ─────────────────────────────────────────────────────────────
const PAYOUT_HISTORY = [
  { id: 'PAY-83920', date: 'Aug 1, 2026', amount: '₦45,000', amtNum: 45000, bank: 'GTBank', acct: '****5678', status: 'Completed' as const, statusColor: G },
  { id: 'PAY-71204', date: 'Jul 18, 2026', amount: '₦120,000', amtNum: 120000, bank: 'GTBank', acct: '****5678', status: 'Completed' as const, statusColor: G },
  { id: 'PAY-60831', date: 'Jul 5, 2026', amount: '₦32,000', amtNum: 32000, bank: 'GTBank', acct: '****5678', status: 'Processing' as const, statusColor: '#64B5F6' },
  { id: 'PAY-55019', date: 'Jun 22, 2026', amount: '₦18,000', amtNum: 18000, bank: 'GTBank', acct: '****5678', status: 'Failed' as const, statusColor: '#ef4444' },
]

function PayoutsScreen({ go }: { go: (p: Page) => void }) {
  const [balanceVisible, setBalanceVisible] = useState(true)

  const STATUS_COLOR: Record<string, string> = { Completed: G, Processing: '#64B5F6', Pending: '#FFB648', Failed: '#ef4444' }

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Payouts" onBack={() => go('settings')} />

      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-5">
        {/* Balance hero card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(130,219,126,0.1) 0%, rgba(130,219,126,0.03) 100%)', border: `1px solid rgba(130,219,126,0.2)`, borderRadius: '28px', padding: '24px 22px 20px' }}>
          <div className="flex items-center justify-between mb-1">
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Available Balance</p>
            <button onClick={() => setBalanceVisible(v => !v)} style={{ color: LABEL }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{balanceVisible ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>}</svg>
            </button>
          </div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '38px', color: '#fff', marginBottom: '18px', letterSpacing: '-1px' }}>
            {balanceVisible ? '₦165,000.00' : '₦•••,•••.••'}
          </p>
          <div className="flex items-center justify-between mb-5">
            {[
              { l: 'Pending Escrow', v: '₦45,000', c: '#FFB648' },
              { l: 'Lifetime Earned', v: '₦330,000', c: G },
            ].map((s, i) => (
              <div key={i} className="flex-1">
                {i > 0 && <div style={{ width: '1px', height: '36px', background: GLASS_BORDER, float: 'left', marginRight: '16px' }} />}
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '3px' }}>{s.l}</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: s.c }}>{balanceVisible ? s.v : '₦•••,•••'}</p>
              </div>
            ))}
          </div>

          {/* Linked bank preview */}
          <div className="flex items-center gap-3 px-4 py-3 mb-4" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: `1px solid rgba(255,255,255,0.07)` }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(130,219,126,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G, flexShrink: 0 }}>
              <BankIcon />
            </div>
            <div className="flex-1">
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff' }}>Guaranty Trust Bank · ****5678</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>Amina Bello</p>
            </div>
            <div style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)' }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: G }}>VERIFIED</span>
            </div>
          </div>

          <button onClick={() => go('withdraw')} style={{ width: '100%', padding: '14px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>Withdraw Funds</button>
        </div>

        {/* Payout history */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Payout History</p>
            <button onClick={() => go('bank-verify')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: G }}>Change Bank</button>
          </div>
          <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px', overflow: 'hidden' }}>
            {PAYOUT_HISTORY.map((p, i) => (
              <div key={p.id}>
                <div className="flex items-center gap-3 px-5 py-4">
                  <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: `${STATUS_COLOR[p.status]}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={STATUS_COLOR[p.status]} strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div className="flex-1">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{p.bank} · {p.acct}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{p.date} · {p.id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{p.amount}</span>
                    <span style={{ fontSize: '10px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: STATUS_COLOR[p.status] }}>{p.status.toUpperCase()}</span>
                  </div>
                </div>
                {i < PAYOUT_HISTORY.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '64px' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 18. BANK ACCOUNT ────────────────────────────────────────────────────────
function BankAccountScreen({ go }: { go: (p: Page) => void }) {
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Bank Account" onBack={() => go('settings')} />
      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-4">
        {/* Active account */}
        <div className="px-5 py-5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px' }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(130,219,126,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G }}><BankIcon /></div>
            <div className="flex-1">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Guaranty Trust Bank</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>**** **** **** 5678</p>
            </div>
            <div style={{ padding: '3px 10px', borderRadius: '8px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)' }}>
              <span style={{ fontSize: '11px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: G }}>ACTIVE</span>
            </div>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>Account holder: <span style={{ color: '#fff', fontWeight: 600 }}>Amina Bello</span></p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
            Verified by Paystack
          </p>
        </div>
        <button onClick={() => go('bank-verify')} style={{ width: '100%', padding: '14px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Change Bank Account</button>
        <button style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ef4444', textAlign: 'center', paddingTop: '4px' }}>Remove Bank Account</button>
      </div>
    </div>
  )
}

// ─── 19. PRIVACY & DISCOVERABILITY ───────────────────────────────────────────
function PrivacyDiscScreen({ go }: { go: (p: Page) => void }) {
  const [search, setSearch] = useState(true)
  const [dms, setDms] = useState(true)
  const [gps, setGps] = useState(false)
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Privacy & Discoverability" onBack={() => go('settings')} />
      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <SettingSection title="Visibility">
          <SettingRow icon={<UserIcon />} label="Show Profile in Local Search" sub="Neighbours can find you by name or handle" toggle toggled={search} onToggle={() => setSearch(v => !v)} chevron={false} />
          <SettingDivider />
          <SettingRow icon={<CommentIcon />} label="Allow Direct Messages" sub="From verified neighbours only" toggle toggled={dms} onToggle={() => setDms(v => !v)} chevron={false} />
        </SettingSection>
        <SettingSection title="Location">
          <SettingRow icon={<GPSIcon />} label="Share Live GPS Location" sub="For proximity feed — never stored" toggle toggled={gps} onToggle={() => setGps(v => !v)} chevron={false} />
        </SettingSection>
        <div className="px-1 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, lineHeight: 1.65 }}>🔒 Your exact address is never visible to other users. YRDLY only shares your general neighbourhood zone (e.g., "Victoria Island") unless you explicitly opt in to GPS sharing above.</p>
        </div>
      </div>
    </div>
  )
}

// ─── 20. LOCATION SETTINGS ───────────────────────────────────────────────────
function LocationSettingsScreen({ go }: { go: (p: Page) => void }) {
  const [radius, setRadius] = useState('3km')
  const radii = ['1km', '3km', '5km', '10km']
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Location" onBack={() => go('settings')} />
      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-5">
        {/* Current neighbourhood */}
        <div className="px-5 py-5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Verified Neighbourhood</p>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(130,219,126,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G }}><PinIcon /></div>
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>Victoria Island</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Eti-Osa LGA, Lagos State</p>
            </div>
            <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '8px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)' }}>
              <span style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 700, color: G }}>VERIFIED</span>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2" style={{ height: '44px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: MUTED, fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
            <GPSIcon /> Refresh GPS Location
          </button>
        </div>

        {/* Proximity radius */}
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Proximity Radius</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '14px', lineHeight: 1.55 }}>Content and neighbours within this distance will appear in your local feed.</p>
          <div className="flex gap-3">
            {radii.map(r => (
              <button key={r} onClick={() => setRadius(r)} style={{ flex: 1, height: '48px', borderRadius: '16px', background: radius === r ? G : '#0f0f0f', border: `1px solid ${radius === r ? G : GLASS_BORDER}`, color: radius === r ? DARK : LABEL, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', transition: 'all 0.2s' }}>{r}</button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: `1px solid ${GLASS_BORDER}` }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, lineHeight: 1.65 }}>📍 Your exact coordinates are never stored or shared. YRDLY uses approximate location to match you with the right neighbourhood community.</p>
        </div>
      </div>
    </div>
  )
}

// ─── 21. NOTIFICATIONS ───────────────────────────────────────────────────────
function NotificationsScreen({ go }: { go: (p: Page) => void }) {
  const [notifs, setNotifs] = useState({ inquiries: true, offers: true, rsvp: true, hostUpdates: false, mentions: true, alerts: true })
  const toggle = (k: keyof typeof notifs) => setNotifs(p => ({ ...p, [k]: !p[k] }))
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Notifications" onBack={() => go('settings')} />
      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <SettingSection title="Marketplace">
          <SettingRow icon={<ShopIcon />} label="Item Inquiries" sub="When someone messages about your listing" toggle toggled={notifs.inquiries} onToggle={() => toggle('inquiries')} chevron={false} />
          <SettingDivider />
          <SettingRow icon={<TagIcon />} label="Offers & Bids" sub="Price offers on your items" toggle toggled={notifs.offers} onToggle={() => toggle('offers')} chevron={false} />
        </SettingSection>
        <SettingSection title="Events">
          <SettingRow icon={<CalendarIcon />} label="RSVP Reminders" sub="Upcoming events you've joined" toggle toggled={notifs.rsvp} onToggle={() => toggle('rsvp')} chevron={false} />
          <SettingDivider />
          <SettingRow icon={<BellIcon />} label="Host Updates" sub="Changes to events you're attending" toggle toggled={notifs.hostUpdates} onToggle={() => toggle('hostUpdates')} chevron={false} />
        </SettingSection>
        <SettingSection title="Community">
          <SettingRow icon={<CommentIcon />} label="Mentions & Replies" sub="When neighbours mention or reply to you" toggle toggled={notifs.mentions} onToggle={() => toggle('mentions')} chevron={false} />
          <SettingDivider />
          <SettingRow icon={<ShieldIcon />} label="Local Emergency Alerts" sub="Safety alerts from your neighbourhood" toggle toggled={notifs.alerts} onToggle={() => toggle('alerts')} chevron={false} />
        </SettingSection>
      </div>
    </div>
  )
}

// ─── 22. DARK MODE ───────────────────────────────────────────────────────────
function DarkModeScreen({ go }: { go: (p: Page) => void }) {
  const [mode, setMode] = useState<'dark' | 'light' | 'system'>('dark')
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Display" onBack={() => go('settings')} />
      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-5">
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.65 }}>Choose how YRDLY looks on your device. The dark theme reduces eye strain and looks great in any lighting.</p>

        {/* Theme cards */}
        <div className="flex flex-col gap-3">
          {[
            { id: 'dark' as const, label: 'Dark', desc: 'Deep black surfaces — recommended', preview: '#050505' },
            { id: 'light' as const, label: 'Light', desc: 'Clean white surfaces', preview: '#F5F5F5' },
            { id: 'system' as const, label: 'System', desc: 'Follows your device setting', preview: 'linear-gradient(135deg, #050505 50%, #F5F5F5 50%)' },
          ].map(t => (
            <button key={t.id} onClick={() => setMode(t.id)} className="flex items-center gap-4 px-5 py-4" style={{ background: mode === t.id ? 'rgba(130,219,126,0.06)' : '#0f0f0f', border: `1.5px solid ${mode === t.id ? G : GLASS_BORDER}`, borderRadius: '20px', transition: 'all 0.2s' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: t.preview, border: `1px solid ${GLASS_BORDER}`, flexShrink: 0 }} />
              <div className="flex-1 text-left">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{t.label}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{t.desc}</p>
              </div>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${mode === t.id ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                {mode === t.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: G }} />}
              </div>
            </button>
          ))}
        </div>

        <PrimaryBtn label="Apply Theme" onClick={() => go('settings')} />
      </div>
    </div>
  )
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
const ic = (d: string, w = '18', extra = '') => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={extra}><path d={d}/></svg>
)
function ArrowRightIcon() { return ic('M5 12h14M13 6l6 6-6 6', '16') }
function HomeIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> }
function MailIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 7 10-7"/></svg> }
function LockIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="3"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function LockSmIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:'1px'}}><rect x="3" y="11" width="18" height="11" rx="3"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> }
function UserIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> }
function AtIcon() { return ic('M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 0c0-2.2 1.8-4 4-4a4 4 0 0 1 4 4v1a2 2 0 0 1-4 0') }
function ChevronLeftIcon() { return ic('m15 18-6-6 6-6', '18') }
function ChevronDownIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg> }
function KeyIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l2 2M13 5l2 2"/></svg> }
function EnvelopeIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 7 10-7"/></svg> }
function EnvelopeSmIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 7 10-7"/></svg> }
function CheckIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> }
function CheckSmIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg> }
function EyeIcon() { return ic('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z') }
function EyeOffIcon() { return ic('M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22') }
function ShieldIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function PinIcon() { return ic('M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z') }
function GPSIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg> }
function CameraIcon() { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> }
function PlusIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> }
function BellIcon() { return ic('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0') }
function MapIcon() { return ic('M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7zm6-3v13m6-10v13', '20') }
function ShopIcon() { return ic('M6 2H18l2 6H4L6 2zm-2 6v14h16V8M9 8v4a3 3 0 0 0 6 0V8', '20') }
function CalendarIcon() { return ic('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', '20') }
function HeartIcon() { return ic('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', '16') }
function CommentIcon() { return ic('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', '16') }
function ShareIcon() { return ic('M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13', '16') }
function DotsIcon() { return ic('M12 5h.01M12 12h.01M12 19h.01', '18') }
function ReplyIcon() { return ic('M9 17l-4-4 4-4M5 13h10a4 4 0 0 1 0 8h-1', '16') }
function PenIcon() { return ic('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', '22') }
function SettingsIcon() { return ic('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm6.93-3a6.98 6.98 0 0 0-.06-.91l1.96-1.53a.47.47 0 0 0 .11-.6l-1.86-3.22a.47.47 0 0 0-.57-.2l-2.31.93a6.96 6.96 0 0 0-1.57-.91l-.35-2.46A.48.48 0 0 0 14 3h-4a.48.48 0 0 0-.47.4l-.35 2.46a6.96 6.96 0 0 0-1.57.91l-2.31-.93a.47.47 0 0 0-.57.2L3.07 9.04a.46.46 0 0 0 .11.6l1.96 1.53A7.07 7.07 0 0 0 5.07 12c0 .31.02.62.07.91L3.18 14.44a.47.47 0 0 0-.11.6l1.86 3.22c.12.21.37.29.57.2l2.31-.93c.49.35 1.01.65 1.57.91l.35 2.46c.06.22.26.4.47.4h4c.21 0 .41-.18.47-.4l.35-2.46a6.96 6.96 0 0 0 1.57-.91l2.31.93c.2.09.45.01.57-.2l1.86-3.22a.47.47 0 0 0-.11-.6l-1.96-1.53z') }
function ChevronRightIcon() { return ic('m9 18 6-6-6-6', '18') }
function PinSmIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg> }
function VerifiedBadge({ size = 20 }: { size?: number } = {}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill={G}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/></svg> }
function VerifiedSmBadge() { return <svg width="18" height="18" viewBox="0 0 24 24" fill={G}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/></svg> }
function WalletIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="M20 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/></svg> }
function BankIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11"/></svg> }
function TagIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg> }
function HashIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></svg> }
function FilterIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg> }
function StarFillIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFB648" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> }
function CameraSmIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg> }
function MoonIcon() { return ic('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z') }
function BookIcon() { return ic('M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z') }
function HelpIcon() { return ic('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01') }
function FlagIcon() { return ic('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7') }
function LogOutIcon() { return ic('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9') }
function TrashIcon() { return ic('M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2') }
function GoogleIcon() { return <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> }
function AppleIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> }

// ─── 23. NEIGHBOURHOOD GUIDELINES ────────────────────────────────────────────
const GUIDELINES = [
  {
    emoji: '🤝',
    title: 'Be a Good Neighbour',
    body: 'Treat every member of the community with the same respect you\'d want in your own home. Disagreements happen — handle them with kindness and good faith.',
  },
  {
    emoji: '🔒',
    title: 'Keep It Real',
    body: 'Use your real identity and neighbourhood location. YRDLY works because our community trusts each other. Fake accounts or misrepresentation violates that trust.',
  },
  {
    emoji: '🛡️',
    title: 'Keep the Neighbourhood Safe',
    body: 'Do not post content that is violent, hateful, abusive, or illegal. This includes discrimination based on ethnicity, religion, gender, or sexual orientation.',
  },
  {
    emoji: '🛒',
    title: 'Honest Marketplace',
    body: 'Only list items you actually own and intend to sell. Accurately describe condition, price, and pickup location. No counterfeit goods, no scams, no bait-and-switch.',
  },
  {
    emoji: '📍',
    title: 'Stay Local',
    body: 'YRDLY is a hyperlocal platform. Posts, listings, and events should be relevant to your neighbourhood. Spam or off-topic commercial promotions will be removed.',
  },
  {
    emoji: '🗣️',
    title: 'Constructive Conversations Only',
    body: 'Political debates, inflammatory opinions, and divisive rhetoric have no place here. Keep conversations focused on building a better neighbourhood together.',
  },
]

function GuidelinesScreen({ go }: { go: (p: Page) => void }) {
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Neighbourhood Guidelines" onBack={() => go('settings')} />

      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-4">
        {/* Hero blurb */}
        <div className="px-5 py-5 mb-1" style={{ background: 'linear-gradient(135deg, rgba(130,219,126,0.09) 0%, rgba(130,219,126,0.02) 100%)', border: '1px solid rgba(130,219,126,0.18)', borderRadius: '24px' }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '6px' }}>Every neighbourhood is shaped by the people in it.</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.65 }}>These guidelines exist to make YRDLY a space where Nigerian communities can thrive — with honesty, respect, and genuine connection at the centre.</p>
        </div>

        {GUIDELINES.map((g, i) => (
          <div key={i} className="px-5 py-5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(130,219,126,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{g.emoji}</div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{g.title}</p>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.7 }}>{g.body}</p>
          </div>
        ))}

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, textAlign: 'center', lineHeight: 1.65, paddingTop: '4px' }}>Violations may result in content removal or account suspension.<br />Last updated August 2026.</p>
      </div>
    </div>
  )
}

// ─── 24. HELP CENTER ──────────────────────────────────────────────────────────
const FAQS = [
  {
    section: 'Getting Started',
    items: [
      { q: 'How do I verify my neighbourhood?', a: 'During onboarding, YRDLY uses your GPS location or a manual address entry to match you to the right neighbourhood zone. You can refresh your location at any time from Settings → Location.' },
      { q: 'Can I change my neighbourhood?', a: 'Yes — go to Settings → Location and tap "Refresh GPS Location." Changes may require re-verification if you\'ve moved to a different area.' },
    ],
  },
  {
    section: 'Marketplace',
    items: [
      { q: 'How does the escrow system work?', a: 'When a buyer confirms a purchase, payment is held securely in escrow. Funds are only released to the seller once the buyer marks the item as received. This protects both parties.' },
      { q: 'What happens if there is a dispute?', a: 'If a transaction cannot be resolved between buyer and seller, YRDLY\'s support team can mediate. Tap "Report an Issue" on the transaction to begin a dispute.' },
      { q: 'Are there fees for selling on YRDLY?', a: 'YRDLY charges a small platform fee on completed marketplace transactions. Posting a listing is always free. Current fee details are shown before you confirm any sale.' },
    ],
  },
  {
    section: 'Privacy & Safety',
    items: [
      { q: 'Who can see my exact address?', a: 'Nobody. YRDLY only ever shows your neighbourhood zone (e.g. "Victoria Island") to other members — never your street or house number.' },
      { q: 'How do I block someone?', a: 'Visit their profile, tap the three-dot menu in the top right, and select "Block." Blocked users cannot see your posts, send you messages, or find your profile.' },
    ],
  },
]

function HelpCenterScreen({ go }: { go: (p: Page) => void }) {
  const [openItem, setOpenItem] = useState<string | null>(null)
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Help Center" onBack={() => go('settings')} />

      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-6">
        {/* Search hint */}
        <div className="flex items-center gap-3 px-4" style={{ height: '48px', borderRadius: '18px', background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>Search help articles…</span>
        </div>

        {FAQS.map((section) => (
          <div key={section.section}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: '4px', marginBottom: '10px' }}>{section.section}</p>
            <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', overflow: 'hidden' }}>
              {section.items.map((item, i) => {
                const id = `${section.section}-${i}`
                const isOpen = openItem === id
                return (
                  <div key={i}>
                    <button onClick={() => setOpenItem(isOpen ? null : id)} className="w-full flex items-start gap-4 px-5 py-4 text-left">
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: G, marginTop: '7px', flexShrink: 0 }} />
                      <p style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: '#fff', lineHeight: 1.45 }}>{item.q}</p>
                      <div style={{ color: LABEL, flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', marginTop: '2px' }}>
                        <ChevronDownIcon />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4" style={{ paddingLeft: '37px' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.7, borderTop: `1px solid ${GLASS_BORDER}`, paddingTop: '12px' }}>{item.a}</p>
                      </div>
                    )}
                    {i < section.items.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '37px' }} />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Contact card */}
        <div className="px-5 py-5 flex flex-col items-center gap-3 text-center" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'rgba(130,219,126,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💬</div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Still need help?</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55, maxWidth: '240px' }}>Our support team responds within 24 hours on weekdays.</p>
          <button style={{ height: '44px', paddingLeft: '24px', paddingRight: '24px', borderRadius: '22px', background: G, color: DARK, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px' }}>Contact Support</button>
        </div>
      </div>
    </div>
  )
}

// ─── 25. REPORT AN ISSUE ─────────────────────────────────────────────────────
const REPORT_CATEGORIES = [
  { emoji: '🧑‍💻', label: 'Bug or App Issue', sub: 'Something isn\'t working as expected' },
  { emoji: '🚨', label: 'Inappropriate Content', sub: 'Post, comment, or profile that violates guidelines' },
  { emoji: '🛒', label: 'Marketplace Dispute', sub: 'Problem with a buyer, seller, or transaction' },
  { emoji: '👤', label: 'Fake or Spam Account', sub: 'Account impersonating someone or posting spam' },
  { emoji: '⚠️', label: 'Safety Concern', sub: 'Something that feels unsafe in your community' },
  { emoji: '📋', label: 'Other', sub: 'Anything else you\'d like to flag' },
]

function ReportIssueScreen({ go }: { go: (p: Page) => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
        <StatusBar />
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5 text-center">
          <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>✅</div>
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', marginBottom: '10px' }}>Report Received</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, lineHeight: 1.65 }}>Thank you for helping keep YRDLY safe. Our team will review your report within 24 hours and take appropriate action.</p>
          </div>
          <button onClick={() => go('settings')} style={{ height: '52px', width: '100%', borderRadius: '16px', background: G, color: DARK, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px' }}>Back to Settings</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="Report an Issue" onBack={() => go('settings')} />

      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-5">
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, lineHeight: 1.6 }}>What would you like to report? We take every report seriously and review all submissions.</p>

        {/* Category selector */}
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Category</p>
          <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', overflow: 'hidden' }}>
            {REPORT_CATEGORIES.map((cat, i) => (
              <div key={i}>
                <button onClick={() => setSelected(i)} className="w-full flex items-center gap-4 px-5 py-4">
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: selected === i ? 'rgba(130,219,126,0.12)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0, transition: 'background 0.2s' }}>{cat.emoji}</div>
                  <div className="flex-1 text-left">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 500, color: selected === i ? '#fff' : 'rgba(255,255,255,0.75)' }}>{cat.label}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{cat.sub}</p>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected === i ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                    {selected === i && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: G }} />}
                  </div>
                </button>
                {i < REPORT_CATEGORIES.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '68px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Detail text area */}
        {selected !== null && (
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Additional Details <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Describe the issue in as much detail as you can…"
              rows={4}
              style={{ width: '100%', background: '#0f0f0f', border: `1px solid ${detail ? 'rgba(130,219,126,0.3)' : GLASS_BORDER}`, borderRadius: '18px', padding: '16px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff', resize: 'none', outline: 'none', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            />
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginTop: '6px', textAlign: 'right' }}>{detail.length}/500</p>
          </div>
        )}

        <button
          onClick={() => selected !== null && setSubmitted(true)}
          disabled={selected === null}
          style={{ height: '52px', borderRadius: '16px', background: selected !== null ? G : 'rgba(255,255,255,0.06)', color: selected !== null ? DARK : LABEL, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', border: 'none', transition: 'all 0.2s', cursor: selected !== null ? 'pointer' : 'default' }}
        >
          Submit Report
        </button>

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, textAlign: 'center', lineHeight: 1.6 }}>Reports are reviewed by our trust & safety team. We do not share your identity with the person you report.</p>
      </div>
    </div>
  )
}

// ─── 26. EDIT PROFILE ────────────────────────────────────────────────────────
function EditProfileScreen({ go }: { go: (p: Page) => void }) {
  const [name, setName] = useState('Amina Bello')
  const [handle, setHandle] = useState('amina_vi')
  const [bio, setBio] = useState('Architect & baker in VI. Loving local markets and community cleanups 🌿 Always down for a good suya spot.')
  const [website, setWebsite] = useState('')
  const [saved, setSaved] = useState(false)

  const bioMax = 140
  const isDirty = name !== 'Amina Bello' || handle !== 'amina_vi' || bio !== 'Architect & baker in VI. Loving local markets and community cleanups 🌿 Always down for a good suya spot.' || website !== ''

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => { setSaved(false); go('profile') }, 900)
  }

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Nav */}
      <div className="flex items-center justify-between px-5 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '16px' }}>
        <button onClick={() => go('profile')} style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#111111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <ChevronLeftIcon />
        </button>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>Edit Profile</span>
        <button
          onClick={handleSave}
          style={{ height: '36px', paddingLeft: '18px', paddingRight: '18px', borderRadius: '18px', background: saved ? 'rgba(130,219,126,0.15)' : G, color: saved ? G : '#050505', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', border: saved ? `1px solid ${G}` : 'none', transition: 'all 0.25s', flexShrink: 0 }}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">

        {/* Avatar section */}
        <div className="flex flex-col items-center pt-2 pb-7" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', padding: '3px', background: `conic-gradient(${G} 0deg 300deg, transparent 300deg 360deg)` }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#050505' }}>
                <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=200&h=200&fit=crop&auto=format" alt="Amina Bello" className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Camera overlay */}
            <button style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
          <button style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: G }}>Change photo</button>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '4px' }}>JPG or PNG · Max 5MB</p>
        </div>

        {/* Form fields */}
        <div className="px-5 pt-6 flex flex-col gap-5">

          {/* Display name */}
          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Display Name</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: LABEL, pointerEvents: 'none' }}>
                <UserIcon />
              </div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
                style={{ width: '100%', height: '56px', background: '#0f0f0f', border: `1px solid ${name ? 'rgba(130,219,126,0.3)' : GLASS_BORDER}`, borderRadius: '18px', paddingLeft: '48px', paddingRight: '16px', fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: G, pointerEvents: 'none', lineHeight: 1 }}>@</div>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 30))}
                style={{ width: '100%', height: '56px', background: '#0f0f0f', border: `1px solid ${handle ? 'rgba(130,219,126,0.3)' : GLASS_BORDER}`, borderRadius: '18px', paddingLeft: '36px', paddingRight: '16px', fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              />
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginTop: '5px', paddingLeft: '4px' }}>Letters, numbers, underscores, and dots only.</p>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Bio</label>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: bio.length > bioMax * 0.85 ? (bio.length >= bioMax ? '#FF5C5C' : '#FFB648') : LABEL }}>{bio.length}/{bioMax}</span>
            </div>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, bioMax))}
              rows={3}
              placeholder="Write a short bio…"
              style={{ width: '100%', background: '#0f0f0f', border: `1px solid ${bio.length >= bioMax ? 'rgba(255,92,92,0.4)' : bio ? 'rgba(130,219,126,0.3)' : GLASS_BORDER}`, borderRadius: '18px', padding: '16px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff', resize: 'none', outline: 'none', lineHeight: 1.6, transition: 'border-color 0.2s', boxSizing: 'border-box' }}
            />
          </div>

          {/* Website */}
          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Website <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: LABEL }}>(optional)</span></label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: LABEL, pointerEvents: 'none' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="yoursite.com"
                style={{ width: '100%', height: '56px', background: '#0f0f0f', border: `1px solid ${website ? 'rgba(130,219,126,0.3)' : GLASS_BORDER}`, borderRadius: '18px', paddingLeft: '48px', paddingRight: '16px', fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              />
            </div>
          </div>

          {/* Read-only verified fields */}
          <div style={{ borderTop: `1px solid ${GLASS_BORDER}`, paddingTop: '20px' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Verified Info</p>
            <div className="flex flex-col gap-3">
              {[
                { icon: <span style={{ fontSize: '15px' }}>🇳🇬</span>, label: 'Phone', value: '+234 801 *** *678' },
                { icon: <MailIcon />, label: 'Email', value: 'amina@gmail.com' },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-4 px-4" style={{ height: '56px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
                  <span style={{ color: LABEL, flexShrink: 0 }}>{f.icon}</span>
                  <div className="flex-1">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 600, color: LABEL, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{f.label}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>{f.value}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={G}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/></svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: G, fontWeight: 600 }}>Verified</span>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '10px', paddingLeft: '4px', lineHeight: 1.55 }}>To update your phone or email, go to Settings → Account & Identity.</p>
          </div>

          {/* Save button — bottom of form */}
          <div style={{ paddingTop: '4px' }}>
            <PrimaryBtn label={saved ? '✓ Profile Saved' : 'Save Changes'} onClick={handleSave} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EXPLORE DATA & TYPES ────────────────────────────────────────────────────
let ACTIVE_ITEM_ID = 1
let ACTIVE_EVENT_ID = 1
let ACTIVE_PLACE_ID = 1

type MktItem = { id: number; title: string; price: string; cond: string; photo: string; area: string; sellerName: string; sellerAvatarId: string; desc: string; category: string }
type EvItem = { id: number; title: string; date: string; time: string; photo: string; org: string; area: string; free: boolean; price?: string; going: number; capacity: number; desc: string; soldOut?: boolean; ended?: boolean }
type PlItem = { id: number; name: string; category: string; photo: string; rating: number; dist: string; area: string; open: boolean; desc: string; phone?: string; hours: string; verified: boolean }
type DiscPerson = { id: number; name: string; handle: string; avatarId: string; area: string; dist: string; mutuals?: number; mutualNames?: string; listings?: number; listingPhoto?: string; personType: 'nearby' | 'mutual' | 'seller' }

const MARKETPLACE_ITEMS: MktItem[] = [
  { id: 1, title: 'Nike Air Max 90', price: '₦85,000', cond: 'Like New', photo: '1654762550505-7c58277e0fac', area: 'VI', sellerName: 'Emeka Obi', sellerAvatarId: '1649502913092-fb7f0e8fc632', desc: 'Bought in London, worn only twice. Size 43. Original box included. No trades please.', category: 'Fashion' },
  { id: 2, title: 'MacBook Air M2', price: '₦650,000', cond: 'Excellent', photo: '1563132337-f159f484226c', area: 'Lekki', sellerName: 'Ngozi Adeyemi', sellerAvatarId: '1758525225816-8dd1901ef6ec', desc: '13-inch, 8GB RAM, 256GB SSD, Space Grey. Purchased Nov 2023. Original box and charger included.', category: 'Electronics' },
  { id: 3, title: 'Solid Oak Dining Table', price: '₦95,000', cond: 'Like New', photo: '1579998120708-682dd8a5624f', area: 'VI', sellerName: 'Amaka Johnson', sellerAvatarId: '1563132337-f159f484226c', desc: 'Beautiful solid oak dining table, seats 6. Only 8 months old. Moving to a smaller apartment.', category: 'Home & Living' },
  { id: 4, title: 'Arched Floor Lamp', price: '₦45,000', cond: 'Good', photo: '1673280401347-309363111070', area: 'VI', sellerName: 'Amina Bello', sellerAvatarId: '1649502913092-fb7f0e8fc632', desc: 'Modern arched lamp with warm LED. Minor scratch on base that is not visible when standing.', category: 'Home & Living' },
  { id: 5, title: 'Vintage Record Player', price: '₦120,000', cond: 'Excellent', photo: '1752622176337-5d9315e2df6e', area: 'Lekki', sellerName: 'Tunde Fashola', sellerAvatarId: '1572816225927-d08fb138f2b2', desc: 'Crosley Cruiser Deluxe. Plays 33/45/78 RPM. Includes 10 classic Afrobeats vinyl records.', category: 'Electronics' },
  { id: 6, title: 'iPhone 14 Pro Max', price: '₦480,000', cond: 'Good', photo: '1758525225816-8dd1901ef6ec', area: 'Ikoyi', sellerName: 'Adaeze Nwosu', sellerAvatarId: '1673280401347-309363111070', desc: 'Deep Purple, 256GB. Perfect screen. Comes with original box and a brand new case.', category: 'Electronics' },
]

const EVENTS_DATA: EvItem[] = [
  { id: 1, title: 'VI Community Cleanup', date: 'Sat, Aug 8', time: '7:00 AM', photo: '1654762550505-7c58277e0fac', org: 'VI Neighbourhood Council', area: 'Victoria Island', free: true, going: 42, capacity: 100, desc: 'Join your neighbours for our monthly Victoria Island cleanup drive. Equipment and refreshments provided. Together we keep our neighbourhood beautiful.' },
  { id: 2, title: 'Lekki Music Festival', date: 'Sun, Aug 9', time: '2:00 PM', photo: '1673280401347-309363111070', org: 'Lagos Culture Co.', area: 'Lekki', free: false, price: '₦5,000', going: 187, capacity: 300, desc: 'An afternoon of live music, art, and food celebrating the best of Lagos creative culture. Featuring local artists and food vendors from across the island.' },
  { id: 3, title: 'Neighbourhood Book Club', date: 'Fri, Aug 7', time: '6:30 PM', photo: '1758525225816-8dd1901ef6ec', org: 'Amina Bello', area: 'Victoria Island', free: true, going: 14, capacity: 20, desc: "This month we're reading 'Purple Hibiscus' by Chimamanda Ngozi Adichie. New members welcome — bring your thoughts and an open mind." },
  { id: 4, title: 'Sunset Suya & Drinks', date: 'Sat, Aug 8', time: '5:00 PM', photo: '1649502913092-fb7f0e8fc632', org: 'Emeka Obi', area: 'Bar Beach', free: false, price: '₦3,500', going: 60, capacity: 60, desc: 'An outdoor evening of suya, drinks, music, and great company at Bar Beach. Experience Lagos at its most beautiful.', soldOut: true },
]

const PLACES_DATA: PlItem[] = [
  { id: 1, name: 'The Green Café', category: 'Café', photo: '1758525225816-8dd1901ef6ec', rating: 4.8, dist: '0.4 km', area: 'Victoria Island', open: true, desc: 'A beloved neighbourhood café serving specialty coffee, fresh pastries, and an all-day menu. The go-to spot for remote workers and weekend brunches.', phone: '+234 801 234 5678', hours: 'Mon–Sat 7am–9pm · Sun 9am–6pm', verified: true },
  { id: 2, name: "Mama Titi's Kitchen", category: 'Restaurant', photo: '1579998120708-682dd8a5624f', rating: 4.9, dist: '0.7 km', area: 'Victoria Island', open: true, desc: 'Authentic Nigerian home cooking — the best egusi soup and jollof rice in VI. Grandmother\'s recipe, no shortcuts. Cash and transfer accepted.', phone: '+234 803 456 7890', hours: 'Tue–Sun 11am–9pm', verified: false },
  { id: 3, name: 'Lagos Tech Hub', category: 'Services', photo: '1649502913092-fb7f0e8fc632', rating: 4.6, dist: '1.2 km', area: 'Victoria Island', open: true, desc: "Co-working space and event venue for Lagos's growing tech community. Daily passes, meeting rooms, and reliable fibre internet.", hours: 'Mon–Fri 8am–10pm · Sat 9am–6pm', verified: true },
  { id: 4, name: 'Glow Beauty Studio', category: 'Beauty & Salon', photo: '1563132337-f159f484226c', rating: 4.7, dist: '0.9 km', area: 'Victoria Island', open: false, desc: 'Full-service beauty studio specializing in braids, natural hair, and skincare treatments. Award-winning stylists. Book via WhatsApp.', phone: '+234 802 345 6789', hours: 'Mon–Sat 9am–7pm', verified: true },
]

const DISCOVER_PEOPLE: DiscPerson[] = [
  { id: 1, name: 'Adaeze Nwosu', handle: '@ada_vi', avatarId: '1673280401347-309363111070', area: 'Victoria Island', dist: '0.4 km', mutuals: 3, mutualNames: 'Amaka and 2 others', personType: 'nearby' },
  { id: 2, name: 'Funke Williams', handle: '@funke_ikoyi', avatarId: '1758525225816-8dd1901ef6ec', area: 'Ikoyi', dist: '2.1 km', mutuals: 2, mutualNames: 'Tunde and 1 other', personType: 'nearby' },
  { id: 3, name: 'Babajide Adewale', handle: '@babs_lekki', avatarId: '1654762550505-7c58277e0fac', area: 'Lekki Phase 1', dist: '1.8 km', mutuals: 5, mutualNames: 'Emeka, Ngozi and 3 others', personType: 'mutual' },
  { id: 4, name: 'Kemi Okafor', handle: '@kemi_vi', avatarId: '1572816225927-d08fb138f2b2', area: 'Victoria Island', dist: '0.9 km', mutuals: 4, mutualNames: 'Amaka, Ngozi and 2 others', personType: 'mutual' },
  { id: 5, name: 'Chidi Okeke', handle: '@chidi_vi', avatarId: '1649502913092-fb7f0e8fc632', area: 'Victoria Island', dist: '0.6 km', listings: 12, listingPhoto: '1673280401347-309363111070', personType: 'seller' },
]

// ─── EXPLORE SECTIONS ─────────────────────────────────────────────────────────
function DiscoverSection({ go: _go }: { go: (p: Page) => void }) {
  const nearby = DISCOVER_PEOPLE.filter(p => p.personType === 'nearby')
  const mutuals = DISCOVER_PEOPLE.filter(p => p.personType === 'mutual')
  const sellers = DISCOVER_PEOPLE.filter(p => p.personType === 'seller')
  const [connected, setConnected] = useState<number[]>([])
  const toggle = (id: number) => setConnected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="pt-4 flex flex-col gap-6">
      {/* Nearby People */}
      <div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '20px', marginBottom: '12px' }}>Nearby People</p>
        <div className="flex gap-3 px-5 pb-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {nearby.map(p => (
            <div key={p.id} className="flex-shrink-0 flex flex-col items-center gap-3 px-4 py-5" style={{ width: '155px', background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', overflow: 'hidden', border: `2px solid rgba(130,219,126,0.25)` }}>
                <img src={`https://images.unsplash.com/photo-${p.avatarId}?w=150&h=150&fit=crop&auto=format&q=70`} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{p.name.split(' ')[0]}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '3px' }}>{p.handle}</p>
                <div className="flex items-center justify-center gap-1">
                  <PinSmIcon />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{p.dist}</span>
                </div>
                {p.mutuals && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: MUTED, marginTop: '3px' }}>{p.mutuals} mutual{p.mutuals > 1 ? 's' : ''}</p>}
              </div>
              <button onClick={() => toggle(p.id)} style={{ width: '100%', height: '34px', borderRadius: '17px', background: connected.includes(p.id) ? 'rgba(130,219,126,0.15)' : 'rgba(130,219,126,0.08)', border: `1px solid ${connected.includes(p.id) ? 'rgba(130,219,126,0.4)' : 'rgba(130,219,126,0.2)'}`, color: G, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, transition: 'all 0.18s' }}>
                {connected.includes(p.id) ? '✓ Sent' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mutual Connections */}
      <div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '20px', marginBottom: '12px' }}>People You May Know</p>
        <div className="flex flex-col gap-3 px-5">
          {mutuals.map(person => (
            <div key={person.id} className="flex items-center gap-4 px-4 py-3.5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                <img src={`https://images.unsplash.com/photo-${person.avatarId}?w=120&h=120&fit=crop&auto=format&q=70`} alt={person.name} className="w-full h-full object-cover" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{person.name}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{person.handle} · {person.area.split(',')[0]}</p>
                {person.mutualNames && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: MUTED, marginTop: '2px' }}>Followed by {person.mutualNames}</p>}
              </div>
              <button onClick={() => toggle(person.id)} style={{ height: '34px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '17px', background: connected.includes(person.id) ? 'rgba(130,219,126,0.12)' : 'rgba(130,219,126,0.07)', border: `1px solid ${connected.includes(person.id) ? 'rgba(130,219,126,0.4)' : 'rgba(130,219,126,0.2)'}`, color: G, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, flexShrink: 0, transition: 'all 0.18s' }}>
                {connected.includes(person.id) ? '✓' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sellers */}
      <div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: '20px', marginBottom: '12px' }}>Active Sellers</p>
        <div className="flex flex-col gap-3 px-5">
          {sellers.map(person => (
            <div key={person.id} className="flex items-center gap-4 px-4 py-3.5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                <img src={`https://images.unsplash.com/photo-${person.avatarId}?w=120&h=120&fit=crop&auto=format&q=70`} alt={person.name} className="w-full h-full object-cover" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{person.name}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Active seller · {person.listings} listings</p>
                {person.listingPhoto && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', marginTop: '5px', border: `1px solid ${GLASS_BORDER}` }}>
                    <img src={`https://images.unsplash.com/photo-${person.listingPhoto}?w=70&h=70&fit=crop&auto=format&q=60`} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <button style={{ height: '34px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '17px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: MUTED, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500, flexShrink: 0 }}>View</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MarketplaceFilterSheet({ onClose }: { onClose: () => void }) {
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [location, setLocation] = useState('nearby')
  const [condition, setCondition] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('newest')
  const toggleCond = (c: string) => setCondition(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderRadius: '28px 28px 0 0', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '82%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 14px' }} />
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff' }}>Filters</p>
            <button onClick={() => { setMinPrice(''); setMaxPrice(''); setLocation('nearby'); setCondition([]); setSortBy('newest') }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>Reset</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-5 pb-4">
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Price Range (₦)</p>
            <div className="flex items-center gap-3">
              <input value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min" style={{ flex: 1, height: '48px', background: '#111', border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px', paddingLeft: '14px', paddingRight: '14px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff', outline: 'none' }} />
              <span style={{ color: LABEL, fontSize: '14px' }}>—</span>
              <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max" style={{ flex: 1, height: '48px', background: '#111', border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px', paddingLeft: '14px', paddingRight: '14px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff', outline: 'none' }} />
            </div>
          </div>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Condition</p>
            <div className="flex gap-2 flex-wrap">
              {['New', 'Like New', 'Good', 'Fair'].map(c => (
                <button key={c} onClick={() => toggleCond(c)} style={{ height: '34px', paddingLeft: '16px', paddingRight: '16px', borderRadius: '17px', background: condition.includes(c) ? 'rgba(130,219,126,0.1)' : '#111', border: `1px solid ${condition.includes(c) ? 'rgba(130,219,126,0.3)' : GLASS_BORDER}`, color: condition.includes(c) ? G : MUTED, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: condition.includes(c) ? 700 : 400, transition: 'all 0.18s' }}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Location</p>
            <div style={{ background: '#111', border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
              {([{ v: 'nearby', l: 'Nearby (< 5 km)' }, { v: 'neighbourhood', l: 'My Neighbourhood' }, { v: 'lga', l: 'Within Lagos' }] as const).map((opt, i) => (
                <div key={opt.v}>
                  <button onClick={() => setLocation(opt.v)} className="w-full flex items-center justify-between px-4 py-3.5">
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }}>{opt.l}</span>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${location === opt.v ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {location === opt.v && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: G }} />}
                    </div>
                  </button>
                  {i < 2 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '16px' }} />}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Sort By</p>
            <div style={{ background: '#111', border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
              {([{ v: 'newest', l: 'Newest first' }, { v: 'price-asc', l: 'Price: Low to high' }, { v: 'price-desc', l: 'Price: High to low' }] as const).map((opt, i) => (
                <div key={opt.v}>
                  <button onClick={() => setSortBy(opt.v)} className="w-full flex items-center justify-between px-4 py-3.5">
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }}>{opt.l}</span>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${sortBy === opt.v ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sortBy === opt.v && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: G }} />}
                    </div>
                  </button>
                  {i < 2 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '16px' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-10 pt-3 flex-shrink-0">
          <PrimaryBtn label="Apply Filters" onClick={onClose} />
        </div>
      </div>
    </div>
  )
}

function MarketplaceSection({ go }: { go: (p: Page) => void }) {
  const [category, setCategory] = useState('All')
  const [showFilter, setShowFilter] = useState(false)
  const [saved, setSaved] = useState<number[]>([])
  const CATS = ['All', 'Fashion', 'Electronics', 'Home & Living', 'Vehicles', 'Food', 'Beauty', 'Services']
  const items = category === 'All' ? MARKETPLACE_ITEMS : MARKETPLACE_ITEMS.filter(i => i.category === category)

  return (
    <div className="pt-4 flex flex-col gap-4" style={{ position: 'relative' }}>
      <div className="flex items-center gap-3 px-5">
        <div className="flex gap-2 flex-1 pb-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {CATS.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', flexShrink: 0, background: category === cat ? G : 'transparent', border: `1px solid ${category === cat ? G : GLASS_BORDER}`, color: category === cat ? DARK : LABEL, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: category === cat ? 700 : 400, transition: 'all 0.18s' }}>{cat}</button>
          ))}
        </div>
        <button onClick={() => setShowFilter(true)} style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, flexShrink: 0 }}>
          <FilterIcon />
        </button>
      </div>
      <div className="grid gap-4 px-5" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {items.map(item => (
          <button key={item.id} onClick={() => { ACTIVE_ITEM_ID = item.id; go('item-detail') }} style={{ textAlign: 'left' }}>
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', marginBottom: '8px', aspectRatio: '1' }}>
              <img src={`https://images.unsplash.com/photo-${item.photo}?w=320&h=320&fit=crop&auto=format&q=75`} alt={item.title} className="w-full h-full object-cover" />
              <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); setSaved(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]) }} style={{ position: 'absolute', top: '8px', right: '8px', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={saved.includes(item.id) ? G : 'none'} stroke={saved.includes(item.id) ? G : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 600, color: '#fff' }}>{item.cond}</span>
              </div>
            </div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: G }}>{item.price}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                <img src={`https://images.unsplash.com/photo-${item.sellerAvatarId}?w=40&h=40&fit=crop&auto=format&q=60`} alt="" className="w-full h-full object-cover" />
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{item.area}</span>
            </div>
          </button>
        ))}
      </div>
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-14 px-8" style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff' }}>Nothing nearby yet</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.6 }}>Be the first to list something in your neighbourhood.</p>
          <button style={{ height: '42px', paddingLeft: '22px', paddingRight: '22px', borderRadius: '21px', background: G, color: DARK, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>Sell Something</button>
        </div>
      )}
      {showFilter && <MarketplaceFilterSheet onClose={() => setShowFilter(false)} />}
    </div>
  )
}

function EventsSection({ go }: { go: (p: Page) => void }) {
  const [filter, setFilter] = useState('All')
  const [saved, setSaved] = useState<number[]>([])
  const FILTERS = ['All', 'Today', 'This Week', 'Weekend', 'Community', 'Music', 'Food', 'Sports']

  return (
    <div className="pt-4 flex flex-col gap-4">
      <div className="flex gap-2 px-5 pb-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', flexShrink: 0, background: filter === f ? G : 'transparent', border: `1px solid ${filter === f ? G : GLASS_BORDER}`, color: filter === f ? DARK : LABEL, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: filter === f ? 700 : 400, transition: 'all 0.18s' }}>{f}</button>
        ))}
      </div>
      <div className="flex flex-col gap-4 px-5">
        {EVENTS_DATA.map(ev => (
          <button key={ev.id} onClick={() => { ACTIVE_EVENT_ID = ev.id; go('event-detail') }} style={{ textAlign: 'left', borderRadius: '24px', overflow: 'hidden', background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}` }}>
            <div style={{ position: 'relative', height: '160px' }}>
              <img src={`https://images.unsplash.com/photo-${ev.photo}?w=700&h=400&fit=crop&auto=format&q=80`} alt={ev.title} className="w-full h-full object-cover" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(5,5,5,0.75))' }} />
              <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '4px 10px', borderRadius: '10px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: '#fff' }}>{ev.date}</span>
              </div>
              <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); setSaved(prev => prev.includes(ev.id) ? prev.filter(i => i !== ev.id) : [...prev, ev.id]) }} style={{ position: 'absolute', top: '10px', right: '10px', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={saved.includes(ev.id) ? G : 'none'} stroke={saved.includes(ev.id) ? G : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '3px 10px', borderRadius: '8px', background: ev.soldOut ? 'rgba(255,92,92,0.18)' : ev.free ? 'rgba(130,219,126,0.18)' : 'rgba(255,255,255,0.1)', border: `1px solid ${ev.soldOut ? 'rgba(255,92,92,0.35)' : ev.free ? 'rgba(130,219,126,0.28)' : GLASS_BORDER}` }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: ev.soldOut ? '#FF5C5C' : ev.free ? G : '#fff' }}>{ev.soldOut ? 'SOLD OUT' : ev.free ? 'FREE' : ev.price}</span>
              </div>
            </div>
            <div className="px-4 py-3.5">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '5px' }}>{ev.title}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{ev.time}</span>
                </div>
                <div className="flex items-center gap-1">
                  <PinSmIcon />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{ev.area}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{ev.going} going</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PlacesSection({ go }: { go: (p: Page) => void }) {
  const [category, setCategory] = useState('All')
  const [saved, setSaved] = useState<number[]>([])
  const CATS = ['All', 'Restaurants', 'Cafés', 'Shopping', 'Beauty', 'Health', 'Services', 'Gyms']

  return (
    <div className="pt-4 flex flex-col gap-4">
      <div className="flex gap-2 px-5 pb-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', flexShrink: 0, background: category === c ? G : 'transparent', border: `1px solid ${category === c ? G : GLASS_BORDER}`, color: category === c ? DARK : LABEL, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: category === c ? 700 : 400, transition: 'all 0.18s' }}>{c}</button>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-5">
        {PLACES_DATA.map(place => (
          <button key={place.id} onClick={() => { ACTIVE_PLACE_ID = place.id; go('place-detail') }} style={{ textAlign: 'left', borderRadius: '20px', overflow: 'hidden', background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, display: 'flex' }}>
            <div style={{ width: '96px', height: '96px', flexShrink: 0, overflow: 'hidden' }}>
              <img src={`https://images.unsplash.com/photo-${place.photo}?w=192&h=192&fit=crop&auto=format&q=75`} alt={place.name} className="w-full h-full object-cover" />
            </div>
            <div style={{ flex: 1, padding: '12px 14px' }}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{place.name}</p>
                  {place.verified && <svg width="14" height="14" viewBox="0 0 24 24" fill={G}><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/></svg>}
                </div>
                <div role="button" tabIndex={0} onClick={e => { e.stopPropagation(); setSaved(prev => prev.includes(place.id) ? prev.filter(i => i !== place.id) : [...prev, place.id]) }} style={{ color: saved.includes(place.id) ? G : LABEL, flexShrink: 0, cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={saved.includes(place.id) ? G : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '5px' }}>{place.category}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <StarFillIcon />
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: '#fff' }}>{place.rating}</span>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{place.dist}</span>
                <div style={{ padding: '2px 7px', borderRadius: '6px', background: place.open ? 'rgba(130,219,126,0.1)' : 'rgba(255,92,92,0.1)', border: `1px solid ${place.open ? 'rgba(130,219,126,0.2)' : 'rgba(255,92,92,0.2)'}` }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: place.open ? G : '#FF5C5C' }}>{place.open ? 'OPEN' : 'CLOSED'}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── EXPLORE DETAIL SCREENS ──────────────────────────────────────────────────
function ItemDetailScreen({ go }: { go: (p: Page) => void }) {
  const item = MARKETPLACE_ITEMS.find(i => i.id === ACTIVE_ITEM_ID) ?? MARKETPLACE_ITEMS[0]
  const isOwn = item.sellerName === 'Amina Bello'
  const [saved, setSaved] = useState(false)
  const [isSold, setIsSold] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <div className="flex-1 overflow-y-auto pb-24">
        <div style={{ position: 'relative', height: '320px' }}>
          <img src={`https://images.unsplash.com/photo-${item.photo}?w=800&h=640&fit=crop&auto=format&q=85`} alt={item.title} className="w-full h-full object-cover" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(5,5,5,0.65) 100%)' }} />
          {isSold && (
            <div style={{ position: 'absolute', top: '20px', left: '20px', padding: '5px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: MUTED }}>SOLD</span>
            </div>
          )}
          <div className="absolute flex items-center justify-between px-5" style={{ top: '52px', left: 0, right: 0 }}>
            <button onClick={() => go('explore')} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
              <ChevronLeftIcon />
            </button>
            <div className="flex gap-2">
              {!isOwn && (
                <button onClick={() => setSaved(v => !v)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? G : 'none'} stroke={saved ? G : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              )}
              <button onClick={() => setShowOptions(true)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                <DotsIcon />
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 pt-5 flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', flex: 1, lineHeight: 1.2 }}>{item.title}</h1>
              <div style={{ marginLeft: '12px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${GLASS_BORDER}`, flexShrink: 0 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: MUTED }}>{item.cond}</span>
              </div>
            </div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '28px', color: isSold ? LABEL : G }}>{isSold ? 'SOLD' : item.price}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <PinSmIcon />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{item.area}, Lagos</span>
            </div>
          </div>

          {/* Seller info card — varies by owner vs customer */}
          {isOwn ? (
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.2)', borderRadius: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(130,219,126,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: G }}>You are the seller of this listing</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '2px' }}>Use the buttons below to manage your listing</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
              <button onClick={() => { ACTIVE_PROFILE_ID = 1; go('public-profile') }} style={{ flexShrink: 0 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden' }}>
                  <img src={`https://images.unsplash.com/photo-${item.sellerAvatarId}?w=100&h=100&fit=crop&auto=format&q=70`} alt={item.sellerName} className="w-full h-full object-cover" />
                </div>
              </button>
              <div style={{ flex: 1 }}>
                <button onClick={() => { ACTIVE_PROFILE_ID = 1; go('public-profile') }} className="text-left">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{item.sellerName}</p>
                </button>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StarFillIcon /><StarFillIcon /><StarFillIcon /><StarFillIcon /><StarFillIcon />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginLeft: '2px' }}>Trusted seller</span>
                </div>
              </div>
              <button onClick={() => { ACTIVE_PROFILE_ID = 1; go('public-profile') }} style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: MUTED, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 500 }}>View Profile</button>
            </div>
          )}

          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>About this item</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>{item.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ padding: '4px 12px', borderRadius: '8px', background: SURFACE, border: `1px solid ${GLASS_BORDER}` }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>{item.category}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar — owner vs customer */}
      {isOwn ? (
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 flex gap-3" style={{ background: 'rgba(5,5,5,0.95)', borderTop: `1px solid ${GLASS_BORDER}`, backdropFilter: 'blur(12px)' }}>
          <button onClick={() => go('business-add-item')} style={{ flex: 1, height: '52px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Listing
          </button>
          <button onClick={() => setIsSold(v => !v)} style={{ flex: 1, height: '52px', borderRadius: '16px', background: isSold ? 'rgba(255,92,92,0.1)' : 'rgba(130,219,126,0.1)', border: isSold ? '1px solid rgba(255,92,92,0.3)' : '1px solid rgba(130,219,126,0.3)', color: isSold ? '#FF5C5C' : G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', transition: 'all 0.2s' }}>
            {isSold ? 'Mark Active' : 'Mark as Sold'}
          </button>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 flex gap-3" style={{ background: 'rgba(5,5,5,0.95)', borderTop: `1px solid ${GLASS_BORDER}`, backdropFilter: 'blur(12px)' }}>
          <button onClick={() => go('checkout')} disabled={isSold} style={{ flex: 1, height: '52px', borderRadius: '16px', background: isSold ? '#111' : G, color: isSold ? LABEL : DARK, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', transition: 'all 0.2s' }}>{isSold ? 'Item Sold' : 'Buy Now'}</button>
          <button onClick={() => go('messages')} style={{ height: '52px', paddingLeft: '18px', paddingRight: '18px', borderRadius: '16px', background: '#111', border: `1px solid ${GLASS_BORDER}`, color: MUTED, fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>Message Seller</button>
        </div>
      )}

      {/* Options sheet */}
      {showOptions && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} onClick={() => setShowOptions(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderRadius: '28px 28px 0 0', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px' }} />
            {(isOwn
              ? [{ l: 'Edit Listing', icon: '✏️', danger: false }, { l: 'Mark as Sold', icon: '🏷️', danger: false }, { l: 'Delete Item', icon: '🗑️', danger: true }, { l: 'Share Link', icon: '🔗', danger: false }]
              : [{ l: 'Report Item', icon: '🚩', danger: true }, { l: 'Share', icon: '🔗', danger: false }, { l: 'Save', icon: '🔖', danger: false }, { l: 'Block Seller', icon: '🚫', danger: true }]
            ).map(opt => (
              <button key={opt.l} onClick={() => setShowOptions(false)} className="w-full flex items-center gap-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{opt.icon}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: opt.danger ? '#ef4444' : '#fff' }}>{opt.l}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EventDetailScreen({ go }: { go: (p: Page) => void }) {
  const ev = EVENTS_DATA.find(e => e.id === ACTIVE_EVENT_ID) ?? EVENTS_DATA[0]
  const [saved, setSaved] = useState(false)
  const [rsvped, setRsvped] = useState(false)

  const ctaLabel = ev.ended ? 'Event Ended' : ev.soldOut ? 'Sold Out' : ev.free ? (rsvped ? '✓ RSVP Confirmed' : 'Free RSVP') : rsvped ? '✓ Ticket Purchased' : `Buy Ticket · ${ev.price}`
  const ctaDisabled = !!(ev.ended || ev.soldOut || rsvped)
  const ctaBg = ev.ended || ev.soldOut ? '#111' : G
  const ctaColor = ev.ended || ev.soldOut ? LABEL : DARK

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <div className="flex-1 overflow-y-auto pb-24">
        <div style={{ position: 'relative', height: '280px' }}>
          <img src={`https://images.unsplash.com/photo-${ev.photo}?w=800&h=560&fit=crop&auto=format&q=85`} alt={ev.title} className="w-full h-full object-cover" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%, rgba(5,5,5,0.85) 100%)' }} />
          <div className="absolute flex items-center justify-between px-5" style={{ top: '52px', left: 0, right: 0 }}>
            <button onClick={() => go('explore')} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
              <ChevronLeftIcon />
            </button>
            <div className="flex gap-2">
              <button onClick={() => setSaved(v => !v)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? G : 'none'} stroke={saved ? G : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
              <button style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                <ShareIcon />
              </button>
            </div>
          </div>
          {(ev.soldOut || ev.ended) && (
            <div style={{ position: 'absolute', bottom: '16px', left: '20px', padding: '5px 14px', borderRadius: '10px', background: 'rgba(255,92,92,0.2)', border: '1px solid rgba(255,92,92,0.35)', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: 700, color: '#FF5C5C' }}>{ev.ended ? 'Event Ended' : 'Sold Out'}</span>
            </div>
          )}
        </div>
        <div className="px-5 pt-5 flex flex-col gap-4">
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', marginBottom: '14px' }}>{ev.title}</h1>
            <div className="flex flex-col gap-2.5">
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, text: `${ev.date} · ${ev.time}` },
                { icon: <PinSmIcon />, text: `${ev.area}, Lagos` },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>, text: `${ev.going} attending · ${ev.capacity} capacity` },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span style={{ flexShrink: 0 }}>{row.icon}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>{row.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              <img src={`https://images.unsplash.com/photo-1563132337-f159f484226c?w=80&h=80&fit=crop&auto=format&q=60`} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Organised by</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{ev.org}</p>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>About</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>{ev.desc}</p>
          </div>
          {!ev.ended && (
            <div>
              <div className="flex justify-between mb-2">
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>{ev.going} attending</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{ev.capacity} capacity</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '2px', background: ev.soldOut ? '#FF5C5C' : G, width: `${Math.min(100, Math.round((ev.going / ev.capacity) * 100))}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4" style={{ background: 'rgba(5,5,5,0.95)', borderTop: `1px solid ${GLASS_BORDER}`, backdropFilter: 'blur(12px)' }}>
        <button onClick={() => { if (!ctaDisabled) { if (ev.free) setRsvped(true); else go('ticket-purchase') } }} style={{ width: '100%', height: '52px', borderRadius: '16px', background: ctaBg, color: ctaColor, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', border: ctaDisabled && !ev.soldOut && !ev.ended ? `1px solid ${GLASS_BORDER}` : 'none', transition: 'all 0.2s', cursor: ctaDisabled ? 'default' : 'pointer' }}>
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}

function PlaceDetailScreen({ go }: { go: (p: Page) => void }) {
  const place = PLACES_DATA.find(p => p.id === ACTIVE_PLACE_ID) ?? PLACES_DATA[0]
  const [saved, setSaved] = useState(false)

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <div className="flex-1 overflow-y-auto pb-24">
        <div style={{ position: 'relative', height: '240px' }}>
          <img src={`https://images.unsplash.com/photo-${place.photo}?w=800&h=480&fit=crop&auto=format&q=85`} alt={place.name} className="w-full h-full object-cover" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(5,5,5,0.7) 100%)' }} />
          <div className="absolute flex items-center justify-between px-5" style={{ top: '52px', left: 0, right: 0 }}>
            <button onClick={() => go('explore')} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
              <ChevronLeftIcon />
            </button>
            <div className="flex gap-2">
              <button onClick={() => setSaved(v => !v)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? G : 'none'} stroke={saved ? G : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
              <button style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
                <ShareIcon />
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 pt-5 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>{place.name}</h1>
              {place.verified && <VerifiedBadge />}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{place.category}</span>
              <div className="flex items-center gap-1">
                <StarFillIcon />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{place.rating}</span>
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{place.dist}</span>
              <div style={{ padding: '2px 8px', borderRadius: '6px', background: place.open ? 'rgba(130,219,126,0.1)' : 'rgba(255,92,92,0.1)', border: `1px solid ${place.open ? 'rgba(130,219,126,0.2)' : 'rgba(255,92,92,0.2)'}` }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: place.open ? G : '#FF5C5C' }}>{place.open ? 'Open now' : 'Closed'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{place.hours}</span>
          </div>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>About</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>{place.desc}</p>
          </div>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Contact & Info</p>
            <div className="flex gap-3">
              {place.phone && (
                <button className="flex-1 flex flex-col items-center gap-2 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11 19.79 19.79 0 0 1 1.61 2.34 2 2 0 0 1 3.58.16h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>Call</span>
                </button>
              )}
              <button className="flex-1 flex flex-col items-center gap-2 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>Directions</span>
              </button>
              <button className="flex-1 flex flex-col items-center gap-2 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>Website</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px' }}>
            <PinSmIcon />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>{place.area}, Lagos</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4" style={{ background: 'rgba(5,5,5,0.95)', borderTop: `1px solid ${GLASS_BORDER}`, backdropFilter: 'blur(12px)' }}>
        <PrimaryBtn label="Message Business" onClick={() => go('messages')} />
      </div>
    </div>
  )
}

// ─── EXPLORE SCREEN (HUB) ────────────────────────────────────────────────────
function ExploreScreen({ go }: { go: (p: Page) => void }) {
  const [section, setSection] = useState<'discover' | 'marketplace' | 'events' | 'places'>('discover')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const SECTIONS = [
    { key: 'discover' as const, label: 'Discover' },
    { key: 'marketplace' as const, label: 'Marketplace' },
    { key: 'events' as const, label: 'Events' },
    { key: 'places' as const, label: 'Business' },
  ]

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-start justify-between px-5 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '12px' }}>
        {showSearch ? (
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 flex items-center gap-2" style={{ background: '#111', border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px', padding: '0 14px', height: '40px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search people, listings, events…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
              {searchQ && <button onClick={() => setSearchQ('')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>}
            </div>
            <button onClick={() => { setShowSearch(false); setSearchQ('') }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: G, fontWeight: 600, flexShrink: 0 }}>Cancel</button>
          </div>
        ) : (
          <>
            <div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', lineHeight: 1.1 }}>Explore</h1>
              <div className="flex items-center gap-1 mt-1">
                <PinSmIcon />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Victoria Island, Lagos</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSearch(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
              <button style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, position: 'relative' }}>
                <BellIcon />
                <span style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', borderRadius: '50%', background: G, border: '1.5px solid #050505' }} />
              </button>
            </div>
          </>
        )}
      </div>
      <div className="flex gap-2 px-5 flex-shrink-0 mb-1 pb-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{ height: '36px', paddingLeft: '18px', paddingRight: '18px', borderRadius: '18px', flexShrink: 0, background: section === s.key ? G : 'rgba(255,255,255,0.05)', border: `1px solid ${section === s.key ? G : GLASS_BORDER}`, color: section === s.key ? DARK : LABEL, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: section === s.key ? 700 : 400, transition: 'all 0.2s' }}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto pb-28">
        {section === 'discover' && <DiscoverSection go={go} />}
        {section === 'marketplace' && <MarketplaceSection go={go} />}
        {section === 'events' && <EventsSection go={go} />}
        {section === 'places' && <PlacesSection go={go} />}
      </div>
      <TabBar active="explore" go={go} />
    </div>
  )
}

// ─── MESSAGING DATA & TYPES ──────────────────────────────────────────────────
type Convo = {
  id: number; type: 'friends' | 'marketplace' | 'business'
  name: string; handle: string; avatarId?: string
  lastMessage: string; time: string; unread: number; online: boolean
  isBusiness?: boolean; listing?: { title: string; price: string; photoId: string }
}
type ChatMsg = {
  id: number; from: 'me' | 'them'; text?: string; photoId?: string
  time: string; status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

let ACTIVE_CHAT_ID = 1

const CONVERSATIONS: Convo[] = [
  { id: 1, type: 'marketplace', name: 'Amaka Johnson', handle: '@amaka_vi', avatarId: '1563132337-f159f484226c', lastMessage: 'Hey, are you still interested in the table?', time: '10:42 AM', unread: 2, online: true, listing: { title: 'Solid Oak Dining Table', price: '₦95,000', photoId: '1579998120708-682dd8a5624f' } },
  { id: 2, type: 'friends', name: 'Emeka Obi', handle: '@emeka_vi', avatarId: '1649502913092-fb7f0e8fc632', lastMessage: 'The suya spot on Ajose is 🔥🔥', time: 'Yesterday', unread: 0, online: true },
  { id: 3, type: 'friends', name: 'Ngozi Adeyemi', handle: '@ngozi_lekki', avatarId: '1758525225816-8dd1901ef6ec', lastMessage: 'Are you coming to the cleanup on Saturday?', time: 'Yesterday', unread: 1, online: false },
  { id: 4, type: 'marketplace', name: 'Tunde Fashola', handle: '@tunde_vi', avatarId: '1572816225927-d08fb138f2b2', lastMessage: "I can do ₦70k, final price 🙏", time: 'Mon', unread: 0, online: false, listing: { title: 'Arched Floor Lamp', price: '₦75,000', photoId: '1673280401347-309363111070' } },
  { id: 5, type: 'business', name: 'Konga Express VI', handle: '@konga_vi', lastMessage: 'Your order #8821 is ready for pickup today!', time: 'Sun', unread: 0, online: false, isBusiness: true },
]

const CHAT_THREADS: Record<number, ChatMsg[]> = {
  1: [
    { id: 1, from: 'them', text: 'Hi! I noticed you were looking at my dining table listing 👋', time: '9:15 AM', status: 'read' },
    { id: 2, from: 'me', text: 'Yes! It looks beautiful. Is it still available?', time: '9:22 AM', status: 'read' },
    { id: 3, from: 'them', text: 'Still available 🙂 Barely used, bought it 8 months ago', time: '9:23 AM', status: 'read' },
    { id: 4, from: 'them', photoId: '1579998120708-682dd8a5624f', time: '9:24 AM', status: 'read' },
    { id: 5, from: 'me', text: 'It looks amazing. Would you take ₦80k?', time: '9:31 AM', status: 'read' },
    { id: 6, from: 'them', text: "I can't go below ₦90k — cost me ₦180k brand new", time: '9:45 AM', status: 'read' },
    { id: 7, from: 'me', text: 'Let me think about it and get back to you 🙏', time: '9:51 AM', status: 'read' },
    { id: 8, from: 'them', text: 'Hey, are you still interested in the table?', time: '10:42 AM', status: 'delivered' },
    { id: 9, from: 'them', text: "I have another interested buyer but I'd prefer to sell to a neighbour 😊", time: '10:42 AM', status: 'delivered' },
  ],
  2: [
    { id: 1, from: 'them', text: 'Bro! Did you catch the match last night 😭', time: '8:00 PM', status: 'read' },
    { id: 2, from: 'me', text: "Don't even remind me 💀 VAR still found a way", time: '8:05 PM', status: 'read' },
    { id: 3, from: 'them', text: 'Hahaha. Have you tried that new suya spot on Ajose?', time: '8:10 PM', status: 'read' },
    { id: 4, from: 'me', text: 'Not yet, is it good?', time: '8:12 PM', status: 'read' },
    { id: 5, from: 'them', text: 'The suya spot on Ajose is 🔥🔥', time: '8:15 PM', status: 'read' },
    { id: 6, from: 'them', text: "We should link up this weekend, I'll send you the location", time: '8:15 PM', status: 'read' },
  ],
  3: [
    { id: 1, from: 'them', text: 'Hi Amina! Quick reminder about the VI community cleanup this Saturday 🌿', time: 'Mon 3:00 PM', status: 'read' },
    { id: 2, from: 'me', text: 'Oh nice! What time does it start?', time: 'Mon 3:15 PM', status: 'read' },
    { id: 3, from: 'them', text: '7am at the roundabout near Bar Beach. Bring gloves!', time: 'Mon 3:16 PM', status: 'read' },
    { id: 4, from: 'them', text: 'Are you coming to the cleanup on Saturday?', time: 'Yesterday', status: 'delivered' },
  ],
}

const MSG_SEARCH_CONTACTS = [
  { id: 1, name: 'Amaka Johnson', handle: '@amaka_vi', avatarId: '1563132337-f159f484226c', area: 'Victoria Island' },
  { id: 2, name: 'Emeka Obi', handle: '@emeka_vi', avatarId: '1649502913092-fb7f0e8fc632', area: 'Victoria Island' },
  { id: 3, name: 'Ngozi Adeyemi', handle: '@ngozi_lekki', avatarId: '1758525225816-8dd1901ef6ec', area: 'Lekki Phase 1' },
  { id: 4, name: 'Tunde Fashola', handle: '@tunde_vi', avatarId: '1572816225927-d08fb138f2b2', area: 'Victoria Island' },
  { id: 5, name: 'Adaeze Nwosu', handle: '@ada_oshodi', avatarId: '1673280401347-309363111070', area: 'Oshodi' },
  { id: 6, name: 'Babajide Adewale', handle: '@babs_lekki', avatarId: '1654762550505-7c58277e0fac', area: 'Lekki Phase 1' },
]

// ─── Messaging helper components ──────────────────────────────────────────────
function DeliveryIcon({ status }: { status: ChatMsg['status'] }) {
  if (status === 'sending') return <span style={{ fontSize: '9px', color: LABEL, lineHeight: 1 }}>●</span>
  if (status === 'sent') return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 5l3.5 3.5L13 1"/></svg>
  )
  if (status === 'delivered') return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 5l3 3L10 1"/><path d="M8 5l3 3L17 1"/></svg>
  )
  if (status === 'read') return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 5l3 3L10 1"/><path d="M8 5l3 3L17 1"/></svg>
  )
  if (status === 'failed') return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF5C5C" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
  return null
}

function ConvoAvatar({ convo, size = 48 }: { convo: Convo; size?: number }) {
  const dot = Math.max(10, Math.round(size * 0.22))
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#1A1A1A' }}>
        {convo.avatarId ? (
          <img src={`https://images.unsplash.com/photo-${convo.avatarId}?w=100&h=100&fit=crop&auto=format&q=70`} alt={convo.name} className="w-full h-full object-cover" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(130,219,126,0.07)', fontSize: Math.round(size * 0.38) }}>
            {convo.isBusiness ? '🏪' : '👤'}
          </div>
        )}
      </div>
      {convo.online && (
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: dot, height: dot, borderRadius: '50%', background: G, border: '2px solid #050505' }} />
      )}
    </div>
  )
}

// ─── 27. MESSAGES INBOX ──────────────────────────────────────────────────────
function MessagesScreen({ go }: { go: (p: Page) => void }) {
  const [filter, setFilter] = useState<'all' | 'friends' | 'marketplace' | 'business'>('all')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const FILTERS = ['all', 'friends', 'marketplace', 'business'] as const
  const FILTER_LABELS: Record<string, string> = { all: 'All', friends: 'Friends', marketplace: 'Marketplace', business: 'Business' }

  const visible = CONVERSATIONS.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false
    if (query) return c.name.toLowerCase().includes(query.toLowerCase()) || c.lastMessage.toLowerCase().includes(query.toLowerCase())
    return true
  })

  const totalUnread = CONVERSATIONS.reduce((s, c) => s + c.unread, 0)

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-5 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '14px' }}>
        {searching ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-3 flex-1 px-4" style={{ height: '42px', background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '21px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
              {query && <button onClick={() => setQuery('')} style={{ color: LABEL, fontSize: '14px', lineHeight: 1 }}>✕</button>}
            </div>
            <button onClick={() => { setSearching(false); setQuery('') }} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: G, flexShrink: 0 }}>Cancel</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>Messages</h1>
              {totalUnread > 0 && (
                <div style={{ minWidth: '20px', height: '20px', borderRadius: '10px', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '5px', paddingRight: '5px' }}>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: 700, color: DARK }}>{totalUnread}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSearching(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
              <button onClick={() => go('new-message')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DARK }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Category filter pills */}
      {!searching && (
        <div className="flex gap-2 px-5 mb-2 flex-shrink-0" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ height: '32px', paddingLeft: '16px', paddingRight: '16px', borderRadius: '16px', flexShrink: 0, background: filter === f ? 'rgba(130,219,126,0.1)' : 'transparent', border: `1px solid ${filter === f ? 'rgba(130,219,126,0.22)' : GLASS_BORDER}`, color: filter === f ? G : LABEL, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: filter === f ? 600 : 400, transition: 'all 0.2s' }}>
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-28">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-8 gap-4 text-center">
            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>💬</div>
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', marginBottom: '6px' }}>No messages yet</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL, lineHeight: 1.55 }}>Say hello to someone in your neighbourhood.</p>
            </div>
            <button onClick={() => go('new-message')} style={{ height: '44px', paddingLeft: '24px', paddingRight: '24px', borderRadius: '22px', background: G, color: DARK, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px' }}>Start a Conversation</button>
          </div>
        ) : (
          visible.map(convo => (
            <button key={convo.id} onClick={() => { ACTIVE_CHAT_ID = convo.id; go('chat') }} className="w-full flex items-center gap-4 px-5" style={{ paddingTop: '13px', paddingBottom: '13px', background: convo.unread > 0 ? 'rgba(130,219,126,0.025)' : 'transparent', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <ConvoAvatar convo={convo} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: convo.unread > 0 ? 700 : 600, fontSize: '15px', color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{convo.name}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: convo.unread > 0 ? G : LABEL, flexShrink: 0, marginLeft: '10px' }}>{convo.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: convo.unread > 0 ? 'rgba(255,255,255,0.68)' : LABEL, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', fontWeight: convo.unread > 0 ? 500 : 400 }}>{convo.lastMessage}</span>
                  {convo.unread > 0 && (
                    <div style={{ minWidth: '20px', height: '20px', borderRadius: '10px', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '5px', paddingRight: '5px', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '11px', fontWeight: 700, color: DARK }}>{convo.unread}</span>
                    </div>
                  )}
                </div>
                {convo.listing && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H18l2 6H4L6 2zm-2 6v14h16V8"/></svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{convo.listing.title} · {convo.listing.price}</span>
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <TabBar active="messages" go={go} />
    </div>
  )
}

// ─── 28. NEW MESSAGE ─────────────────────────────────────────────────────────
function NewMessageScreen({ go }: { go: (p: Page) => void }) {
  const [query, setQuery] = useState('')
  const results = query
    ? MSG_SEARCH_CONTACTS.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.handle.toLowerCase().includes(query.toLowerCase()))
    : MSG_SEARCH_CONTACTS

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-4 px-5 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '16px' }}>
        <button onClick={() => go('messages')} style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <ChevronLeftIcon />
        </button>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff' }}>New Message</h1>
      </div>

      <div className="px-5 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 px-4" style={{ height: '48px', background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or @username" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff' }} />
          {query && <button onClick={() => setQuery('')} style={{ color: LABEL, fontSize: '14px' }}>✕</button>}
        </div>
      </div>

      <div className="px-5 mb-3 flex-shrink-0">
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{query ? 'Results' : 'Suggested'}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <span style={{ fontSize: '28px' }}>🔍</span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>No neighbours found for "{query}"</p>
          </div>
        ) : results.map(c => (
          <button key={c.id} onClick={() => { const ex = CONVERSATIONS.find(cv => cv.id === c.id); ACTIVE_CHAT_ID = ex?.id ?? c.id; go('chat') }} className="w-full flex items-center gap-4 px-5" style={{ paddingTop: '13px', paddingBottom: '13px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#1A1A1A', flexShrink: 0 }}>
              <img src={`https://images.unsplash.com/photo-${c.avatarId}?w=100&h=100&fit=crop&auto=format&q=70`} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 text-left">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '15px', color: '#fff' }}>{c.name}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{c.handle}</p>
            </div>
            <div className="flex items-center gap-1">
              <PinSmIcon />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{c.area}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 29. CHAT SCREEN ─────────────────────────────────────────────────────────
function ChatScreen({ go }: { go: (p: Page) => void }) {
  const convo = CONVERSATIONS.find(c => c.id === ACTIVE_CHAT_ID) ?? CONVERSATIONS[0]
  const initialThread: ChatMsg[] = CHAT_THREADS[ACTIVE_CHAT_ID] ?? [
    { id: 1, from: 'them', text: convo.lastMessage, time: convo.time, status: 'delivered' },
  ]

  const [messages, setMessages] = useState<ChatMsg[]>(initialThread)
  const [draft, setDraft] = useState('')
  const [showAttach, setShowAttach] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMsg = () => {
    const text = draft.trim()
    if (!text) return
    const id = messages.length + 1
    setMessages(prev => [...prev, { id, from: 'me', text, time: 'Now', status: 'sending' }])
    setDraft('')
    setTimeout(() => setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'delivered' } : m)), 900)
  }

  // Group consecutive messages from same sender
  const grouped = messages.map((msg, i) => ({
    ...msg,
    isFirst: i === 0 || messages[i - 1].from !== msg.from,
    isLast: i === messages.length - 1 || messages[i + 1].from !== msg.from,
  }))

  const ATTACH_OPTIONS = [
    { emoji: '🖼️', label: 'Photo Library' }, { emoji: '📷', label: 'Camera' },
    { emoji: '📍', label: 'Location' }, { emoji: '🛒', label: 'Listing' },
    { emoji: '🎟️', label: 'Event' }, { emoji: '📄', label: 'Document' },
    { emoji: '🎵', label: 'Audio' }, { emoji: '💳', label: 'Payment' },
  ]

  const CHAT_OPTIONS = [
    { icon: '🔍', label: 'Search Conversation', danger: false },
    { icon: '🔕', label: 'Mute Notifications', danger: false },
    { icon: '🚩', label: 'Report', danger: false },
    { icon: '🚫', label: 'Block', danger: true },
    { icon: '🗑️', label: 'Delete Conversation', danger: true },
  ]

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 flex-shrink-0" style={{ paddingTop: '58px', paddingBottom: '12px', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        <button onClick={() => go('messages')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
          <ChevronLeftIcon />
        </button>
        <div onClick={() => {}} style={{ cursor: 'pointer' }}>
          <ConvoAvatar convo={convo} size={38} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.name}</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: convo.online ? G : LABEL }}>{convo.online ? '● Online' : convo.handle}</p>
        </div>
        <button onClick={() => setShowOptions(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, flexShrink: 0 }}>
          <DotsIcon />
        </button>
      </div>

      {/* Marketplace context banner */}
      {convo.listing && (
        <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.015)', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
            <img src={`https://images.unsplash.com/photo-${convo.listing.photoId}?w=100&h=100&fit=crop&auto=format&q=70`} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{convo.listing.title}</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: G }}>{convo.listing.price}</p>
          </div>
          <button style={{ height: '30px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '15px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.18)', color: G, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>View Listing</button>
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 flex flex-col gap-0.5">
        {/* Date separator */}
        <div className="flex justify-center mb-4">
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, background: 'rgba(255,255,255,0.04)', padding: '3px 14px', borderRadius: '20px' }}>Today</span>
        </div>

        {grouped.map(msg => {
          const isMe = msg.from === 'me'
          const bubbleRadius = isMe
            ? (msg.isFirst ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
            : (msg.isFirst ? '18px 18px 18px 4px' : '4px 18px 18px 4px')

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`} style={{ marginTop: msg.isFirst ? '10px' : '2px' }}>
              {/* Incoming avatar / spacer */}
              {!isMe && (
                <div style={{ width: '28px', marginRight: '8px', alignSelf: 'flex-end', marginBottom: '2px', flexShrink: 0 }}>
                  {msg.isFirst && convo.avatarId && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden' }}>
                      <img src={`https://images.unsplash.com/photo-${convo.avatarId}?w=60&h=60&fit=crop&auto=format&q=60`} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              <div style={{ maxWidth: '72%' }}>
                {msg.photoId ? (
                  <div style={{ width: '190px', height: '140px', borderRadius: bubbleRadius, overflow: 'hidden' }}>
                    <img src={`https://images.unsplash.com/photo-${msg.photoId}?w=400&h=300&fit=crop&auto=format&q=70`} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', borderRadius: bubbleRadius, background: isMe ? 'rgba(130,219,126,0.12)' : '#1A1A1A', border: `1px solid ${isMe ? 'rgba(130,219,126,0.16)' : 'rgba(255,255,255,0.06)'}` }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff', lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                  </div>
                )}

                {msg.isLast && (
                  <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{msg.time}</span>
                    {isMe && <DeliveryIcon status={msg.status} />}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 px-4 pt-3 pb-7" style={{ background: '#050505', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
        <div className="flex items-end gap-3">
          <button onClick={() => setShowAttach(true)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#111', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>

          <div style={{ flex: 1, background: '#0f0f0f', border: `1px solid ${draft ? 'rgba(130,219,126,0.22)' : GLASS_BORDER}`, borderRadius: '22px', padding: '10px 16px', transition: 'border-color 0.2s' }}>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }} placeholder="Message…" rows={1} style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff', resize: 'none', lineHeight: '1.5', maxHeight: '96px', overflow: 'auto' }} />
          </div>

          <button onClick={sendMsg} disabled={!draft.trim()} style={{ width: '40px', height: '40px', borderRadius: '50%', background: draft.trim() ? G : '#111', border: `1px solid ${draft.trim() ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: draft.trim() ? DARK : MUTED, flexShrink: 0, transition: 'all 0.2s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>

      {/* Attachment bottom sheet */}
      {showAttach && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, backdropFilter: 'blur(6px)' }} onClick={() => setShowAttach(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0f0f0f', borderRadius: '28px 28px 0 0', border: `1px solid ${GLASS_BORDER}`, padding: '20px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '16px' }}>Attach</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {ATTACH_OPTIONS.map(item => (
                <button key={item.label} onClick={() => setShowAttach(false)} className="flex flex-col items-center gap-2 py-3">
                  <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{item.emoji}</div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: MUTED, textAlign: 'center' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Options bottom sheet */}
      {showOptions && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, backdropFilter: 'blur(6px)' }} onClick={() => setShowOptions(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0f0f0f', borderRadius: '28px 28px 0 0', border: `1px solid ${GLASS_BORDER}`, padding: '20px 0 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '0 auto 16px' }} />
            {CHAT_OPTIONS.map((opt, i, arr) => (
              <div key={opt.label}>
                <button onClick={() => setShowOptions(false)} className="w-full flex items-center gap-4 px-6 py-4">
                  <span style={{ fontSize: '19px', lineHeight: 1 }}>{opt.icon}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 500, color: opt.danger ? '#FF5C5C' : '#fff' }}>{opt.label}</span>
                </button>
                {i < arr.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '62px' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMMUNITY ────────────────────────────────────────────────────────────────
const CONNECTIONS = [
  { id: 1, name: 'Chidi Okeke', handle: '@chidi_ok', area: 'Lekki Phase 1', avatarId: '1499628212640-7b2160c8f4f3', mutual: 3 },
  { id: 2, name: 'Amaka Eze', handle: '@amaka.e', area: 'Ajah', avatarId: '1531746020798-c70a81bd6a52', mutual: 1 },
  { id: 3, name: 'Tunde Adeyemi', handle: '@tunde_ade', area: 'Victoria Island', avatarId: '1507003211169-0a1dd7228f2d', mutual: 5 },
  { id: 4, name: 'Ngozi Obi', handle: '@ngozi_obi', area: 'Surulere', avatarId: '1531123897728-9d9e7b9cba1e', mutual: 2 },
  { id: 5, name: 'Emeka Nwosu', handle: '@emeka_n', area: 'Yaba', avatarId: '1500648767791-d7b8de5614b0', mutual: 4 },
]
const SUGGESTIONS = [
  { id: 10, name: 'Adaeze Okafor', handle: '@adaeze_ok', area: 'Lekki Phase 1', dist: '0.4 km', avatarId: '1531123897728-9d9e7b9cba1e', type: 'nearby' as const, context: '0.4 km away', listings: 5 },
  { id: 11, name: 'Kelechi Mba', handle: '@kelechi_m', area: 'VI', dist: '1.2 km', avatarId: '1507003211169-0a1dd7228f2d', type: 'mutual' as const, context: 'Followed by Amaka & Tunde', listings: 0 },
  { id: 12, name: 'Funke Adeola', handle: '@funke_ad', area: 'Ikeja', dist: '3.1 km', avatarId: '1502823403499-6ccfcf4fb453', type: 'seller' as const, context: 'Active seller · 12 listings', listings: 12 },
  { id: 13, name: 'Seun Balogun', handle: '@seun_b', area: 'Ajah', dist: '0.9 km', avatarId: '1502823403499-6ccfcf4fb453', type: 'nearby' as const, context: '0.9 km away', listings: 0 },
  { id: 14, name: 'Chisom Eze', handle: '@chisom_e', area: 'Lekki', dist: '1.8 km', avatarId: '1531746020798-c70a81bd6a52', type: 'mutual' as const, context: 'Followed by Chidi & Ngozi', listings: 3 },
]
const REQUESTS = [
  { id: 20, name: 'Blessing Okonkwo', handle: '@blessing_ok', area: 'Ikeja', avatarId: '1502823403499-6ccfcf4fb453', mutual: 2 },
  { id: 21, name: 'Dele Fashola', handle: '@dele_f', area: 'Lekki', avatarId: '1500648767791-d7b8de5614b0', mutual: 1 },
]

function CommunityScreen({ go }: { go: (p: Page) => void }) {
  const [tab, setTab] = useState<'connections' | 'discover'>('connections')
  const [search, setSearch] = useState('')
  const [requests, setRequests] = useState(REQUESTS)
  const [connections, setConnections] = useState(CONNECTIONS)
  const [connected, setConnected] = useState<number[]>([])
  const [discoverFilter, setDiscoverFilter] = useState<'all' | 'nearby' | 'mutual' | 'seller'>('all')

  const filteredConns = connections.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.handle.toLowerCase().includes(search.toLowerCase())
  )
  const discSuggestions = SUGGESTIONS.filter(s =>
    discoverFilter === 'all' ? true : s.type === discoverFilter
  )

  const accept = (id: number) => {
    const req = requests.find(r => r.id === id)
    if (req) {
      setConnections(c => [...c, { ...req, mutual: req.mutual }])
      setRequests(r => r.filter(x => x.id !== id))
    }
  }
  const decline = (id: number) => setRequests(r => r.filter(x => x.id !== id))

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      {/* Header */}
      <div style={{ padding: '54px 20px 0' }}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => go('profile')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex-1">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', lineHeight: 1 }}>Community</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>My People</p>
          </div>
          <div className="flex gap-1.5">
            {[{ n: '47', l: 'connections' }, { n: '2', l: 'requests' }].map(s => (
              <div key={s.l} className="flex flex-col items-center px-3 py-2" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}`, borderRadius: '12px' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', lineHeight: 1 }}>{s.n}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: LABEL }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 mt-3 mb-3 px-3" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px', height: '40px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search connections…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mb-0" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '4px' }}>
          {(['connections', 'discover'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 capitalize"
              style={{ borderRadius: '11px', background: tab === t ? '#fff' : 'transparent', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: tab === t ? DARK : MUTED, transition: 'all 0.2s' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 mt-4">
        {tab === 'connections' && (
          <>
            {/* Pending requests */}
            {requests.length > 0 && (
              <div className="mb-5">
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Requests · {requests.length}</p>
                <div className="flex flex-col gap-3">
                  {requests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3.5" style={{ background: '#0f0f0f', border: `1px solid rgba(130,219,126,0.18)`, borderRadius: '20px' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={`https://images.unsplash.com/photo-${req.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${G}` }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{req.name}</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{req.area} · {req.mutual} mutual</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => accept(req.id)} style={{ padding: '6px 12px', borderRadius: '10px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: DARK }}>Accept</button>
                        <button onClick={() => decline(req.id)} style={{ padding: '6px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connections list */}
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Connections · {connections.length}</p>
            {filteredConns.length > 0 ? (
              <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '22px', overflow: 'hidden' }}>
                {filteredConns.map((m, i) => (
                  <div key={m.id}>
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <img src={`https://images.unsplash.com/photo-${m.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{m.name}</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{m.handle} · {m.area}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => go('chat')} style={{ padding: '6px 12px', borderRadius: '10px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '12px', color: G }}>Message</button>
                        <button style={{ width: '32px', height: '32px', borderRadius: '10px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                        </button>
                      </div>
                    </div>
                    {i < filteredConns.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '60px' }} />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-14 gap-3">
                <div style={{ width: '52px', height: '52px', borderRadius: '18px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.6" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>Build your community</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, textAlign: 'center', maxWidth: '220px' }}>Start connecting with people around you.</p>
                <button onClick={() => setTab('discover')} style={{ padding: '10px 24px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>Discover Neighbors</button>
              </div>
            )}
          </>
        )}

        {tab === 'discover' && (
          <>
            {/* Filter pills */}
            <div className="flex gap-2 mb-5" style={{ overflowX: 'auto' }}>
              {([['all', 'All'], ['nearby', 'Neighbors'], ['mutual', 'Mutuals'], ['seller', 'Sellers']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setDiscoverFilter(key)}
                  style={{ height: '32px', paddingLeft: '14px', paddingRight: '14px', borderRadius: '16px', background: discoverFilter === key ? G : '#111', border: `1px solid ${discoverFilter === key ? G : GLASS_BORDER}`, color: discoverFilter === key ? DARK : MUTED, fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: discoverFilter === key ? 700 : 500, flexShrink: 0, transition: 'all 0.2s' }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {discSuggestions.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
                  <img src={`https://images.unsplash.com/photo-${s.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{s.name}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginTop: '1px' }}>{s.context}</p>
                  </div>
                  <button onClick={() => setConnected(c => c.includes(s.id) ? c : [...c, s.id])}
                    style={{ padding: '7px 14px', borderRadius: '12px', flexShrink: 0, background: connected.includes(s.id) ? SURFACE : 'rgba(130,219,126,0.1)', border: `1px solid ${connected.includes(s.id) ? GLASS_BORDER : 'rgba(130,219,126,0.25)'}`, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: connected.includes(s.id) ? MUTED : G, transition: 'all 0.2s' }}>
                    {connected.includes(s.id) ? 'Sent' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── TICKETS ──────────────────────────────────────────────────────────────────
function TicketsScreen({ go }: { go: (p: Page) => void }) {
  const TICKETS = [
    { event: 'Lagos Tech Summit 2025', date: 'Sat, 9 Aug · 10:00 AM', venue: 'Eko Convention Centre, VI', type: 'VIP Access', price: '₦15,000', photoId: '1540575861846-d775fab174ef', code: 'YRDT-VIP-9821' },
    { event: 'Afrobeats Night at Terra', date: 'Fri, 15 Aug · 8:00 PM', venue: 'Terra Kulture, Victoria Island', type: 'General Admission', price: 'Free', photoId: '1493225457124-a3eb161ffa5f', code: 'YRDT-GA-4453' },
  ]
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <DetailHeader title="My Tickets" onBack={() => go('profile')} />
      <div className="flex-1 overflow-y-auto pb-8 px-5">
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', marginTop: '4px' }}>Upcoming · {TICKETS.length}</p>
        <div className="flex flex-col gap-4">
          {TICKETS.map(t => (
            <div key={t.code} style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px', overflow: 'hidden' }}>
              <img src={`https://images.unsplash.com/photo-${t.photoId}?w=600&h=200&fit=crop&auto=format&q=80`} alt="" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
              <div className="p-5">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', marginBottom: '4px' }}>{t.event}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, marginBottom: '2px' }}>{t.date}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '16px' }}>{t.venue}</p>
                <div className="flex items-center justify-between">
                  <div style={{ background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.2)', borderRadius: '10px', padding: '6px 12px' }}>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: G }}>{t.type}</p>
                  </div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{t.price}</p>
                </div>
                <button onClick={() => go('ticket-qr')} style={{ marginTop: '14px', width: '100%', padding: '12px', background: 'rgba(130,219,126,0.06)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="9" height="9"/><rect x="13" y="2" width="9" height="9"/><rect x="2" y="13" width="9" height="9"/><path d="M13 18h2M15 13h4M17 18h4M19 13v2"/></svg>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: G }}>View Ticket QR</p>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Past Events</p>
          <div className="flex flex-col items-center py-10 gap-3">
            <div style={{ width: '52px', height: '52px', borderRadius: '18px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/></svg>
            </div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>No past events yet</p>
            <button onClick={() => go('explore')} style={{ marginTop: '4px', padding: '10px 24px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>Explore Events</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MY EVENTS ────────────────────────────────────────────────────────────────
function MyEventsScreen({ go }: { go: (p: Page) => void }) {
  const MY_EVENTS = [
    { title: 'Lekki Community Football Match', date: 'Sun, 10 Aug · 4:00 PM', area: 'Lekki Phase 1', going: 34, photoId: '1546519638-59a6236b39be', status: 'live' },
    { title: 'Neighbourhood Clean-Up Drive', date: 'Sat, 23 Aug · 8:00 AM', area: 'Victoria Island', going: 18, photoId: '1529156069898-49953e39b3ac', status: 'draft' },
  ]
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => go('profile')} style={{ width: '36px', height: '36px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>My Events</p>
        </div>
        <button onClick={() => go('create-event')} style={{ padding: '8px 16px', borderRadius: '12px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: DARK, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pb-8 px-5 mt-5">
        {MY_EVENTS.length > 0 ? (
          <div className="flex flex-col gap-4">
            {MY_EVENTS.map(ev => (
              <div key={ev.title} style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '24px', overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img src={`https://images.unsplash.com/photo-${ev.photoId}?w=600&h=180&fit=crop&auto=format&q=80`} alt="" style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', borderRadius: '8px', background: ev.status === 'live' ? 'rgba(130,219,126,0.9)' : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '11px', color: ev.status === 'live' ? DARK : '#fff' }}>{ev.status === 'live' ? '● Live' : 'Draft'}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>{ev.title}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED, marginBottom: '2px' }}>{ev.date}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '14px' }}>{ev.area}</p>
                  <div className="flex items-center justify-between">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>{ev.going} going</p>
                    <div className="flex gap-2">
                      <button style={{ padding: '6px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>Edit</button>
                      <button onClick={() => go('event-manage')} style={{ padding: '6px 14px', borderRadius: '10px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '12px', color: G }}>Manage</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 gap-3">
            <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff' }}>No events yet</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, textAlign: 'center', maxWidth: '220px' }}>Events you create will appear here.</p>
            <button onClick={() => go('create-event')} style={{ marginTop: '4px', padding: '10px 24px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>Create Event</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CREATE POST ──────────────────────────────────────────────────────────────
function CreatePostScreen({ go }: { go: (p: Page) => void }) {
  const [text, setText] = useState('')
  const [photos] = useState(['1531746020798-c70a81bd6a52', '1529156069898-49953e39b3ac'])
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)

  const doPost = () => {
    if (!text.trim() && attachedPhotos.length === 0) return
    setPosting(true)
    setTimeout(() => { setPosting(false); setPosted(true) }, 1500)
  }

  if (posted) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', gap: '16px', padding: '40px 32px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff', textAlign: 'center' }}>Posted!</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6 }}>Your post is now live in your neighbourhood.</p>
      <button onClick={() => go('feed')} style={{ marginTop: '8px', padding: '14px 40px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>Back to Feed</button>
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '54px 20px 0' }}>
        <button onClick={() => go('feed')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: MUTED }}>Cancel</button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff' }}>New Post</p>
        <button onClick={doPost} disabled={!text.trim() && attachedPhotos.length === 0}
          style={{ padding: '8px 18px', borderRadius: '12px', background: (text.trim() || attachedPhotos.length > 0) ? G : 'rgba(130,219,126,0.25)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: (text.trim() || attachedPhotos.length > 0) ? DARK : 'rgba(130,219,126,0.5)', transition: 'all 0.2s' }}>
          {posting ? '...' : 'Post'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Author row */}
        <div className="flex items-center gap-3 px-5 py-4">
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>YO</span>
          </div>
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Your Name</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${GLASS_BORDER}` }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: MUTED }}>Neighbourhood</span>
            </div>
          </div>
        </div>

        {/* Text composer */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What's happening in your neighbourhood?"
          className="w-full px-5 pb-4 resize-none"
          rows={7}
          style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#fff', lineHeight: 1.65, caretColor: G }}
        />

        {/* Attached photos */}
        {attachedPhotos.length > 0 && (
          <div className="px-5 pb-4 flex gap-2 flex-wrap">
            {attachedPhotos.map((pid, i) => (
              <div key={i} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '14px', overflow: 'hidden' }}>
                <img src={`https://images.unsplash.com/photo-${pid}?w=200&h=200&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setAttachedPhotos(p => p.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: '5px', right: '5px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachment toolbar */}
      <div style={{ borderTop: `1px solid ${GLASS_BORDER}`, padding: '12px 20px 34px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        {photos.map((pid, i) => (
          <button key={i} onClick={() => setAttachedPhotos(p => p.includes(pid) ? p : [...p, pid])}
            style={{ width: '44px', height: '44px', borderRadius: '14px', overflow: 'hidden', border: `2px solid ${attachedPhotos.includes(pid) ? G : 'transparent'}`, flexShrink: 0 }}>
            <img src={`https://images.unsplash.com/photo-${pid}?w=88&h=88&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        <button style={{ width: '44px', height: '44px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─── CREATE FOR SALE ──────────────────────────────────────────────────────────
function CreateForSaleScreen({ go }: { go: (p: Page) => void }) {
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [location, setLocation] = useState('')
  const [desc, setDesc] = useState('')
  const [listing, setListing] = useState(false)
  const [listed, setListed] = useState(false)

  const STEPS = ['Photos', 'Details', 'Description', 'Review']
  const CATEGORIES = ['Fashion', 'Electronics', 'Home & Living', 'Vehicles', 'Food', 'Gaming', 'Books', 'Beauty', 'Services', 'Other']
  const CONDITIONS = ['New', 'Used – Like New', 'Used – Good', 'Fair']
  const PHOTO_IDS = ['1556742049-0cfed4f6a45d', '1523275335684-37898b6baf30', '1585386959984-a4155224a1ad']

  if (listed) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', gap: '16px', padding: '40px 32px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff', textAlign: 'center' }}>Item Listed!</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: '260px' }}>Your listing is now live in the neighbourhood marketplace.</p>
      <button onClick={() => go('explore')} style={{ marginTop: '8px', padding: '14px 40px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>View Marketplace</button>
      <button onClick={() => go('feed')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>Back to Feed</button>
    </div>
  )

  const canNext = [
    true,
    title.trim() && price.trim() && category && condition && location,
    desc.trim(),
    true,
  ][step]

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '54px 20px 0' }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : go('feed')} style={{ width: '36px', height: '36px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Item for Sale</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ margin: '14px 20px 0', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', borderRadius: '2px', background: G, width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.35s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {step === 0 && (
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff', marginBottom: '4px' }}>Add Photos</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '20px' }}>First photo becomes your listing cover.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {PHOTO_IDS.map((pid, i) => (
                <div key={i} style={{ aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: i === 0 ? `2px solid ${G}` : '2px solid transparent' }}>
                  <img src={`https://images.unsplash.com/photo-${pid}?w=200&h=200&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <div style={{ position: 'absolute', bottom: '5px', left: '50%', transform: 'translateX(-50%)', padding: '2px 8px', borderRadius: '6px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '9px', color: DARK, whiteSpace: 'nowrap' }}>COVER</div>}
                </div>
              ))}
              <button style={{ aspectRatio: '1', borderRadius: '16px', background: SURFACE, border: `1px dashed rgba(255,255,255,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</p>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Nike Air Max 90, Blue" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Price (₦)</p>
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="₦ 0" type="number" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 14px', borderRadius: '12px', background: category === c ? 'rgba(130,219,126,0.15)' : SURFACE, border: `1px solid ${category === c ? 'rgba(130,219,126,0.35)' : GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '13px', color: category === c ? G : MUTED }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Condition</p>
              <div className="flex flex-col gap-2">
                {CONDITIONS.map(c => (
                  <button key={c} onClick={() => setCondition(c)} className="flex items-center gap-3 px-4 py-3" style={{ borderRadius: '14px', background: condition === c ? 'rgba(130,219,126,0.08)' : SURFACE, border: `1px solid ${condition === c ? 'rgba(130,219,126,0.25)' : GLASS_BORDER}`, textAlign: 'left' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${condition === c ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {condition === c && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: G }} />}
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: condition === c ? '#fff' : MUTED }}>{c}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</p>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lekki Phase 1, Lagos" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff', marginBottom: '4px' }}>Description</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '20px' }}>Describe the item — condition, features, why you're selling.</p>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Barely used, bought last year. No scratches..." rows={10}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.65, resize: 'none', outline: 'none' }} />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5 pb-4">
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '19px', color: '#fff' }}>Preview</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginTop: '2px' }}>This is how your listing appears on the feed and marketplace.</p>
            </div>

            {/* Feed card preview */}
            <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', overflow: 'hidden' }}>
              {/* Author row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=80&h=80&fit=crop&auto=format" alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <div className="flex-1">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Amina Bello</p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>Just now</span>
                    {location && <><span style={{ color: LABEL, fontSize: '10px' }}>·</span><span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{location}</span></>}
                  </div>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>For Sale</span>
                </div>
              </div>

              {/* Cover photo */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
                <img src={`https://images.unsplash.com/photo-${PHOTO_IDS[0]}?w=600&h=450&fit=crop&auto=format&q=85`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* Price badge overlay */}
                {price && (
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', padding: '6px 14px', borderRadius: '12px', background: G, backdropFilter: 'blur(8px)' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>₦{Number(price).toLocaleString()}</span>
                  </div>
                )}
                {/* Condition badge */}
                {condition && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#fff' }}>{condition}</span>
                  </div>
                )}
              </div>

              {/* Title + meta */}
              <div className="px-4 py-3">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff', marginBottom: '4px' }}>{title || 'Item Title'}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {category && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, padding: '2px 10px', borderRadius: '20px', background: SURFACE, border: `1px solid ${GLASS_BORDER}` }}>{category}</span>}
                  {location && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{location}</span>}
                </div>
                {desc && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55, marginTop: '8px' }}>{desc.slice(0, 120)}{desc.length > 120 ? '…' : ''}</p>}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 px-4 pb-4">
                <button style={{ flex: 1, height: '38px', borderRadius: '12px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: DARK }}>Message Seller</button>
                <button style={{ height: '38px', width: '38px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                </button>
              </div>
            </div>

            {/* All photos strip */}
            {PHOTO_IDS.length > 1 && (
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '10px' }}>{PHOTO_IDS.length} photos</p>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {PHOTO_IDS.map((pid, i) => (
                    <div key={i} style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: i === 0 ? `2px solid ${G}` : 'none' }}>
                      <img src={`https://images.unsplash.com/photo-${pid}?w=160&h=160&fit=crop&auto=format&q=80`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit reminder */}
            <div className="flex items-start gap-3 px-4 py-3" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.15)', borderRadius: '14px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55 }}>Your listing will appear on the neighbourhood feed and marketplace as soon as you tap <strong style={{ color: '#fff' }}>List Item</strong>.</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => {
          if (step < STEPS.length - 1) { setStep(s => s + 1) }
          else { setListing(true); setTimeout(() => { setListing(false); setListed(true) }, 1600) }
        }} disabled={!canNext}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: canNext ? G : 'rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: canNext ? DARK : 'rgba(130,219,126,0.4)', transition: 'all 0.2s' }}>
          {listing ? 'Listing…' : step < STEPS.length - 1 ? 'Continue' : 'List Item'}
        </button>
      </div>
    </div>
  )
}

// ─── CREATE EVENT ─────────────────────────────────────────────────────────────
type TicketTier = { id: number; name: string; price: string; qty: string; desc: string; expanded: boolean }

function CreateEventScreen({ go }: { go: (p: Page) => void }) {
  const [step, setStep] = useState(0)
  const [eventName, setEventName] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventCategory, setEventCategory] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venue, setVenue] = useState('')
  const [area, setArea] = useState('')
  const [tiers, setTiers] = useState<TicketTier[]>([
    { id: 1, name: 'General Admission', price: '0', qty: '', desc: '', expanded: true }
  ])
  const [nextTierId, setNextTierId] = useState(2)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  const STEPS = ['Cover', 'Details', 'Date & Time', 'Location', 'Tickets', 'Review']
  const CATEGORIES = ['Party', 'Music', 'Sports', 'Food', 'Networking', 'Community', 'Arts', 'Tech']
  const COVER_ID = '1540575861846-d775fab174ef'

  const updateTier = (id: number, patch: Partial<TicketTier>) =>
    setTiers(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t))
  const deleteTier = (id: number) => setTiers(ts => ts.filter(t => t.id !== id))
  const addTier = () => {
    setTiers(ts => [...ts, { id: nextTierId, name: '', price: '0', qty: '', desc: '', expanded: true }])
    setNextTierId(n => n + 1)
  }

  if (published) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', gap: '16px', padding: '40px 32px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: '#fff', textAlign: 'center' }}>Event Published!</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: '260px' }}>Your event is now live on YRDLY.</p>
      <button onClick={() => go('my-events')} style={{ marginTop: '8px', padding: '14px 40px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>View My Events</button>
      <button onClick={() => go('feed')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>Back to Feed</button>
    </div>
  )

  const canNext = [
    true,
    eventName.trim() && eventCategory,
    dateStr.trim() && startTime.trim(),
    venue.trim() && area.trim(),
    tiers.length > 0 && tiers.every(t => t.name.trim()),
    true,
  ][step]

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '54px 20px 0' }}>
        <button onClick={() => step > 0 ? setStep(s => s - 1) : go('feed')} style={{ width: '36px', height: '36px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Create Event</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
        </div>
      </div>

      <div style={{ margin: '14px 20px 0', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', borderRadius: '2px', background: G, width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.35s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {step === 0 && (
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff', marginBottom: '4px' }}>Cover Image</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '16px' }}>A 16:9 banner that represents your event.</p>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '20px', overflow: 'hidden', background: '#111' }}>
              <img src={`https://images.unsplash.com/photo-${COVER_ID}?w=700&h=394&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
              <button style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                <div style={{ padding: '10px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Change Cover</div>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Event Name</p>
              <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="What's your event called?" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setEventCategory(c)} style={{ padding: '8px 14px', borderRadius: '12px', background: eventCategory === c ? 'rgba(130,219,126,0.15)' : SURFACE, border: `1px solid ${eventCategory === c ? 'rgba(130,219,126,0.35)' : GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '13px', color: eventCategory === c ? G : MUTED }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</p>
              <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Tell people what this event is about…" rows={5}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.65, resize: 'none', outline: 'none' }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date</p>
              <input value={dateStr} onChange={e => setDateStr(e.target.value)} placeholder="e.g. Saturday, 9 August 2025" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start Time</p>
              <input value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="e.g. 4:00 PM" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>End Time <span style={{ color: LABEL, fontWeight: 400, textTransform: 'none', fontSize: '11px' }}>(optional)</span></p>
              <input value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="e.g. 10:00 PM" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Venue Name</p>
              <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Eko Convention Centre" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Area / Neighbourhood</p>
              <input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Victoria Island, Lagos" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff' }}>Ticket Types</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>Add as many tiers as you need.</p>
              </div>
              <button onClick={addTier} style={{ padding: '7px 14px', borderRadius: '12px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.25)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: G, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add Tier
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {tiers.map(tier => (
                <div key={tier.id} style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', overflow: 'hidden' }}>
                  {/* Tier header */}
                  <button onClick={() => updateTier(tier.id, { expanded: !tier.expanded })}
                    className="w-full flex items-center gap-3 px-4 py-4" style={{ textAlign: 'left' }}>
                    <div className="flex-1">
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: tier.name ? '#fff' : LABEL }}>{tier.name || 'Untitled Tier'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {tier.price === '0' || tier.price === '' ? (
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: G, padding: '2px 8px', borderRadius: '6px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)' }}>Free</span>
                        ) : (
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>₦{Number(tier.price).toLocaleString()}</span>
                        )}
                        {tier.qty && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>· {tier.qty} tickets</span>}
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round" style={{ transform: tier.expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                  </button>

                  {/* Expanded fields */}
                  {tier.expanded && (
                    <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: `1px solid ${GLASS_BORDER}`, paddingTop: '14px' }}>
                      <div>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px' }}>TICKET NAME</p>
                        <input value={tier.name} onChange={e => updateTier(tier.id, { name: e.target.value })} placeholder="e.g. VIP, Early Bird, General…"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none' }} />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px' }}>PRICE (₦) · 0 = Free</p>
                          <input value={tier.price} onChange={e => updateTier(tier.id, { price: e.target.value })} placeholder="0" type="number"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', outline: 'none' }} />
                        </div>
                        <div className="flex-1">
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px' }}>QUANTITY</p>
                          <input value={tier.qty} onChange={e => updateTier(tier.id, { qty: e.target.value })} placeholder="Unlimited" type="number"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none' }} />
                        </div>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px' }}>DESCRIPTION (optional)</p>
                        <input value={tier.desc} onChange={e => updateTier(tier.id, { desc: e.target.value })} placeholder="e.g. Includes backstage access"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px', outline: 'none' }} />
                      </div>
                      {tiers.length > 1 && (
                        deleteConfirmId === tier.id ? (
                          <div className="flex items-center gap-2 pt-1">
                            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED, flex: 1 }}>Remove this tier?</p>
                            <button onClick={() => { deleteTier(tier.id); setDeleteConfirmId(null) }} style={{ padding: '6px 12px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: '#ef4444' }}>Remove</button>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '6px 12px', borderRadius: '10px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(tier.id)} className="flex items-center gap-2 mt-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ef4444' }}>Remove Tier</span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-5 pb-4">
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '19px', color: '#fff' }}>Preview</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginTop: '2px' }}>This is how your event appears on the feed and events hub.</p>
            </div>

            {/* Feed card preview */}
            <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', overflow: 'hidden' }}>
              {/* Author row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=80&h=80&fit=crop&auto=format" alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <div className="flex-1">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Amina Bello</p>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>Just now</span>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(219,130,196,0.12)', border: '1px solid rgba(219,130,196,0.3)' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: '#DB82C4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event</span>
                </div>
              </div>

              {/* Cover banner */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                <img src={`https://images.unsplash.com/photo-${COVER_ID}?w=700&h=394&fit=crop&auto=format&q=85`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* Date badge */}
                {dateStr && (
                  <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px', color: G, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dateStr}</p>
                    {startTime && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: MUTED, marginTop: '1px' }}>{startTime}{endTime ? ` – ${endTime}` : ''}</p>}
                  </div>
                )}
                {/* Category badge */}
                {eventCategory && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: '#fff' }}>{eventCategory}</span>
                  </div>
                )}
              </div>

              {/* Event details */}
              <div className="px-4 pt-3 pb-2">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', marginBottom: '6px' }}>{eventName || 'Event Name'}</p>
                {(venue || area) && (
                  <div className="flex items-center gap-1 mb-3">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{[venue, area].filter(Boolean).join(' · ')}</span>
                  </div>
                )}
                {eventDesc && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55, marginBottom: '12px' }}>{eventDesc.slice(0, 100)}{eventDesc.length > 100 ? '…' : ''}</p>}
              </div>

              {/* Ticket tiers */}
              <div className="px-4 pb-4">
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Tickets</p>
                <div className="flex flex-col gap-2">
                  {tiers.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2.5" style={{ background: SURFACE, borderRadius: '12px', border: `1px solid ${GLASS_BORDER}` }}>
                      <div>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff' }}>{t.name || 'Ticket'}</p>
                        {t.desc && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginTop: '1px' }}>{t.desc}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {(t.price === '0' || t.price === '') ? (
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '13px', color: G }}>FREE</span>
                        ) : (
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '13px', color: '#fff' }}>₦{Number(t.price).toLocaleString()}</span>
                        )}
                        {t.qty && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>{t.qty} left</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{ width: '100%', marginTop: '10px', height: '40px', borderRadius: '12px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '14px', color: DARK }}>Get Tickets</button>
              </div>
            </div>

            {/* Publish reminder */}
            <div className="flex items-start gap-3 px-4 py-3" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.15)', borderRadius: '14px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55 }}>Your event will appear on the neighbourhood feed, events hub, and map as soon as you tap <strong style={{ color: '#fff' }}>Publish Event</strong>.</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => {
          if (step < STEPS.length - 1) { setStep(s => s + 1) }
          else { setPublishing(true); setTimeout(() => { setPublishing(false); setPublished(true) }, 1800) }
        }} disabled={!canNext}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: canNext ? G : 'rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: canNext ? DARK : 'rgba(130,219,126,0.4)', transition: 'all 0.2s' }}>
          {publishing ? 'Publishing…' : step < STEPS.length - 1 ? 'Continue' : 'Publish Event'}
        </button>
      </div>
    </div>
  )
}

// ─── TICKET PURCHASE ──────────────────────────────────────────────────────────
function TicketPurchaseScreen({ go }: { go: (p: Page) => void }) {
  const ev = EVENTS_DATA.find(e => e.id === ACTIVE_EVENT_ID) ?? EVENTS_DATA[0]
  type Tier = { id: number; name: string; price: number; desc: string; avail: number }
  const TIERS: Tier[] = [
    { id: 1, name: 'General Admission', price: 0, desc: 'Entry to all general areas', avail: 200 },
    { id: 2, name: 'VIP', price: 10000, desc: 'Exclusive lounge access + drinks', avail: 50 },
    { id: 3, name: 'VVIP', price: 25000, desc: 'Private table, 5-star service', avail: 15 },
  ]
  const [selected, setSelected] = useState<number>(1)
  const [qty, setQty] = useState(1)
  const [paying, setPaying] = useState(false)

  const tier = TIERS.find(t => t.id === selected)!
  const total = tier.price * qty

  if (paying) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', gap: '18px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', marginBottom: '6px' }}>Redirecting to payment…</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>You're being securely redirected to Paystack</p>
      </div>
      <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '2px', background: G, animation: 'pulse 1.4s ease-in-out infinite' }} />
      </div>
      {setTimeout(() => go('checkout-success'), 2000) as unknown as null}
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('event-detail')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Select Ticket</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{ev.title}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-3 mb-6">
          {TIERS.map(t => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className="flex items-start gap-4 px-4 py-4 text-left w-full"
              style={{ background: selected === t.id ? 'rgba(130,219,126,0.07)' : '#0f0f0f', border: `1.5px solid ${selected === t.id ? 'rgba(130,219,126,0.35)' : GLASS_BORDER}`, borderRadius: '20px', transition: 'all 0.2s' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected === t.id ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}>
                {selected === t.id && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: G }} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{t.name}</p>
                  {t.price === 0 ? (
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '14px', color: G }}>Free</span>
                  ) : (
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '14px', color: '#fff' }}>₦{t.price.toLocaleString()}</span>
                  )}
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '4px' }}>{t.desc}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: MUTED }}>{t.avail} available</p>
              </div>
            </button>
          ))}
        </div>

        {/* Qty adjuster */}
        <div className="flex items-center justify-between px-4 py-4 mb-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Quantity</p>
          <div className="flex items-center gap-5">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: '32px', height: '32px', borderRadius: '50%', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff' }}>−</button>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
            <button onClick={() => setQty(q => Math.min(tier.avail, q + 1))} style={{ width: '32px', height: '32px', borderRadius: '50%', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff' }}>+</button>
          </div>
        </div>

        {/* Order total */}
        <div className="px-4 py-4" style={{ background: 'rgba(130,219,126,0.05)', border: '1px solid rgba(130,219,126,0.18)', borderRadius: '18px' }}>
          <div className="flex justify-between mb-2">
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>{tier.name} × {qty}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>{total === 0 ? 'Free' : `₦${(tier.price * qty).toLocaleString()}`}</span>
          </div>
          {total > 0 && (
            <div className="flex justify-between mb-2">
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>Service fee</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>₦{(total * 0.01).toLocaleString()}</span>
            </div>
          )}
          <div style={{ height: '1px', background: 'rgba(130,219,126,0.15)', margin: '10px 0' }} />
          <div className="flex justify-between">
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Total</span>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: G }}>{total === 0 ? 'Free' : `₦${(total * 1.01).toLocaleString()}`}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => tier.price === 0 ? go('checkout-success') : setPaying(true)}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>
          {tier.price === 0 ? 'Confirm RSVP' : `Pay ₦${(total * 1.01).toLocaleString()}`}
        </button>
      </div>
    </div>
  )
}

// ─── TICKET QR ────────────────────────────────────────────────────────────────
function QRBlock({ value }: { value: string }) {
  const seed = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const cells = Array.from({ length: 121 }, (_, i) => {
    const r = Math.floor(i / 11), c = i % 11
    const border = r === 0 || r === 10 || c === 0 || c === 10
    const corner = (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3)
    return corner || border || ((seed * (i + 7) * 13) % 17 < 8)
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '2px', padding: '12px', background: '#fff', borderRadius: '12px', width: '140px', height: '140px' }}>
      {cells.map((on, i) => <div key={i} style={{ background: on ? '#000' : '#fff', borderRadius: '1px' }} />)}
    </div>
  )
}

function TicketQRScreen({ go }: { go: (p: Page) => void }) {
  const ev = EVENTS_DATA.find(e => e.id === ACTIVE_EVENT_ID) ?? EVENTS_DATA[0]
  const CODE = `TICK-7392-${ACTIVE_EVENT_ID}084`
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px' }}>
        <button onClick={() => go('tickets')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>My Ticket</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Digital ticket card */}
        <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '28px', overflow: 'hidden' }}>
          {/* Event cover */}
          <div style={{ position: 'relative', height: '140px' }}>
            <img src={`https://images.unsplash.com/photo-${ev.photo}?w=700&h=280&fit=crop&auto=format&q=85`} alt="" className="w-full h-full object-cover" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(15,15,15,0.9))' }} />
            <div style={{ position: 'absolute', bottom: '14px', left: '20px', right: '20px' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff' }}>{ev.title}</p>
            </div>
          </div>

          {/* Ticket tear line */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 -1px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#050505', border: `1px solid ${GLASS_BORDER}`, flexShrink: 0, marginLeft: '-9px' }} />
            <div style={{ flex: 1, borderTop: '1.5px dashed rgba(255,255,255,0.1)' }} />
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#050505', border: `1px solid ${GLASS_BORDER}`, flexShrink: 0, marginRight: '-9px' }} />
          </div>

          {/* Ticket details */}
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '2px' }}>ATTENDEE</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Your Name</p>
              </div>
              <div style={{ padding: '4px 12px', borderRadius: '10px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: G }}>VIP</p>
              </div>
            </div>

            <div className="flex gap-4 mb-5">
              {[
                { l: 'DATE', v: ev.date },
                { l: 'TIME', v: ev.time },
              ].map(f => (
                <div key={f.l} className="flex-1">
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL, marginBottom: '2px' }}>{f.l}</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff' }}>{f.v}</p>
                </div>
              ))}
            </div>
            <div className="mb-5">
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL, marginBottom: '2px' }}>VENUE</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff' }}>{ev.area}, Lagos</p>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center py-4" style={{ borderTop: `1px dashed rgba(255,255,255,0.08)` }}>
              <QRBlock value={CODE} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginTop: '10px' }}>Ticket Code</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: '#fff', letterSpacing: '0.08em', marginTop: '2px' }}>{CODE}</p>
            </div>

            {/* Status badge */}
            <div className="flex items-center justify-center gap-2 mt-3 py-2.5" style={{ background: 'rgba(130,219,126,0.07)', borderRadius: '12px', border: '1px solid rgba(130,219,126,0.15)' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: G }} />
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: G }}>Valid · Upcoming</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CHECKOUT (MARKETPLACE) ───────────────────────────────────────────────────
function CheckoutScreen({ go }: { go: (p: Page) => void }) {
  const item = MARKETPLACE_ITEMS.find(i => i.id === ACTIVE_ITEM_ID) ?? MARKETPLACE_ITEMS[0]
  const price = parseInt(item.price.replace(/[₦,]/g, '')) || 85000
  const fee = Math.round(price * 0.006)
  const [paying, setPaying] = useState(false)

  if (paying) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', gap: '18px', padding: '32px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', marginBottom: '6px' }}>Redirecting to Paystack</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>Your payment is being processed securely.</p>
      </div>
      {setTimeout(() => go('checkout-success'), 2000) as unknown as null}
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('item-detail')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Checkout</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {/* Item summary card */}
        <div className="flex gap-4 px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0 }}>
            <img src={`https://images.unsplash.com/photo-${item.photo}?w=128&h=128&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>{item.title}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '2px' }}>Seller: {item.sellerName}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{item.cond} · {item.area}</p>
          </div>
        </div>

        {/* Delivery */}
        <div className="px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Delivery / Pickup</p>
          {[
            { l: 'Meet-up · Lekki Phase 1', s: 'Agree a safe public meeting point', active: true },
            { l: 'Delivery (add address)', s: 'Seller ships to you', active: false },
          ].map(opt => (
            <div key={opt.l} className="flex items-start gap-3 mb-3">
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${opt.active ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}>
                {opt.active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: G }} />}
              </div>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: opt.active ? '#fff' : MUTED }}>{opt.l}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{opt.s}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Order Summary</p>
          {[
            { l: 'Item price', v: item.price },
            { l: 'Platform fee', v: `₦${fee.toLocaleString()}` },
          ].map(r => (
            <div key={r.l} className="flex justify-between mb-3">
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>{r.l}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }}>{r.v}</span>
            </div>
          ))}
          <div style={{ height: '1px', background: GLASS_BORDER, margin: '4px 0 12px' }} />
          <div className="flex justify-between">
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Total</span>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: G }}>₦{(price + fee).toLocaleString()}</span>
          </div>
        </div>

        {/* Escrow notice */}
        <div className="flex items-start gap-3 px-4 py-4" style={{ background: 'rgba(130,219,126,0.05)', border: '1px solid rgba(130,219,126,0.15)', borderRadius: '18px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px', flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55 }}>Your payment is held securely until the transaction is complete. You're protected.</p>
        </div>
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => setPaying(true)} style={{ width: '100%', padding: '16px', borderRadius: '18px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>Continue to Payment</button>
      </div>
    </div>
  )
}

// ─── CHECKOUT SUCCESS ─────────────────────────────────────────────────────────
function CheckoutSuccessScreen({ go }: { go: (p: Page) => void }) {
  const item = MARKETPLACE_ITEMS.find(i => i.id === ACTIVE_ITEM_ID) ?? MARKETPLACE_ITEMS[0]
  const REF = `REF-${84920 + ACTIVE_ITEM_ID}`
  return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', padding: '40px 28px', gap: '0' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '26px', color: '#fff', textAlign: 'center', marginBottom: '8px' }}>Order Confirmed!</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: '28px', maxWidth: '260px' }}>Your payment is being held securely until the transaction is completed.</p>

      <div className="w-full flex flex-col gap-2 mb-8">
        {[
          { l: 'Item', v: item.title },
          { l: 'Seller', v: item.sellerName },
          { l: 'Amount', v: item.price },
          { l: 'Reference', v: REF },
        ].map(r => (
          <div key={r.l} className="flex items-center justify-between px-4 py-3" style={{ background: SURFACE, borderRadius: '14px', border: `1px solid ${GLASS_BORDER}` }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{r.l}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{r.v}</span>
          </div>
        ))}
      </div>

      <div className="w-full flex flex-col gap-3">
        <button onClick={() => { ACTIVE_ORDER_ROLE = 'buyer'; go('order-detail') }} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>View Order</button>
        <button onClick={() => go('explore')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>Continue Shopping</button>
      </div>
    </div>
  )
}

// ─── ORDER DETAIL (ESCROW) ────────────────────────────────────────────────────
function OrderDetailScreen({ go }: { go: (p: Page) => void }) {
  const item = MARKETPLACE_ITEMS.find(i => i.id === ACTIVE_ITEM_ID) ?? MARKETPLACE_ITEMS[0]
  const role = ACTIVE_ORDER_ROLE
  type EscrowStatus = 'paid' | 'shipped' | 'delivered' | 'completed'
  const [status, setStatus] = useState<EscrowStatus>('paid')
  const [showConfirm, setShowConfirm] = useState(false)

  const STEPS: { key: EscrowStatus; label: string }[] = [
    { key: 'paid', label: 'Paid' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' },
  ]
  const stepIdx = STEPS.findIndex(s => s.key === status)
  const STATUS_MSG: Record<EscrowStatus, { title: string; sub: string; color: string }> = {
    paid: { title: 'Payment Secured', sub: 'Waiting for seller to ship the item.', color: '#FFB74D' },
    shipped: { title: 'Item Shipped', sub: 'Seller has marked the item as shipped.', color: '#CE93D8' },
    delivered: { title: 'Item Delivered', sub: 'Confirm receipt to release payment to seller.', color: G },
    completed: { title: 'Transaction Complete', sub: 'Payment has been released to seller.', color: G },
  }
  const msg = STATUS_MSG[status]

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('transactions')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Order Details</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>REF-{84920 + ACTIVE_ORDER_ID} · {role === 'buyer' ? 'Purchase' : 'Sale'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4 pb-10">
        {/* Status card */}
        <div className="px-4 py-4" style={{ background: `${msg.color}0e`, border: `1px solid ${msg.color}25`, borderRadius: '20px' }}>
          <div className="flex items-center gap-3 mb-1">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: msg.color, flexShrink: 0 }} />
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff' }}>{msg.title}</p>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, marginLeft: '20px' }}>{msg.sub}</p>
        </div>

        {/* Progress timeline */}
        <div className="px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <div className="flex items-center justify-between relative">
            <div style={{ position: 'absolute', top: '15px', left: '20px', right: '20px', height: '2px', background: 'rgba(255,255,255,0.08)', zIndex: 0 }}>
              <div style={{ height: '100%', background: G, width: `${(stepIdx / 3) * 100}%`, transition: 'width 0.5s ease', borderRadius: '2px' }} />
            </div>
            {STEPS.map((s, i) => {
              const done = i <= stepIdx
              return (
                <div key={s.key} className="flex flex-col items-center gap-1.5" style={{ zIndex: 1 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: done ? G : '#1a1a1a', border: `2px solid ${done ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                    {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.8" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: GLASS_BORDER }} />}
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: done ? '#fff' : LABEL, fontWeight: done ? 600 : 400 }}>{s.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Item info */}
        <div className="flex gap-4 px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
            <img src={`https://images.unsplash.com/photo-${item.photo}?w=120&h=120&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '3px' }}>{item.title}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>
              {role === 'buyer' ? `From ${item.sellerName}` : 'Your listing'}
            </p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: G, marginTop: '4px' }}>{item.price}</p>
          </div>
        </div>

        {/* Demo: advance status */}
        {status !== 'completed' && (
          <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: `1px solid ${GLASS_BORDER}` }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '8px' }}>DEMO — advance status:</p>
            <div className="flex gap-2">
              {STEPS.filter((_, i) => i > stepIdx).map(s => (
                <button key={s.key} onClick={() => setStatus(s.key)} style={{ padding: '5px 12px', borderRadius: '10px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>{s.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Role-based actions */}
        {role === 'buyer' && status === 'delivered' && !showConfirm && (
          <button onClick={() => setShowConfirm(true)} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>Confirm Delivery</button>
        )}
        {role === 'buyer' && status === 'delivered' && showConfirm && (
          <div className="px-4 py-4" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.2)', borderRadius: '20px' }}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '6px' }}>Confirm you received it?</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, marginBottom: '14px', lineHeight: 1.55 }}>Confirming receipt releases payment to the seller. Only confirm if you've received the item in good condition.</p>
            <div className="flex gap-3">
              <button onClick={() => { setStatus('completed'); setShowConfirm(false) }} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>Yes, I received it</button>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '12px 16px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Cancel</button>
            </div>
          </div>
        )}
        {role === 'buyer' && status === 'completed' && (
          <button onClick={() => go('review-seller')} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>Leave a Review</button>
        )}
        {role === 'seller' && status === 'paid' && (
          <button onClick={() => setStatus('shipped')} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>Mark as Shipped</button>
        )}
        {(status === 'paid' || status === 'shipped') && role === 'buyer' && (
          <button onClick={() => go('dispute')} style={{ width: '100%', padding: '13px', borderRadius: '14px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#ef4444' }}>Report a Problem</button>
        )}
      </div>
    </div>
  )
}

// ─── DISPUTE ──────────────────────────────────────────────────────────────────
function DisputeScreen({ go }: { go: (p: Page) => void }) {
  const [reason, setReason] = useState('')
  const [desc, setDesc] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const REASONS = ['Item not received', 'Item damaged', 'Item significantly different', 'Wrong item sent', 'Other']

  if (submitted) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', padding: '40px 28px', gap: '16px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(255,183,0,0.1)', border: '1px solid rgba(255,183,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFB700" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', textAlign: 'center' }}>Dispute Submitted</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: '260px' }}>The transaction is being reviewed. We'll update you shortly.</p>

      {/* Dispute timeline */}
      <div className="w-full flex flex-col gap-3 mt-4">
        {[
          { l: 'Dispute Submitted', done: true },
          { l: 'Under Review', done: false },
          { l: 'Seller Response', done: false },
          { l: 'Resolution', done: false },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: s.done ? 'rgba(130,219,126,0.15)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${s.done ? G : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.done ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.8" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: GLASS_BORDER }} />}
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: s.done ? '#fff' : MUTED, fontWeight: s.done ? 600 : 400 }}>{s.l}</p>
          </div>
        ))}
      </div>
      <button onClick={() => go('order-detail')} style={{ marginTop: '8px', padding: '13px 32px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Back to Order</button>
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('order-detail')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Report a Problem</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What went wrong?</p>
          <div className="flex flex-col gap-2">
            {REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} className="flex items-center gap-3 px-4 py-3.5 text-left"
                style={{ background: reason === r ? 'rgba(239,68,68,0.07)' : SURFACE, border: `1.5px solid ${reason === r ? 'rgba(239,68,68,0.3)' : GLASS_BORDER}`, borderRadius: '16px', transition: 'all 0.2s' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${reason === r ? '#ef4444' : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {reason === r && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />}
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: reason === r ? '#fff' : MUTED }}>{r}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Details</p>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe what happened…" rows={5}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.65, resize: 'none', outline: 'none' }} />
        </div>

        <button style={{ width: '100%', padding: '14px', borderRadius: '16px', background: SURFACE, border: `1px dashed rgba(255,255,255,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: MUTED, fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          Attach evidence (optional)
        </button>
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => reason && setSubmitted(true)} disabled={!reason}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: reason ? '#ef4444' : 'rgba(239,68,68,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: reason ? '#fff' : 'rgba(239,68,68,0.4)', transition: 'all 0.2s' }}>
          Submit Dispute
        </button>
      </div>
    </div>
  )
}

// ─── REVIEW SELLER ────────────────────────────────────────────────────────────
function ReviewSellerScreen({ go }: { go: (p: Page) => void }) {
  const item = MARKETPLACE_ITEMS.find(i => i.id === ACTIVE_ITEM_ID) ?? MARKETPLACE_ITEMS[0]
  const [stars, setStars] = useState(0)
  const [review, setReview] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (submitted) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', padding: '40px 28px', gap: '14px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>Review Submitted</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center' }}>Thanks for helping the community.</p>
      <button onClick={() => go('transactions')} style={{ marginTop: '8px', padding: '13px 32px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>Done</button>
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('order-detail')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Leave a Review</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
        {/* Seller info */}
        <div className="flex items-center gap-4 px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <img src={`https://images.unsplash.com/photo-${item.sellerAvatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{item.sellerName}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Sold: {item.title}</p>
          </div>
        </div>

        {/* Star rating */}
        <div className="flex flex-col items-center gap-4">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff' }}>How was your experience?</p>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setStars(n)}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill={n <= stars ? '#FFB648' : 'none'} stroke={n <= stars ? '#FFB648' : GLASS_BORDER} strokeWidth="1.8">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
            ))}
          </div>
          {stars > 0 && (
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '14px', color: G }}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][stars]}
            </p>
          )}
        </div>

        {/* Review text */}
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Review</p>
          <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Describe your experience with this seller…" rows={5}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.65, resize: 'none', outline: 'none' }} />
        </div>
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => stars > 0 && setSubmitted(true)} disabled={stars === 0}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: stars > 0 ? G : 'rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: stars > 0 ? DARK : 'rgba(130,219,126,0.4)', transition: 'all 0.2s' }}>
          Submit Review
        </button>
      </div>
    </div>
  )
}

// ─── EVENT MANAGE (ORGANIZER) ─────────────────────────────────────────────────
function EventManageScreen({ go }: { go: (p: Page) => void }) {
  const [checkedIn, setCheckedIn] = useState(342)
  const total = 500
  const pct = Math.round((checkedIn / total) * 100)

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('my-events')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Manage Event</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: G }} />
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: G }}>Live</p>
          </div>
        </div>
        <button onClick={() => go('scan-tickets')} style={{ padding: '8px 16px', borderRadius: '12px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: DARK, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DARK} strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 7h.01M7 17h.01M17 7h.01M12 12h.01"/></svg>
          Scan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {/* Stats row */}
        <div className="flex gap-3">
          {[
            { n: checkedIn.toString(), l: 'Checked In', color: G },
            { n: (total - checkedIn).toString(), l: 'Remaining', color: '#FFB648' },
            { n: total.toString(), l: 'Total', color: MUTED },
          ].map(s => (
            <div key={s.l} className="flex-1 flex flex-col items-center py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '16px' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: s.color }}>{s.n}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Capacity bar */}
        <div className="px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <div className="flex justify-between mb-3">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Attendance</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: G }}>{pct}%</p>
          </div>
          <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '5px', background: `linear-gradient(90deg, ${G}, rgba(130,219,126,0.7))`, width: `${pct}%`, transition: 'width 0.5s ease' }} />
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '8px' }}>{checkedIn} of {total} attendees checked in</p>
        </div>

        {/* Scanner CTA */}
        <button onClick={() => go('scan-tickets')} className="flex items-center gap-4 px-4 py-4" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.2)', borderRadius: '20px', width: '100%', textAlign: 'left' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: G }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 7h.01M7 17h.01M17 7h.01M12 12h.01M17 17h.01"/></svg>
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Scan Tickets</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Open QR scanner to check in attendees</p>
          </div>
          <ChevronRightIcon />
        </button>

        {/* Recent check-ins */}
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Recent Check-ins</p>
          <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', overflow: 'hidden' }}>
            {[
              { name: 'Adaeze Okafor', tier: 'VIP', time: '2 min ago', avatarId: '1531123897728-9d9e7b9cba1e' },
              { name: 'Kelechi Mba', tier: 'General', time: '4 min ago', avatarId: '1507003211169-0a1dd7228f2d' },
              { name: 'Funke Adeola', tier: 'VVIP', time: '7 min ago', avatarId: '1502823403499-6ccfcf4fb453' },
            ].map((a, i, arr) => (
              <div key={a.name}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <img src={`https://images.unsplash.com/photo-${a.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <div className="flex-1">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{a.name}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{a.tier} · {a.time}</p>
                  </div>
                  <div style={{ padding: '4px 8px', borderRadius: '8px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.2)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                  </div>
                </div>
                {i < arr.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '54px' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Demo: simulate check-in */}
        <button onClick={() => setCheckedIn(n => Math.min(total, n + 1))} style={{ padding: '12px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>Demo: +1 Check-in</button>
      </div>
    </div>
  )
}

// ─── SCAN TICKETS ─────────────────────────────────────────────────────────────
function ScanTicketsScreen({ go }: { go: (p: Page) => void }) {
  const [flash, setFlash] = useState(false)
  const [scanState, setScanState] = useState<null | 'success' | 'invalid'>( null)
  const [scanName, setScanName] = useState('')

  const ATTENDEES = ['Amaka Johnson', 'Seun Balogun', 'Chisom Eze', 'Blessing Mba']
  const INVALID_REASONS = ['Already Used', 'Ticket not found', 'Wrong Event']

  const simulateScan = () => {
    if (Math.random() > 0.25) {
      setScanName(ATTENDEES[Math.floor(Math.random() * ATTENDEES.length)])
      setScanState('success')
    } else {
      setScanState('invalid')
    }
    setTimeout(() => setScanState(null), 2800)
  }

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#000' }}>
      <StatusBar />
      {/* Camera area */}
      <div style={{ flex: 1, position: 'relative', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Simulated camera bg */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 80%)' }} />

        {/* Back + flash controls */}
        <div className="absolute flex items-center justify-between px-5" style={{ top: '16px', left: 0, right: 0, zIndex: 10 }}>
          <button onClick={() => go('event-manage')} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>Scan Ticket</p>
          <button onClick={() => setFlash(f => !f)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: flash ? 'rgba(255,255,200,0.2)' : 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={flash ? '#FFE066' : 'none'} stroke={flash ? '#FFE066' : '#fff'} strokeWidth="1.8" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </button>
        </div>

        {/* Viewfinder */}
        <div style={{ position: 'relative', width: '220px', height: '220px', zIndex: 5 }}>
          {/* Corner brackets */}
          {[
            { top: 0, left: 0, borderTop: '3px solid', borderLeft: '3px solid', borderRadius: '4px 0 0 0' },
            { top: 0, right: 0, borderTop: '3px solid', borderRight: '3px solid', borderRadius: '0 4px 0 0' },
            { bottom: 0, left: 0, borderBottom: '3px solid', borderLeft: '3px solid', borderRadius: '0 0 0 4px' },
            { bottom: 0, right: 0, borderBottom: '3px solid', borderRight: '3px solid', borderRadius: '0 0 4px 0' },
          ].map((style, i) => (
            <div key={i} style={{ position: 'absolute', width: '28px', height: '28px', borderColor: scanState === 'success' ? G : scanState === 'invalid' ? '#ef4444' : '#fff', ...style, transition: 'border-color 0.2s' }} />
          ))}
          {/* Scan line animation */}
          {!scanState && (
            <div style={{ position: 'absolute', left: '4px', right: '4px', height: '2px', background: `linear-gradient(90deg, transparent, ${G}, transparent)`, animation: 'scanline 2s ease-in-out infinite', top: '50%' }} />
          )}
          {/* Feedback overlay */}
          {scanState && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: scanState === 'success' ? 'rgba(130,219,126,0.12)' : 'rgba(239,68,68,0.12)', borderRadius: '8px' }}>
              {scanState === 'success'
                ? <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                : <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              }
            </div>
          )}
        </div>

        {/* Result banner */}
        {scanState && (
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', padding: '14px 18px', borderRadius: '20px', background: scanState === 'success' ? 'rgba(130,219,126,0.15)' : 'rgba(239,68,68,0.15)', backdropFilter: 'blur(16px)', border: `1px solid ${scanState === 'success' ? 'rgba(130,219,126,0.35)' : 'rgba(239,68,68,0.35)'}`, zIndex: 10 }}>
            {scanState === 'success' ? (
              <>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: G, marginBottom: '2px' }}>✓ Check-in Successful</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }}>{scanName}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED, marginTop: '1px' }}>VIP · Just now</p>
              </>
            ) : (
              <>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: '#ef4444', marginBottom: '2px' }}>✗ Invalid Ticket</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>{INVALID_REASONS[Math.floor(Math.random() * INVALID_REASONS.length)]}</p>
              </>
            )}
          </div>
        )}

        <p style={{ position: 'absolute', bottom: scanState ? '120px' : '30px', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', zIndex: 5 }}>Point camera at attendee's ticket QR code</p>
      </div>

      {/* Demo scan button */}
      <div style={{ padding: '14px 20px 34px', background: '#050505', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={simulateScan} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>Demo: Simulate Scan</button>
      </div>
    </div>
  )
}

// ─── WITHDRAWAL FLOW ──────────────────────────────────────────────────────────
let WITHDRAW_AMOUNT = 45000

function WithdrawScreen({ go }: { go: (p: Page) => void }) {
  const [amount, setAmount] = useState('')
  const avail = 165000
  const fee = 0
  const net = amount ? Math.max(0, Number(amount) - fee) : 0

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('payouts')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Withdraw Funds</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Balance badge */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.18)', borderRadius: '14px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: G }}>Available balance: <span style={{ fontWeight: 700 }}>₦{avail.toLocaleString()}</span></p>
        </div>

        {/* Amount input */}
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Withdrawal Amount</p>
          <div className="flex items-center gap-2 px-4" style={{ height: '64px', borderRadius: '18px', background: SURFACE, border: `1px solid ${GLASS_BORDER}` }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '24px', color: LABEL }}>₦</span>
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" type="number" className="flex-1"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '28px', color: '#fff', caretColor: G }} />
          </div>
          <div className="flex gap-2 mt-2">
            {[10000, 25000, 50000, 100000].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                style={{ flex: 1, padding: '6px 4px', borderRadius: '10px', background: Number(amount) === v ? 'rgba(130,219,126,0.12)' : SURFACE, border: `1px solid ${Number(amount) === v ? 'rgba(130,219,126,0.3)' : GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '11px', color: Number(amount) === v ? G : MUTED }}>
                ₦{(v / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(130,219,126,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G, flexShrink: 0 }}>
            <BankIcon />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>Guaranty Trust Bank</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>**** 5678 · Amina Bello</p>
          </div>
          <button onClick={() => go('bank-verify')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: G }}>Change</button>
        </div>

        {/* Fee breakdown */}
        {amount ? (
          <div className="px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
            {[
              { l: 'Withdrawal amount', v: `₦${Number(amount).toLocaleString()}` },
              { l: 'Transfer fee', v: fee === 0 ? 'Free' : `₦${fee}` },
            ].map(r => (
              <div key={r.l} className="flex justify-between mb-3">
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>{r.l}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#fff' }}>{r.v}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: GLASS_BORDER, margin: '4px 0 10px' }} />
            <div className="flex justify-between">
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>You receive</span>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: G }}>₦{net.toLocaleString()}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => { if (amount && Number(amount) > 0) { WITHDRAW_AMOUNT = Number(amount); go('withdraw-confirm') } }} disabled={!amount || Number(amount) <= 0 || Number(amount) > avail}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: (amount && Number(amount) > 0 && Number(amount) <= avail) ? G : 'rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: (amount && Number(amount) > 0) ? DARK : 'rgba(130,219,126,0.4)', transition: 'all 0.2s' }}>
          Continue
        </button>
      </div>
    </div>
  )
}

function WithdrawConfirmScreen({ go }: { go: (p: Page) => void }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('withdraw')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Confirm Withdrawal</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-4">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '8px' }}>You are withdrawing</p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '42px', color: '#fff', letterSpacing: '-1px' }}>₦{WITHDRAW_AMOUNT.toLocaleString()}</p>
        </div>

        {[
          { l: 'Destination', v: 'Guaranty Trust Bank' },
          { l: 'Account', v: '**** **** **** 5678' },
          { l: 'Account Holder', v: 'Amina Bello' },
          { l: 'Transfer Fee', v: 'Free' },
          { l: 'Net Amount', v: `₦${WITHDRAW_AMOUNT.toLocaleString()}` },
        ].map(r => (
          <div key={r.l} className="flex items-center justify-between px-4 py-3.5" style={{ background: '#0f0f0f', borderRadius: '16px', border: `1px solid ${GLASS_BORDER}` }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{r.l}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{r.v}</span>
          </div>
        ))}

        <div className="flex items-start gap-3 px-4 py-4" style={{ background: 'rgba(255,183,28,0.05)', border: '1px solid rgba(255,183,28,0.2)', borderRadius: '16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB700" strokeWidth="2" strokeLinecap="round" style={{ marginTop: '1px', flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55 }}>Transfers usually arrive within 1–5 minutes. This action moves real money and cannot be undone.</p>
        </div>
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => { setConfirming(true); setTimeout(() => go('withdraw-success'), 1400) }} disabled={confirming}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>
          {confirming ? 'Processing…' : `Confirm — Withdraw ₦${WITHDRAW_AMOUNT.toLocaleString()}`}
        </button>
      </div>
    </div>
  )
}

function WithdrawSuccessScreen({ go }: { go: (p: Page) => void }) {
  const REF = `PAY-${94820 + WITHDRAW_AMOUNT % 100}`
  return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', padding: '40px 28px', gap: '0' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '28px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '28px', color: '#fff', textAlign: 'center', marginBottom: '8px' }}>Withdrawal Requested</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: '28px' }}>Transfers usually arrive within 1–5 minutes.</p>

      <div className="w-full flex flex-col gap-2 mb-8">
        {[
          { l: 'Amount', v: `₦${WITHDRAW_AMOUNT.toLocaleString()}` },
          { l: 'Destination', v: 'GTBank · ****5678' },
          { l: 'Reference', v: REF },
          { l: 'Status', v: 'Processing' },
        ].map(r => (
          <div key={r.l} className="flex items-center justify-between px-4 py-3" style={{ background: SURFACE, borderRadius: '14px', border: `1px solid ${GLASS_BORDER}` }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{r.l}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: r.l === 'Status' ? '#64B5F6' : '#fff' }}>{r.v}</span>
          </div>
        ))}
      </div>
      <button onClick={() => go('payouts')} style={{ width: '100%', padding: '15px', borderRadius: '16px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK, marginBottom: '12px' }}>Done</button>
    </div>
  )
}

// ─── BANK VERIFY (NUBAN FLOW) ─────────────────────────────────────────────────
const NIGERIAN_BANKS = ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Kuda Bank', 'OPay', 'Moniepoint', 'Stanbic IBTC', 'Polaris Bank', 'Fidelity Bank', 'Sterling Bank', 'Union Bank', 'Ecobank']

function BankVerifyScreen({ go }: { go: (p: Page) => void }) {
  const [step, setStep] = useState<'select' | 'account' | 'verifying' | 'confirmed'>('select')
  const [bankSearch, setBankSearch] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [acct, setAcct] = useState('')
  const [resolvedName] = useState('Amina Bello')

  const filteredBanks = NIGERIAN_BANKS.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()))

  const handleAcct = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 10)
    setAcct(n)
    if (n.length === 10) { setStep('verifying'); setTimeout(() => setStep('confirmed'), 1400) }
    else if (step === 'confirmed') setStep('account')
  }

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => step === 'select' ? go('bank-account') : setStep('select')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>
            {step === 'select' ? 'Select Bank' : 'Verify Account'}
          </p>
          {step !== 'select' && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{selectedBank}</p>}
        </div>
      </div>

      {step === 'select' && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mx-5 my-4 px-3" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px', height: '42px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={bankSearch} onChange={e => setBankSearch(e.target.value)} placeholder="Search banks…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '22px', overflow: 'hidden' }}>
              {filteredBanks.map((bank, i) => (
                <div key={bank}>
                  <button onClick={() => { setSelectedBank(bank); setStep('account') }} className="w-full flex items-center gap-4 px-5 py-4 text-left">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(130,219,126,0.06)', border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: G }}><BankIcon /></div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff' }}>{bank}</span>
                    <div style={{ marginLeft: 'auto' }}><ChevronRightIcon /></div>
                  </button>
                  {i < filteredBanks.length - 1 && <div style={{ height: '1px', background: GLASS_BORDER, marginLeft: '64px' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(step === 'account' || step === 'verifying' || step === 'confirmed') && (
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>10-Digit Account Number (NUBAN)</p>
            <div className="flex items-center gap-2 px-4" style={{ height: '58px', borderRadius: '18px', background: SURFACE, border: `1px solid ${step === 'confirmed' ? 'rgba(130,219,126,0.4)' : GLASS_BORDER}`, transition: 'border-color 0.3s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
              <input value={acct} onChange={e => handleAcct(e.target.value)} placeholder="0000000000" maxLength={10} type="tel" className="flex-1"
                style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '20px', color: '#fff', letterSpacing: '0.15em', caretColor: G }} />
              {step === 'verifying' && <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${G}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />}
              {step === 'confirmed' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>}
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginTop: '6px' }}>{acct.length}/10 digits</p>
          </div>

          {step === 'verifying' && (
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: 'rgba(100,181,246,0.06)', border: '1px solid rgba(100,181,246,0.2)', borderRadius: '14px' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#64B5F6' }}>Verifying account with Paystack…</p>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="flex items-center gap-4 px-4 py-4" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.25)', borderRadius: '18px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
              </div>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '2px' }}>ACCOUNT HOLDER</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>{resolvedName}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: G, marginTop: '2px' }}>Verified by Paystack ✓</p>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'confirmed' && (
        <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
          <button onClick={() => go('bank-account')} style={{ width: '100%', padding: '16px', borderRadius: '18px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK }}>Save Bank Account</button>
        </div>
      )}
    </div>
  )
}

// ─── BUSINESS HUB ─────────────────────────────────────────────────────────────
type CatalogItem = { id: number; title: string; price: string; photoId: string; inStock: boolean; category: string }
const CATALOG_ITEMS: CatalogItem[] = [
  { id: 1, title: 'Jollof Rice (Full Pot)', price: '₦8,500', photoId: '1547592166-23ac68d07589', inStock: true, category: 'Food' },
  { id: 2, title: 'Fried Chicken (8pc)', price: '₦4,200', photoId: '1568901346375-3c5a19b3e27c', inStock: true, category: 'Food' },
  { id: 3, title: 'Party Small Chops', price: '₦12,000', photoId: '1565299624946-b28f40a0ae38', inStock: false, category: 'Food' },
  { id: 4, title: 'Birthday Cake (5kg)', price: '₦25,000', photoId: '1586985289688-ca3cf47d3e8d', inStock: true, category: 'Baked Goods' },
]

function MyBusinessScreen({ go }: { go: (p: Page) => void }) {
  const [hasSetup, setHasSetup] = useState(false)

  if (!hasSetup) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', padding: '40px 28px', gap: '0' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '28px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', textAlign: 'center', marginBottom: '10px' }}>Set up your business on YRDLY</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: '260px', marginBottom: '28px' }}>Connect with customers in your neighbourhood — list products, services, and hours.</p>
      <div className="flex flex-col gap-4 w-full mb-8">
        {[
          { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, text: 'Set your opening hours' },
          { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, text: 'Add your location & address' },
          { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, text: 'List your products & services' },
        ].map(f => (
          <div key={f.text} className="flex items-center gap-3">
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{f.icon}</div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>{f.text}</p>
          </div>
        ))}
      </div>
      <button onClick={() => setHasSetup(true)} style={{ width: '100%', padding: '16px', borderRadius: '18px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: DARK, marginBottom: '12px' }}>Set Up Business</button>
      <button onClick={() => go('profile')} style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>Maybe later</button>
    </div>
  )

  return <BusinessHubScreen go={go} />
}

function BusinessHubScreen({ go }: { go: (p: Page) => void }) {
  const [viewAsCustomer, setViewAsCustomer] = useState(false)
  const [activeTab, setActiveTab] = useState<'catalog' | 'reviews' | 'analytics'>('catalog')
  const [items, setItems] = useState(CATALOG_ITEMS)
  const [catalogSheet, setCatalogSheet] = useState<CatalogItem | null>(null)

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Cover banner */}
      <div style={{ position: 'relative', height: '155px', background: '#111', flexShrink: 0, overflow: 'hidden' }}>
        <img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=780&h=310&fit=crop&auto=format&q=80"
          alt="Business cover" className="w-full h-full object-cover" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,5,5,0.1) 0%, rgba(5,5,5,0.72) 100%)' }} />
        {/* Back button */}
        <button onClick={() => go('profile')} style={{ position: 'absolute', top: '54px', left: '20px', width: '34px', height: '34px', borderRadius: '11px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        {/* Customer view toggle — overlaid top-right */}
        <div style={{ position: 'absolute', top: '54px', right: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px', padding: '5px 10px 5px 12px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>Customer view</p>
          <button onClick={() => setViewAsCustomer(v => !v)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: viewAsCustomer ? G : 'rgba(255,255,255,0.18)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: viewAsCustomer ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
          </button>
        </div>
      </div>

      {/* Business info */}
      <div style={{ padding: '0 20px', flexShrink: 0 }}>
        {/* Avatar overlapping banner */}
        <div style={{ width: '64px', height: '64px', borderRadius: '18px', border: '3px solid #050505', overflow: 'hidden', background: '#1a1a1a', marginTop: '-28px', marginBottom: '10px', flexShrink: 0 }}>
          <img src="https://images.unsplash.com/photo-1547592166-23ac68d07589?w=128&h=128&fit=crop&auto=format&q=80" alt="Mama's Kitchen" className="w-full h-full object-cover" />
        </div>
        {/* Name + verified */}
        <div className="flex items-center gap-2 mb-0.5">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>Mama's Kitchen</p>
          <VerifiedBadge size={18} />
        </div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '12px' }}>Food & Catering · Lekki Phase 1</p>
        {/* Stats row */}
        <div className="flex gap-6 pb-4 mb-3" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
          {[
            { v: '1.2k', l: 'Followers', action: () => { ACTIVE_LIST_TYPE = 'followers'; go('followers-list') } },
            { v: '4', l: 'Items', action: null },
            { v: '4.8 ★', l: 'Rating', action: null },
          ].map(s => (
            <button key={s.l} onClick={() => s.action && s.action()} className="flex flex-col items-start">
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', lineHeight: 1.2 }}>{s.v}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{s.l}</span>
            </button>
          ))}
        </div>
        {/* Quick actions */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => go('business-add-item')} style={{ flex: 1, padding: '9px', borderRadius: '12px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: G }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add Item
          </button>
          <button onClick={() => go('business-edit')} style={{ flex: 1, padding: '9px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Info
          </button>
          <button style={{ flex: 1, padding: '9px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
          {(['catalog', 'reviews', 'analytics'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className="pb-3 relative capitalize"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: activeTab === t ? 700 : 500, fontSize: '14px', color: activeTab === t ? '#fff' : LABEL }}>
              {t}
              {activeTab === t && <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', borderRadius: '99px', background: G }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 mt-4">
        {activeTab === 'catalog' && (
          <>
            {viewAsCustomer && (
              <div className="flex items-center gap-2 px-3 py-2.5 mb-4" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.2)', borderRadius: '12px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: G }}>Viewing as customer — this is how your storefront appears</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {items.map(item => (
                <button key={item.id} onClick={() => setCatalogSheet(item)} className="text-left" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', height: '100px' }}>
                    <img src={`https://images.unsplash.com/photo-${item.photoId}?w=300&h=200&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
                    {!item.inStock && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: '#ef4444' }}>OUT OF STOCK</p>
                      </div>
                    )}
                    {!viewAsCustomer && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', padding: '3px 8px', borderRadius: '7px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: item.inStock ? G : '#ef4444' }}>
                        {item.inStock ? 'In Stock' : 'Sold Out'}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff', marginBottom: '2px', lineHeight: 1.3 }}>{item.title}</p>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '14px', color: G }}>{item.price}</p>
                  </div>
                </button>
              ))}
              {!viewAsCustomer && (
                <button onClick={() => go('business-add-item')} style={{ height: '160px', borderRadius: '18px', background: 'rgba(130,219,126,0.04)', border: '1px dashed rgba(130,219,126,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(130,219,126,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: G }}>Add Item</p>
                </button>
              )}
            </div>
          </>
        )}

        {activeTab === 'reviews' && (
          <div>
            <div className="flex items-center gap-4 px-4 py-4 mb-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '48px', color: '#fff', lineHeight: 1 }}>4.8</p>
              <div>
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4,5].map(n => <svg key={n} width="16" height="16" viewBox="0 0 24 24" fill={n <= 5 ? '#FFB648' : 'none'} stroke="#FFB648" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>Based on 47 reviews</p>
              </div>
            </div>
            {[
              { name: 'Chisom Obi', rating: 5, text: 'Amazing jollof rice, delivered on time!', date: '2d ago', avatarId: '1531123897728-9d9e7b9cba1e' },
              { name: 'Emeka Nwosu', rating: 5, text: 'Best small chops in Lekki, no cap.', date: '5d ago', avatarId: '1500648767791-d7b8de5614b0' },
              { name: 'Ngozi Bello', rating: 4, text: 'Very good portions, will order again.', date: '1w ago', avatarId: '1531746020798-c70a81bd6a52' },
            ].map(r => (
              <div key={r.name} className="flex items-start gap-3 px-4 py-4 mb-3" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
                <img src={`https://images.unsplash.com/photo-${r.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff' }}>{r.name}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{r.date}</p>
                  </div>
                  <div className="flex gap-0.5 mb-1.5">
                    {[1,2,3,4,5].map(n => <svg key={n} width="11" height="11" viewBox="0 0 24 24" fill={n <= r.rating ? '#FFB648' : 'none'} stroke="#FFB648" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.5 }}>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="flex flex-col gap-3">
            {[
              { l: 'Total Catalog Items', v: '4', icon: '📦' },
              { l: 'Profile Views (30d)', v: '1,247', icon: '👁️' },
              { l: 'Inquiries Received', v: '34', icon: '💬' },
              { l: 'Average Rating', v: '4.8 ★', icon: '⭐' },
            ].map(s => (
              <div key={s.l} className="flex items-center gap-4 px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
                <div className="flex-1">
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{s.l}</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>{s.v}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Catalog item action sheet */}
      {catalogSheet && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} onClick={() => setCatalogSheet(null)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0A0A0A', borderRadius: '28px 28px 0 0', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 auto 16px' }} />
            {/* Item preview */}
            <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={`https://images.unsplash.com/photo-${catalogSheet.photoId}?w=104&h=104&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '2px' }}>{catalogSheet.title}</p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '14px', color: G }}>{catalogSheet.price}</p>
              </div>
              {!catalogSheet.inStock && <div style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: '#ef4444' }}>OUT OF STOCK</span>
              </div>}
            </div>
            {/* Actions vary by view mode */}
            {viewAsCustomer ? (
              <>
                <button onClick={() => { setCatalogSheet(null); go('chat') }} className="w-full flex items-center gap-4 py-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(130,219,126,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: G }}>Inquire / Order via Chat</span>
                </button>
                <button onClick={() => setCatalogSheet(null)} className="w-full flex items-center gap-4 py-4">
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff' }}>Share Listing</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setCatalogSheet(null); go('business-add-item') }} className="w-full flex items-center gap-4 py-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff' }}>Edit Item</span>
                </button>
                <button onClick={() => { setItems(its => its.map(i => i.id === catalogSheet.id ? { ...i, inStock: !i.inStock } : i)); setCatalogSheet(null) }} className="w-full flex items-center gap-4 py-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff' }}>{catalogSheet.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}</span>
                </button>
                <button onClick={() => setCatalogSheet(null)} className="w-full flex items-center gap-4 py-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#fff' }}>Hide Listing</span>
                </button>
                <button onClick={() => { setItems(its => its.filter(i => i.id !== catalogSheet.id)); setCatalogSheet(null) }} className="w-full flex items-center gap-4 py-4">
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                  </div>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#ef4444' }}>Delete Item</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const FOLLOWERS_DATA = [
  { id: 10, name: 'Adaeze Okonkwo', handle: '@adaeze_vi', avatarId: '1531123897728-9d9e7b9cba1e', verified: false, mutual: true },
  { id: 11, name: 'Tunde Afolabi', handle: '@tunde_af', avatarId: '1572816225927-d08fb138f2b2', verified: false, mutual: false },
  { id: 12, name: 'Ngozi Bello', handle: '@ngozib', avatarId: '1531746020798-c70a81bd6a52', verified: true, mutual: true },
  { id: 13, name: 'Emeka Nwosu', handle: '@emeka_n', avatarId: '1649502913092-fb7f0e8fc632', verified: false, mutual: false },
  { id: 14, name: 'Fatimah Yusuf', handle: '@fatimah_y', avatarId: '1758525225816-8dd1901ef6ec', verified: false, mutual: true },
  { id: 15, name: 'Olumide Adeyemi', handle: '@olu_adeyemi', avatarId: '1563132337-f159f484226c', verified: true, mutual: true },
  { id: 16, name: 'Chisom Obi', handle: '@chisom_obi', avatarId: '1673280401347-309363111070', verified: false, mutual: false },
  { id: 17, name: 'Kunle Bakare', handle: '@kunle_b', avatarId: '1500648767791-d7b8de5614b0', verified: false, mutual: true },
]
const FOLLOWING_DATA = [
  { id: 1, name: 'Chidi Okeke', handle: '@chidi_ok', avatarId: '1500648767791-d7b8de5614b0', verified: true, mutual: true },
  { id: 10, name: 'Adaeze Okonkwo', handle: '@adaeze_vi', avatarId: '1531123897728-9d9e7b9cba1e', verified: false, mutual: true },
  { id: 15, name: 'Olumide Adeyemi', handle: '@olu_adeyemi', avatarId: '1563132337-f159f484226c', verified: true, mutual: true },
  { id: 18, name: 'Lagos Food Stories', handle: '@lagosfoodstories', avatarId: '1547592166-23ac68d07589', verified: true, mutual: false },
  { id: 19, name: 'Bola Adekunle', handle: '@bola_dkl', avatarId: '1758525225816-8dd1901ef6ec', verified: false, mutual: false },
  { id: 20, name: 'Sade Ogundimu', handle: '@sade_og', avatarId: '1579998120708-682dd8a5624f', verified: false, mutual: true },
]

function FollowersListScreen({ go }: { go: (p: Page) => void }) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(ACTIVE_LIST_TYPE)
  const [searchQ, setSearchQ] = useState('')
  const [followingState, setFollowingState] = useState<Record<number, boolean>>(
    Object.fromEntries(FOLLOWING_DATA.map(u => [u.id, true]))
  )

  const list = activeTab === 'followers' ? FOLLOWERS_DATA : FOLLOWING_DATA
  const filtered = searchQ
    ? list.filter(u => u.name.toLowerCase().includes(searchQ.toLowerCase()) || u.handle.includes(searchQ.toLowerCase()))
    : list

  const toggleFollow = (id: number) => setFollowingState(s => ({ ...s, [id]: !s[id] }))

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-4" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}`, flexShrink: 0 }}>
        <button onClick={() => go('profile')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Amina Bello</p>
      </div>

      {/* Tabs */}
      <div className="flex px-5 gap-0" style={{ borderBottom: `1px solid ${GLASS_BORDER}`, flexShrink: 0 }}>
        {(['followers', 'following'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ flex: 1, paddingTop: '14px', paddingBottom: '14px', position: 'relative', fontFamily: 'Outfit, sans-serif', fontWeight: activeTab === tab ? 700 : 500, fontSize: '14px', color: activeTab === tab ? '#fff' : LABEL }}>
            {tab === 'followers' ? '142 Followers' : '38 Following'}
            {activeTab === tab && <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', background: G, borderRadius: '2px' }} />}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '12px 20px 8px', flexShrink: 0 }}>
        <div className="flex items-center gap-3" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px', padding: '0 14px', height: '42px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
          {searchQ && <button onClick={() => setSearchQ('')} style={{ color: LABEL }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-16">
            <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>No results for "{searchQ}"</p>
          </div>
        )}
        {filtered.map(user => (
          <div key={user.id} className="flex items-center gap-3 py-3.5" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
            <button onClick={() => { ACTIVE_PROFILE_ID = user.id; go('public-profile') }} style={{ flexShrink: 0 }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a' }}>
                <img src={`https://images.unsplash.com/photo-${user.avatarId}?w=92&h=92&fit=crop&auto=format&q=80`} alt={user.name} className="w-full h-full object-cover" />
              </div>
            </button>
            <button className="flex-1 text-left" onClick={() => { ACTIVE_PROFILE_ID = user.id; go('public-profile') }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{user.name}</p>
                {user.verified && <VerifiedBadge size={14} />}
              </div>
              <div className="flex items-center gap-2">
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{user.handle}</p>
                {user.mutual && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '1px 6px', borderRadius: '6px', background: SURFACE, border: `1px solid ${GLASS_BORDER}` }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>Mutual</span>
                  </div>
                )}
              </div>
            </button>
            {activeTab === 'following' ? (
              <button onClick={() => toggleFollow(user.id)}
                style={{ padding: '7px 14px', borderRadius: '10px', background: followingState[user.id] ? SURFACE : G, border: followingState[user.id] ? `1px solid ${GLASS_BORDER}` : 'none', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: followingState[user.id] ? MUTED : DARK, flexShrink: 0, transition: 'all 0.15s' }}>
                {followingState[user.id] ? 'Following' : 'Follow'}
              </button>
            ) : (
              <button onClick={() => toggleFollow(user.id)}
                style={{ padding: '7px 14px', borderRadius: '10px', background: followingState[user.id] ? SURFACE : 'rgba(130,219,126,0.1)', border: followingState[user.id] ? `1px solid ${GLASS_BORDER}` : '1px solid rgba(130,219,126,0.3)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: followingState[user.id] ? MUTED : G, flexShrink: 0, transition: 'all 0.15s' }}>
                {followingState[user.id] ? 'Following' : 'Follow Back'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BusinessEditScreen({ go }: { go: (p: Page) => void }) {
  const [name, setName] = useState('Mama\'s Kitchen')
  const [desc, setDesc] = useState('Home-cooked meals and catering for all occasions. Based in Lekki Phase 1.')
  const [phone, setPhone] = useState('+234 801 234 5678')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('Food & Catering')
  const [hours, setHours] = useState('Mon–Sat: 9am – 8pm')
  const [saved, setSaved] = useState(false)

  const CATS = ['Food & Catering', 'Restaurant', 'Shopping', 'Beauty & Salon', 'Local Services', 'Tech & Repair']

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center justify-between px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => go('business-hub')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Edit Business</p>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => go('business-hub'), 1000) }}
          style={{ padding: '8px 18px', borderRadius: '12px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Cover + logo */}
        <div style={{ position: 'relative', height: '120px', borderRadius: '18px', overflow: 'hidden', background: '#111' }}>
          <img src="https://images.unsplash.com/photo-1547592166-23ac68d07589?w=700&h=240&fit=crop&auto=format&q=80" alt="" className="w-full h-full object-cover" />
          <button style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '7px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff' }}>Change Cover</div>
          </button>
        </div>

        {[
          { l: 'Business Name', v: name, set: setName, ph: 'Your business name' },
          { l: 'Phone Number', v: phone, set: setPhone, ph: '+234…' },
          { l: 'Website (optional)', v: website, set: setWebsite, ph: 'https://…' },
          { l: 'Opening Hours', v: hours, set: setHours, ph: 'e.g. Mon–Sat: 9am – 8pm' },
        ].map(f => (
          <div key={f.l}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.l}</p>
            <input value={f.v} onChange={e => f.set(e.target.value)} placeholder={f.ph}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
          </div>
        ))}

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 14px', borderRadius: '12px', background: category === c ? 'rgba(130,219,126,0.15)' : SURFACE, border: `1px solid ${category === c ? 'rgba(130,219,126,0.35)' : GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '13px', color: category === c ? G : MUTED }}>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</p>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.65, resize: 'none', outline: 'none' }} />
        </div>
      </div>
    </div>
  )
}

function BusinessAddItemScreen({ go }: { go: (p: Page) => void }) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Food')
  const [inStock, setInStock] = useState(true)
  const [added, setAdded] = useState(false)

  const CATS = ['Food', 'Baked Goods', 'Drinks', 'Services', 'Other']

  if (added) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', gap: '14px', padding: '40px 28px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>Item Added!</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center' }}>"{title}" is now on your storefront.</p>
      <button onClick={() => go('business-hub')} style={{ marginTop: '8px', padding: '13px 32px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>Back to Storefront</button>
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('business-hub')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Add Item</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Photo picker */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {['1547592166-23ac68d07589', '1568901346375-3c5a19b3e27c'].map((pid, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: '14px', overflow: 'hidden', border: `2px solid ${i === 0 ? G : 'transparent'}` }}>
              <img src={`https://images.unsplash.com/photo-${pid}?w=200&h=200&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          <button style={{ aspectRatio: '1', borderRadius: '14px', background: SURFACE, border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Item Title</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Jollof Rice (Full Pot)" style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
        </div>

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Price (₦)</p>
          <div className="flex items-center gap-2 px-4" style={{ height: '56px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}` }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: LABEL }}>₦</span>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="0" type="number" className="flex-1"
              style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '20px', color: '#fff', caretColor: G }} />
          </div>
        </div>

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 14px', borderRadius: '12px', background: category === c ? 'rgba(130,219,126,0.15)' : SURFACE, border: `1px solid ${category === c ? 'rgba(130,219,126,0.35)' : GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '13px', color: category === c ? G : MUTED }}>{c}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '18px' }}>
          <div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>In Stock</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Visible and available to order</p>
          </div>
          <button onClick={() => setInStock(v => !v)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: inStock ? G : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: inStock ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '9px', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => title.trim() && price.trim() && setAdded(true)} disabled={!title.trim() || !price.trim()}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: (title.trim() && price.trim()) ? G : 'rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: (title.trim() && price.trim()) ? DARK : 'rgba(130,219,126,0.4)', transition: 'all 0.2s' }}>
          Add to Storefront
        </button>
      </div>
    </div>
  )
}

// ─── SAFETY ALERTS ────────────────────────────────────────────────────────────
const ALERTS_DATA = [
  { id: 1, title: 'Road Closure — Admiralty Way', area: 'Lekki Phase 1', time: '1h ago', severity: 'caution' as const, type: 'SAFETY ALERT', desc: 'Flooding at Admiralty Way junction. Road closed to traffic. Use alternative routes via Admiralty Circle.', action: 'Avoid Admiralty Way. Use Chevron Drive as an alternative.', status: 'active' as const, updated: '45m ago' },
  { id: 2, title: 'Power Outage — Estate B', area: 'Victoria Island', time: '3h ago', severity: 'information' as const, type: 'COMMUNITY INFO', desc: 'EKEDC has confirmed a planned maintenance outage for Estate B. Power expected to be restored by 6pm.', action: 'Charge devices now. Power restored by 6:00 PM today.', status: 'active' as const, updated: '2h ago' },
  { id: 3, title: 'Security Alert — Gate 3', area: 'Lekki Phase 2', time: '6h ago', severity: 'urgent' as const, type: 'AMBER ALERT', desc: 'Suspected break-in attempt at Gate 3 entry point. Residents advised to lock doors and report any suspicious activity to the estate security office.', action: 'Lock all entrances. Report suspicious activity to 0800-SECURITY.', status: 'resolved' as const, updated: '4h ago' },
  { id: 4, title: 'Water Supply Disruption', area: 'Ajah', time: '1d ago', severity: 'information' as const, type: 'COMMUNITY INFO', desc: 'Planned maintenance work will disrupt water supply for approximately 12 hours starting at 8am.', action: 'Store adequate water before 8am tomorrow.', status: 'resolved' as const, updated: '18h ago' },
]
const SEVERITY_COLORS = { information: { bg: 'rgba(33,150,243,0.08)', border: 'rgba(33,150,243,0.25)', text: '#64B5F6', icon: '#2196F3' }, caution: { bg: 'rgba(230,81,0,0.08)', border: 'rgba(230,81,0,0.28)', text: '#FFB74D', icon: '#E65100' }, urgent: { bg: 'rgba(183,28,28,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444', icon: '#EF4444' } }
let ACTIVE_ALERT_ID = 1

function AlertsScreen({ go }: { go: (p: Page) => void }) {
  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('feed')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Safety Alerts</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Victoria Island & Lekki, Lagos</p>
        </div>
        <div style={{ padding: '3px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '11px', color: '#ef4444' }}>{ALERTS_DATA.filter(a => a.status === 'active').length} ACTIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {['active', 'resolved'].map(status => {
          const group = ALERTS_DATA.filter(a => a.status === status)
          if (group.length === 0) return null
          return (
            <div key={status}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                {status === 'active' ? 'Active' : 'Resolved'} · {group.length}
              </p>
              <div className="flex flex-col gap-3">
                {group.map(alert => {
                  const c = SEVERITY_COLORS[alert.severity]
                  return (
                    <button key={alert.id} onClick={() => { ACTIVE_ALERT_ID = alert.id; go('alert-detail') }}
                      className="flex items-start gap-3 px-4 py-4 w-full text-left"
                      style={{ background: status === 'resolved' ? '#0a0a0a' : c.bg, border: `1px solid ${status === 'resolved' ? GLASS_BORDER : c.border}`, borderRadius: '20px', opacity: status === 'resolved' ? 0.6 : 1 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={status === 'resolved' ? LABEL : c.icon} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '11px', color: status === 'resolved' ? LABEL : c.text, letterSpacing: '0.05em' }}>{alert.type}</span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>· {alert.time}</span>
                        </div>
                        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: status === 'resolved' ? MUTED : '#fff', marginBottom: '4px' }}>{alert.title}</p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>📍 {alert.area}</p>
                      </div>
                      {status === 'resolved' && (
                        <div style={{ padding: '2px 8px', borderRadius: '7px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.15)', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: G }}>RESOLVED</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AlertDetailScreen({ go }: { go: (p: Page) => void }) {
  const alert = ALERTS_DATA.find(a => a.id === ACTIVE_ALERT_ID) ?? ALERTS_DATA[0]
  const c = SEVERITY_COLORS[alert.severity]
  const isResolved = alert.status === 'resolved'

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px' }}>
        <button onClick={() => go('alerts')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-4">
        {/* Resolution banner */}
        {isResolved && (
          <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(130,219,126,0.07)', border: '1px solid rgba(130,219,126,0.2)', borderRadius: '14px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: G }}>Resolved — This alert is no longer active.</p>
          </div>
        )}

        {/* Hero */}
        <div className="px-4 py-5" style={{ background: isResolved ? '#0a0a0a' : c.bg, border: `1px solid ${isResolved ? GLASS_BORDER : c.border}`, borderRadius: '24px' }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ padding: '3px 10px', borderRadius: '8px', background: `${c.icon}22`, border: `1px solid ${c.icon}44` }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px', color: isResolved ? LABEL : c.text, letterSpacing: '0.05em' }}>{alert.type}</span>
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{alert.time}</span>
          </div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: isResolved ? MUTED : '#fff', lineHeight: 1.2, marginBottom: '8px' }}>{alert.title}</p>
          <div className="flex items-center gap-3">
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>📍 {alert.area}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>· Updated {alert.updated}</p>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>What Happened</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{alert.desc}</p>
        </div>

        {/* Recommended action */}
        {!isResolved && (
          <div className="flex items-start gap-3 px-4 py-4" style={{ background: `${c.icon}0e`, border: `1px solid ${c.icon}30`, borderRadius: '20px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: c.text, marginBottom: '5px' }}>RECOMMENDED ACTION</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff', lineHeight: 1.6 }}>{alert.action}</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="px-4 py-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
          {[
            { l: 'Affected Area', v: alert.area },
            { l: 'Reported', v: alert.time },
            { l: 'Last Updated', v: alert.updated },
            { l: 'Status', v: isResolved ? 'Resolved' : 'Active' },
          ].map(r => (
            <div key={r.l} className="flex justify-between py-2" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{r.l}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: r.l === 'Status' ? (isResolved ? G : c.text) : '#fff' }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CreateAlertScreen({ go }: { go: (p: Page) => void }) {
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [severity, setSeverity] = useState<'information' | 'caution' | 'urgent'>('caution')
  const [type, setType] = useState<'safety' | 'amber' | 'info'>('safety')
  const [area, setArea] = useState('')
  const [action, setAction] = useState('')
  const [published, setPublished] = useState(false)

  if (published) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', gap: '14px', padding: '40px 28px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.12)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>Alert Published</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center' }}>The alert is now live on the Home Feed and Alerts screen.</p>
      <button onClick={() => go('alerts')} style={{ marginTop: '8px', padding: '13px 32px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>View Alerts</button>
    </div>
  )

  const c = SEVERITY_COLORS[severity]
  const typeLabels = { safety: 'SAFETY ALERT', amber: 'AMBER ALERT', info: 'COMMUNITY INFO' }

  if (step === 'preview') return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center justify-between px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('form')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Preview Alert</p>
        </div>
        <button onClick={() => setPublished(true)} style={{ padding: '8px 18px', borderRadius: '12px', background: '#ef4444', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff' }}>Publish Alert</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Home Feed Banner</p>
        <div className="flex items-start gap-3 px-4 py-3.5" style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '18px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px', color: c.text }}>{typeLabels[type]}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>· {area || 'Your Area'} · Now</span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#fff', lineHeight: 1.45 }}>{desc || 'Alert description will appear here.'}</p>
          </div>
        </div>

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '8px' }}>Alert Detail Preview</p>
        <div className="px-4 py-5" style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '24px' }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px', color: c.text, padding: '2px 8px', borderRadius: '6px', background: `${c.icon}22` }}>{typeLabels[type]}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>Now</span>
          </div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff', marginBottom: '8px' }}>{title || 'Alert title'}</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>📍 {area || 'Affected area'}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('settings')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Create Safety Alert</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Severity</p>
          <div className="flex gap-2">
            {([['information', 'Info', '#64B5F6'], ['caution', 'Caution', '#FFB74D'], ['urgent', 'Urgent', '#EF4444']] as const).map(([key, label, color]) => (
              <button key={key} onClick={() => setSeverity(key)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '12px', background: severity === key ? `${color}15` : SURFACE, border: `1.5px solid ${severity === key ? color : GLASS_BORDER}`, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '12px', color: severity === key ? color : MUTED, transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Alert Type</p>
          <div className="flex gap-2">
            {([['safety', 'Safety Alert'], ['amber', 'Amber Alert'], ['info', 'Community Info']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setType(key)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '12px', background: type === key ? SURFACE : 'transparent', border: `1.5px solid ${type === key ? G : GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '11px', color: type === key ? '#fff' : MUTED, transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {[
          { l: 'Alert Title', v: title, set: setTitle, ph: 'e.g. Road closure at Admiralty Way' },
          { l: 'Affected Area', v: area, set: setArea, ph: 'e.g. Lekki Phase 1, Lagos' },
          { l: 'Recommended Action', v: action, set: setAction, ph: 'e.g. Avoid Admiralty Way, use Chevron Drive' },
        ].map(f => (
          <div key={f.l}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.l}</p>
            <input value={f.v} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', outline: 'none' }} />
          </div>
        ))}

        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</p>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Factual description of what is happening…" rows={5}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.65, resize: 'none', outline: 'none' }} />
        </div>
      </div>

      <div style={{ padding: '14px 20px 34px', borderTop: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => title.trim() && desc.trim() && setStep('preview')} disabled={!title.trim() || !desc.trim()}
          style={{ width: '100%', padding: '16px', borderRadius: '18px', background: (title.trim() && desc.trim()) ? G : 'rgba(130,219,126,0.2)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: (title.trim() && desc.trim()) ? DARK : 'rgba(130,219,126,0.4)', transition: 'all 0.2s' }}>
          Preview Alert
        </button>
      </div>
    </div>
  )
}

// ─── ADMIN DISPUTES ───────────────────────────────────────────────────────────
const DISPUTE_DATA = [
  { id: 'DISP-1042', orderId: 'TX-8841', item: 'Nike Air Max 90', itemPhoto: '1556742049-0cfed4f6a45d', buyer: 'Chidi O.', seller: 'Funke A.', amount: '₦85,000', status: 'Open' as const, priority: 'HIGH' as const, date: 'Aug 3, 2026', reason: 'Item not received' },
  { id: 'DISP-1039', orderId: 'TX-8829', item: 'iPhone 13 Pro', itemPhoto: '1523275335684-37898b6baf30', buyer: 'Amaka E.', seller: 'Tunde D.', amount: '₦340,000', status: 'Waiting for Seller' as const, priority: 'HIGH' as const, date: 'Aug 2, 2026', reason: 'Item significantly different' },
  { id: 'DISP-1035', orderId: 'TX-8815', item: 'Vintage Record Player', itemPhoto: '1673280401347-309363111070', buyer: 'Ngozi B.', seller: 'Emeka V.', amount: '₦120,000', status: 'Under Review' as const, priority: 'MEDIUM' as const, date: 'Jul 31, 2026', reason: 'Item damaged' },
  { id: 'DISP-1029', orderId: 'TX-8800', item: 'Handwoven Basket Set', itemPhoto: '1758525225816-8dd1901ef6ec', buyer: 'Seun K.', seller: 'Bola M.', amount: '₦22,000', status: 'Resolved' as const, priority: 'NORMAL' as const, date: 'Jul 28, 2026', reason: 'Wrong item sent' },
]
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'Open': { bg: 'rgba(255,183,77,0.12)', text: '#FFB74D' },
  'Under Review': { bg: 'rgba(33,150,243,0.12)', text: '#64B5F6' },
  'Waiting for Seller': { bg: 'rgba(33,150,243,0.12)', text: '#64B5F6' },
  'Waiting for Buyer': { bg: 'rgba(33,150,243,0.12)', text: '#64B5F6' },
  'Resolved': { bg: 'rgba(130,219,126,0.1)', text: G },
  'Escalated': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
}
const PRIORITY_COLOR: Record<string, string> = { HIGH: '#ef4444', MEDIUM: '#FFB74D', NORMAL: MUTED }
let ACTIVE_DISPUTE_ID = 'DISP-1042'

function AdminDisputesScreen({ go }: { go: (p: Page) => void }) {
  const [filter, setFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const FILTERS = ['All', 'Open', 'Under Review', 'Waiting for Seller', 'Resolved', 'Escalated']

  const rows = DISPUTE_DATA.filter(d => {
    const matchFilter = filter === 'All' || d.status === filter
    const matchSearch = !search || d.id.toLowerCase().includes(search.toLowerCase()) || d.buyer.toLowerCase().includes(search.toLowerCase()) || d.seller.toLowerCase().includes(search.toLowerCase()) || d.item.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#0B0E14' }}>
      <StatusBar />
      <div style={{ padding: '54px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => go('settings')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex-1">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Dispute Resolution</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Admin · Internal Operations</p>
          </div>
          <div style={{ padding: '3px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '11px', color: '#ef4444' }}>{DISPUTE_DATA.filter(d => d.status === 'Open').length} OPEN</span>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', height: '38px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Dispute ID, buyer, seller, item…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#fff' }} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 pb-3" style={{ overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ height: '28px', paddingLeft: '12px', paddingRight: '12px', borderRadius: '14px', background: filter === f ? G : 'rgba(255,255,255,0.05)', border: `1px solid ${filter === f ? G : 'rgba(255,255,255,0.08)'}`, color: filter === f ? DARK : MUTED, fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: filter === f ? 700 : 500, flexShrink: 0, transition: 'all 0.2s' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {rows.map(d => {
          const ss = STATUS_STYLE[d.status]
          return (
            <button key={d.id} onClick={() => { ACTIVE_DISPUTE_ID = d.id; go('admin-dispute-detail') }}
              className="flex items-start gap-3 px-4 py-4 w-full text-left"
              style={{ background: '#141923', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px' }}>
              <img src={`https://images.unsplash.com/photo-${d.itemPhoto}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff' }}>{d.id}</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: PRIORITY_COLOR[d.priority], padding: '1px 6px', borderRadius: '5px', background: `${PRIORITY_COLOR[d.priority]}15` }}>{d.priority}</span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, marginBottom: '3px' }}>{d.item}</p>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, padding: '1px 7px', borderRadius: '6px', background: 'rgba(100,181,246,0.1)', border: '1px solid rgba(100,181,246,0.2)' }}>{d.buyer}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>vs</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, padding: '1px 7px', borderRadius: '6px', background: 'rgba(255,183,77,0.1)', border: '1px solid rgba(255,183,77,0.2)' }}>{d.seller}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>{d.amount}</span>
                <div style={{ padding: '2px 8px', borderRadius: '7px', background: ss.bg, border: `1px solid ${ss.text}30` }}>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: ss.text }}>{d.status.toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>{d.date}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AdminDisputeDetailScreen({ go }: { go: (p: Page) => void }) {
  const dispute = DISPUTE_DATA.find(d => d.id === ACTIVE_DISPUTE_ID) ?? DISPUTE_DATA[0]
  const ss = STATUS_STYLE[dispute.status]
  const [showResolution, setShowResolution] = useState(false)
  const [outcome, setOutcome] = useState<'full-refund' | 'release' | 'partial' | 'reject' | null>(null)
  const [refundAmt, setRefundAmt] = useState('')
  const [sellerAmt, setSellerAmt] = useState('')
  const [note, setNote] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)
  const [resolved, setResolved] = useState(false)

  const TIMELINE = [
    { event: 'Order Created', time: 'Jul 28, 2026 · 10:14 AM', done: true },
    { event: 'Payment Confirmed', time: 'Jul 28, 2026 · 10:15 AM', done: true },
    { event: 'Item Shipped', time: 'Jul 30, 2026 · 2:30 PM', done: true },
    { event: 'Dispute Raised', time: 'Aug 2, 2026 · 9:45 AM', done: true },
    { event: 'Seller Response', time: 'Aug 2, 2026 · 3:12 PM', done: true },
    { event: 'Admin Review', time: 'Aug 3, 2026 · 11:00 AM', done: dispute.status !== 'Open' },
    { event: 'Resolution', time: '—', done: resolved },
  ]

  if (resolved) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#0B0E14', gap: '14px', padding: '40px 28px' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff' }}>Dispute Resolved</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', maxWidth: '240px' }}>Resolution logged. Buyer and seller have been notified.</p>
      <div className="w-full mt-2 px-4 py-3" style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.18)', borderRadius: '14px' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '3px' }}>Resolved by Admin · {new Date().toLocaleString()}</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: G }}>Outcome: {outcome === 'full-refund' ? 'Full Refund to Buyer' : outcome === 'release' ? 'Funds Released to Seller' : outcome === 'partial' ? 'Partial Refund' : 'Dispute Rejected'}</p>
      </div>
      <button onClick={() => go('admin-disputes')} style={{ marginTop: '8px', padding: '13px 32px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: DARK }}>Back to Dashboard</button>
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#0B0E14' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => go('admin-disputes')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff' }}>{dispute.id}</p>
            <span style={{ padding: '2px 7px', borderRadius: '6px', background: `${PRIORITY_COLOR[dispute.priority]}15`, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: PRIORITY_COLOR[dispute.priority] }}>{dispute.priority}</span>
          </div>
          <div style={{ padding: '2px 8px', borderRadius: '7px', background: ss.bg, border: `1px solid ${ss.text}30`, display: 'inline-block', marginTop: '3px' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: ss.text }}>{dispute.status.toUpperCase()}</span>
          </div>
        </div>
        <button onClick={() => setShowResolution(true)} style={{ padding: '8px 14px', borderRadius: '12px', background: '#ef4444', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: '#fff' }}>Resolve</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Financial summary */}
        <div style={{ background: '#141923', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Financial Summary</p>
          <div className="flex gap-3 mb-3">
            <img src={`https://images.unsplash.com/photo-${dispute.itemPhoto}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
            <div className="flex-1">
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{dispute.item}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{dispute.orderId} · {dispute.date}</p>
            </div>
          </div>
          {[
            { l: 'Total Paid', v: dispute.amount },
            { l: 'YRDLY Fee', v: '₦510' },
            { l: 'Escrow Balance', v: dispute.amount },
            { l: 'Reason', v: dispute.reason },
          ].map(r => (
            <div key={r.l} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{r.l}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff' }}>{r.v}</span>
            </div>
          ))}
        </div>

        {/* Parties */}
        <div style={{ background: '#141923', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Parties</p>
          <div className="flex gap-3">
            {[{ role: 'BUYER', name: dispute.buyer, color: '#64B5F6' }, { role: 'SELLER', name: dispute.seller, color: '#FFB74D' }].map(p => (
              <div key={p.role} className="flex-1 px-3 py-3" style={{ background: `${p.color}0a`, border: `1px solid ${p.color}25`, borderRadius: '14px' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: p.color, marginBottom: '4px' }}>{p.role}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{p.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: '#141923', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Timeline</p>
          <div className="flex flex-col gap-3">
            {TIMELINE.map((ev, i) => (
              <div key={i} className="flex items-start gap-3">
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: ev.done ? 'rgba(130,219,126,0.15)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${ev.done ? G : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  {ev.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.8" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>}
                </div>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: ev.done ? 600 : 400, fontSize: '13px', color: ev.done ? '#fff' : LABEL }}>{ev.event}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{ev.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence / Chat excerpt */}
        <div style={{ background: '#141923', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Evidence</p>
          <div className="flex gap-2 mb-4">
            {['1579998120708-682dd8a5624f', '1673280401347-309363111070'].map((pid, i) => (
              <div key={i} style={{ width: '72px', height: '72px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={`https://images.unsplash.com/photo-${pid}?w=144&h=144&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Buyer Statement</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.6, marginBottom: '12px' }}>"I ordered the Nike Air Max 90 and the seller confirmed shipping, but the tracking number doesn't work and the item never arrived after 5 days."</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Seller Response</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>"I shipped the item via GIG Logistics. Here is the tracking number: GIG-2024-112394. The buyer should check again."</p>
        </div>

        {/* Admin actions */}
        <div style={{ background: '#141923', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Admin Actions</p>
          <div className="flex flex-col gap-2">
            {[
              { l: 'Message Buyer', c: '#64B5F6' },
              { l: 'Message Seller', c: '#FFB74D' },
              { l: 'Request More Information', c: MUTED },
              { l: 'Escalate', c: '#ef4444' },
            ].map(a => (
              <button key={a.l} style={{ width: '100%', padding: '11px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: a.c, textAlign: 'left' }}>{a.l}</button>
            ))}
            <button onClick={() => setShowResolution(true)} style={{ width: '100%', padding: '13px 16px', borderRadius: '14px', background: 'rgba(130,219,126,0.08)', border: '1px solid rgba(130,219,126,0.25)', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: G }}>Resolve Dispute</button>
          </div>
        </div>
      </div>

      {/* Resolution modal */}
      {showResolution && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ background: '#141923', borderRadius: '28px 28px 0 0', border: '1px solid rgba(255,255,255,0.1)', paddingBottom: '34px', maxHeight: '90%', overflowY: 'auto' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '16px auto 0' }} />
            <div className="px-5 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Resolve Dispute</p>
              <button onClick={() => { setShowResolution(false); setConfirmStep(false) }} style={{ color: LABEL }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {!confirmStep ? (
              <div className="px-5 py-4 flex flex-col gap-4">
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: LABEL, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outcome</p>
                  <div className="flex flex-col gap-2">
                    {([
                      ['full-refund', 'Full Refund to Buyer', '#64B5F6'],
                      ['release', 'Release Funds to Seller', '#FFB74D'],
                      ['partial', 'Partial Refund', MUTED],
                      ['reject', 'Reject Dispute', '#ef4444'],
                    ] as const).map(([key, label, color]) => (
                      <button key={key} onClick={() => setOutcome(key)}
                        className="flex items-center gap-3 px-4 py-3.5 text-left"
                        style={{ background: outcome === key ? `${color}0f` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${outcome === key ? `${color}50` : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', transition: 'all 0.2s' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${outcome === key ? color : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {outcome === key && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />}
                        </div>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: outcome === key ? '#fff' : MUTED }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {outcome === 'partial' && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px' }}>REFUND TO BUYER (₦)</p>
                      <input value={refundAmt} onChange={e => setRefundAmt(e.target.value)} placeholder="0" type="number"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', outline: 'none' }} />
                    </div>
                    <div className="flex-1">
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px' }}>RELEASE TO SELLER (₦)</p>
                      <input value={sellerAmt} onChange={e => setSellerAmt(e.target.value)} placeholder="0" type="number"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', outline: 'none' }} />
                    </div>
                  </div>
                )}

                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Internal Admin Note (private)</p>
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Internal reasoning for this decision…" rows={3}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '13px', resize: 'none', outline: 'none', lineHeight: 1.55 }} />
                </div>

                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer-Facing Resolution Message</p>
                  <textarea value={customerNote} onChange={e => setCustomerNote(e.target.value)} placeholder="Factual summary sent to both buyer and seller…" rows={3}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '13px', resize: 'none', outline: 'none', lineHeight: 1.55 }} />
                </div>

                <button onClick={() => outcome && setConfirmStep(true)} disabled={!outcome}
                  style={{ width: '100%', padding: '14px', borderRadius: '16px', background: outcome ? '#ef4444' : 'rgba(239,68,68,0.15)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: outcome ? '#fff' : 'rgba(239,68,68,0.4)', transition: 'all 0.2s' }}>
                  Continue
                </button>
              </div>
            ) : (
              <div className="px-5 py-5 flex flex-col gap-4">
                <div className="px-4 py-4" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '18px' }}>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '16px', color: '#fff', marginBottom: '6px' }}>Confirm Resolution</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.55 }}>This action will execute a financial transaction and notify both parties. This cannot be undone.</p>
                </div>
                <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL, marginBottom: '4px' }}>Outcome</p>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>{outcome === 'full-refund' ? 'Full Refund to Buyer' : outcome === 'release' ? 'Release Funds to Seller' : outcome === 'partial' ? `Partial Refund — Buyer ₦${refundAmt || 0} / Seller ₦${sellerAmt || 0}` : 'Reject Dispute'}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmStep(false)} style={{ flex: 1, padding: '13px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Go Back</button>
                  <button onClick={() => { setResolved(true); setShowResolution(false) }} style={{ flex: 2, padding: '13px', borderRadius: '14px', background: '#ef4444', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '14px', color: '#fff' }}>Confirm & Execute</button>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL, textAlign: 'center' }}>Action logged · Admin ID: ADM-001 · {new Date().toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAP ──────────────────────────────────────────────────────────────────────
type MapFilter = 'All' | 'Posts' | 'Marketplace' | 'Events' | 'Businesses'
type MapPin = { id: number; type: 'post' | 'marketplace' | 'event' | 'business'; x: number; y: number; title: string; sub: string; price?: string; photo: string; badge?: string }

const MAP_PINS: MapPin[] = [
  { id: 1, type: 'marketplace', x: 55, y: 38, title: 'Nike Air Max 90', sub: '@tunde_d · Lekki', price: '₦85,000', photo: '1556742049-0cfed4f6a45d' },
  { id: 2, type: 'event', x: 30, y: 52, title: 'Afrobeats Night Out', sub: 'Sat 9 Aug · Hard Rock Lagos', photo: '1508700115892-45ecd05ae2ad', badge: '9 Aug' },
  { id: 3, type: 'business', x: 70, y: 62, title: "Mama's Kitchen", sub: 'Food & Catering · 0.4 km', photo: '1547592166-23ac68d07589' },
  { id: 4, type: 'post', x: 42, y: 72, title: 'Flooding update', sub: 'Chidi O. · 1h ago', photo: '1531746020798-c70a81bd6a52' },
  { id: 5, type: 'marketplace', x: 78, y: 30, title: 'iPhone 13 Pro Max', sub: '@emeka_vi · VI', price: '₦340,000', photo: '1523275335684-37898b6baf30' },
  { id: 6, type: 'business', x: 22, y: 36, title: 'TechFix Lekki', sub: 'Tech & Repair · 1.2 km', photo: '1563770660941-20978e870e26' },
  { id: 7, type: 'event', x: 60, y: 80, title: 'Lekki Art Fair 2026', sub: 'Sun 10 Aug · Lekki Phase 1', photo: '1573152958734-1922c188fbb3', badge: '10 Aug' },
  { id: 8, type: 'post', x: 85, y: 50, title: 'Power outage – Estate B', sub: 'Ngozi B. · 3h ago', photo: '1531123897728-9d9e7b9cba1e' },
]

const PIN_COLORS: Record<string, string> = { post: '#82DB7E', marketplace: '#F59E0B', event: '#F59E0B', business: '#3B82F6' }

function MapPinIcon({ type, price, badge }: { type: string; price?: string; badge?: string }) {
  const c = PIN_COLORS[type]
  if (type === 'marketplace' && price) return (
    <div style={{ background: '#F59E0B', borderRadius: '10px', padding: '3px 8px', boxShadow: '0 2px 10px rgba(245,158,11,0.5)', border: '1.5px solid rgba(255,255,255,0.2)' }}>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px', color: '#fff', whiteSpace: 'nowrap' }}>{price}</span>
    </div>
  )
  if (type === 'event') return (
    <div style={{ background: '#F59E0B', borderRadius: '10px', padding: '4px 8px', boxShadow: '0 2px 10px rgba(245,158,11,0.45)', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '10px', color: '#fff' }}>{badge}</span>
    </div>
  )
  if (type === 'business') return (
    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#3B82F6', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(59,130,246,0.5)' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
    </div>
  )
  return (
    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: c, border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 10px ${c}55` }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </div>
  )
}

function MapScreen({ go }: { go: (p: Page) => void }) {
  const [filter, setFilter] = useState<MapFilter>('All')
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null)
  const FILTERS: MapFilter[] = ['All', 'Posts', 'Marketplace', 'Events', 'Businesses']
  const TYPE_MAP: Record<MapFilter, string[]> = { All: ['post', 'marketplace', 'event', 'business'], Posts: ['post'], Marketplace: ['marketplace'], Events: ['event'], Businesses: ['business'] }
  const visiblePins = MAP_PINS.filter(p => TYPE_MAP[filter].includes(p.type))

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#0D1117', overflow: 'hidden' }}>
      <StatusBar dark />

      {/* Dark map canvas */}
      <div style={{ position: 'absolute', inset: 0, background: '#0D1117' }}>
        {/* Road network simulation */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
          <rect width="390" height="844" fill="#0D1117"/>
          {/* Major roads */}
          <path d="M0 320 L390 320" stroke="#1A2332" strokeWidth="12"/>
          <path d="M0 500 L390 500" stroke="#1A2332" strokeWidth="8"/>
          <path d="M195 0 L195 844" stroke="#1A2332" strokeWidth="12"/>
          <path d="M80 0 L80 844" stroke="#1A2332" strokeWidth="6"/>
          <path d="M310 0 L310 844" stroke="#1A2332" strokeWidth="6"/>
          <path d="M0 180 L390 180" stroke="#1A2332" strokeWidth="6"/>
          <path d="M0 650 L390 650" stroke="#1A2332" strokeWidth="6"/>
          {/* Secondary roads */}
          <path d="M0 420 L390 420" stroke="#111D2A" strokeWidth="4"/>
          <path d="M140 0 L140 844" stroke="#111D2A" strokeWidth="4"/>
          <path d="M250 0 L250 844" stroke="#111D2A" strokeWidth="4"/>
          <path d="M0 580 L390 580" stroke="#111D2A" strokeWidth="4"/>
          {/* Water body */}
          <ellipse cx="50" cy="750" rx="90" ry="60" fill="#0D2236" opacity="0.8"/>
          <ellipse cx="340" cy="780" rx="70" ry="50" fill="#0D2236" opacity="0.7"/>
          {/* Parks */}
          <rect x="210" y="200" width="70" height="50" rx="8" fill="#0D1A0F" opacity="0.9"/>
          <rect x="290" y="400" width="50" height="60" rx="8" fill="#0D1A0F" opacity="0.7"/>
          {/* City blocks */}
          {[
            [90,90,40,70], [140,90,40,70], [90,190,40,100], [215,90,50,70],
            [90,350,40,50], [90,460,40,50], [310,350,50,60], [50,350,25,100],
            [215,380,25,100],[215,200,25,80],[310,200,50,160],[90,700,90,60],
          ].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#141E2B" opacity="0.85"/>
          ))}
        </svg>

        {/* Neighborhood label */}
        <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lekki Phase 1</p>
        </div>
        <div style={{ position: 'absolute', top: '22%', left: '18%', textAlign: 'center', pointerEvents: 'none' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Victoria Island</p>
        </div>
      </div>

      {/* Floating top header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: '54px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '12px', background: 'linear-gradient(to bottom, rgba(13,17,23,0.92) 0%, transparent 100%)', zIndex: 10 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => go('feed')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-1.5 flex-1 px-3 py-2" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', backdropFilter: 'blur(10px)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={G}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#fff' }}>Lekki Phase 1, Lagos</span>
          </div>
          <button style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mt-3" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ height: '30px', padding: '0 14px', borderRadius: '15px', flexShrink: 0, background: filter === f ? G : 'rgba(0,0,0,0.55)', border: `1px solid ${filter === f ? G : 'rgba(255,255,255,0.12)'}`, backdropFilter: 'blur(8px)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: filter === f ? 700 : 500, color: filter === f ? DARK : 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Map pins */}
      {visiblePins.map(pin => (
        <button key={pin.id} onClick={() => setSelectedPin(selectedPin?.id === pin.id ? null : pin)}
          style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -50%)', zIndex: 5, filter: selectedPin?.id === pin.id ? `drop-shadow(0 0 8px ${PIN_COLORS[pin.type]})` : 'none', transition: 'filter 0.2s' }}>
          <MapPinIcon type={pin.type} price={pin.price} badge={pin.badge} />
        </button>
      ))}

      {/* Recenter button */}
      <button style={{ position: 'absolute', bottom: selectedPin ? '230px' : '100px', right: '16px', width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transition: 'bottom 0.3s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
      </button>

      {/* Pin preview bottom sheet */}
      {selectedPin && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#111', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.09)', padding: '20px 20px 40px', zIndex: 20, backdropFilter: 'blur(20px)' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '0 auto 18px' }} />
          <div className="flex items-start gap-3">
            <div style={{ width: '72px', height: '72px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0 }}>
              <img src={`https://images.unsplash.com/photo-${selectedPin.photo}?w=144&h=144&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div style={{ padding: '2px 8px', borderRadius: '6px', background: `${PIN_COLORS[selectedPin.type]}18`, border: `1px solid ${PIN_COLORS[selectedPin.type]}40` }}>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '10px', color: PIN_COLORS[selectedPin.type], textTransform: 'uppercase' }}>{selectedPin.type}</span>
                </div>
                {selectedPin.price && <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: G }}>{selectedPin.price}</span>}
              </div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', marginBottom: '3px' }}>{selectedPin.title}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{selectedPin.sub}</p>
            </div>
          </div>
          <button onClick={() => {
            setSelectedPin(null)
            if (selectedPin.type === 'marketplace') { ACTIVE_ITEM_ID = selectedPin.id; go('item-detail') }
            else if (selectedPin.type === 'event') { ACTIVE_EVENT_ID = selectedPin.id; go('event-detail') }
            else if (selectedPin.type === 'business') { ACTIVE_PLACE_ID = selectedPin.id; go('place-detail') }
          }} style={{ marginTop: '16px', width: '100%', padding: '13px', borderRadius: '14px', background: G, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: DARK }}>
            View {selectedPin.type === 'marketplace' ? 'Item' : selectedPin.type === 'event' ? 'Event' : selectedPin.type === 'business' ? 'Place' : 'Post'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── PUBLIC PROFILE ───────────────────────────────────────────────────────────
const PUBLIC_PROFILES = [
  { id: 1, name: 'Chidi Okeke', handle: '@chidi_ok', bio: 'Software engineer. Community builder. Lekki Phase 1.', area: 'Lekki Phase 1', avatarId: '1500648767791-d7b8de5614b0', verified: true, mutuals: 4, followers: 312, following: 180, posts: [
    { id: 101, text: 'The flooding on Admiralty Way is getting worse. Has anyone contacted LASG?', likes: 34, comments: 12, photo: '1547592166-23ac68d07589', time: '2h ago' },
    { id: 102, text: 'Great community cleanup today at Lekki Phase 1 park. Proud of this neighbourhood!', likes: 87, comments: 21, photo: '1529156069898-49953e39b3ac', time: '1d ago' },
  ]},
  { id: 2, name: 'Adaeze Okafor', handle: '@adaeze_ok', bio: 'Chef. Food lover. Based in Victoria Island.', area: 'Victoria Island', avatarId: '1531746020798-c70a81bd6a52', mutuals: 2, followers: 840, following: 230, posts: [] },
]

function PublicProfileScreen({ go }: { go: (p: Page) => void }) {
  const profile = PUBLIC_PROFILES.find(p => p.id === ACTIVE_PROFILE_ID) ?? PUBLIC_PROFILES[0]
  const [following, setFollowing] = useState(false)
  const [tab, setTab] = useState<'posts' | 'marketplace'>('posts')
  const [showMore, setShowMore] = useState(false)
  const [showBlock, setShowBlock] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reported, setReported] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const REPORT_REASONS = ['Spam or fake account', 'Harassment or bullying', 'Impersonation', 'Inappropriate content', 'Scam or fraud', 'Other']

  if (blocked) return (
    <div className="screen-enter relative w-full h-full flex flex-col items-center justify-center" style={{ background: '#050505', padding: '40px 28px', gap: '12px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '22px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
      </div>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>User Blocked</p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center' }}>You cannot view this profile. You won't see each other's content.</p>
      <button onClick={() => go('feed')} style={{ marginTop: '8px', padding: '12px 28px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Go Back</button>
    </div>
  )

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Nav header */}
      <div className="flex items-center justify-between px-5 pb-3" style={{ paddingTop: '54px' }}>
        <button onClick={() => go('feed')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: MUTED }}>{profile.handle}</p>
        <button onClick={() => setShowMore(true)} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Profile hero */}
        <div className="px-5 pb-5" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
          <div className="flex items-start gap-4 mb-4">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={`https://images.unsplash.com/photo-${profile.avatarId}?w=160&h=160&fit=crop&auto=format&q=80`} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${GLASS_BORDER}` }} />
              <div style={{ position: 'absolute', bottom: '3px', right: '3px', width: '14px', height: '14px', borderRadius: '50%', background: G, border: '2px solid #050505' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '20px', color: '#fff' }}>{profile.name}</p>
                {(profile as any).verified && <VerifiedBadge size={18} />}
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '6px' }}>{profile.handle}</p>
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill={G}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{profile.area}</span>
              </div>
            </div>
          </div>

          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, lineHeight: 1.6, marginBottom: '12px' }}>{profile.bio}</p>

          {/* Stats */}
          <div className="flex gap-5 mb-4">
            {[
              { l: 'Followers', v: profile.followers },
              { l: 'Following', v: profile.following },
              { l: 'Posts', v: profile.posts.length },
            ].map(s => (
              <button key={s.l} className="text-center" onClick={() => {
                if (s.l === 'Followers') { ACTIVE_LIST_TYPE = 'followers'; go('followers-list') }
                else if (s.l === 'Following') { ACTIVE_LIST_TYPE = 'following'; go('followers-list') }
              }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>{s.v}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{s.l}</p>
              </button>
            ))}
          </div>

          {/* Mutuals */}
          {profile.mutuals > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #050505', marginLeft: i > 0 ? '-8px' : '0' }}>
                    <img src={`https://images.unsplash.com/photo-${['1531123897728-9d9e7b9cba1e','1500648767791-d7b8de5614b0','1529156069898-49953e39b3ac'][i]}?w=44&h=44&fit=crop&auto=format&q=80`} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED }}>{profile.mutuals} mutual connections</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={() => setFollowing(f => !f)}
              className="flex-1 flex items-center justify-center gap-2"
              style={{ padding: '10px', borderRadius: '14px', background: following ? SURFACE : G, border: `1px solid ${following ? GLASS_BORDER : G}`, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: following ? '#fff' : DARK, transition: 'all 0.2s' }}>
              {following && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>}
              {following ? 'Following' : 'Follow'}
            </button>
            <button onClick={() => go('chat')}
              className="flex-1 flex items-center justify-center gap-2"
              style={{ padding: '10px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Message
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-5 mt-0" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
          {(['posts', 'marketplace'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 py-3 relative capitalize"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: tab === t ? 700 : 500, fontSize: '14px', color: tab === t ? '#fff' : LABEL }}>
              {t}
              {tab === t && <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', borderRadius: '99px', background: G }} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 mt-4">
          {tab === 'posts' && (
            profile.posts.length > 0 ? profile.posts.map(post => (
              <div key={post.id} className="mb-4 p-4" style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px' }}>
                <div className="flex items-center gap-3 mb-3">
                  <img src={`https://images.unsplash.com/photo-${profile.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff' }}>{profile.name}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{post.time}</p>
                  </div>
                </div>
                {post.photo && <img src={`https://images.unsplash.com/photo-${post.photo}?w=700&h=400&fit=crop&auto=format&q=80`} alt="" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '14px', marginBottom: '10px' }} />}
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, lineHeight: 1.6, marginBottom: '10px' }}>{post.text}</p>
                <div className="flex gap-4">
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>♥ {post.likes}</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>💬 {post.comments}</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center py-12 gap-2">
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>No public posts yet.</p>
              </div>
            )
          )}
          {tab === 'marketplace' && (
            <div className="flex flex-col items-center py-12 gap-2">
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>No active marketplace listings.</p>
            </div>
          )}
        </div>
      </div>

      {/* More options sheet */}
      {showMore && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, backdropFilter: 'blur(6px)' }} onClick={() => setShowMore(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#111', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '0 auto 20px' }} />
            {[
              { l: 'Block User', c: '#ef4444', action: () => { setShowMore(false); setShowBlock(true) } },
              { l: 'Report User', c: '#ef4444', action: () => { setShowMore(false); setShowReport(true) } },
              { l: 'Share Profile', c: '#fff', action: () => setShowMore(false) },
            ].map(o => (
              <button key={o.l} onClick={o.action} className="w-full text-left py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: 'Inter, sans-serif', fontSize: '16px', color: o.c }}>
                {o.l}
              </button>
            ))}
            <button onClick={() => setShowMore(false)} className="w-full text-center mt-4 py-3" style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', color: MUTED }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Block confirm */}
      {showBlock && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowBlock(false)}>
          <div style={{ background: '#111', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '28px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff', marginBottom: '10px', textAlign: 'center' }}>Block {profile.name}?</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: '20px' }}>{"You won't see each other's content or be able to message each other."}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowBlock(false)} style={{ flex: 1, padding: '13px', borderRadius: '14px', background: SURFACE, fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Cancel</button>
              <button onClick={() => { setShowBlock(false); setBlocked(true) }} style={{ flex: 1, padding: '13px', borderRadius: '14px', background: '#ef4444', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Block</button>
            </div>
          </div>
        </div>
      )}

      {/* Report user sheet */}
      {showReport && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 60, backdropFilter: 'blur(4px)' }} onClick={() => setShowReport(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#111', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '0 auto 18px' }} />
            {reported ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                </div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Report Submitted</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.6 }}>{"Thank you. We'll review this report and take appropriate action."}</p>
                <button onClick={() => setShowReport(false)} style={{ marginTop: '4px', padding: '12px 32px', borderRadius: '14px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Close</button>
              </div>
            ) : (
              <>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', marginBottom: '4px' }}>Report {profile.name}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, marginBottom: '16px' }}>Select a reason for your report:</p>
                <div className="flex flex-col gap-2">
                  {REPORT_REASONS.map(r => (
                    <button key={r} onClick={() => setReportReason(r)} className="flex items-center gap-3 px-4 py-3 text-left" style={{ borderRadius: '14px', background: reportReason === r ? 'rgba(239,68,68,0.08)' : SURFACE, border: `1px solid ${reportReason === r ? 'rgba(239,68,68,0.3)' : GLASS_BORDER}` }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${reportReason === r ? '#ef4444' : GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {reportReason === r && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />}
                      </div>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: reportReason === r ? '#fff' : MUTED }}>{r}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => reportReason && setReported(true)} disabled={!reportReason}
                  style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: '16px', background: reportReason ? '#ef4444' : 'rgba(239,68,68,0.15)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '15px', color: reportReason ? '#fff' : 'rgba(239,68,68,0.4)', transition: 'all 0.2s' }}>
                  Submit Report
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NETWORK (FOLLOWERS / FOLLOWING) ──────────────────────────────────────────
const NETWORK_USERS = [
  { id: 1, name: 'Chidi Okeke', handle: '@chidi_ok', avatarId: '1500648767791-d7b8de5614b0', mutual: 'Followed by Amaka', following: true },
  { id: 2, name: 'Adaeze Okafor', handle: '@adaeze_ok', avatarId: '1531746020798-c70a81bd6a52', mutual: '', following: false },
  { id: 3, name: 'Emeka Nwosu', handle: '@emeka_nw', avatarId: '1546961342-ea5a9a3f3075', mutual: 'Followed by Tunde', following: true },
  { id: 4, name: 'Ngozi Bello', handle: '@ngozi_b', avatarId: '1531123897728-9d9e7b9cba1e', mutual: 'Followed by Chidi', following: false },
  { id: 5, name: 'Funke Adeola', handle: '@funke_ad', avatarId: '1529156069898-49953e39b3ac', mutual: '', following: true },
]

function NetworkScreen({ go }: { go: (p: Page) => void }) {
  const [tab, setTab] = useState<'followers' | 'following'>('followers')
  const [search, setSearch] = useState('')
  const [followingState, setFollowingState] = useState<Record<number, boolean>>(
    Object.fromEntries(NETWORK_USERS.map(u => [u.id, u.following]))
  )
  const [showConfirm, setShowConfirm] = useState<{ type: 'remove' | 'unfollow'; user: typeof NETWORK_USERS[0] } | null>(null)
  const [removed, setRemoved] = useState<Set<number>>(new Set())

  const filtered = NETWORK_USERS.filter(u => {
    const match = u.name.toLowerCase().includes(search.toLowerCase()) || u.handle.toLowerCase().includes(search.toLowerCase())
    const notRemoved = !removed.has(u.id)
    return match && notRemoved
  })

  const followers = filtered.filter((_, i) => i % 2 === 0)
  const following = filtered.filter(u => followingState[u.id])

  const list = tab === 'followers' ? followers : following

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('public-profile')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Connections</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mx-5 my-3 px-3" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}`, borderRadius: '14px', height: '40px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or @username…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
      </div>

      {/* Tab toggle */}
      <div className="flex px-5 mb-0" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
        {([['followers', 'Followers', followers.length], ['following', 'Following', following.length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)} className="flex-1 py-3 relative"
            style={{ fontFamily: 'Outfit, sans-serif', fontWeight: tab === key ? 700 : 500, fontSize: '14px', color: tab === key ? '#fff' : LABEL }}>
            {label} <span style={{ color: tab === key ? G : LABEL }}>({count})</span>
            {tab === key && <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', borderRadius: '99px', background: G }} />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        {list.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: LABEL }}>{search ? 'No users found matching your search.' : tab === 'followers' ? 'No followers yet.' : "You're not following anyone yet."}</p>
          </div>
        ) : list.map((user, i) => (
          <div key={user.id} className="flex items-center gap-3 py-3" style={{ borderBottom: i < list.length - 1 ? `1px solid ${GLASS_BORDER}` : 'none' }}>
            <button onClick={() => { ACTIVE_PROFILE_ID = user.id; go('public-profile') }} style={{ flexShrink: 0 }}>
              <img src={`https://images.unsplash.com/photo-${user.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
            </button>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{user.name}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{user.handle}</p>
              {user.mutual && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: MUTED, marginTop: '1px' }}>{user.mutual}</p>}
            </div>
            {tab === 'followers' ? (
              <button onClick={() => setShowConfirm({ type: 'remove', user })}
                style={{ padding: '6px 12px', borderRadius: '10px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '12px', color: MUTED, flexShrink: 0 }}>
                Remove
              </button>
            ) : (
              <button onClick={() => setShowConfirm({ type: 'unfollow', user })}
                style={{ padding: '6px 12px', borderRadius: '10px', background: 'rgba(130,219,126,0.1)', border: '1px solid rgba(130,219,126,0.25)', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, color: G, flexShrink: 0 }}>
                Following
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowConfirm(null)}>
          <div style={{ background: '#111', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '28px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '17px', color: '#fff', textAlign: 'center', marginBottom: '8px' }}>
              {showConfirm.type === 'remove' ? `Remove ${showConfirm.user.name}?` : `Unfollow ${showConfirm.user.handle}?`}
            </p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: '20px' }}>
              {showConfirm.type === 'remove' ? "They won't be notified." : ''}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: SURFACE, fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED }}>Cancel</button>
              <button onClick={() => {
                if (showConfirm.type === 'remove') setRemoved(s => new Set([...s, showConfirm.user.id]))
                else setFollowingState(s => ({ ...s, [showConfirm.user.id]: false }))
                setShowConfirm(null)
              }} style={{ flex: 1, padding: '12px', borderRadius: '14px', background: '#ef4444', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                {showConfirm.type === 'remove' ? 'Remove' : 'Unfollow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── POST DETAIL ──────────────────────────────────────────────────────────────
function PostDetailScreen({ go }: { go: (p: Page) => void }) {
  const post = FEED_DATA.find(p => p.id === ACTIVE_POST_ID) ?? FEED_DATA[0]
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes)
  const [saved, setSaved] = useState(false)
  const [comment, setComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [comments, setComments] = useState([
    { id: 1, name: 'Chidi Okeke', handle: '@chidi_ok', avatarId: '1500648767791-d7b8de5614b0', text: 'This is really concerning. The council needs to address this urgently.', time: '1h ago', likes: 8, liked: false, replies: [
      { id: 11, name: 'Ngozi Bello', handle: '@ngozi_b', avatarId: '1531123897728-9d9e7b9cba1e', text: 'Agreed! I sent an email to the ward chairman yesterday.', time: '45m ago', likes: 3, liked: false },
    ]},
    { id: 2, name: 'Funke Adeola', handle: '@funke_ad', avatarId: '1529156069898-49953e39b3ac', text: 'Thank you for sharing this. Sharing to my street WhatsApp group now.', time: '30m ago', likes: 12, liked: false, replies: [] },
    { id: 3, name: 'Emeka Nwosu', handle: '@emeka_nw', avatarId: '1546961342-ea5a9a3f3075', text: "I drove past there this morning — it's worse than the photo shows.", time: '15m ago', likes: 5, liked: false, replies: [] },
  ])

  const toggleLike = () => { setLiked(l => !l); setLikeCount(c => liked ? c - 1 : c + 1) }

  const sendComment = () => {
    if (!comment.trim()) return
    const newC = { id: Date.now(), name: 'Amina Bello', handle: '@amina_b', avatarId: '1563132337-f159f484226c', text: replyTo ? `↳ Replying to ${replyTo}: ${comment}` : comment, time: 'now', likes: 0, liked: false, replies: [] }
    setComments(cs => [...cs, newC])
    setComment('')
    setReplyTo(null)
  }

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('feed')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>Post</p>
        <button style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Post content */}
        <div className="px-5 pt-4 pb-4" style={{ borderBottom: `1px solid ${GLASS_BORDER}` }}>
          {/* Author */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => { ACTIVE_PROFILE_ID = 1; go('public-profile') }}>
                <img src={`https://images.unsplash.com/photo-${post.authorAvatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${GLASS_BORDER}` }} />
              </button>
              <button onClick={() => { ACTIVE_PROFILE_ID = 1; go('public-profile') }} className="text-left">
                <div className="flex items-center gap-1.5">
                  <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{post.authorName}</p>
                  {post.verified && <VerifiedBadge size={14} />}
                </div>
                <div className="flex items-center gap-1.5">
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{post.time}</p>
                  {post.area && <><span style={{ color: LABEL, fontSize: '10px' }}>·</span><div className="flex items-center gap-0.5"><svg width="10" height="10" viewBox="0 0 24 24" fill={LABEL}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg><p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>{post.area}</p></div></>}
                </div>
              </button>
            </div>
            <button style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>•••</button>
          </div>

          {/* Full text */}
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(255,255,255,0.88)', lineHeight: 1.7, marginBottom: '12px' }}>{post.text}</p>

          {/* Media */}
          {post.photoId && (
            <div style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '14px', maxHeight: '260px' }}>
              <img src={`https://images.unsplash.com/photo-${post.photoId}?w=700&h=500&fit=crop&auto=format&q=80`} alt="" className="w-full object-cover" style={{ maxHeight: '260px' }} />
            </div>
          )}

          {/* Interaction bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={toggleLike} className="flex items-center gap-1.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? '#ef4444' : 'none'} stroke={liked ? '#ef4444' : LABEL} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: liked ? '#ef4444' : LABEL }}>{likeCount}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL }}>{comments.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button onClick={() => setSaved(s => !s)}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill={saved ? G : 'none'} stroke={saved ? G : LABEL} strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="px-5 pt-4">
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '16px' }}>Comments ({comments.length})</p>
          {comments.map((c, ci) => (
            <div key={c.id} className="mb-4">
              <div className="flex items-start gap-3">
                <img src={`https://images.unsplash.com/photo-${c.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '13px', color: '#fff' }}>{c.name}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{c.time}</p>
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, lineHeight: 1.55 }}>{c.text}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="flex items-center gap-1" onClick={() => setComments(cs => cs.map((cc, cii) => cii === ci ? { ...cc, liked: !cc.liked, likes: cc.liked ? cc.likes - 1 : cc.likes + 1 } : cc))}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={c.liked ? '#ef4444' : 'none'} stroke={c.liked ? '#ef4444' : LABEL} strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: c.liked ? '#ef4444' : LABEL }}>{c.likes}</span>
                    </button>
                    <button onClick={() => setReplyTo(c.handle)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Reply</button>
                  </div>
                </div>
              </div>
              {c.replies.map(r => (
                <div key={r.id} className="flex items-start gap-3 mt-3 ml-11">
                  <img src={`https://images.unsplash.com/photo-${r.avatarId}?w=80&h=80&fit=crop&auto=format&q=80`} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px', color: '#fff' }}>{r.name}</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: LABEL }}>{r.time}</p>
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED, lineHeight: 1.5 }}>{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div style={{ borderTop: `1px solid ${GLASS_BORDER}`, background: '#050505', padding: '10px 16px 28px' }}>
        {replyTo && (
          <div className="flex items-center justify-between mb-2 px-2">
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: LABEL }}>Replying to <span style={{ color: G }}>{replyTo}</span></p>
            <button onClick={() => setReplyTo(null)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LABEL} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1563132337-f159f484226c?w=80&h=80&fit=crop&auto=format&q=80" alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div className="flex-1 flex items-center gap-2 px-3" style={{ background: SURFACE, border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', height: '40px' }}>
            <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendComment()} placeholder="Write a comment…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#fff' }} />
          </div>
          <button onClick={sendComment} style={{ width: '36px', height: '36px', borderRadius: '50%', background: comment.trim() ? G : 'rgba(130,219,126,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={comment.trim() ? DARK : 'rgba(130,219,126,0.4)'} strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── INVITE NEIGHBOURS ────────────────────────────────────────────────────────
function InviteScreen({ go }: { go: (p: Page) => void }) {
  const [copied, setCopied] = useState(false)
  const INVITE_LINK = 'yrdly.ng/join/LEKKI-8492'
  const PREFILL = `Hey! I'm using YRDLY to connect with our neighbours in Lekki Phase 1. Join our neighborhood community here: ${INVITE_LINK}`

  const copyLink = () => { setCopied(true); setTimeout(() => setCopied(false), 2500) }

  // Pseudo-QR using CSS grid
  const qrSeed = 'LEKKI8492'
  const QR_SIZE = 11
  const qrCells = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
    const row = Math.floor(i / QR_SIZE), col = i % QR_SIZE
    if ((row < 3 && col < 3) || (row < 3 && col > QR_SIZE - 4) || (row > QR_SIZE - 4 && col < 3)) return true
    return ((qrSeed.charCodeAt(i % qrSeed.length) ^ (row * 7 + col * 13)) % 3) === 0
  })

  return (
    <div className="screen-enter relative w-full h-full flex flex-col" style={{ background: '#050505' }}>
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pb-3" style={{ paddingTop: '54px', borderBottom: `1px solid ${GLASS_BORDER}` }}>
        <button onClick={() => go('profile')} style={{ width: '34px', height: '34px', borderRadius: '11px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '18px', color: '#fff' }}>Invite Your Neighbours</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Hero banner */}
        <div style={{ background: 'rgba(130,219,126,0.06)', border: '1px solid rgba(130,219,126,0.18)', borderRadius: '24px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>🏘️</div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', marginBottom: '8px' }}>Grow Your Local Community</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: MUTED, lineHeight: 1.65 }}>YRDLY is better when your real-world neighbours are here too.</p>
        </div>

        {/* Invite link card */}
        <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: LABEL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Your Invite Link</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2.5" style={{ background: SURFACE, borderRadius: '12px', border: `1px solid ${GLASS_BORDER}` }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: G, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{INVITE_LINK}</p>
            </div>
            <button onClick={copyLink}
              style={{ padding: '8px 16px', borderRadius: '12px', background: copied ? 'rgba(130,219,126,0.15)' : G, fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '13px', color: copied ? G : DARK, border: `1px solid ${copied ? 'rgba(130,219,126,0.35)' : 'transparent'}`, transition: 'all 0.2s', flexShrink: 0 }}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* QR code */}
        <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: LABEL, textAlign: 'center' }}>Scan to join Lekki Phase 1 on YRDLY</p>
          <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', display: 'grid', gridTemplateColumns: `repeat(${QR_SIZE}, 14px)`, gridTemplateRows: `repeat(${QR_SIZE}, 14px)`, gap: '1.5px' }}>
            {qrCells.map((filled, i) => (
              <div key={i} style={{ width: '14px', height: '14px', borderRadius: '2px', background: filled ? '#111' : '#fff' }} />
            ))}
          </div>
          <div className="flex gap-3 w-full">
            <button style={{ flex: 1, padding: '10px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>Save QR</button>
            <button style={{ flex: 1, padding: '10px', borderRadius: '12px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, fontFamily: 'Inter, sans-serif', fontSize: '13px', color: MUTED }}>Share QR</button>
          </div>
        </div>

        {/* Share actions */}
        <div className="flex flex-col gap-3">
          <button style={{ width: '100%', padding: '14px', borderRadius: '16px', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            Share via WhatsApp
          </button>
          <button style={{ width: '100%', padding: '14px', borderRadius: '16px', background: SURFACE, border: `1px solid ${GLASS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share via SMS / Other
          </button>
        </div>

        {/* Community stats */}
        <div style={{ background: '#0f0f0f', border: `1px solid ${GLASS_BORDER}`, borderRadius: '20px', padding: '16px' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill={G}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: G }}>240 neighbours active in Lekki Phase 1</p>
          </div>
          <div className="flex gap-3">
            {[{ l: 'Invited', v: '14' }, { l: 'Joined', v: '8' }, { l: 'Pending', v: '6' }].map(s => (
              <div key={s.l} className="flex-1 px-3 py-3" style={{ background: SURFACE, borderRadius: '14px', border: `1px solid ${GLASS_BORDER}`, textAlign: 'center' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '22px', color: '#fff', marginBottom: '2px' }}>{s.v}</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: LABEL }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('splash')
  const [key, setKey] = useState(0)
  const go = (p: Page) => { setPage(p); setKey(k => k + 1) }

  const screens: Record<Page, React.ReactNode> = {
    splash: <SplashScreen go={go} />,
    onboarding: <OnboardingFlow go={go} />,
    signup: <SignUpScreen go={go} />,
    login: <LoginScreen go={go} />,
    forgot: <ForgotScreen go={go} />,
    reset: <ResetScreen go={go} />,
    'verify-email': <VerifyEmailScreen go={go} />,
    phone: <PhoneScreen go={go} />,
    otp: <OTPScreen go={go} />,
    profile1: <Profile1Screen go={go} />,
    profile2: <Profile2Screen go={go} />,
    permissions: <PermissionsScreen go={go} />,
    feed: <FeedScreen go={go} />,
    profile: <ProfileScreen go={go} />,
    settings: <SettingsScreen go={go} />,
    transactions: <TransactionsScreen go={go} />,
    payouts: <PayoutsScreen go={go} />,
    'bank-account': <BankAccountScreen go={go} />,
    'privacy-disc': <PrivacyDiscScreen go={go} />,
    'location-settings': <LocationSettingsScreen go={go} />,
    'notifications-settings': <NotificationsScreen go={go} />,
    'darkmode-settings': <DarkModeScreen go={go} />,
    'edit-profile': <EditProfileScreen go={go} />,
    explore: <ExploreScreen go={go} />,
    messages: <MessagesScreen go={go} />,
    'new-message': <NewMessageScreen go={go} />,
    chat: <ChatScreen go={go} />,
    guidelines: <GuidelinesScreen go={go} />,
    'help-center': <HelpCenterScreen go={go} />,
    'report-issue': <ReportIssueScreen go={go} />,
    'item-detail': <ItemDetailScreen go={go} />,
    'event-detail': <EventDetailScreen go={go} />,
    'place-detail': <PlaceDetailScreen go={go} />,
    community: <CommunityScreen go={go} />,
    tickets: <TicketsScreen go={go} />,
    'my-events': <MyEventsScreen go={go} />,
    'my-business': <MyBusinessScreen go={go} />,
    'create-post': <CreatePostScreen go={go} />,
    'create-for-sale': <CreateForSaleScreen go={go} />,
    'create-event': <CreateEventScreen go={go} />,
    'ticket-purchase': <TicketPurchaseScreen go={go} />,
    'ticket-qr': <TicketQRScreen go={go} />,
    'scan-tickets': <ScanTicketsScreen go={go} />,
    'event-manage': <EventManageScreen go={go} />,
    checkout: <CheckoutScreen go={go} />,
    'checkout-success': <CheckoutSuccessScreen go={go} />,
    'order-detail': <OrderDetailScreen go={go} />,
    dispute: <DisputeScreen go={go} />,
    'review-seller': <ReviewSellerScreen go={go} />,
    withdraw: <WithdrawScreen go={go} />,
    'withdraw-confirm': <WithdrawConfirmScreen go={go} />,
    'withdraw-success': <WithdrawSuccessScreen go={go} />,
    'bank-verify': <BankVerifyScreen go={go} />,
    'business-hub': <BusinessHubScreen go={go} />,
    'business-edit': <BusinessEditScreen go={go} />,
    'business-add-item': <BusinessAddItemScreen go={go} />,
    alerts: <AlertsScreen go={go} />,
    'alert-detail': <AlertDetailScreen go={go} />,
    'create-alert': <CreateAlertScreen go={go} />,
    'admin-disputes': <AdminDisputesScreen go={go} />,
    'admin-dispute-detail': <AdminDisputeDetailScreen go={go} />,
    map: <MapScreen go={go} />,
    'public-profile': <PublicProfileScreen go={go} />,
    network: <NetworkScreen go={go} />,
    'post-detail': <PostDetailScreen go={go} />,
    invite: <InviteScreen go={go} />,
    'followers-list': <FollowersListScreen go={go} />,
  }

  return (
    <div className="flex items-center justify-center w-full h-full" style={{ background: '#0d0d0d' }}>
      <div style={{ width: '390px', height: '844px', background: DARK, borderRadius: '52px', overflow: 'hidden', position: 'relative', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 48px 96px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        <div key={key} style={{ height: '100%' }}>
          {screens[page]}
        </div>
      </div>
    </div>
  )
}
