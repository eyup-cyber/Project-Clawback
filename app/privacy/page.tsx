import Nav from '../components/Nav';
import Footer from '../components/layout/Footer';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Scroungers Multimedia.',
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <section className="min-h-screen py-24 px-4" style={{ background: 'var(--background)' }}>
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-5xl font-bold mb-4 text-center"
            style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--primary)' }}
          >
            privacy policy
          </h1>
          <p
            className="text-center mb-12"
            style={{ color: 'var(--foreground)', opacity: 0.7 }}
          >
            Last updated: December 2024
          </p>

          <div
            className="prose prose-lg max-w-none"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <Section title="Our Commitment to Privacy">
              <p>
                Scroungers Multimedia is committed to protecting your privacy. We collect only the minimum data necessary to operate the platform and never sell your personal information to third parties.
              </p>
            </Section>

            <Section title="Information We Collect">
              <h3 className="font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>Account Information</h3>
              <p>When you create an account, we collect:</p>
              <ul>
                <li>Email address (required for account management)</li>
                <li>Display name and username</li>
                <li>Optional profile information (bio, social links)</li>
              </ul>

              <h3 className="font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>Content Data</h3>
              <p>When you contribute content, we store:</p>
              <ul>
                <li>Your submitted articles, media, and comments</li>
                <li>Metadata (publication dates, edit history)</li>
              </ul>

              <h3 className="font-bold mt-4 mb-2" style={{ color: 'var(--foreground)' }}>Usage Data</h3>
              <p>We collect minimal, anonymized usage data:</p>
              <ul>
                <li>Page views and basic engagement metrics</li>
                <li>No third-party tracking or advertising pixels</li>
              </ul>
            </Section>

            <Section title="How We Use Your Information">
              <p>Your information is used to:</p>
              <ul>
                <li>Operate and improve the platform</li>
                <li>Communicate important updates</li>
                <li>Prevent abuse and maintain security</li>
                <li>Display your content as you&apos;ve published it</li>
              </ul>
            </Section>

            <Section title="Information We DON'T Collect">
              <p>Unlike many platforms, we do NOT:</p>
              <ul>
                <li>Sell data to advertisers or data brokers</li>
                <li>Use third-party tracking cookies</li>
                <li>Build profiles for targeted advertising</li>
                <li>Share data with marketing companies</li>
                <li>Collect financial information (donations are handled by Ko-fi)</li>
              </ul>
            </Section>

            <Section title="Data Storage and Security">
              <p>
                Your data is stored securely using industry-standard encryption. We use Supabase for our database, which provides enterprise-grade security. Media files are stored on Cloudflare R2.
              </p>
            </Section>

            <Section title="Your Rights">
              <p>You have the right to:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Erasure:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your content in a standard format</li>
                <li><strong>Object:</strong> Object to certain processing of your data</li>
              </ul>
            </Section>

            <Section title="Cookie Policy">
              <p>We use only essential cookies required for:</p>
              <ul>
                <li>Authentication and session management</li>
                <li>Security (CSRF protection)</li>
              </ul>
              <p>
                We do not use analytics cookies, advertising cookies, or any third-party tracking cookies.
              </p>
            </Section>

            <Section title="Third-Party Services">
              <p>We use the following third-party services:</p>
              <ul>
                <li><strong>Supabase:</strong> Database and authentication</li>
                <li><strong>Cloudflare:</strong> Content delivery and media storage</li>
                <li><strong>Ko-fi:</strong> Payment processing for donations (external link)</li>
              </ul>
              <p>Each of these services has their own privacy policy that governs their handling of data.</p>
            </Section>

            <Section title="Data Retention">
              <p>
                We retain your account data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, though some content may be retained in backups for a limited period.
              </p>
            </Section>

            <Section title="Changes to This Policy">
              <p>
                We may update this privacy policy occasionally. Significant changes will be communicated via email or platform notification. The &quot;last updated&quot; date at the top of this page indicates when the policy was last revised.
              </p>
            </Section>

            <Section title="Contact Us">
              <p>
                For privacy-related questions or to exercise your rights, please contact us via our <a href="/contact" style={{ color: 'var(--primary)' }}>contact page</a>.
              </p>
            </Section>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 p-6 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h2
        className="text-xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-kindergarten)', color: 'var(--secondary)' }}
      >
        {title}
      </h2>
      <div
        className="space-y-3"
        style={{ color: 'var(--foreground)', opacity: 0.85 }}
      >
        {children}
      </div>
    </div>
  );
}
