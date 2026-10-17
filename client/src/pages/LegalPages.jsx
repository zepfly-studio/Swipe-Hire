// Terms, Privacy, Refund and Contact pages. The business name, email, phone and address come
// from Admin → Content & lists, so they can be filled in without a code change.
import { Link } from 'react-router-dom';
import { LifeBuoy, Mail, MapPin, Phone } from 'lucide-react';
import { PublicLayout } from '../components/marketing';
import { useSite } from '../lib/site';

const UPDATED = '17 October 2026';

function useContact() {
  const c = useSite().content.contact || {};
  return { business: c.business || 'Glide Recruit', email: c.email, phone: c.phone, address: c.address };
}

// Where to reach us, as one line of text inside the legal pages.
function ReachUs() {
  const { email, phone } = useContact();
  return (
    <>
      {email ? <a href={`mailto:${email}`} className="font-semibold text-brand-500 hover:underline">{email}</a> : <Link to="/contact" className="font-semibold text-brand-500 hover:underline">our Contact page</Link>}
      {phone && <> or call {phone}</>}
    </>
  );
}

function Doc({ title, intro, children }) {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">Legal</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-white/45">Last updated {UPDATED}</p>
        {intro && <p className="mt-6 text-white/70">{intro}</p>}
        <div className="glass mt-8 space-y-7 rounded-3xl p-6 text-[15px] leading-relaxed text-white/75 sm:p-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_ul]:mt-2 [&_ul]:space-y-1.5">
          {children}
        </div>
      </article>
    </PublicLayout>
  );
}

export function TermsPage() {
  const { business } = useContact();
  return (
    <Doc title="Terms of Service" intro={`These terms are an agreement between you and ${business} ("we", "us"), which runs Glide Recruit. By creating an account or using the website or app, you agree to them.`}>
      <section>
        <h2>1. What Glide Recruit is</h2>
        <p>Glide Recruit is a hiring platform. Job seekers ("candidates") create a profile with a resume and a short intro video. Companies set filters and swipe through candidate profiles to shortlist people, then chat, send tasks and schedule interviews.</p>
      </section>
      <section>
        <h2>2. Your account</h2>
        <ul>
          <li>You must be at least 18 years old and give true, current information.</li>
          <li>Keep your password safe. You are responsible for what happens in your account.</li>
          <li>One person per candidate account. Company accounts may add team members, who follow these terms too.</li>
        </ul>
      </section>
      <section>
        <h2>3. Candidates</h2>
        <ul>
          <li>Your resume, video and details must be your own and true. Fake profiles are removed.</li>
          <li>Companies see your profile without your phone and email; these are shared only when a company shortlists you.</li>
          <li>Glide Recruit does not promise you a job or interviews. Hiring decisions are made by companies.</li>
          <li>Never pay anyone to get a job through Glide Recruit. Report such requests to us.</li>
        </ul>
      </section>
      <section>
        <h2>4. Companies</h2>
        <ul>
          <li>Use candidate details only to hire for real jobs, and do not share or sell them.</li>
          <li>Do not ask candidates for money, and do not discriminate on gender, religion, caste, age or disability.</li>
          <li>Swipes are bought in packs and used when you shortlist or pass a candidate. Prices are shown on the Pricing page.</li>
        </ul>
      </section>
      <section>
        <h2>5. Things that are not allowed</h2>
        <ul>
          <li>Spam, harassment, abusive or adult content, or anything illegal.</li>
          <li>Copying, scraping or reselling data from the platform, or trying to break its security.</li>
          <li>Pretending to be someone else or another company.</li>
        </ul>
        <p className="mt-2">We may remove content, suspend or delete accounts that break these rules.</p>
      </section>
      <section>
        <h2>6. Payments</h2>
        <p>Payments are processed by our payment partner (Razorpay). Refunds follow our <Link to="/refund-policy" className="font-semibold text-brand-500 hover:underline">Refund Policy</Link>.</p>
      </section>
      <section>
        <h2>7. Liability</h2>
        <p>We work hard to keep Glide Recruit available and safe, but it is provided "as is". We are not responsible for what users say or do, or for hiring outcomes. Our total liability to a company is limited to the amount it paid us in the last 3 months.</p>
      </section>
      <section>
        <h2>8. Ending your account</h2>
        <p>You can delete your account any time in Account settings. We may close accounts that break these terms.</p>
      </section>
      <section>
        <h2>9. Changes and law</h2>
        <p>We may update these terms; we will tell you about big changes. These terms follow the laws of India.</p>
      </section>
      <section>
        <h2>10. Contact</h2>
        <p>Questions? Write to <ReachUs />.</p>
      </section>
    </Doc>
  );
}

