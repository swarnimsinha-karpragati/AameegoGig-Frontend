import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LandingHeader, LandingFooter } from "../components/LandingChrome";
import usePageMeta from "../hooks/usePageMeta";
import "./Landing.css";
import "./Solution.css";

export const PRIVACY_PATH = "/privacy-policy";
const CONTACT_EMAIL = "sales@karpragati.com";
const UPDATED = "27 October 2026";

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS = [
  {
    h2: "Who we are",
    paras: [
      "Workza (the website at workza.ai and the Workza mobile app for Android and iOS) is an HR and payroll platform operated by Kar Pragati Technologies Pvt. Ltd., India (\"we\", \"us\"). Organisations (\"employers\") use Workza to manage their employees' attendance, leave, payroll, expenses, documents and letters.",
      "This policy explains what personal data Workza collects, why, who it is shared with, and the choices you have. It applies to the website and the mobile app.",
    ],
  },
  {
    h2: "Our role: your employer controls your HR data",
    paras: [
      "Workza is used by employers to run their HR. When your employer adds you to Workza, your employer decides what information about you is stored and who in the organisation can see it. For that information we act as a data processor on your employer's behalf, under the Digital Personal Data Protection Act, 2023 and other applicable Indian law.",
      "If you have a question about the HR data your employer holds, please contact your employer's HR or admin team first. You can always contact us as well, and we will help or pass your request to your employer.",
    ],
  },
  {
    h2: "Information we collect",
    paras: ["Depending on how your employer uses Workza, we may collect:"],
    bullets: [
      "Account details: name, work email, phone number, organisation code and a password (stored only as a one-way hash).",
      "Employee profile: employee code, department, designation, date of joining, date of birth, gender, address, emergency contact and profile photo.",
      "Statutory and payroll details: PAN, Aadhaar number, bank account number and IFSC, UAN, ESIC number, salary structure, payslips, deductions, advances and loans.",
      "Attendance data: a selfie photo and your precise location (GPS) at the moment you check in or check out, used to confirm you are at your assigned work site.",
      "Requests and records: leave, regularization, overtime, expense claims and receipts, resignations, HR letters and documents that you or your employer upload.",
      "Technical data: basic device and log information (such as app version, IP address and error logs) needed to keep the service secure and working.",
    ],
  },
  {
    h2: "Camera, location and storage permissions",
    paras: [
      "The mobile app asks for camera access only so you can take an attendance selfie, and for location access only when you check in or check out. Workza does not track your location in the background or when you are not marking attendance.",
      "Storage and file access is used only to save files you choose to download, such as payslips and letters, and to attach files you choose to upload. You can turn these permissions off in your phone settings at any time; attendance check-in will not work without camera and location.",
    ],
  },
  {
    h2: "How we use information",
    bullets: [
      "To provide Workza to your employer: attendance, leave, payroll, payslips, expenses, letters and approvals.",
      "To verify attendance against the geofence of your work site and match the selfie to the check-in.",
      "To sign you in, keep your account secure and send service emails such as password reset codes.",
      "To provide support, fix bugs and improve the service.",
      "To meet legal, tax and statutory obligations.",
    ],
    paras: [
      "We do not sell personal data, we do not show advertising in Workza, and we do not use your data for advertising or cross-app tracking.",
    ],
  },
  {
    h2: "AI features",
    paras: [
      "Some optional features, such as drafting HR letters and the payroll assistant, use AI models from Anthropic and Google to generate text. When an authorised user at your employer uses these features, the relevant details (for example an employee's name, designation and salary for a letter) are sent to the AI provider to produce the result. These providers process the data under their API terms to return the result; we do not send attendance selfies or location to them.",
    ],
  },
  {
    h2: "Who we share information with",
    paras: [
      "Your information is visible to authorised people at your employer according to the roles your employer configures. We share data only with service providers that help us run Workza, under contracts that require them to protect it:",
    ],
    bullets: [
      "Amazon Web Services (servers and file storage in India).",
      "MongoDB Atlas (database hosting).",
      "Google Maps Platform (showing work-site maps and geofences).",
      "Anthropic and Google (AI features described above).",
      "Our email delivery provider (password reset codes and notifications).",
    ],
    after: [
      "We may also disclose information if required by law or a valid order of a court or government authority.",
    ],
  },
  {
    h2: "Security",
    paras: [
      "All data is encrypted in transit using HTTPS. Passwords are stored as one-way hashes. Access to data is limited by role inside each organisation, and access by our team is limited to what is needed to support and operate the service.",
    ],
  },
  {
    h2: "Data retention",
    paras: [
      "We keep personal data for as long as your employer uses Workza and your account is active. When your employer closes its account, or asks us to delete your data, we delete it within 30 days, except for records that must be kept longer under tax, labour or other laws (for example payroll records), which are deleted once that period ends.",
    ],
  },
  {
    h2: "Your rights",
    paras: [
      "Subject to applicable law, you can ask to access, correct or delete your personal data, withdraw consent, or nominate someone to exercise your rights. You can view your profile, payslips and records in the app; for corrections or anything else, contact your employer or write to us.",
    ],
  },
];

