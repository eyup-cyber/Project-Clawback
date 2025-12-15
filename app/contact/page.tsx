'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Nav from '../components/Nav';
import Footer from '../components/layout/Footer';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success('Message sent! We\'ll get back to you soon.');
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <>
      <Nav />

      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-4xl mx-auto">
          <h1
            className="text-5xl font-bold mb-4 text-center"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            get in touch
          </h1>
          <p
            className="text-center mb-12 text-lg"
            style={{ color: 'var(--foreground)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
          >
            Questions, feedback, or just want to say hello? We&apos;d love to hear from you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact info */}
            <div className="space-y-8">
              <div>
                <h2
                  className="text-2xl font-bold mb-4"
                  style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--secondary)' }}
                >
                  Contact Information
                </h2>
                <div className="space-y-4" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}>
                  <p className="flex items-center gap-3">
                    <span className="text-2xl">📧</span>
                    <a href="mailto:contact@scroungers.media" className="hover:text-[var(--primary)]">
                      contact@scroungers.media
                    </a>
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="text-2xl">🐦</span>
                    <a
                      href="https://twitter.com/scroungersmedia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--primary)]"
                    >
                      @scroungersmedia
                    </a>
                  </p>
                </div>
              </div>

              <div>
                <h2
                  className="text-2xl font-bold mb-4"
                  style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--secondary)' }}
                >
                  Quick Links
                </h2>
                <ul className="space-y-2" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-body)' }}>
                  <li>
                    <a href="/apply" className="hover:text-[var(--primary)]">
                      → Become a Contributor
                    </a>
                  </li>
                  <li>
                    <a href="/about" className="hover:text-[var(--primary)]">
                      → About Us
                    </a>
                  </li>
                  <li>
                    <a href="/faq" className="hover:text-[var(--primary)]">
                      → FAQ
                    </a>
                  </li>
                </ul>
              </div>

              <div
                className="p-6 rounded-lg"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <h3
                  className="text-xl font-bold mb-2"
                  style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
                >
                  Response Time
                </h3>
                <p style={{ color: 'var(--foreground)', opacity: 0.8, fontFamily: 'var(--font-body)' }}>
                  We aim to respond to all inquiries within 48 hours. For urgent matters,
                  please reach out on Twitter.
                </p>
              </div>
            </div>

            {/* Contact form */}
            <div>
              {submitted ? (
                <div
                  className="p-8 rounded-lg border text-center"
                  style={{ background: 'var(--surface)', borderColor: 'var(--primary)' }}
                >
                  <span className="text-6xl block mb-4">✉️</span>
                  <h2
                    className="text-2xl font-bold mb-4"
                    style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
                  >
                    Message Sent!
                  </h2>
                  <p style={{ color: 'var(--foreground)' }}>
                    Thanks for reaching out. We&apos;ll get back to you as soon as possible.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full p-3 rounded-lg border"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full p-3 rounded-lg border"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Subject *
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="w-full p-3 rounded-lg border"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                      }}
                    >
                      <option value="">Select a subject...</option>
                      <option value="general">General Inquiry</option>
                      <option value="contributor">Contributor Question</option>
                      <option value="technical">Technical Issue</option>
                      <option value="press">Press/Media</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Message *
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={6}
                      className="w-full p-3 rounded-lg border resize-none"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg font-medium disabled:opacity-50"
                    style={{ background: 'var(--primary)', color: 'var(--background)' }}
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}



