import { useState } from 'react';
import type { ChangeEvent, FormEvent, SVGProps } from 'react';
import './Auth.css';

type IconName = 'mail' | 'lock' | 'user' | 'eye' | 'eye-off' | 'arrow-right' | 'check';

interface IconProps {
  name: IconName;
  className?: string;
}

interface PasswordInputProps {
  id: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

interface SignInData {
  email: string;
  password: string;
  remember: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface SignInViewProps {
  onSubmit?: (data: SignInData) => void;
  onSwitchToRegister: () => void;
  onForgot?: () => void;
}

interface RegisterViewProps {
  onSubmit?: (data: RegisterData) => void;
  onSwitchToSignIn: () => void;
}

interface AuthProps {
  initialView?: 'signin' | 'register';
  brandName?: string;
  brandLetter?: string;
  onSignIn?: (data: SignInData) => void;
  onRegister?: (data: RegisterData) => void;
  onForgotPassword?: () => void;
}

/* ---------- Tiny icon set (inline SVG, no deps) ---------- */
function Icon({ name, className }: IconProps) {
  const common: SVGProps<SVGSVGElement> = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  };
  switch (name) {
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg {...common}>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A10.4 10.4 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.6" />
          <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.7" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common} strokeWidth="2.4">
          <path d="M5 12h14" />
          <path d="m13 5 7 7-7 7" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common} strokeWidth="3">
          <path d="m5 12 5 5L20 7" />
        </svg>
      );
    default:
      return null;
  }
}

/* ---------- Reusable password input ---------- */
function PasswordInput({ id, placeholder, autoComplete, value, onChange }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="rm-input">
      <Icon name="lock" className="rm-input__lead" />
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="rm-input__toggle"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow((s) => !s)}
        style={{ color: show ? 'var(--rm-brand)' : 'var(--rm-ink-3)' }}
      >
        <Icon name={show ? 'eye-off' : 'eye'} />
      </button>
    </div>
  );
}

/* ---------- Brand row ---------- */
function Brand({ letter = 'R', name = 'RateMal' }: { letter?: string; name?: string }) {
  const [first, ...rest] = name.split(/(?=[A-Z])/);
  const second = rest.join('');
  return (
    <div className="rm-brand">
      <div className="rm-brand__mark" aria-hidden="true">
        {letter}
      </div>
      <div className="rm-brand__name">
        <span>{first || name}</span>
        {second && <span className="rm-brand__name-accent">{second}</span>}
      </div>
    </div>
  );
}

/* ---------- Sign In view ---------- */
function SignInView({ onSubmit, onSwitchToRegister, onForgot }: SignInViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit?.({ email, password, remember });
  }

  return (
    <section className="rm-fade" aria-labelledby="signin-title">
      <div className="rm-head">
        <h1 id="signin-title">Welcome back.</h1>
        <p>Get ready for the ultimate drawing experience.</p>
      </div>

      <form onSubmit={handleSubmit} className="rm-form">
        <div className="rm-field">
          <label htmlFor="si-email">Email address</label>
          <div className="rm-input">
            <Icon name="mail" className="rm-input__lead" />
            <input
              id="si-email"
              type="email"
              autoComplete="email"
              placeholder="you@ratemal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="rm-field">
          <div className="rm-row-between" style={{ marginBottom: 8 }}>
            <label htmlFor="si-pass" style={{ margin: 0 }}>Password</label>
            <button
              type="button"
              className="rm-forgot"
              onClick={(e) => {
                e.preventDefault();
                onForgot?.();
              }}
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput
            id="si-pass"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="rm-row-between">
          <label className="rm-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="rm-check__box"><Icon name="check" /></span>
            <span>Keep me signed in</span>
          </label>
        </div>

        <button type="submit" className="rm-btn rm-btn--primary">
          Sign In
          <Icon name="arrow-right" />
        </button>
      </form>

      <p className="rm-swap">
        New to RateMal?{' '}
        <button type="button" onClick={onSwitchToRegister}>
          Create an account →
        </button>
      </p>
    </section>
  );
}

/* ---------- Register view ---------- */
function RegisterView({ onSubmit, onSwitchToSignIn }: RegisterViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree) return;
    onSubmit?.({ name, email, password });
  }

  return (
    <section className="rm-fade" aria-labelledby="reg-title">
      <div className="rm-head">
        <h1 id="reg-title">Create your account.</h1>
        <p>"Funny Subtitle :)"</p>
      </div>

      <form onSubmit={handleSubmit} className="rm-form">
        <div className="rm-field">
          <label htmlFor="r-name">Full name</label>
          <div className="rm-input">
            <Icon name="user" className="rm-input__lead" />
            <input
              id="r-name"
              type="text"
              autoComplete="name"
              placeholder="Jordan Avery"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="rm-field">
          <label htmlFor="r-email">Email address</label>
          <div className="rm-input">
            <Icon name="mail" className="rm-input__lead" />
            <input
              id="r-email"
              type="email"
              autoComplete="email"
              placeholder="you@ratemal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="rm-field">
          <label htmlFor="r-pass">Password</label>
          <PasswordInput
            id="r-pass"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="rm-hint">Min. 8 characters with one symbol</div>
        </div>

        <label className="rm-check" style={{ marginTop: 2 }}>
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span className="rm-check__box"><Icon name="check" /></span>
          <span>
            I agree to the <a href="#terms">Terms of Service</a> and{' '}
            <a href="#privacy">Privacy Policy</a>.
          </span>
        </label>

        <button
          type="submit"
          className="rm-btn rm-btn--accent"
          style={{ marginTop: 6 }}
          disabled={!agree}
        >
          Create Account
          <Icon name="arrow-right" />
        </button>
      </form>

      <p className="rm-swap">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToSignIn}>
          Sign in →
        </button>
      </p>
    </section>
  );
}

/* ---------- Main exported component ---------- */
export default function Auth({
  initialView = 'signin',
  brandName = 'RateMal',
  brandLetter = 'R',
  onSignIn,
  onRegister,
  onForgotPassword,
}: AuthProps) {
  const [view, setView] = useState<'signin' | 'register'>(initialView);

  return (
    <div className="rm-auth-stage">
      <main className="rm-card" role="main">
        <Brand letter={brandLetter} name={brandName} />

        <div className="rm-tabs" role="tablist" aria-label="Authentication">
          <button
            type="button"
            className={'rm-tab ' + (view === 'signin' ? 'is-active' : '')}
            onClick={() => setView('signin')}
            role="tab"
            aria-selected={view === 'signin'}
          >
            Sign In
          </button>
          <button
            type="button"
            className={'rm-tab ' + (view === 'register' ? 'is-active' : '')}
            onClick={() => setView('register')}
            role="tab"
            aria-selected={view === 'register'}
          >
            Create Account
          </button>
        </div>

        {view === 'signin' ? (
          <SignInView
            onSubmit={onSignIn}
            onSwitchToRegister={() => setView('register')}
            onForgot={onForgotPassword}
          />
        ) : (
          <RegisterView
            onSubmit={onRegister}
            onSwitchToSignIn={() => setView('signin')}
          />
        )}

        <p className="rm-legal">
          © {new Date().getFullYear()} {brandName} ·{' '}
          <a href="#help">Help</a> · <a href="#status">Status</a>
        </p>
      </main>
    </div>
  );
}

export { SignInView, RegisterView };