export default function PrivacyPolicy() {
  usePageMeta({
    title: "Privacy Policy | Workza",
    description:
      "How Workza collects, uses, shares and protects personal data on the Workza HR and payroll website and mobile app, and how to delete your account.",
    path: PRIVACY_PATH,
  });

  useEffect(() => {
    if (window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="landing-page solution-page">
      <LandingHeader />

      <main>
        <section className="solution-hero">
          <div className="solution-inner">
            <nav className="solution-breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link> <span aria-hidden="true">/</span>{" "}
              <span>Privacy policy</span>
            </nav>
            <p className="solution-kicker">LAST UPDATED {UPDATED.toUpperCase()}</p>
            <h1>Privacy policy</h1>
            <p className="solution-lead">
              Workza is an HR and payroll app used by employers and their employees. This
              page explains what we collect, why we collect it, and how you can delete your
              account and data.
            </p>
          </div>
        </section>

        <div className="solution-inner solution-body">
          {SECTIONS.map((section) => (
            <section key={section.h2} className="solution-section">
              <h2>{section.h2}</h2>
              {section.paras?.map((text) => (
                <p key={text}>{text}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {section.after?.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </section>
          ))}

          <section id="delete-account" className="solution-section" style={{ scrollMarginTop: 96 }}>
            <h2>Delete your Workza account and data</h2>
            <p>
              Workza accounts are created by your employer. To delete your account and the
              personal data linked to it:
            </p>
            <ul>
              <li>
                Ask your employer's HR or admin team to remove you from Workza, or
              </li>
              <li>
                Email {mail} from your registered email address with the subject "Delete my
                Workza account", including your name and organisation name.
              </li>
            </ul>
            <p>
              We confirm the request with you and your employer, then delete your account,
              profile, attendance selfies and location history, documents and uploaded files
              within 30 days. Payroll and statutory records that your employer must keep by
              law are retained only for the legally required period and then deleted. Once
              your account is deleted you can no longer sign in to the Workza app.
            </p>
          </section>

          <section className="solution-section">
            <h2>Children</h2>
            <p>
              Workza is meant for employees and HR teams and is not directed at children
              under 18. We do not knowingly collect data from children.
            </p>
          </section>

          <section className="solution-section">
            <h2>Changes to this policy</h2>
            <p>
              If we change this policy, we will update the date at the top of this page and,
              for significant changes, let your employer know.
            </p>
          </section>

          <section className="solution-section">
            <h2>Contact and grievance officer</h2>
            <p>
              For privacy questions, data requests or complaints, contact our grievance
              officer at {mail}. Kar Pragati Technologies Pvt. Ltd., India. We respond within
              30 days.
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
