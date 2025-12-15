"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { useAuth } from "@/lib/hooks/useAuth";
import { loginSchema, type LoginInput } from "@/lib/validations";
import toast from "react-hot-toast";

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
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

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

      <form onSubmit={handleSubmit} className="space-y-5">
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
      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span
          className="text-xs uppercase tracking-wider"
          style={{
            color: "var(--foreground)",
            opacity: 0.4,
            fontFamily: "var(--font-body)",
          }}
        >
          or
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      {/* Register link */}
      <p
        className="text-center"
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
