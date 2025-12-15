"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { newsletterSchema } from "@/lib/validations";
import toast from "react-hot-toast";

gsap.registerPlugin(ScrollTrigger);

// Confetti particle component
function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    const colors = ["#32CD32", "#FFD700", "#FF00FF", "#E0E0E0"];

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: Math.random() * -12 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allDone = true;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity
        p.rotation += p.rotationSpeed;
        p.vx *= 0.99;

        if (p.y < canvas.height + 20) {
          allDone = false;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (!allDone) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}

// Loading spinner component
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

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(contentRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Shake animation for error
  const shakeInput = useCallback(() => {
    if (!inputRef.current) return;

    gsap.to(inputRef.current, {
      keyframes: [
        { x: -10, duration: 0.06 },
        { x: 10, duration: 0.06 },
        { x: -10, duration: 0.06 },
        { x: 10, duration: 0.06 },
        { x: -5, duration: 0.06 },
        { x: 5, duration: 0.06 },
        { x: 0, duration: 0.06 },
      ],
      ease: "power2.out",
    });

    setError(true);
    setTimeout(() => setError(false), 2000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = newsletterSchema.safeParse({ email });
    if (!result.success) {
      toast.error("Please enter a valid email address");
      shakeInput();
      return;
    }

    setLoading(true);

    // Simulate API call - will be replaced with real endpoint
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubscribed(true);
    setLoading(false);
    setShowConfetti(true);
    toast.success("Welcome to the margins!");

    // Clear confetti after animation
    setTimeout(() => setShowConfetti(false), 3000);
  };

  if (subscribed) {
    return (
      <section
        ref={sectionRef}
        className="py-20 px-4 md:px-8 relative overflow-hidden"
        style={{ background: "var(--surface)" }}
      >
        <Confetti active={showConfetti} />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-bounce"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), var(--secondary))",
              boxShadow: "0 0 40px var(--glow-primary)",
            }}
          >
            <span className="text-4xl">🎉</span>
          </div>
          <h3
            className="text-3xl md:text-4xl mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--primary)",
            }}
          >
            You&apos;re In!
          </h3>
          <p
            className="text-lg"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--foreground)",
              opacity: 0.8,
            }}
          >
            We&apos;ll keep you updated with the latest from the margins.
            <br />
            <span style={{ opacity: 0.6 }}>
              Check your inbox for a welcome message.
            </span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="py-20 px-4 md:px-8"
      style={{
        background:
          "linear-gradient(180deg, var(--background) 0%, var(--surface) 50%, var(--background) 100%)",
      }}
    >
      <div ref={contentRef} className="max-w-2xl mx-auto text-center">
        <p
          className="text-sm uppercase tracking-[0.3em] mb-3"
          style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}
        >
          Newsletter
        </p>
        <h3
          className="text-3xl md:text-4xl mb-4"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--secondary)",
          }}
        >
          Stay Informed
        </h3>
        <p
          className="mb-10 max-w-md mx-auto"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--foreground)",
            opacity: 0.7,
          }}
        >
          Get the latest from Scroungers Multimedia straight to your inbox. No
          spam, just the good stuff.
        </p>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
        >
          {/* Email input with focus glow */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="your@email.com"
              className="w-full px-5 py-4 rounded-xl outline-none transition-all duration-300"
              style={{
                background: "var(--background)",
                border: `2px solid ${
                  error
                    ? "var(--accent)"
                    : isFocused
                    ? "var(--primary)"
                    : "var(--border)"
                }`,
                color: "var(--foreground)",
                fontFamily: "var(--font-body)",
                boxShadow: isFocused
                  ? "0 0 20px var(--glow-primary), 0 0 40px rgba(50, 205, 50, 0.1)"
                  : error
                  ? "0 0 20px var(--glow-accent)"
                  : "none",
              }}
            />
            {/* Focus glow effect */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary), var(--secondary))",
                opacity: isFocused ? 0.1 : 0,
                filter: "blur(20px)",
              }}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 active:scale-100 disabled:hover:scale-100"
            style={{
              background: loading
                ? "var(--surface-elevated)"
                : "linear-gradient(135deg, var(--primary), #28a428)",
              color: loading ? "var(--foreground)" : "#000",
              fontFamily: "var(--font-body)",
              boxShadow: loading ? "none" : "0 4px 20px var(--glow-primary)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <>
                <Spinner />
                <span>Subscribing...</span>
              </>
            ) : (
              <>
                <span>Subscribe</span>
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

        <p
          className="mt-6 text-xs"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--foreground)",
            opacity: 0.4,
          }}
        >
          No spam. Unsubscribe anytime. We respect your privacy.
        </p>
      </div>
    </section>
  );
}
