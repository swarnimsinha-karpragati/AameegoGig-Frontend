import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LandingHeader,
  LandingFooter,
  FaqList,
  FIELD_HRMS_PATH,
  OFFICE_HRMS_PATH,
} from "../components/LandingChrome";
import usePageMeta, { SITE_URL } from "../hooks/usePageMeta";
import NotFound from "./NotFound";
import "./Landing.css";
import "./Solution.css";

const SOLUTIONS = {
  "blue-collar-field-hrms": {
    path: FIELD_HRMS_PATH,
    metaTitle: "Blue-Collar & Field Workforce HRMS — Shifts, Geofenced Attendance & Wages | Workza",
    metaDescription:
      "HRMS for blue-collar and field teams: shift allocation, geofenced selfie attendance, overtime, and attendance-linked wage payroll with PF and ESIC. Built for logistics, warehousing, and staffing.",
    breadcrumb: "Blue-collar & field HRMS",
    kicker: "FIELD WORKFORCE HRMS",
    h1: "HRMS for blue-collar and field workforces",
    intro: [
      "Most HR software is designed for people who sit at a desk. Your workforce doesn't. Riders, pickers, packers, guards, technicians, and site staff work in shifts, move between locations, and are paid on the hours they actually put in — and they rarely have a laptop or the time to fill in a form.",
      "Workza is an HRMS built for exactly that reality. Supervisors allocate shifts from their phone, employees mark attendance with a geofenced selfie check-in, and payroll is calculated from what really happened on the ground — not from a spreadsheet reconciled at the end of the month.",
    ],
    sections: [
      {
        h2: "Shift allocation without the WhatsApp chaos",
        paras: [
          "When shift rosters live in group chats and paper registers, nobody knows who is supposed to be where until someone fails to turn up. Workza gives every site a structured roster: define shifts with start and end times, assign employees to them, and set week-offs per person or per team.",
          "Because shifts, week-offs, and holidays sit next to attendance, late arrivals, early exits, and overtime are measured against the shift the employee was actually rostered for. Teams on our platform have already managed more than 15,000 shift allocations this way.",
        ],
        bullets: [
          "Define shifts and week-offs per department, alongside your holiday calendar.",
          "Track overtime against each employee's rostered shift.",
          "See shift coverage for every site at a glance before the day starts.",
        ],
      },
      {
        h2: "Geofenced, selfie-verified attendance",
        paras: [
          "Proxy attendance and buddy punching are expensive in blue-collar operations. In Workza, each work site has its own location and geofence radius. Employees check in from their own phone, and the check-in only counts when they are physically inside the site's geofence.",
          "Every check-in is paired with a selfie, so supervisors and HR can verify that the right person marked attendance. When a punch is missed — a dead phone, a network outage, a shift that ran late — the employee raises a regularization request and their manager approves or rejects it with a full record of why.",
        ],
        bullets: [
          "Site-level geofences with a configurable radius.",
          "Selfie check-in and check-out from the employee's own phone.",
          "Regularization requests for missed punches, approved by the manager.",
        ],
      },
      {
        h2: "Wage rules that match how you actually pay",
        paras: [
          "Field workforces are rarely paid a flat monthly salary with no variation. Workza lets you build salary structures from configurable components, so pay reflects attendance, leave, and overtime recorded during the month rather than a manual adjustment sheet.",
          "Statutory deductions are handled inside the same payroll run: PF, ESIC, professional tax, labour welfare fund, and TDS where applicable. Advances and loans requested by employees are tracked alongside payroll, and every employee receives a payslip they can open on their phone — which cuts down the queue of salary questions at the site office.",
        ],
        bullets: [
          "Salary structures and components configured per role or grade.",
          "Attendance, leave, and overtime flow straight into payroll.",
          "PF, ESIC, PT, LWF, and TDS handled in the payroll run.",
          "Advance and loan requests tracked next to payroll.",
        ],
      },
      {
        h2: "Built for supervisors and site managers",
        paras: [
          "Supervisors are the people who make field HR work, so Workza gives them their own view: who is checked in right now, who is on leave, which regularization or leave requests are waiting, and which shifts are short-staffed. Approvals take a tap, not a phone call to head office.",
          "HR and admins keep central control. Roles and permissions decide what each supervisor can see and approve, sites and departments roll up into one organisation view, and every action leaves an audit trail.",
        ],
      },
      {
        h2: "Who uses Workza for field teams",
        paras: [
          "Workza is used by organisations in quick-commerce, logistics, warehousing, and staffing — businesses where hundreds of people work across many sites and attendance directly drives cost. Whether you run a handful of dark stores or a network of warehouses, the same platform also covers your office staff, so HR doesn't juggle two systems.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do field employees need a laptop to use Workza?",
        a: "No. Employees check in and out, apply for leave, raise regularization requests, and view payslips from their phone. Supervisors approve requests from their phone too.",
      },
      {
        q: "How does geofenced attendance stop proxy check-ins?",
        a: "Each site has a location and a geofence radius. A check-in only counts when the employee's phone is inside that radius, and every check-in includes a selfie so the right person can be verified.",
      },
      {
        q: "What happens when an employee misses a check-in?",
        a: "The employee raises a regularization request with the correct time and a reason. Their manager approves or rejects it, and the approved record flows into attendance and payroll automatically.",
      },
      {
        q: "Can one account handle both field and office staff?",
        a: "Yes. Sites, departments, and roles let you run field teams and office teams side by side, each with its own attendance rules, shifts, and approvers, in one Workza organisation.",
      },
    ],
    related: {
      to: OFFICE_HRMS_PATH,
      label: "White-collar & office HRMS",
      body: "Running corporate teams too? See approval workflows, statutory compliance, and payroll metrics for office staff.",
    },
  },

  "white-collar-office-hrms": {
    path: OFFICE_HRMS_PATH,
    metaTitle: "White-Collar & Office HRMS — Approvals, Compliance & Payroll | Workza",
    metaDescription:
      "HRMS for office and corporate teams: leave and expense approval workflows, PF/ESIC/PT/TDS-compliant payroll, payslips, HR letters, and payroll reports leadership can trust.",
    breadcrumb: "White-collar & office HRMS",
    kicker: "OFFICE WORKFORCE HRMS",
    h1: "HRMS for office and white-collar teams",
    intro: [
      "Office HR problems are rarely about attendance at a gate. They are about approvals stuck in someone's inbox, leave balances nobody trusts, payroll that needs three spreadsheets and a late night to close, and compliance questions that surface only when an auditor asks.",
      "Workza replaces that patchwork with one HRMS: structured approval workflows, statutory-compliant payroll, employee self-service, and reports that show leadership what the workforce actually costs — all from the same system your field teams can use too.",
    ],
    sections: [
      {
        h2: "Approval workflows that don't live in inboxes",
        paras: [
          "Every request in Workza follows a defined path. Leave, work-from-home, attendance regularization, expense claims, salary advances, and resignations each go to the right approver based on the employee's role and reporting manager, with the full history attached.",
          "Managers see everything waiting for them in one place and can approve or reject in seconds. Employees see the status of their request without having to chase anyone, and HR gets a complete record of who approved what and when.",
        ],
        bullets: [
          "Leave and WFH requests routed to the reporting manager.",
          "Expense claims checked against your expense policy.",
          "Advance and loan requests with an approval trail.",
          "Resignation, notice period, and exit workflows.",
        ],
      },
      {
        h2: "Statutory compliance built into payroll",
        paras: [
          "Compliance should be a by-product of running payroll correctly, not a separate project. Workza calculates PF, ESIC, professional tax, labour welfare fund, and TDS inside each payroll run, based on the salary structures and components you configure.",
          "Leave policies accrue balances automatically according to your rules, holidays and week-offs are applied consistently, and probation policies track confirmation dates — so the numbers behind payroll are the same numbers employees see in their own accounts.",
        ],
        bullets: [
          "Configurable salary structures and salary components.",
          "PF, ESIC, PT, LWF, and TDS calculated in the payroll run.",
          "Leave accrual by policy, with balances employees can see.",
          "Probation tracking from the date of joining.",
        ],
      },
      {
        h2: "Payroll metrics leadership can trust",
        paras: [
          "Because attendance, leave, and payroll come from one system, the reports agree with each other. HR can see payroll totals, headcount, leave usage, and attendance trends without stitching exports together.",
          "Each payroll run produces payslips employees download themselves, and reports can be exported for finance, auditors, and leadership in minutes. When the CFO asks why payroll moved this month, the answer is a filter away.",
        ],
        bullets: [
          "Payroll run summaries and per-employee payslips.",
          "Headcount, leave, and attendance trends in one dashboard.",
          "Exports to Excel and PDF for finance and audits.",
        ],
      },
      {
        h2: "Attendance and leave for hybrid office teams",
        paras: [
          "Office teams rarely sit in the same place every day. Employees mark attendance from the web or their phone, raise work-from-home requests for remote days, and regularize a missed check-in instead of emailing HR. Your holiday calendar and week-offs, configurable per department, are applied automatically, so nobody is marked absent on a day they weren't expected in.",
          "Leave balances update in real time as requests are approved, and managers see team availability before they approve — which makes planning around releases, audits, and month-end close far less of a guessing game.",
        ],
        bullets: [
          "Web and mobile attendance with WFH requests.",
          "Regularization for missed or incorrect punches.",
          "Holiday calendar plus week-offs per department.",
        ],
      },
      {
        h2: "HR letters and documents in minutes",
        paras: [
          "Offer letters, appointment letters, and other HR documents are generated from your own templates with employee details filled in automatically, then stored against the employee record. Employees can access their documents from self-service instead of emailing HR for a copy.",
        ],
      },
      {
        h2: "Self-service that gives HR its time back",
        paras: [
          "Every employee gets a personal dashboard to apply for leave, check balances, view payslips, submit expenses, and update their profile. Managers get a team view of who is in, who is away, and what needs their sign-off. Admins configure roles and permissions so each person sees exactly what their role allows, and nothing more.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can approval workflows follow our reporting structure?",
        a: "Yes. Requests are routed using each employee's role and reporting manager, so leave, expenses, advances, and resignations reach the right approver automatically.",
      },
      {
        q: "Which statutory components does Workza calculate?",
        a: "Workza payroll covers PF, ESIC, professional tax, labour welfare fund, and TDS, based on the salary structures and components you configure.",
      },
      {
        q: "Does Workza support hybrid and work-from-home teams?",
        a: "Yes. Employees raise work-from-home requests that their manager approves, and attendance can be marked from the web or a phone, so hybrid schedules are recorded accurately.",
      },
      {
        q: "Can we generate offer and appointment letters?",
        a: "Yes. HR letters are generated from your own templates with employee details filled in automatically, and each letter is saved against the employee's record.",
      },
      {
        q: "Can employees download their own payslips?",
        a: "Yes. Every payroll run publishes payslips to each employee's self-service account, where they can view and download them at any time.",
      },
    ],
    related: {
      to: FIELD_HRMS_PATH,
      label: "Blue-collar & field HRMS",
      body: "Running shift-based or site-based teams too? See shift allocation, geofenced attendance, and wage rules for field staff.",
    },
  },
};

function SolutionContent({ page }) {
  usePageMeta({
    title: page.metaTitle,
    description: page.metaDescription,
    path: page.path,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Workza", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: page.breadcrumb, item: `${SITE_URL}${page.path}` },
    ],
  };

  return (
    <div className="landing-page solution-page">
      <LandingHeader />

      <main>
        <section className="solution-hero">
          <div className="solution-inner">
            <nav className="solution-breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link> <span aria-hidden="true">/</span>{" "}
              <span>{page.breadcrumb}</span>
            </nav>
            <p className="solution-kicker">{page.kicker}</p>
            <h1>{page.h1}</h1>
            {page.intro.map((text) => (
              <p key={text} className="solution-lead">
                {text}
              </p>
            ))}
            <Link to="/#demo" className="landing-btn landing-btn--primary">
              Request a demo
            </Link>
          </div>
        </section>

        <div className="solution-inner solution-body">
          {page.sections.map((section) => (
            <section key={section.h2} className="solution-section">
              <h2>{section.h2}</h2>
              {section.paras.map((text) => (
                <p key={text}>{text}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className="solution-section">
            <h2>Frequently asked questions</h2>
            <FaqList faqs={page.faqs} />
          </section>

          <aside className="solution-related">
            <h2>
              <Link to={page.related.to}>{page.related.label} →</Link>
            </h2>
            <p>{page.related.body}</p>
          </aside>

          <section className="solution-cta">
            <h2>See Workza on your own data</h2>
            <p>
              Book a 30-minute personalised walkthrough for your team size, sites,
              and HR setup.
            </p>
            <Link to="/#demo" className="landing-btn landing-btn--primary">
              Request a demo
            </Link>
          </section>
        </div>
      </main>

      <LandingFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </div>
  );
}

export default function Solution() {
  const { slug } = useParams();
  const page = SOLUTIONS[slug];
  return page ? <SolutionContent page={page} /> : <NotFound />;
}
