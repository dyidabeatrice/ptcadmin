'use client'
import { useState } from 'react'

const sections = [
  { id: 'dashboard', label: '📊 Dashboard', emoji: '📊' },
  { id: 'clients', label: '👥 Clients', emoji: '👥' },
  { id: 'master', label: '📋 Master Schedule', emoji: '📋' },
  { id: 'schedule', label: '🗓️ Schedule', emoji: '🗓️' },
  { id: 'payments', label: '💳 Payments', emoji: '💳' },
  { id: 'reports', label: '📄 Reports', emoji: '📄' },
  { id: 'messages', label: '💬 Messages', emoji: '💬' },
  { id: 'therapists', label: '🧑‍⚕️ Therapists', emoji: '🧑‍⚕️' },
  { id: 'tips', label: '✨ Tips & Tricks', emoji: '✨' },
]

function Section({ title, emoji, children }: { title: string, emoji: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ color: '#0f4c81', fontSize: '20px', fontWeight: '700', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: '2px solid #E6F1FB' }}>
        <span>{emoji}</span> {title}
      </h2>
      {children}
    </div>
  )
}

function SubSection({ title, children }: { title: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: '12px', background: 'white', borderRadius: '10px', border: '1px solid #e8edf5', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', textAlign: 'left', padding: '12px 16px',
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '14px', fontWeight: '600', color: '#0f4c81'
      }}>
        {title}
        <span style={{ fontSize: '12px', color: '#aaa', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '4px 16px 16px', fontSize: '13px', color: '#444', lineHeight: '1.8' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Note({ children, type = 'info' }: { children: React.ReactNode, type?: 'info' | 'warning' | 'tip' }) {
  const styles = {
    info: { bg: '#E6F1FB', border: '#B5D4F4', color: '#0C447C', icon: 'ℹ️' },
    warning: { bg: '#FAEEDA', border: '#EF9F27', color: '#633806', icon: '⚠️' },
    tip: { bg: '#EAF3DE', border: '#97C459', color: '#27500A', icon: '💡' },
  }
  const s = styles[type]
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '10px 14px', margin: '10px 0', fontSize: '12px', color: s.color, display: 'flex', gap: '8px' }}>
      <span>{s.icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Step({ num, children }: { num: number, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, width: '24px', height: '24px', background: '#0f4c81', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', marginTop: '1px' }}>{num}</span>
      <span style={{ flex: 1, paddingTop: '2px' }}>{children}</span>
    </div>
  )
}

function ColorSwatch({ bg, border, color, label }: { bg: string, border: string, color: string, label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
      <div style={{ width: '80px', height: '24px', background: bg, border: `1px solid ${border}`, borderRadius: '4px', flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: '#444' }}>{label}</span>
    </div>
  )
}

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('dashboard')

  const scrollTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ display: 'flex', fontFamily: 'sans-serif', minHeight: '100vh', background: '#f8f9fb' }}>

      {/* Sidebar */}
      <div style={{ width: '220px', flexShrink: 0, position: 'sticky', top: '56px', height: 'calc(100vh - 56px)', overflowY: 'auto', background: 'white', borderRight: '1px solid #e0e0e0', padding: '1.5rem 0' }}>
        <div style={{ padding: '0 1rem 1rem', fontSize: '11px', color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Help & Guide</div>
        {sections.map(s => (
          <button key={s.id} onClick={() => scrollTo(s.id)} style={{
            width: '100%', textAlign: 'left', padding: '9px 16px',
            background: activeSection === s.id ? '#E6F1FB' : 'none',
            border: 'none', borderLeft: activeSection === s.id ? '3px solid #0f4c81' : '3px solid transparent',
            cursor: 'pointer', fontSize: '13px', fontWeight: activeSection === s.id ? '600' : '400',
            color: activeSection === s.id ? '#0f4c81' : '#555'
          }}>{s.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '2rem 2.5rem', maxWidth: '860px' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ color: '#0f4c81', margin: '0 0 8px', fontSize: '28px', fontWeight: '700' }}>Help & Guide</h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Everything you need to know about using the PTC Admin Portal. Friendly, quick, and to the point! 😊</p>
        </div>

        {/* DASHBOARD */}
        <div id="dashboard"><Section title="Dashboard" emoji="📊">
          <p style={{ fontSize: '13px', color: '#555', marginTop: 0 }}>Your daily command center! The dashboard gives you a real-time snapshot of what's happening at the clinic today.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
            {[
              { label: "Today's Sessions", desc: "Total sessions scheduled today with present/absent count" },
              { label: "Today's Collections", desc: "Total payments collected today" },
              { label: "Unpaid Today", desc: "Sessions marked present or cancelled but not yet paid" },
              { label: "Pending Messages", desc: "Message drafts waiting to be sent" },
              { label: "Outstanding", desc: "Number of clients with unsettled balances" },
            ].map((c, i) => (
              <div key={i} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e8edf5' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f4c81', marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{c.desc}</div>
              </div>
            ))}
          </div>
          <Note type="tip">All cards are clickable and will take you directly to the relevant page!</Note>
          <p style={{ fontSize: '13px', color: '#555' }}>Below the cards you'll see <strong>Today's sessions</strong> at a glance, the list of <strong>therapists in today</strong>, <strong>pending message drafts</strong>, and clients with <strong>outstanding balances</strong> that need follow-up.</p>
        </Section></div>

        {/* CLIENTS */}
        <div id="clients"><Section title="Clients" emoji="👥">
          <SubSection title="How to add a new client">
            <Step num={1}>Click <strong>+ Add client</strong> in the top right.</Step>
            <Step num={2}>Enter the client's <strong>Last name</strong> and <strong>First name</strong> — this will be saved as "Last, First" format.</Step>
            <Step num={3}>Fill in birthdate, phone, address, and notes as needed.</Step>
            <Step num={4}>Enter the <strong>Facebook account name</strong> — this must be typed <strong>exactly as it appears on Messenger</strong> for auto-messaging to work.</Step>
            <Step num={5}>Add their <strong>therapist schedule</strong> — select day, therapist, start time, and session duration.</Step>
            <Step num={6}>Click <strong>Save client</strong>.</Step>
            <Note type="warning">The Facebook account name must match exactly. Contact <strong>Ida</strong> to set up auto-messaging for a new client.</Note>
          </SubSection>

          <SubSection title="How to edit a client">
            <Step num={1}>Find the client in the list (use the search bar).</Step>
            <Step num={2}>Click the <strong>Edit</strong> button on their row.</Step>
            <Step num={3}>Update any fields as needed and click <strong>Save client</strong>.</Step>
            <Note type="warning">Editing a client's schedule here updates the Master Schedule automatically — but already-generated week sheets won't update. You may need to manually adjust those sessions on the Schedule page.</Note>
          </SubSection>

          <SubSection title="Merge duplicates">
            <Step num={1}>Click <strong>Merge duplicates</strong> button at the top.</Step>
            <Step num={2}>Check two clients you want to merge.</Step>
            <Step num={3}>Click <strong>Merge these two →</strong></Step>
            <Step num={4}>Choose which record to keep — schedules will be combined automatically.</Step>
            <Note type="warning">This permanently deletes one record and combines credits and outstanding balances. Cannot be undone!</Note>
          </SubSection>

          <SubSection title="Deactivate / Reactivate a client">
            <p>Click <strong>Deactivate</strong> on a client's row to mark them inactive. Their schedule slots will be removed from the master schedule and they won't appear in active lists. Click <strong>Reactivate</strong> to bring them back.</p>
            <Note type="tip">Use "Show inactive" toggle to view deactivated clients.</Note>
          </SubSection>
        </Section></div>

        {/* MASTER */}
        <div id="master"><Section title="Master Schedule" emoji="📋">
          <p style={{ fontSize: '13px', color: '#555', marginTop: 0 }}>The Master Schedule is the <strong>permanent recurring schedule</strong> of all active clients. This is the template used to auto-generate each week's sessions.</p>
          <Note type="warning">The Master Schedule <strong>cannot be edited directly</strong>. It is automatically updated when you add or edit clients on the Clients page. The only exception is <strong>blocking time slots</strong> — you can block specific slots directly on the Master page (e.g. for admin time or recurring blocked hours).</Note>
          <Note type="info">If a client's schedule changes, update it on the <strong>Clients page</strong>. Keep in mind that already-generated week sheets won't update automatically — you'll need to adjust those manually on the Schedule page.</Note>
        </Section></div>

        {/* SCHEDULE */}
        <div id="schedule"><Section title="Schedule" emoji="🗓️">

          <SubSection title="How to generate a new week">
            <p>Week sheets are <strong>automatically generated every Saturday or Sunday</strong> when someone opens the Schedule page. The system always keeps the current week and next week available.</p>
            <Note type="tip">Just make sure someone opens the Schedule page over the weekend and the next week will be ready by Monday!</Note>
          </SubSection>

          <SubSection title="How to mark a therapist absent">
            <Step num={1}>Go to the day the therapist is absent.</Step>
            <Step num={2}>Click <strong>Mark absent</strong> on their column header.</Step>
            <Step num={3}>Confirm the prompt.</Step>
            <p>The column header will turn gray. A message draft will be automatically created for each of the therapist's clients that day — go to the <strong>Messages page</strong> to review and send them.</p>
          </SubSection>

          <SubSection title="How to record a session">
            <p>Each session block has a <strong>status dropdown</strong>. Here's what each status means:</p>
            <div style={{ marginBottom: '12px' }}>
              {[
                { status: 'Pencil', desc: 'Tentative — session is scheduled but not yet confirmed' },
                { status: 'Confirmed', desc: 'Confirmed via message with the parent' },
                { status: 'Present', desc: 'Client attended the session' },
                { status: 'Absent', desc: 'Client did not show up' },
                { status: 'Cancelled', desc: 'Last-minute cancellation — may incur a cancellation fee' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#0f4c81', minWidth: '90px' }}>{s.status}</span>
                  <span style={{ color: '#666' }}>{s.desc}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}><strong>Color guide:</strong></p>
            <ColorSwatch bg="#FFFBE6" border="#FFD666" color="#7C5800" label="Pencil — tentative" />
            <ColorSwatch bg="#E6F1FB" border="#B5D4F4" color="#0C447C" label="Confirmed — unpaid or paid" />
            <ColorSwatch bg="#D9EAD3" border="#6AA84F" color="#274E13" label="Present + Paid or Cancelled + Paid" />
            <ColorSwatch bg="#F4CCCC" border="#E06666" color="#7B0000" label="Absent" />
            <ColorSwatch bg="#FCE5CD" border="#E69138" color="#7F3F00" label="Present + Unpaid or Cancelled + Unpaid" />
          </SubSection>

          <SubSection title="How to change a session type (right-click)">
            <Step num={1}><strong>Right-click</strong> on any session block.</Step>
            <Step num={2}>A menu appears with session types for that therapist's specialty.</Step>
            <Step num={3}>Select the correct type (e.g. OT-IE, ST SESSION, PLAYSCHOOL).</Step>
            <p>The session type and amount update automatically. If the session is unpaid and marked Present or Cancelled, the <strong>outstanding balance also updates</strong> to match the new amount.</p>
            <Note type="tip">Look for the hint at the bottom of the schedule page as a reminder!</Note>
          </SubSection>

          <SubSection title="How to move a session">
            <p>Two ways to move a session:</p>
            <p><strong>Same day, different time:</strong> Drag the session block up or down the grid to the new time slot. The column highlights green when you're hovering over a valid slot.</p>
            <p><strong>Different day or therapist:</strong> Click the <strong>Move</strong> button on the session block → select new day, therapist, and time → confirm.</p>
          </SubSection>

          <SubSection title="How to add a one-off or make-up session">
            <p><strong>Option 1 — Click on the grid:</strong> Click any empty (or occupied) time slot in a therapist's column. The Add session modal opens pre-filled with that therapist and time.</p>
            <p><strong>Option 2 — Use the button:</strong> Click <strong>+ Add one-off session</strong> at the top. You can type a new client name (for walk-ins or IE clients not yet in the system) or select an existing client.</p>
            <Note type="tip">To add a make-up session for a therapist on a day they don't normally work — use the <strong>+ Add one-off session</strong> button and select that therapist. They'll appear as a new column for that day on the grid.</Note>
          </SubSection>

          <SubSection title="How to record a payment">
            <Step num={1}>Click the red <strong>Unpaid</strong> button on a session block.</Step>
            <Step num={2}>Select the session type and verify the amount.</Step>
            <Step num={3}>Choose mode of payment (Cash, BDO, Union Bank).</Step>
            <Step num={4}>For bank transfers, enter the reference number.</Step>
            <Step num={5}>Click <strong>Confirm</strong>.</Step>
            <Note type="tip">If the client has a credit balance, you'll see options to use full credit, split payment, or pay normally.</Note>
          </SubSection>

          <SubSection title="How to reverse a payment">
            <p>Click the green <strong>Paid ✓</strong> button on a session block. You'll be prompted to confirm — the payment will be reversed and the amount will be moved to the client's <strong>credit balance</strong>, which can be applied to their next session.</p>
          </SubSection>

          <SubSection title="How to send a reminder to a client">
            <Step num={1}>Click the <strong>Remind</strong> button on a session block.</Step>
            <Step num={2}>Choose the type of message: IE Appointment Reminder, Outstanding Balance, or Re-schedule / Make-up Request.</Step>
            <Step num={3}>A draft is automatically created on the <strong>Messages page</strong>.</Step>
            <Step num={4}>Go to Messages to review, edit, and send.</Step>
          </SubSection>

          <SubSection title="How to mark a holiday">
            <p>Click <strong>Mark holiday</strong> on the day tab. All sessions for that day will be cancelled and a message draft will be created for every affected client. You can edit the message before it's sent.</p>
            <Note type="warning">This action cannot be undone easily — all sessions for that day will be marked Cancelled.</Note>
          </SubSection>

        </Section></div>

        {/* PAYMENTS */}
        <div id="payments"><Section title="Payments" emoji="💳">

          <SubSection title="Advance / Partial Payment">
            <p>Use <strong>+ Advance / Partial Payment</strong> to record a payment that isn't tied to a specific session — like when a parent pays ahead. The amount is stored as <strong>credit</strong> and can be applied when settling a session payment.</p>
          </SubSection>

          <SubSection title="Submitted IE Report by Therapist">
            <p>Use this to record when a therapist submits their IE report. No payment is collected from the parent — this is purely for tracking in the <strong>Excel export</strong> so the therapist's professional fee is computed correctly.</p>
          </SubSection>

          <SubSection title="Transactions tab">
            <p>Shows all payments recorded for the selected week. Filter by day, type (Session, Advance, Refund, Document), or by mode of payment. You can also <strong>update the session type</strong> directly from the dropdown in the table, and <strong>verify</strong> each payment by selecting a verifier.</p>
          </SubSection>

          <SubSection title="Credits tab">
            <p>Shows all clients with available credit balances. Use the <strong>Process refund</strong> button to return credit to a client in cash.</p>
            <Note type="warning">Refunds here should only be used for <strong>advance/credit payments</strong> that were never tied to a specific session. If a client paid for a session and wants an immediate refund, use the <strong>✕ button on the Schedule page</strong> to reverse and delete the session instead — this keeps records clean.</Note>
          </SubSection>

          <SubSection title="Outstanding tab">
            <p>Shows all unpaid Present and Cancelled sessions, arranged <strong>by date then alphabetically</strong>. Click <strong>Settle</strong> to record payment for any session directly from here.</p>
          </SubSection>

          <SubSection title="How to export payments">
            <Step num={1}>Select the month using the month picker in the Export section.</Step>
            <Step num={2}>Click <strong>⬇ Export Excel</strong>.</Step>
            <Step num={3}>The file downloads with a separate sheet per therapist showing session details, therapist cut, and center share — all calculated automatically.</Step>
            <Note type="info">Both paid and unpaid Present sessions are included in the export so the therapist's record is complete.</Note>
          </SubSection>

        </Section></div>

        {/* REPORTS */}
        <div id="reports"><Section title="Reports" emoji="📄">

          <SubSection title="How to request a document">
            <Step num={1}>Go to the <strong>Reports</strong> page.</Step>
            <Step num={2}>Click <strong>+ New request</strong>.</Step>
            <Step num={3}>Select the client, therapist, and document type (IE Report, Progress Report, etc.).</Step>
            <Step num={4}>The request will appear in the list with an <strong>Outstanding</strong> status and the corresponding balance due.</Step>
          </SubSection>

          <SubSection title="How to settle a document balance">
            <Step num={1}>Find the document request in the list.</Step>
            <Step num={2}>Click the <strong>Outstanding</strong> button to record payment.</Step>
            <Step num={3}>Choose mode of payment and confirm.</Step>
            <Step num={4}>Once the report has been physically released to the client, click <strong>Ready for release</strong> → then <strong>Complete</strong> to mark it as done.</Step>
          </SubSection>

        </Section></div>

        {/* MESSAGES */}
        <div id="messages"><Section title="Messages" emoji="💬">

          <SubSection title="How to send a message draft">
            <Step num={1}>Go to the <strong>Messages</strong> page — drafts are listed under the Drafts tab.</Step>
            <Step num={2}>Review the message. Click <strong>Edit</strong> to make changes if needed.</Step>
            <Step num={3}>Click <strong>Send via Messenger</strong> to send directly, or <strong>Open in Viber</strong> if the client uses Viber.</Step>
            <Step num={4}>Sent messages move to the <strong>Archive</strong> tab.</Step>
            <Note type="info">If a client has no contact linked, the send button will be disabled. Contact Ida to link their Messenger PSID.</Note>
          </SubSection>

          <SubSection title="How to compose a new message">
            <Step num={1}>Click <strong>+ Compose</strong> at the top of the Messages page.</Step>
            <Step num={2}>Select the client from the dropdown (active clients only).</Step>
            <Step num={3}>Choose a message type or select <strong>Custom message</strong>.</Step>
            <Step num={4}>Type your message in the text box.</Step>
            <Step num={5}>Click <strong>Save as draft</strong> — it will appear in the Drafts tab ready to send.</Step>
          </SubSection>

        </Section></div>

        {/* THERAPISTS */}
        <div id="therapists"><Section title="Therapists" emoji="🧑‍⚕️">

          <SubSection title="How to add a therapist">
            <Step num={1}>Click <strong>+ Add therapist</strong>.</Step>
            <Step num={2}>Enter their name, specialty (OT/ST/PT/SPED), and check <strong>Intern</strong> if applicable.</Step>
            <Step num={3}>Add their working days with start and end times. You can add multiple days.</Step>
            <Step num={4}>Click <strong>Add therapist</strong>.</Step>
          </SubSection>

          <SubSection title="How to edit a therapist">
            <Step num={1}>Find the therapist on the list and click <strong>Edit</strong>.</Step>
            <Step num={2}>Update their name, specialty, intern status, or <strong>level</strong> (Junior 1–3, Senior 1–2) — the level affects their professional fee in the Excel export.</Step>
            <Step num={3}>Add or remove working days using <strong>+ Add day</strong> or the ✕ button per day.</Step>
            <Step num={4}>Click <strong>Save changes</strong>.</Step>
            <Note type="info">The <strong>Level</strong> field is only visible in the edit modal — it won't show on the therapist list card.</Note>
          </SubSection>

        </Section></div>

        {/* TIPS */}
        <div id="tips"><Section title="Tips & Tricks" emoji="✨">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { tip: 'Right-click any session block', detail: 'Opens a context menu to change the session type and amount. Great for IE sessions or specialized treatments!' },
              { tip: 'Drag and drop to reschedule', detail: 'Grab any session block and drag it to a new time slot on the same day. The slot turns green when you\'re hovering over a valid position.' },
              { tip: 'Click any empty time slot', detail: 'Clicking an empty (or occupied) slot on the grid opens the Add session modal pre-filled with that therapist and time — no need to use the button!' },
              { tip: 'Color = status at a glance', detail: 'Yellow = Pencil, Blue = Confirmed, Green = Paid, Red = Absent, Orange = Unpaid Present/Cancelled. ⚠️ means the client has an outstanding balance.' },
              { tip: 'Outstanding tab is sorted by date', detail: 'Sessions are grouped by date (earliest first) then alphabetically — making it easy to settle balances in order.' },
              { tip: 'Credits carry over', detail: 'Any overpayment or advance payment is stored as credit and automatically offered when recording the next payment for that client.' },
            ].map((t, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '10px', border: '1px solid #e8edf5', padding: '14px 16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>✨</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f4c81', marginBottom: '4px' }}>{t.tip}</div>
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', background: '#E6F1FB', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>🛠️</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f4c81', marginBottom: '6px' }}>Need help with something not covered here?</div>
            <div style={{ fontSize: '13px', color: '#555' }}>Contact <strong>Ida</strong> — she's the one who can fix anything in the system! 😊</div>
          </div>
        </Section></div>

      </div>
    </div>
  )
}