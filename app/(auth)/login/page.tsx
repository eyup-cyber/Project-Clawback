"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { useAuth } from "@/lib/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/lib/validations";
import toast from "react-hot-toast";

// Social provider icons
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const MagicLinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

// Input component with floating label and glow
function FormInput({
  id,
  name,
  type,
  label,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPassword = type === "password";
  const actualType = isPassword && showPassword ? "text" : type;
  const hasValue = value.length > 0;

  // Shake animation on error
  useEffect(() => {
    if (error && inputRef.current) {
      gsap.to(inputRef.current, {
        keyframes: [
          { x: -8, duration: 0.05 },
          { x: 8, duration: 0.05 },
          { x: -8, duration: 0.05 },
          { x: 8, duration: 0.05 },
          { x: -4, duration: 0.05 },
          { x: 4, duration: 0.05 },
          { x: 0, duration: 0.05 },
        ],
        ease: "power2.out",
      });
    }
  }, [error]);

  return (
    <div className="relative">
      {/* Floating label */}
      <label
        htmlFor={id}
        className="absolute left-4 transition-all duration-200 pointer-events-none"
        style={{
          top: isFocused || hasValue ? "-8px" : "50%",
          transform:
            isFocused || hasValue ? "translateY(0)" : "translateY(-50%)",
          fontSize: isFocused || hasValue ? "0.75rem" : "0.875rem",
          color: error
            ? "var(--accent)"
            : isFocused
            ? "var(--primary)"
            : "var(--foreground)",
          opacity: isFocused || hasValue ? 1 : 0.5,
          background: isFocused || hasValue ? "var(--surface)" : "transparent",
          padding: isFocused || hasValue ? "0 4px" : "0",
          fontFamily: "var(--font-body)",
        }}
      >
        {label}
      </label>

      {/* Input */}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={actualType}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isFocused ? placeholder : ""}
        className="w-full px-4 py-4 rounded-xl outline-none transition-all duration-200"
        style={{
          background: "rgba(1, 50, 32, 0.5)",
          border: `2px solid ${
            error
              ? "var(--accent)"
              : isFocused
              ? "var(--primary)"
              : "var(--border)"
          }`,
          color: "var(--foreground)",
          fontFamily: "var(--font-body)",
          boxShadow:
            isFocused && !error
              ? "0 0 20px var(--glow-primary)"
              : error
              ? "0 0 20px var(--glow-accent)"
              : "none",
        }}
      />

      {/* Password toggle */}
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: "var(--foreground)" }}
          tabIndex={-1}
        >
          {showPassword ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <p
          className="mt-2 text-sm flex items-center gap-1"
          style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// Spinner component
function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginInput>>({});
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { signIn, signInWithOAuth, signInWithMagicLink } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const handleOAuthSignIn = async (provider: 'google' | 'twitter') => {
    setOauthLoading(provider);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
    // On success, the user will be redirected to the OAuth provider
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicLinkEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const { error } = await signInWithMagicLink(magicLinkEmail);
    setLoading(false);
    if (error) {
      toast.error(error.message || "Failed to send magic link");
      return;
    }
    setMagicLinkSent(true);
    toast.success("Check your email for the magic link!");
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error on change
      if (errors[name as keyof LoginInput]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<LoginInput> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof LoginInput] = err.message;
        }
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    // Sign in
    const { error } = await signIn(formData.email, formData.password);

    if (error) {
      toast.error(error.message || "Failed to sign in");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    router.push(redirect);
  };

  return (
    <div
      className="p-8 md:p-10 rounded-2xl"
      style={{
        background: "rgba(1, 50, 32, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--border)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      }}
    >
      <h1
        className="text-3xl text-center mb-2"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--foreground)",
        }}
      >
        Welcome Back
      </h1>
      <p
        className="text-center mb-8"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--foreground)",
          opacity: 0.6,
        }}
      >
        Sign in to your account
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <FormInput
          id="email"
          name="email"
          type="email"
          label="Email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="you@example.com"
        />

        <FormInput
          id="password"
          name="password"
          type="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="••••••••"
        />

        {/* Forgot password */}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm hover:underline transition-colors"
            style={{ color: "var(--primary)", fontFamily: "var(--font-body)" }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
          style={{
            background: loading
              ? "var(--surface)"
              : "linear-gradient(135deg, var(--primary), #28a428)",
            color: loading ? "var(--foreground)" : "var(--background)",
            fontFamily: "var(--font-body)",
            boxShadow: loading ? "none" : "0 4px 20px var(--glow-primary)",
          }}
        >
          {loading ? (
            <>
              <Spinner />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span
          className="text-xs uppercase tracking-wider"
          style={{
            color: "var(--foreground)",
            opacity: 0.4,
            fontFamily: "var(--font-body)",
          }}
        >
          or continue with
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Social login buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => void handleOAuthSignIn('google')}
          disabled={oauthLoading !== null}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontFamily: "var(--font-body)",
          }}
        >
          {oauthLoading === 'google' ? <Spinner /> : <GoogleIcon />}
          <span>Google</span>
        </button>
        <button
          type="button"
          onClick={() => void handleOAuthSignIn('twitter')}
          disabled={oauthLoading !== null}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontFamily: "var(--font-body)",
          }}
        >
          {oauthLoading === 'twitter' ? <Spinner /> : <XIcon />}
          <span>X</span>
        </button>
      </div>

      {/* Magic link option */}
      {!magicLinkMode ? (
        <button
          type="button"
          onClick={() => setMagicLinkMode(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:bg-[var(--surface-elevated)]"
          style={{
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontFamily: "var(--font-body)",
          }}
        >
          <MagicLinkIcon />
          <span>Sign in with Magic Link</span>
        </button>
      ) : magicLinkSent ? (
        <div
          className="p-4 rounded-xl text-center"
          style={{
            background: "rgba(50, 205, 50, 0.1)",
            border: "1px solid var(--primary)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--primary)", fontFamily: "var(--font-body)" }}
          >
            ✓ Magic link sent! Check your email inbox.
          </p>
          <button
            type="button"
            onClick={() => {
              setMagicLinkMode(false);
              setMagicLinkSent(false);
              setMagicLinkEmail("");
            }}
            className="mt-2 text-xs underline"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            Use a different method
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleMagicLinkSubmit(e)} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={magicLinkEmail}
              onChange={(e) => setMagicLinkEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-xl outline-none transition-all duration-200"
              style={{
                background: "rgba(1, 50, 32, 0.5)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontFamily: "var(--font-body)",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--background)",
                fontFamily: "var(--font-body)",
              }}
            >
              {loading ? <Spinner /> : "Send"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMagicLinkMode(false)}
            className="w-full text-xs underline"
            style={{ color: "var(--foreground)", opacity: 0.7 }}
          >
            Back to password login
          </button>
        </form>
      )}

      {/* Register link */}
      <p
        className="text-center mt-6"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--foreground)",
          opacity: 0.7,
        }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-bold hover:underline transition-colors"
          style={{ color: "var(--secondary)" }}
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
