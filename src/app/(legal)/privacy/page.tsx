import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Vizio',
  description: 'Privacy Policy for Vizio Finance',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'February 25, 2026';
  const contactEmail = 'privacy@vizio.finance'; // TODO: Update with your email

  return (
    <article className="prose prose-invert prose-emerald max-w-none">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: {lastUpdated}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Introduction</h2>
        <p className="text-white/70 leading-relaxed">
          Vizio Finance (&quot;Vizio,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
          personal finance management application and related services (the &quot;Service&quot;).
        </p>
        <p className="text-white/70 leading-relaxed mt-4">
          Please read this Privacy Policy carefully. By using the Service, you agree to the collection and use of
          information in accordance with this policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>

        <h3 className="text-lg font-medium mb-3 text-white/90">Account Information</h3>
        <p className="text-white/70 leading-relaxed mb-4">
          When you create an account, we collect:
        </p>
        <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
          <li>Email address</li>
          <li>Name (optional)</li>
          <li>Password (stored securely using industry-standard encryption)</li>
        </ul>

        <h3 className="text-lg font-medium mb-3 text-white/90">Financial Information</h3>
        <p className="text-white/70 leading-relaxed mb-4">
          When you connect your financial accounts through Plaid, we receive:
        </p>
        <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">
          <li>Account information (account name, type, and masked account numbers)</li>
          <li>Account balances</li>
          <li>Transaction history (date, amount, merchant name, category)</li>
          <li>Institution name</li>
        </ul>
        <p className="text-white/70 leading-relaxed">
          <strong className="text-white/90">Important:</strong> We do not store your bank login credentials.
          Authentication with your financial institutions is handled securely by Plaid.
          For more information about how Plaid handles your data, please review{' '}
          <a
            href="https://plaid.com/legal/#end-user-privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Plaid&apos;s Privacy Policy
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
        <p className="text-white/70 leading-relaxed mb-4">We use the information we collect to:</p>
        <ul className="list-disc list-inside text-white/70 space-y-2">
          <li>Provide, maintain, and improve the Service</li>
          <li>Display your financial accounts and transactions</li>
          <li>Categorize transactions and track spending patterns</li>
          <li>Generate budgets and financial insights</li>
          <li>Send you verification codes and security alerts</li>
          <li>Respond to your inquiries and provide customer support</li>
          <li>Protect against fraudulent or unauthorized activity</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Sharing and Disclosure</h2>
        <p className="text-white/70 leading-relaxed mb-4">
          We do not sell your personal information. We may share your information only in the following circumstances:
        </p>
        <ul className="list-disc list-inside text-white/70 space-y-2">
          <li>
            <strong className="text-white/90">Service Providers:</strong> We use Plaid to connect to your financial
            institutions and Resend to send verification emails. These providers only access data necessary to
            perform their services.
          </li>
          <li>
            <strong className="text-white/90">Legal Requirements:</strong> We may disclose information if required
            by law, court order, or governmental authority.
          </li>
          <li>
            <strong className="text-white/90">Protection of Rights:</strong> We may disclose information to protect
            our rights, privacy, safety, or property.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Security</h2>
        <p className="text-white/70 leading-relaxed">
          We implement appropriate technical and organizational security measures to protect your information, including:
        </p>
        <ul className="list-disc list-inside text-white/70 space-y-2 mt-4">
          <li>Encryption of data in transit using TLS 1.2 or higher</li>
          <li>Encryption of sensitive data at rest</li>
          <li>Secure password hashing using bcrypt</li>
          <li>Two-factor authentication via email verification</li>
          <li>Regular security assessments</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
        <p className="text-white/70 leading-relaxed">
          We retain your information for as long as your account is active or as needed to provide you with the Service.
          Specifically:
        </p>
        <ul className="list-disc list-inside text-white/70 space-y-2 mt-4">
          <li>
            <strong className="text-white/90">Account data:</strong> Retained until you delete your account
          </li>
          <li>
            <strong className="text-white/90">Transaction data:</strong> Retained for up to 7 years for tax and
            financial record-keeping purposes, or until you delete your account
          </li>
          <li>
            <strong className="text-white/90">Verification codes:</strong> Automatically deleted after use or expiration
          </li>
        </ul>
        <p className="text-white/70 leading-relaxed mt-4">
          When you delete your account, all your data is permanently removed from our systems within 30 days,
          except where retention is required by law.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Rights and Choices</h2>
        <p className="text-white/70 leading-relaxed mb-4">You have the right to:</p>
        <ul className="list-disc list-inside text-white/70 space-y-2">
          <li>
            <strong className="text-white/90">Access:</strong> View all your personal data through the Service
          </li>
          <li>
            <strong className="text-white/90">Export:</strong> Download your transaction data in CSV format
          </li>
          <li>
            <strong className="text-white/90">Correction:</strong> Update your account information at any time
          </li>
          <li>
            <strong className="text-white/90">Deletion:</strong> Delete your account and all associated data
          </li>
          <li>
            <strong className="text-white/90">Disconnect:</strong> Unlink any connected financial account at any time
          </li>
          <li>
            <strong className="text-white/90">Opt-out:</strong> Disable two-factor authentication (not recommended)
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Children&apos;s Privacy</h2>
        <p className="text-white/70 leading-relaxed">
          The Service is not intended for children under 18 years of age. We do not knowingly collect personal
          information from children under 18. If you are a parent or guardian and believe your child has provided
          us with personal information, please contact us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Changes to This Privacy Policy</h2>
        <p className="text-white/70 leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of any material changes by
          posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. Your continued
          use of the Service after any changes constitutes your acceptance of the new Privacy Policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
        <p className="text-white/70 leading-relaxed">
          If you have questions about this Privacy Policy or our privacy practices, please contact us at:{' '}
          <a href={`mailto:${contactEmail}`} className="text-emerald-400 hover:text-emerald-300">
            {contactEmail}
          </a>
        </p>
      </section>
    </article>
  );
}
