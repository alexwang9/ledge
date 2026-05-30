import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Ledge',
  description: 'Terms of Service for Ledge',
};

export default function TermsOfServicePage() {
  const lastUpdated = 'February 25, 2026';
  const contactEmail = 'support@ledgeflux.com';

  return (
    <article className="prose prose-invert prose-emerald max-w-none">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: {lastUpdated}</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Agreement to Terms</h2>
        <p className="text-white/70 leading-relaxed">
          By accessing or using Ledge (&quot;Ledge,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and our personal finance
          management application (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
          If you do not agree to these Terms, do not use the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Description of Service</h2>
        <p className="text-white/70 leading-relaxed">
          Ledge is a personal finance management tool that allows you to:
        </p>
        <ul className="list-disc list-inside text-white/70 space-y-2 mt-4">
          <li>Connect your bank accounts, credit cards, and other financial accounts</li>
          <li>View your transactions and account balances in one place</li>
          <li>Categorize and track your spending</li>
          <li>Create and manage budgets</li>
          <li>Analyze your financial habits</li>
        </ul>
        <p className="text-white/70 leading-relaxed mt-4">
          The Service uses Plaid Inc. (&quot;Plaid&quot;) to connect to your financial institutions. By using the Service,
          you also agree to Plaid&apos;s{' '}
          <a
            href="https://plaid.com/legal/#end-user-services-agreement-us"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            End User Services Agreement
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Eligibility</h2>
        <p className="text-white/70 leading-relaxed">
          You must be at least 18 years old and capable of forming a binding contract to use the Service.
          By using the Service, you represent and warrant that you meet these eligibility requirements.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Registration</h2>
        <p className="text-white/70 leading-relaxed mb-4">
          To use the Service, you must create an account. You agree to:
        </p>
        <ul className="list-disc list-inside text-white/70 space-y-2">
          <li>Provide accurate, current, and complete information</li>
          <li>Maintain and promptly update your account information</li>
          <li>Keep your password secure and confidential</li>
          <li>Notify us immediately of any unauthorized access to your account</li>
          <li>Accept responsibility for all activities that occur under your account</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Acceptable Use</h2>
        <p className="text-white/70 leading-relaxed mb-4">You agree not to:</p>
        <ul className="list-disc list-inside text-white/70 space-y-2">
          <li>Use the Service for any illegal purpose or in violation of any laws</li>
          <li>Access accounts or data that do not belong to you</li>
          <li>Attempt to gain unauthorized access to our systems or networks</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
          <li>Use the Service to transmit malware or harmful code</li>
          <li>Scrape, crawl, or use automated means to access the Service without permission</li>
          <li>Resell, sublicense, or commercially exploit the Service</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Financial Information Disclaimer</h2>
        <p className="text-white/70 leading-relaxed">
          <strong className="text-white/90">The Service is for informational purposes only.</strong> We are not a
          financial advisor, bank, or credit institution. The Service does not provide financial, investment, tax,
          or legal advice. You should consult with qualified professionals before making any financial decisions.
        </p>
        <p className="text-white/70 leading-relaxed mt-4">
          While we strive to display accurate information, we do not guarantee the accuracy, completeness, or
          timeliness of any financial data displayed in the Service. Transaction data and account balances are
          provided by your financial institutions through Plaid and may be delayed or contain errors.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Third-Party Services</h2>
        <p className="text-white/70 leading-relaxed">
          The Service integrates with third-party services, including Plaid for financial data aggregation.
          Your use of these third-party services is subject to their respective terms and privacy policies.
          We are not responsible for the practices or content of third-party services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Intellectual Property</h2>
        <p className="text-white/70 leading-relaxed">
          The Service, including its design, features, and content (excluding your personal data), is owned by
          Ledge and protected by copyright, trademark, and other intellectual property laws. You may not copy,
          modify, distribute, or create derivative works without our prior written consent.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Termination</h2>
        <p className="text-white/70 leading-relaxed">
          You may terminate your account at any time by deleting it through the Service settings. We may suspend
          or terminate your access to the Service at any time, with or without cause, with or without notice.
          Upon termination, your right to use the Service will immediately cease, and we may delete your account
          and data in accordance with our Privacy Policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Disclaimer of Warranties</h2>
        <p className="text-white/70 leading-relaxed">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
          OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
          OR SECURE.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
        <p className="text-white/70 leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, LEDGE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
          INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR
          USE OR INABILITY TO USE THE SERVICE; (B) ANY UNAUTHORIZED ACCESS TO OR USE OF OUR SERVERS AND/OR ANY
          PERSONAL INFORMATION STORED THEREIN; (C) ANY ERRORS OR OMISSIONS IN THE SERVICE; OR (D) ANY THIRD-PARTY
          CONTENT OR CONDUCT.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Indemnification</h2>
        <p className="text-white/70 leading-relaxed">
          You agree to indemnify and hold harmless Ledge and its officers, directors, employees, and agents from
          any claims, damages, losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising
          out of or related to your use of the Service or violation of these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Governing Law</h2>
        <p className="text-white/70 leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of the State of California,
          United States, without regard to its conflict of law provisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
        <p className="text-white/70 leading-relaxed">
          We may modify these Terms at any time. We will notify you of material changes by posting the updated
          Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after any
          changes constitutes your acceptance of the new Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
        <p className="text-white/70 leading-relaxed">
          If you have questions about these Terms, please contact us at:{' '}
          <a href={`mailto:${contactEmail}`} className="text-emerald-400 hover:text-emerald-300">
            {contactEmail}
          </a>
        </p>
      </section>
    </article>
  );
}
