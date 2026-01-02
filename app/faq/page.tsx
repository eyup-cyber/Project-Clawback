'use client';

import { useState } from 'react';
import Footer from '../components/layout/Footer';
import Nav from '../components/Nav';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // General
  {
    category: 'General',
    question: 'What is Scroungers Multimedia?',
    answer:
      'Scroungers Multimedia is a platform for political journalism and multimedia content created by independent contributors. We amplify marginalized voices—people who experience political and economic systems firsthand, not just commentators watching from the sidelines.',
  },
  {
    category: 'General',
    question: 'Why is it called "Scroungers"?',
    answer:
      '"Scrounger" is what they call us—the tabloids, politicians, and comfortable classes use it to shame us into silence. We\'re reclaiming the word. Our "low esteem" is our authority. The disabled, unemployed, precariously employed, and working poor understand these systems best—not from textbooks, but from lived experience.',
  },
  {
    category: 'General',
    question: 'How is Scroungers different from other media platforms?',
    answer:
      "Unlike traditional platforms, we don't require journalism degrees or formal credentials. Contributors retain 100% of their intellectual property and receive 100% of donations made through Ko-fi. We take 0% of creator revenue—ever.",
  },
  // Contributors
  {
    category: 'Contributors',
    question: 'Who can become a contributor?',
    answer:
      "Anyone with lived experience and perspective to share. We don't require degrees, publications, or industry connections. If you have skin in the game and a story to tell, you belong here.",
  },
  {
    category: 'Contributors',
    question: 'How do I apply to become a contributor?',
    answer:
      "Visit our Apply page and fill out the application form. Tell us about yourself, what topics you're passionate about, and what kind of content you'd like to create. We review all applications and respond within 1-2 weeks.",
  },
  {
    category: 'Contributors',
    question: 'What types of content can I create?',
    answer:
      'We accept written articles, video essays, audio podcasts, and visual art/photography. You can focus on one type or create across multiple formats.',
  },
  {
    category: 'Contributors',
    question: 'How do donations work?',
    answer:
      "Each post includes your Ko-fi link. Readers who want to support your work can donate directly to you through Ko-fi. We don't process payments or take any cut—100% goes to you.",
  },
  {
    category: 'Contributors',
    question: 'Do I keep my intellectual property?',
    answer:
      'Yes, absolutely. You retain full ownership and IP rights to everything you create. By publishing on our platform, you grant us a license to display and distribute your content, but the work remains yours. You can republish elsewhere or remove your content anytime.',
  },
  {
    category: 'Contributors',
    question: 'Is there an editorial review process?',
    answer:
      "Yes, all content goes through a brief editorial review before publication. This is primarily to ensure content aligns with our guidelines and doesn't contain issues like hate speech. We respect your voice and don't edit your perspective.",
  },
  // Readers
  {
    category: 'Readers',
    question: 'Do I need an account to read content?',
    answer:
      'No, all published content is freely accessible without an account. You only need an account to comment, react, or apply to become a contributor.',
  },
  {
    category: 'Readers',
    question: 'How can I support creators?',
    answer:
      "Each post displays the creator's Ko-fi link. Click it to make a one-time or recurring donation. You can also engage with content by starring, commenting, and sharing.",
  },
  {
    category: 'Readers',
    question: 'Can I suggest topics or request content?',
    answer:
      'We welcome suggestions! Use our contact form to share ideas. Contributors often draw inspiration from reader interests.',
  },
  // Technical
  {
    category: 'Technical',
    question: 'How do I delete my account?',
    answer:
      'Go to Dashboard > Settings and click "Delete Account." This will remove your profile and personal data. Note: Published content may remain unless you specifically request its removal before deleting your account.',
  },
  {
    category: 'Technical',
    question: 'I forgot my password. How do I reset it?',
    answer:
      'Click "Forgot Password" on the login page, enter your email, and we\'ll send you a reset link. Check your spam folder if you don\'t see it.',
  },
  {
    category: 'Technical',
    question: 'What file formats are supported for uploads?',
    answer:
      'For video: MP4, WebM, MOV. For audio: MP3, WAV, M4A, OGG. For images: JPEG, PNG, WebP, GIF. Maximum file size is 500MB for video/audio and 10MB for images.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(faqs.map((f) => f.category)))];
  const filteredFaqs =
    activeCategory === 'All' ? faqs : faqs.filter((f) => f.category === activeCategory);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-5xl font-bold mb-4 text-center"
            style={{
              fontFamily: 'var(--font-kindergarten)',
              color: 'var(--primary)',
            }}
          >
            frequently asked questions
          </h1>
          <p
            className="text-center mb-12"
            style={{
              color: 'var(--foreground)',
              opacity: 0.7,
              fontFamily: 'var(--font-body)',
            }}
          >
            Everything you need to know about Scroungers Multimedia.
          </p>

          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${
                  activeCategory === category
                    ? 'bg-[var(--primary)] text-[var(--background)]'
                    : 'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-lg border overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <span
                    className="font-medium text-lg"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {faq.question}
                  </span>
                  <span
                    className={`text-2xl transition-transform ${openIndex === index ? 'rotate-45' : ''}`}
                    style={{ color: 'var(--primary)' }}
                  >
                    +
                  </span>
                </button>
                {openIndex === index && (
                  <div
                    className="px-6 pb-6"
                    style={{
                      color: 'var(--foreground)',
                      opacity: 0.8,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Still have questions */}
          <div
            className="mt-12 p-8 rounded-lg text-center"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <h2
              className="text-2xl font-bold mb-4"
              style={{
                fontFamily: 'var(--font-kindergarten)',
                color: 'var(--secondary)',
              }}
            >
              Still have questions?
            </h2>
            <p className="mb-6" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              Can&apos;t find what you&apos;re looking for? Get in touch with us.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium"
              style={{
                background: 'var(--primary)',
                color: 'var(--background)',
              }}
            >
              Contact Us →
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
