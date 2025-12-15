'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import Nav from '../components/Nav';
import Footer from '../components/layout/Footer';
import { useAuth } from '@/lib/hooks';
import gsap from 'gsap';

interface FormData {
  full_name: string;
  email: string;
  why_scroungers: string;
  first_piece_pitch: string;
  topics: string[];
  content_types: string[];
  portfolio_url: string;
  location: string;
  agreed_to_terms: boolean;
}

const contentTypes = [
  { id: 'written', label: 'Written Articles', icon: '📝', description: 'Blog posts, essays, news analysis' },
  { id: 'video', label: 'Video Essays', icon: '🎬', description: 'Documentaries, vlogs, visual storytelling' },
  { id: 'audio', label: 'Podcasts/Audio', icon: '🎙️', description: 'Podcasts, interviews, audio essays' },
  { id: 'visual', label: 'Visual Art', icon: '🎨', description: 'Illustrations, photography, infographics' },
];

const topicsList = [
  'Housing', 'Benefits', 'Disability', 'Healthcare', 'Employment',
  'Education', 'Economics', 'Local Politics', 'National Politics',
  'Climate', 'Immigration', 'Other'
];

const STEPS = [
  { id: 1, label: 'Basics', icon: '👤' },
  { id: 2, label: 'Content', icon: '📋' },
  { id: 3, label: 'Story', icon: '✍️' },
  { id: 4, label: 'Review', icon: '✅' },
];

function CharacterProgress({ current, max }: { current: number; max: number }) {
  const percentage = Math.min((current / max) * 100, 100);
  const isOverLimit = current > max;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-2">
      <svg width="44" height="44" className="rotate-[-90deg]">
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={isOverLimit ? '#EF4444' : 'var(--primary)'}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <span
        className="text-sm font-medium"
        style={{ color: isOverLimit ? '#EF4444' : 'var(--foreground)', opacity: 0.7 }}
      >
        {current}/{max}
      </span>
    </div>
  );
}

function StepProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* Step circle */}
          <div
            className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${
              index + 1 <= currentStep
                ? 'bg-[var(--primary)] text-[var(--background)] scale-110'
                : 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]'
            }`}
            style={{
              boxShadow: index + 1 === currentStep ? '0 0 20px var(--primary)' : 'none',
            }}
          >
            {index + 1 < currentStep ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step.icon
            )}
          </div>

          {/* Connector line */}
          {index < totalSteps - 1 && (
            <div
              className="w-16 h-1 mx-2 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  background: 'var(--primary)',
                  width: index + 1 < currentStep ? '100%' : '0%',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isContributor, setIsContributor] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const stepContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    why_scroungers: '',
    first_piece_pitch: '',
    topics: [],
    content_types: [],
    portfolio_url: '',
    location: '',
    agreed_to_terms: false,
  });

  useEffect(() => {
    const check = async () => {
      if (!user) return;

      if (user.email) {
        setFormData(prev => ({ ...prev, email: user.email || '' }));
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'contributor' || profile?.role === 'admin') {
        setIsContributor(true);
        return;
      }

      if (profile?.display_name) {
        setFormData(prev => ({ ...prev, full_name: profile.display_name || '' }));
      }

      const { data: application } = await supabase
        .from('contributor_applications')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (application) {
        setHasApplied(true);
      }
    };

    check();
  }, [user, supabase]);

  // Animate step transitions
  useEffect(() => {
    if (stepContainerRef.current) {
      gsap.fromTo(
        stepContainerRef.current,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [currentStep]);

  const handleContentTypeToggle = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      content_types: prev.content_types.includes(type)
        ? prev.content_types.filter((t) => t !== type)
        : [...prev.content_types, type],
    }));
  };

  const handleTopicToggle = (topic: string) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.full_name.trim()) {
          toast.error('Please enter your name');
          return false;
        }
        if (!formData.email.trim()) {
          toast.error('Please enter your email');
          return false;
        }
        return true;
      case 2:
        if (formData.content_types.length === 0) {
          toast.error('Please select at least one content type');
          return false;
        }
        if (formData.topics.length === 0) {
          toast.error('Please select at least one topic');
          return false;
        }
        return true;
      case 3:
        if (!formData.why_scroungers.trim()) {
          toast.error('Please tell us why you want to contribute');
          return false;
        }
        if (!formData.first_piece_pitch.trim()) {
          toast.error('Please pitch your first piece');
          return false;
        }
        return true;
      case 4:
        if (!formData.agreed_to_terms) {
          toast.error('Please agree to the terms');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        // Animate out
        if (stepContainerRef.current) {
          gsap.to(stepContainerRef.current, {
            opacity: 0,
            x: -30,
            duration: 0.2,
            onComplete: () => setCurrentStep(currentStep + 1),
          });
        }
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      if (stepContainerRef.current) {
        gsap.to(stepContainerRef.current, {
          opacity: 0,
          x: 30,
          duration: 0.2,
          onComplete: () => setCurrentStep(currentStep - 1),
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    if (!user) {
      toast.error('Please log in to apply');
      router.push('/login?redirect=/apply');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('contributor_applications').insert({
        user_id: user.id,
        full_name: formData.full_name,
        email: formData.email || user.email || '',
        why_scroungers: formData.why_scroungers,
        first_piece_pitch: formData.first_piece_pitch,
        topics: formData.topics,
        content_types: formData.content_types,
        portfolio_url: formData.portfolio_url || null,
        location: formData.location || null,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Application submitted! We\'ll be in touch.');
      setHasApplied(true);
    } catch (error) {
      console.error('Application error:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 border-4 rounded-full animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
            />
            <p style={{ color: 'var(--foreground)' }}>Loading...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />

      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-5xl font-bold mb-4 text-center"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            become a contributor
          </h1>
          <p
            className="text-center mb-8"
            style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
          >
            No credentials required. Just your perspective and your story.
          </p>

          {isContributor ? (
            <div
              className="p-8 rounded-lg border text-center glass"
              style={{ borderColor: 'var(--primary)' }}
            >
              <span className="text-6xl block mb-4">🎉</span>
              <h2
                className="text-2xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
              >
                You&apos;re already a contributor!
              </h2>
              <p className="mb-6" style={{ color: 'var(--foreground)' }}>
                Head to your dashboard to start creating content.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
                style={{ background: 'var(--primary)', color: 'var(--background)' }}
              >
                Go to Dashboard →
              </button>
            </div>
          ) : hasApplied ? (
            <div
              className="p-8 rounded-lg border text-center glass"
              style={{ borderColor: 'var(--secondary)' }}
            >
              <span className="text-6xl block mb-4">⏳</span>
              <h2
                className="text-2xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--secondary)' }}
              >
                Application Pending
              </h2>
              <p style={{ color: 'var(--foreground)' }}>
                Thanks for applying! We&apos;re reviewing your application and will be in touch soon.
              </p>
            </div>
          ) : (
            <>
              {/* Step Progress */}
              <StepProgress currentStep={currentStep} totalSteps={4} />

              {/* Login warning */}
              {!user && (
                <div
                  className="p-4 rounded-lg border mb-8"
                  style={{ background: 'var(--surface)', borderColor: 'var(--secondary)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--secondary)' }}>
                    ⚠️ You need to be logged in to apply.{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/login?redirect=/apply')}
                      className="underline font-medium"
                    >
                      Log in
                    </button>{' '}
                    or{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/register?redirect=/apply')}
                      className="underline font-medium"
                    >
                      create an account
                    </button>
                  </p>
                </div>
              )}

              {/* Step Content */}
              <div
                ref={stepContainerRef}
                className="p-8 rounded-xl border glass"
                style={{ borderColor: 'var(--border)' }}
              >
                {/* Step 1: Basics */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <span className="text-4xl block mb-2">👤</span>
                      <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}>
                        Let&apos;s start with the basics
                      </h2>
                    </div>

                    <div>
                      <label
                        className="block text-lg font-medium mb-2"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                      >
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="How should we address you?"
                        className="w-full p-4 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          color: 'var(--foreground)',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-lg font-medium mb-2"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Your email address"
                        className="w-full p-4 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          color: 'var(--foreground)',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-lg font-medium mb-2"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                      >
                        Location (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="City, Country"
                        className="w-full p-4 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          color: 'var(--foreground)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Content Types & Topics */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <span className="text-4xl block mb-2">📋</span>
                      <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}>
                        What do you want to create?
                      </h2>
                    </div>

                    <div>
                      <label
                        className="block text-lg font-medium mb-4"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                      >
                        Content Type *
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {contentTypes.map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => handleContentTypeToggle(type.id)}
                            className={`p-6 rounded-xl border text-left transition-all group ${
                              formData.content_types.includes(type.id)
                                ? 'border-[var(--primary)] scale-[1.02]'
                                : 'border-[var(--border)] hover:border-[var(--primary)]/50 hover:scale-[1.01]'
                            }`}
                            style={{
                              background: formData.content_types.includes(type.id)
                                ? 'rgba(50, 205, 50, 0.1)'
                                : 'var(--surface)',
                              boxShadow: formData.content_types.includes(type.id)
                                ? '0 0 20px rgba(50, 205, 50, 0.2)'
                                : 'none',
                            }}
                          >
                            <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{type.icon}</span>
                            <span className="text-lg font-medium block" style={{ color: 'var(--foreground)' }}>{type.label}</span>
                            <span className="text-sm block mt-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>{type.description}</span>
                            {formData.content_types.includes(type.id) && (
                              <span
                                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                style={{ background: 'var(--primary)', color: 'var(--background)' }}
                              >
                                ✓
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-lg font-medium mb-4"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                      >
                        Topics of Interest *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {topicsList.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => handleTopicToggle(topic)}
                            className={`px-4 py-2 rounded-full text-sm transition-all hover:scale-105 ${
                              formData.topics.includes(topic)
                                ? 'bg-[var(--primary)] text-[var(--background)] shadow-[0_0_10px_var(--primary)]'
                                : 'border border-[var(--border)] hover:border-[var(--primary)]'
                            }`}
                            style={{
                              background: formData.topics.includes(topic) ? undefined : 'var(--surface)',
                              color: formData.topics.includes(topic) ? undefined : 'var(--foreground)'
                            }}
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Your Story */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div className="text-center mb-8">
                      <span className="text-4xl block mb-2">✍️</span>
                      <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}>
                        Tell us your story
                      </h2>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className="text-lg font-medium"
                          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                        >
                          Why Scroungers? *
                        </label>
                        <CharacterProgress current={formData.why_scroungers.length} max={1000} />
                      </div>
                      <textarea
                        value={formData.why_scroungers}
                        onChange={(e) => setFormData({ ...formData, why_scroungers: e.target.value })}
                        placeholder="Tell us about yourself and why this platform resonates with you..."
                        rows={5}
                        className="w-full p-4 rounded-lg border resize-none outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          color: 'var(--foreground)',
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className="text-lg font-medium"
                          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                        >
                          Pitch Your First Piece *
                        </label>
                        <CharacterProgress current={formData.first_piece_pitch.length} max={500} />
                      </div>
                      <textarea
                        value={formData.first_piece_pitch}
                        onChange={(e) => setFormData({ ...formData, first_piece_pitch: e.target.value })}
                        placeholder="What would your first article, video, or piece be about? Give us a brief pitch..."
                        rows={4}
                        className="w-full p-4 rounded-lg border resize-none outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          color: 'var(--foreground)',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-lg font-medium mb-2"
                        style={{ color: 'var(--foreground)', fontFamily: 'var(--font-kindergarten)' }}
                      >
                        Portfolio (optional)
                      </label>
                      <input
                        type="url"
                        value={formData.portfolio_url}
                        onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                        placeholder="Link to previous work, social media, etc..."
                        className="w-full p-4 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-[var(--primary)]"
                        style={{
                          background: 'var(--background)',
                          borderColor: 'var(--border)',
                          color: 'var(--foreground)',
                        }}
                      />
                      <p className="text-sm mt-2" style={{ color: 'var(--foreground)', opacity: 0.5 }}>
                        Don&apos;t worry if you don&apos;t have any—we&apos;re here to help you get started!
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <span className="text-4xl block mb-2">✅</span>
                      <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--foreground)' }}>
                        Review Your Application
                      </h2>
                    </div>

                    {/* Summary */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg" style={{ background: 'var(--background)' }}>
                        <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Name & Email</h3>
                        <p style={{ color: 'var(--foreground)' }}>{formData.full_name} ({formData.email})</p>
                      </div>

                      <div className="p-4 rounded-lg" style={{ background: 'var(--background)' }}>
                        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Content Types</h3>
                        <div className="flex flex-wrap gap-2">
                          {formData.content_types.map(type => (
                            <span
                              key={type}
                              className="px-3 py-1 rounded-full text-sm"
                              style={{ background: 'var(--primary)', color: 'var(--background)' }}
                            >
                              {contentTypes.find(t => t.id === type)?.icon} {contentTypes.find(t => t.id === type)?.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ background: 'var(--background)' }}>
                        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.6 }}>Topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {formData.topics.map(topic => (
                            <span
                              key={topic}
                              className="px-3 py-1 rounded-full text-sm border"
                              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg" style={{ background: 'var(--background)' }}>
                        <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.6 }}>First Piece Pitch</h3>
                        <p className="text-sm" style={{ color: 'var(--foreground)' }}>{formData.first_piece_pitch}</p>
                      </div>
                    </div>

                    {/* Terms */}
                    <div
                      className="flex items-start gap-3 p-4 rounded-lg border"
                      style={{ borderColor: formData.agreed_to_terms ? 'var(--primary)' : 'var(--border)', background: formData.agreed_to_terms ? 'rgba(50, 205, 50, 0.05)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        id="terms"
                        checked={formData.agreed_to_terms}
                        onChange={(e) => setFormData({ ...formData, agreed_to_terms: e.target.checked })}
                        className="mt-1 w-5 h-5 accent-[var(--primary)]"
                      />
                      <label htmlFor="terms" className="text-sm" style={{ color: 'var(--foreground)' }}>
                        I understand that Scroungers Multimedia retains <strong>0%</strong> of my intellectual property and revenue.
                        I agree to create content that aligns with the platform&apos;s mission of amplifying marginalized voices.
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                  >
                    ← Back
                  </button>

                  <div className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.6 }}>
                    Step {currentStep} of 4
                  </div>

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
                      style={{ background: 'var(--primary)', color: 'var(--background)' }}
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !user}
                      className="px-8 py-3 rounded-lg font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      style={{ background: 'var(--primary)', color: 'var(--background)', fontFamily: 'var(--font-kindergarten)' }}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        'Submit Application 🚀'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