export function PrivacyPage() {
  const { business } = useContact();
  return (
    <Doc title="Privacy Policy" intro={`This policy explains what ${business} collects on Glide Recruit, why, and the choices you have.`}>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><b className="text-white">Account:</b> name, email, phone and password (stored encrypted).</li>
          <li><b className="text-white">Candidate profile:</b> resume, intro video, photo, education, experience, skills, salary, notice period, city and job preferences. Age and gender are collected but never shown to companies.</li>
          <li><b className="text-white">Company profile:</b> company details, HR contact, logo and verification documents (GSTIN).</li>
          <li><b className="text-white">Use of the platform:</b> swipes, shortlists, chats, tasks, interviews, support requests and payments (handled by Razorpay; we do not store card details).</li>
          <li><b className="text-white">Technical:</b> a login cookie and basic logs. If analytics are turned on, they use cookies too.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To show candidates to companies that are hiring, and to rank them by how well they match.</li>
          <li>To let companies and shortlisted candidates talk, send tasks and schedule interviews.</li>
          <li>To send codes, alerts and important messages by email.</li>
          <li>To keep the platform safe: checking reports, removing fake profiles and stopping abuse.</li>
        </ul>
        <p className="mt-2">We do not sell your personal data.</p>
      </section>
      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Companies see candidate profiles, resumes and videos, but a candidate's phone and email only after shortlisting them.</li>
          <li>Candidates see a company's details once it contacts them.</li>
          <li>Our service providers (hosting, storage, email, payments) process data only to run Glide Recruit.</li>
          <li>We share data with authorities only when the law requires it.</li>
        </ul>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Edit your profile any time, or turn off "Open to work" to hide from companies.</li>
          <li>Delete your account in Account settings; your profile, resume, video and chats are deleted. Payment records are kept for accounting and tax law.</li>
          <li>Ask us for a copy of your data or to correct it.</li>
        </ul>
      </section>
      <section>
        <h2>Security and storage</h2>
        <p>Data is sent over HTTPS, passwords are encrypted, and files are stored with private, expiring links. We keep data while your account is active and delete it when you delete the account.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>For privacy questions or requests, write to <ReachUs />.</p>
      </section>
    </Doc>
  );
}

export function RefundPage() {
  return (
    <Doc title="Refund & Cancellation Policy" intro="Glide Recruit is free for job seekers. Companies buy swipe packs as one-time purchases; there is no subscription to cancel.">
      <section>
        <h2>Swipe packs</h2>
        <ul>
          <li>Swipes are added to your account right after payment and do not expire.</li>
          <li>Unused swipe packs can be refunded in full within 7 days of purchase, if no swipe from that pack has been used.</li>
          <li>Swipes already used (shortlists and passes) cannot be refunded, because the candidate's details were already shown to you.</li>
        </ul>
      </section>
      <section>
        <h2>Payment problems</h2>
        <ul>
          <li>If money was taken but swipes were not added, contact us with the payment ID; we will add the swipes or refund you.</li>
          <li>Payments charged twice by mistake are refunded in full.</li>
        </ul>
      </section>
      <section>
        <h2>How refunds are paid</h2>
        <p>Approved refunds go back to the original payment method within 5–7 working days, through our payment partner Razorpay.</p>
      </section>
      <section>
        <h2>How to ask</h2>
        <p>Use Help &amp; support in your account, or write to <ReachUs /> with your company name and payment ID.</p>
      </section>
    </Doc>
  );
}

export function ContactPage() {
  const { business, email, phone, address } = useContact();
  const rows = [
    [Mail, 'Email', email && <a href={`mailto:${email}`} className="font-semibold text-brand-500 hover:underline">{email}</a>],
    [Phone, 'Phone', phone && <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-semibold hover:underline">{phone}</a>],
    [MapPin, 'Address', address],
  ].filter(([, , v]) => v);
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">Contact</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Talk to us</h1>
        <p className="mt-4 text-white/65">Questions about hiring, your profile or a payment? We usually reply within one working day.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-3xl p-6">
            <p className="font-bold">{business}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {rows.map(([Icon, label, value]) => (
                <li key={label} className="flex gap-3">
                  <Icon size={18} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-white/40">{label}</span>
                    {value}
                  </span>
                </li>
              ))}
              {!rows.length && <li className="text-white/55">Contact details will be added here soon. Meanwhile, use Help &amp; support after logging in.</li>}
            </ul>
          </div>
          <div className="glass rounded-3xl p-6">
            <LifeBuoy size={22} className="text-brand-500" />
            <p className="mt-3 font-bold">Already have an account?</p>
            <p className="mt-1 text-sm text-white/60">Open a request in Help &amp; support. You can follow the replies there and we can see your account details, so it is the fastest way.</p>
            <Link to="/support" className="btn-primary mt-5 w-full">
              Help &amp; support
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
