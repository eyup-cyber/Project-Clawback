import Footer from '../components/layout/Footer';
import Nav from '../components/Nav';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Scroungers Multimedia.',
};

export default function TermsPage() {
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
            terms of service
          </h1>
          <p className="text-center mb-12" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            Last updated: December 2024
          </p>

          <div className="prose prose-lg max-w-none" style={{ fontFamily: 'var(--font-body)' }}>
            <Section title="1. Acceptance of Terms">
              <p>
                By accessing and using Scroungers Multimedia (&quot;the Platform&quot;), you agree
                to be bound by these Terms of Service. If you do not agree to these terms, please do
                not use the Platform.
              </p>
            </Section>

            <Section title="2. About the Platform">
              <p>
                Scroungers Multimedia is a platform for independent political journalism and
                multimedia content. We provide a space for contributors to publish their work and
                for readers to engage with that content.
              </p>
            </Section>

            <Section title="3. User Accounts">
              <p>
                To access certain features, you must create an account. You are responsible for:
              </p>
              <ul>
                <li>Providing accurate and complete information</li>
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </Section>

            <Section title="4. Content Guidelines">
              <p>
                Contributors retain full ownership and intellectual property rights to their
                content. By publishing on our platform, you grant us a non-exclusive license to
                display and distribute your content.
              </p>
              <p>Content must not:</p>
              <ul>
                <li>Contain hate speech or incite violence against protected groups</li>
                <li>Include illegal content or promote illegal activities</li>
                <li>Infringe on others&apos; intellectual property rights</li>
                <li>Contain personal attacks, doxxing, or harassment</li>
                <li>Spread deliberate misinformation presented as fact</li>
              </ul>
              <p>
                <strong>Note:</strong> Robust political criticism, even of powerful individuals or
                institutions, is not only allowed but encouraged. We distinguish between legitimate
                critique and personal harassment.
              </p>
            </Section>

            <Section title="5. Contributor Rights and Responsibilities">
              <p>As a contributor, you:</p>
              <ul>
                <li>Retain 100% ownership of your content</li>
                <li>Receive 100% of any donations made through your Ko-fi link</li>
                <li>Can remove your content at any time</li>
                <li>Are responsible for the accuracy and legality of your content</li>
                <li>Must not plagiarize or misrepresent others&apos; work as your own</li>
              </ul>
            </Section>

            <Section title="6. Reader Conduct">
              <p>Readers must:</p>
              <ul>
                <li>Engage respectfully with content and other users</li>
                <li>Not harass, threaten, or abuse contributors</li>
                <li>Report violations of community guidelines</li>
                <li>Not attempt to circumvent security measures</li>
              </ul>
            </Section>

            <Section title="7. Moderation and Enforcement">
              <p>
                We reserve the right to remove content or suspend accounts that violate these terms.
                We aim to be transparent about moderation decisions and provide appeals where
                possible.
              </p>
            </Section>

            <Section title="8. Donations and Payments">
              <p>
                All donations to contributors are processed through Ko-fi. We do not process
                payments and take 0% of creator revenue. Any disputes regarding donations should be
                directed to Ko-fi.
              </p>
            </Section>

            <Section title="9. Disclaimer of Warranties">
              <p>
                The Platform is provided &quot;as is&quot; without warranties of any kind. We do not
                guarantee uninterrupted access or that the Platform will be error-free.
              </p>
            </Section>

            <Section title="10. Limitation of Liability">
              <p>
                To the fullest extent permitted by law, Scroungers Multimedia shall not be liable
                for any indirect, incidental, or consequential damages arising from your use of the
                Platform.
              </p>
            </Section>

            <Section title="11. Changes to Terms">
              <p>
                We may update these terms from time to time. Significant changes will be
                communicated via the Platform or email. Continued use after changes constitutes
                acceptance of the new terms.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                For questions about these terms, please contact us via our{' '}
                <a href="/contact" style={{ color: 'var(--primary)' }}>
                  contact page
                </a>
                .
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
    <div
      className="mb-8 p-6 rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <h2
        className="text-xl font-bold mb-4"
        style={{
          fontFamily: 'var(--font-kindergarten)',
          color: 'var(--secondary)',
        }}
      >
        {title}
      </h2>
      <div className="space-y-3" style={{ color: 'var(--foreground)', opacity: 0.85 }}>
        {children}
      </div>
    </div>
  );
}
