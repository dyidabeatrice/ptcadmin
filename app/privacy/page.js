export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 2rem', fontFamily: 'sans-serif', color: '#333', lineHeight: '1.7' }}>
      
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/" style={{ fontSize: '12px', color: '#999', textDecoration: 'none' }}>← Back to website</a>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#0f4c81', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: '#999', fontSize: '14px' }}>Potentials Therapy Center · Last updated: April 2026</p>
      </div>

      <div style={{ background: '#E6F1FB', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', fontSize: '14px', color: '#0C447C' }}>
        This privacy policy explains how Potentials Therapy Center collects and uses information through our clinic management system and Facebook Messenger integration.
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>Information We Collect</h2>
        <p>We collect the following information solely for the purpose of managing therapy sessions and communicating session reminders:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '10px' }}>
          <li style={{ marginBottom: '8px' }}><strong style={{ fontWeight: '500' }}>Parent/Guardian name</strong> — to identify the responsible party for each client</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ fontWeight: '500' }}>Child/Client name</strong> — to identify the therapy client</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ fontWeight: '500' }}>Facebook account ID</strong> — to send session reminders and payment notifications via Facebook Messenger</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ fontWeight: '500' }}>Contact information</strong> — phone number and address for clinic records</li>
          <li style={{ marginBottom: '8px' }}><strong style={{ fontWeight: '500' }}>Session and payment records</strong> — appointment dates, times, therapist assignments, and payment status</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>How We Use Your Information</h2>
        <p>Information collected is used exclusively for:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '10px' }}>
          <li style={{ marginBottom: '8px' }}>Sending session reminders via Facebook Messenger 24 hours before scheduled appointments</li>
          <li style={{ marginBottom: '8px' }}>Sending payment reminders for outstanding session fees via Facebook Messenger</li>
          <li style={{ marginBottom: '8px' }}>Managing therapy session scheduling and attendance records</li>
          <li style={{ marginBottom: '8px' }}>Processing and recording session payments</li>
        </ul>
        <p style={{ marginTop: '12px', padding: '12px', background: '#EAF3DE', borderRadius: '8px', fontSize: '14px', color: '#27500A' }}>
          We do not store any medical records, diagnoses, or clinical data. We do not sell, share, or disclose your information to any third parties.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>Facebook Messenger</h2>
        <p>We use the Facebook Messenger platform to send automated session and payment reminders. By providing your Facebook account information to our clinic, you consent to receiving these messages.</p>
        <p style={{ marginTop: '10px' }}>Messages sent through our system include:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '10px' }}>
          <li style={{ marginBottom: '8px' }}>24-hour session reminders with attendance confirmation prompts</li>
          <li style={{ marginBottom: '8px' }}>Payment reminders for outstanding balances</li>
          <li style={{ marginBottom: '8px' }}>Therapist absence notices</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>Data Storage</h2>
        <p>Your information is stored securely in Google Sheets accessible only to authorized Potentials Therapy Center staff. We do not store any data on third-party servers beyond what is necessary for Google Workspace and Facebook Messenger to function.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>Your Rights</h2>
        <p>You have the right to:</p>
        <ul style={{ paddingLeft: '1.5rem', marginTop: '10px' }}>
          <li style={{ marginBottom: '8px' }}>Request access to the information we hold about you</li>
          <li style={{ marginBottom: '8px' }}>Request correction of any inaccurate information</li>
          <li style={{ marginBottom: '8px' }}>Request deletion of your information from our records</li>
          <li style={{ marginBottom: '8px' }}>Opt out of Facebook Messenger communications at any time</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>Data Deletion Requests</h2>
        <p>To request deletion of your data from our records, please contact us at:</p>
        <div style={{ margin: '12px 0', padding: '14px 18px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <p style={{ margin: 0, fontWeight: '500', color: '#0f4c81' }}>Potentials Therapy Center</p>
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            Email: <a href="mailto:potentialstherapycenter@gmail.com" style={{ color: '#185FA5' }}>potentialstherapycenter@gmail.com</a>
          </p>
        </div>
        <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>We will process your request within 30 days.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '500', marginBottom: '12px' }}>Changes to This Policy</h2>
        <p>We may update this privacy policy from time to time. Any changes will be posted on this page with an updated date.</p>
      </section>

      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem', marginTop: '2rem', fontSize: '13px', color: '#999', textAlign: 'center' }}>
        © 2026 Potentials Therapy Center · All rights reserved
      </div>
    </div>
  )
}