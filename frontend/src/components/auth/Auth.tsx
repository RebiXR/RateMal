import { useState, type FormEvent } from "react";
import "./Auth.css";

export type SignInData = {
  email: string;
  password: string;
  remember: boolean;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
};

type AuthProps = {
  initialView?: "signin" | "register";
  brandName?: string;
  brandLetter?: string;
  onSignIn?: (data: SignInData) => void;
  onRegister?: (data: RegisterData) => void;
};

export default function Auth({
  initialView = "signin",
  brandName = "RateMal",
  brandLetter = "R",
  onSignIn,
  onRegister,
}: AuthProps) {
  const [view, setView] = useState<"signin" | "register">(initialView);
  const [showPassword, setShowPassword] = useState(false);
  const [signIn, setSignIn] = useState<SignInData>({
    email: "",
    password: "",
    remember: true,
  });
  const [register, setRegister] = useState<RegisterData>({
    name: "",
    email: "",
    password: "",
  });
  const [agree, setAgree] = useState(false);

  const submitSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSignIn?.(signIn);
  };

  const submitRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agree) return;
    onRegister?.(register);
  };

  return (
    <div className="rm-auth-stage">
      <main className="rm-card">
        <div className="rm-brand">
          <div className="rm-brand__mark">{brandLetter}</div>
          <div className="rm-brand__name">{brandName}</div>
        </div>

        <div className="rm-tabs">
          <button
            type="button"
            className={`rm-tab ${view === "signin" ? "is-active" : ""}`}
            onClick={() => setView("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`rm-tab ${view === "register" ? "is-active" : ""}`}
            onClick={() => setView("register")}
          >
            Create Account
          </button>
        </div>

        {view === "signin" ? (
          <section className="rm-fade">
            <div className="rm-head">
              <h1>Welcome back.</h1>
              <p>Get ready for the drawing session.</p>
            </div>

            <form className="rm-form" onSubmit={submitSignIn}>
              <label className="rm-field">
                <span>Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={signIn.email}
                  onChange={(event) => setSignIn({ ...signIn, email: event.target.value })}
                  required
                />
              </label>

              <label className="rm-field">
                <span>Password</span>
                <div className="rm-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={signIn.password}
                    onChange={(event) => setSignIn({ ...signIn, password: event.target.value })}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <label className="rm-check">
                <input
                  type="checkbox"
                  checked={signIn.remember}
                  onChange={(event) => setSignIn({ ...signIn, remember: event.target.checked })}
                />
                <span>Keep me signed in</span>
              </label>

              <button className="rm-btn rm-btn--primary" type="submit">
                Sign In
              </button>
            </form>
          </section>
        ) : (
          <section className="rm-fade">
            <div className="rm-head">
              <h1>Create your account.</h1>
              <p>Start drawing together with your group.</p>
            </div>

            <form className="rm-form" onSubmit={submitRegister}>
              <label className="rm-field">
                <span>Full name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={register.name}
                  onChange={(event) => setRegister({ ...register, name: event.target.value })}
                  required
                />
              </label>

              <label className="rm-field">
                <span>Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={register.email}
                  onChange={(event) => setRegister({ ...register, email: event.target.value })}
                  required
                />
              </label>

              <label className="rm-field">
                <span>Password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={register.password}
                  onChange={(event) => setRegister({ ...register, password: event.target.value })}
                  minLength={8}
                  required
                />
              </label>

              <label className="rm-check">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                />
                <span>I agree to the Terms of Service and Privacy Policy.</span>
              </label>

              <button className="rm-btn rm-btn--accent" type="submit" disabled={!agree}>
                Create Account
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
