import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useFormValidation from "../hooks/useFormValidation";
import {
  LIMITS,
  TEAM_SIZE_OPTIONS,
  WORKFORCE_TYPES,
  GOAL_MIN_LENGTH,
  validateDemoRequestPayload,
} from "../utils/demoRequestValidation";
import { ToastProvider, useToast } from "../components/Toast";
import LandingSelect from "../components/LandingSelect";
import {
  LandingHeader,
  LandingFooter,
  scrollToSection,
  FaqList,
  FIELD_HRMS_PATH,
  OFFICE_HRMS_PATH,
} from "../components/LandingChrome";
import usePageMeta from "../hooks/usePageMeta";
import { submitDemoRequest } from "../services/demoRequestService";
import "./Landing.css";

import roundLogo from "../assets/landing/round-logo.png";
import checkIcon from "../assets/landing/check.svg";
import playIcon from "../assets/landing/play.svg";
import waveFeaturesTop from "../assets/landing/wave-features-top.svg";
import demoBg from "../assets/landing/demo-bg.svg";
import iconUsers from "../assets/landing/icon-users.svg";
import iconWallet from "../assets/landing/icon-wallet.svg";
import iconClock from "../assets/landing/icon-clock.svg";
import iconStar from "../assets/landing/icon-star.svg";
import iconChart from "../assets/landing/icon-chart.svg";
import iconEmployee from "../assets/landing/icon-employee.svg";
import iconAdmin from "../assets/landing/icon-admin.svg";
import iconHr from "../assets/landing/icon-hr.svg";
import iconManager from "../assets/landing/icon-manager.svg";
import logoPartner1 from "../assets/landing/logo-partner-1.png";
import logoPartner2 from "../assets/landing/logo-partner-2.png";
import logoPartner3 from "../assets/landing/logo-partner-3.png";
import logoPartner4 from "../assets/landing/logo-partner-4.png";
import logoPartner5 from "../assets/landing/logo-partner-5.png";
import logoPartner6 from "../assets/landing/logo-partner-6.png";
import adminTabVisual from "../assets/landing/admin.png";
import hrTabVisual from "../assets/landing/hr-tab.png";
import managerTabVisual from "../assets/landing/manager-tab.png";
import employeeTabVisual from "../assets/landing/employee-tab.png";

const HERO_BULLETS = [
  "Built for both blue-collar and white-collar teams.",
  "No spreadsheets, no chaos - just HRMS that runs itself.",
  "Simplify HR to unlock real productivity & growth.",
  "One Platform for every employee, every process, every day.",
];

const STATS = [
  { value: "834+", label: "Employee Successfully Onboarded" },
  { value: "100%", label: "Digital Employee Records" },
  { value: "30,000+", label: "Payroll Transactions Processed" },
  { value: "15,000+", label: "Shifts Allocations Managed" },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const parseStatValue = (display) => ({
  numeric: Number(String(display).replace(/[^\d]/g, "")),
  suffix: String(display).replace(/[\d,]/g, ""),
  grouped: String(display).includes(","),
});

const formatStatNumber = (n, grouped, suffix) => {
  const rounded = Math.round(n);
  const body = grouped ? rounded.toLocaleString("en-US") : String(rounded);
  return `${body}${suffix}`;
};

function LandingStat({ value, label, play, delayMs }) {
  const { numeric, suffix, grouped } = parseStatValue(value);
  const valueRef = useRef(null);

  useEffect(() => {
    const node = valueRef.current;
    if (!node) return undefined;

    const write = (n) => {
      node.textContent = formatStatNumber(n, grouped, suffix);
    };

    if (!play) {
      write(0);
      return undefined;
    }
    if (prefersReducedMotion()) {
      write(numeric);
      return undefined;
    }

    let frame;
    const startAt = performance.now() + delayMs;
    const duration = 1600;
    const tick = (now) => {
      if (now < startAt) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      write(numeric * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, numeric, delayMs, grouped, suffix]);

  return (
    <div className="landing-stat">
      <strong ref={valueRef}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const PARTNER_LOGOS = [
  {
    src: logoPartner1,
    alt: "Blinkit",
    className: "landing-logo-item--blinkit",
  },
  {
    src: logoPartner2,
    alt: "Zepto",
    className: "landing-logo-item--zepto",
  },
  {
    src: logoPartner3,
    alt: "Meesho",
    className: "landing-logo-item--meesho",
  },
  {
    src: logoPartner4,
    alt: "Holisol",
    className: "landing-logo-item--holisol",
  },
  {
    src: logoPartner5,
    alt: "Genex",
    className: "landing-logo-item--genex",
  },
  {
    src: logoPartner6,
    alt: "Threye",
    className: "landing-logo-item--threye",
    text: "THREYE",
  },
];

const ROLE_TABS = ["Admin", "HR", "Manager", "Employee"];
const ROLE_ROTATE_MS = 4500;

const ORBIT_ROLES = [
  {
    name: "HR",
    icon: iconHr,
    track: "52%",
    duration: "12s",
    start: 0,
  },
  {
    name: "Admin",
    icon: iconAdmin,
    track: "68%",
    duration: "22s",
    start: 90,
  },
  {
    name: "Employee",
    icon: iconEmployee,
    track: "84%",
    duration: "40s",
    start: 180,
  },
  {
    name: "Manager",
    icon: iconManager,
    track: "100%",
    duration: "70s",
    start: 270,
  },
];

const ROLE_CONTENT = {
  Admin: {
    title: "Full control, zero complexity.",
    body: "Configure policies, manage roles, and oversee all entities from a single admin panel — with audit trails for every action.",
    bullets: [
      "Manage roles, permissions, and entity hierarchy.",
      "Configure leave, payroll, and attendance policies.",
      "Monitor system health and integration status.",
    ],
    shot: adminTabVisual,
  },
  HR: {
    title: "Run HR operations from one place.",
    body: "Onboard employees, manage documents, and keep compliance on track without switching between tools.",
    bullets: [
      "Centralize employee records and org structure.",
      "Approve leave, attendance, and payroll workflows.",
      "Generate reports for leadership in minutes.",
    ],
    shot: hrTabVisual,
  },
  Manager: {
    title: "Lead your team with clarity.",
    body: "See who is in, who is on leave, and what needs your approval — without chasing spreadsheets.",
    bullets: [
      "Review and approve team leave and WFH requests.",
      "Track attendance and shift coverage at a glance.",
      "Support your team with role-specific dashboards.",
    ],
    shot: managerTabVisual,
  },
  Employee: {
    title: "Everything you need, self-serve.",
    body: "Apply for leave, check balances, view payslips, and update your profile from any device.",
    bullets: [
      "Apply for leave and WFH in a few taps.",
      "View payslips, attendance, and documents securely.",
      "Get notified when requests are approved or rejected.",
    ],
    shot: employeeTabVisual,
  },
};

const ROLE_SHOTS = [adminTabVisual, hrTabVisual, managerTabVisual, employeeTabVisual];

const FEATURES = [
  {
    icon: iconUsers,
    title: "Employee Management",
    desc: "Keep every employee record, document, department, and site in one searchable directory. Bulk-import existing staff, assign roles and reporting managers, and replace scattered spreadsheets with one source of truth.",
  },
  {
    icon: iconWallet,
    title: "Payroll & Compliance",
    desc: "Run monthly payroll straight from attendance, leave, and overtime data. Configure salary structures, handle PF, ESIC, professional tax, LWF, and TDS, and publish payslips employees download themselves.",
  },
  {
    icon: iconClock,
    title: "Attendance & Leave",
    desc: "Capture geofenced, selfie-verified attendance at field sites, manage shifts, week-offs, and overtime, and let employees regularize missed punches. Leave accrues by policy and routes to the right approver.",
  },
  {
    icon: iconStar,
    title: "Onboarding & Offboarding",
    desc: "Generate offer and appointment letters from templates, collect joining documents, and track probation. Resignations, notice periods, and full-and-final settlements follow a clear, auditable workflow.",
  },
  {
    icon: iconChart,
    title: "Reports & Analytics",
    desc: "See headcount, attendance, leave, and payroll trends at a glance, and export reports for leadership, auditors, and clients in minutes — decisions run on live workforce data, not last month's spreadsheet.",
  },
];

const SOLUTIONS = [
  {
    to: FIELD_HRMS_PATH,
    title: "Blue-collar & field workforce HRMS",
    body: "For logistics, warehousing, quick-commerce, facility, and staffing teams spread across sites. Allocate shifts, verify attendance with geofenced selfie check-ins, and pay wages that match the hours actually worked.",
    cta: "Explore field workforce HRMS",
  },
  {
    to: OFFICE_HRMS_PATH,
    title: "White-collar & office HRMS",
    body: "For corporate and office teams that need clean approval workflows, statutory payroll compliance, and payroll metrics leadership can trust — with self-service that keeps HR out of the inbox.",
    cta: "Explore office HRMS",
  },
];

const HOME_FAQS = [
  {
    q: "What is Workza?",
    a: "Workza is a cloud HRMS and payroll platform for Indian businesses that run both office teams and field or blue-collar workforces. Employee records, attendance, shifts, leave, payroll, statutory compliance, HR letters, and exits all live in one system.",
  },
  {
    q: "Does Workza work for blue-collar and field teams?",
    a: "Yes. Each work site can have its own geofence, so employees check in from their phone with a selfie only when they are on site. Supervisors manage shifts, week-offs, and overtime, and payroll is calculated from the attendance that was actually recorded.",
  },
  {
    q: "Which statutory deductions does Workza payroll handle?",
    a: "Payroll supports PF, ESIC, professional tax, labour welfare fund (LWF), and TDS, configured through your salary structures and components. Every run produces payslips that employees can view and download from their own login.",
  },
  {
    q: "Can employees use Workza themselves?",
    a: "Every employee gets a self-service view to apply for leave or WFH, regularize missed attendance, submit expenses and advance requests, and download payslips and documents. Managers approve requests from their own dashboard.",
  },
  {
    q: "How long does it take to go live?",
    a: "Our team handles most of the setup: we import your employee data, configure payroll rules, leave policies, and approval flows, and check everything before go-live. The timeline depends on your team size and how many sites you run — we'll give you a plan during the demo.",
  },
  {
    q: "Who can see salary and personal data?",
    a: "Access is role-based. Admins decide what HR, managers, and employees can see and do, so salary data and personal records are only visible to the people whose role needs them.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Book a Demo",
    body: "Show us your team and how you work today - we'll show you exactly how Workza fits, whether that's your office staff, your field teams, or both.",
  },
  {
    num: "02",
    title: "Set Up your Workspace",
    body: "We move your employee data, payroll rules and approval flows into Workza - configured, checked and ready before your go live. You stay hands-off.",
  },
  {
    num: "03",
    title: "Go Live",
    body: "Employees, HR, Managers and admins all onboard together, with a guided walkthrough for every role and support included from day one.",
  },
];

const DEMO_INITIAL = {
  fullName: "",
  email: "",
  company: "",
  phone: "",
  teamSize: "",
  workforceType: "",
  goal: "",
};

const DEMO_FIELD_ORDER = [
  "fullName",
  "email",
  "company",
  "phone",
  "teamSize",
  "workforceType",
  "goal",
];

const focusDemoField = (name) => {
  document.getElementById(`demo-${name}`)?.focus();
};

function LandingPage() {
  const toast = useToast();
  const [activeRole, setActiveRole] = useState("Admin");
  const [roleRotatePaused, setRoleRotatePaused] = useState(false);
  const [roleRotateKey, setRoleRotateKey] = useState(0);
  const [statsInView, setStatsInView] = useState(false);
  const statsRef = useRef(null);
  const pageRef = useRef(null);
  const [demoForm, setDemoForm] = useState(DEMO_INITIAL);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoStatus, setDemoStatus] = useState(null);
  const [demoTouched, setDemoTouched] = useState({});
  const { errors, setErrors, clearAll } = useFormValidation();
  const role = ROLE_CONTENT[activeRole];
  const { hash } = useLocation();

  usePageMeta({
    title: "Workza — Blue-Collar & White-Collar HRMS & Automated Payroll",
    description:
      "Workza is HRMS and payroll software for office and field teams in India — geofenced attendance, shifts, leave, PF/ESIC-compliant payroll, and HR letters in one platform. Book a free demo.",
    path: "/",
  });

  // Arriving from another page via /#section: React Router doesn't scroll to hashes itself.
  useEffect(() => {
    if (hash) scrollToSection(hash.slice(1));
  }, [hash]);

  useEffect(() => {
    if (roleRotatePaused) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveRole((current) => {
        const index = ROLE_TABS.indexOf(current);
        return ROLE_TABS[(index + 1) % ROLE_TABS.length];
      });
    }, ROLE_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [roleRotatePaused, roleRotateKey]);

  useEffect(() => {
    ROLE_SHOTS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return undefined;

    const start = () => setStatsInView(true);
    const isVisible = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    };

    if (isVisible()) {
      start();
      return undefined;
    }

    if (typeof IntersectionObserver === "undefined") {
      start();
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const nodes = Array.from(root.querySelectorAll(".lp-reveal"));
    if (!nodes.length) return undefined;

    const show = (el) => {
      el.classList.add("is-in");
      el.classList.remove("lp-wait");
    };

    if (prefersReducedMotion()) {
      nodes.forEach(show);
      return undefined;
    }

    const inView = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    if (typeof IntersectionObserver === "undefined") {
      nodes.forEach(show);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "80px 0px 80px 0px" }
    );

    nodes.forEach((el) => {
      if (inView(el)) {
        show(el);
        return;
      }
      el.classList.add("lp-wait");
      observer.observe(el);
    });

    const failsafe = window.setTimeout(() => nodes.forEach(show), 1800);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  const selectRole = (tab) => {
    setActiveRole(tab);
    setRoleRotateKey((key) => key + 1);
  };

  const applyDemoFieldError = (name, form) => {
    const result = validateDemoRequestPayload(form);
    setErrors((prev) => {
      const next = { ...prev };
      if (result.errors[name]) next[name] = result.errors[name];
      else delete next[name];
      return next;
    });
  };

  const onDemoChange = (name, value) => {
    const next = { ...demoForm, [name]: value };
    setDemoForm(next);
    if (demoStatus?.type === "error") setDemoStatus(null);
    if (demoTouched[name] || errors[name]) applyDemoFieldError(name, next);
  };

  const onDemoBlur = (name) => {
    setDemoForm((prev) => {
      const next = {
        ...prev,
        [name]:
          name === "phone" || name === "teamSize" || name === "workforceType"
            ? prev[name]
            : String(prev[name] || "").trim(),
      };
      applyDemoFieldError(name, next);
      return next;
    });
    setDemoTouched((prev) => ({ ...prev, [name]: true }));
  };

  const onDemoSubmit = async (e) => {
    e.preventDefault();
    if (demoSubmitting) return;

    setDemoStatus(null);
    const result = validateDemoRequestPayload(demoForm);
    setErrors(result.errors);
    setDemoTouched(
      DEMO_FIELD_ORDER.reduce((acc, name) => ({ ...acc, [name]: true }), {})
    );

    const hasEmpty = DEMO_FIELD_ORDER.some(
      (name) => !String(demoForm[name] ?? "").trim()
    );
    if (hasEmpty || !result.valid) {
      const firstInvalid = DEMO_FIELD_ORDER.find((name) => result.errors[name]);
      if (firstInvalid) focusDemoField(firstInvalid);
      toast.warning(
        hasEmpty
          ? "Please fill in all fields before submitting"
          : result.firstError || "Please fix the highlighted fields"
      );
      return;
    }

    setDemoSubmitting(true);
    try {
      const data = await submitDemoRequest(result.values);
      setDemoForm(DEMO_INITIAL);
      setDemoTouched({});
      clearAll();
      const message =
        data.message ||
        "Thanks — we received your request and will be in touch shortly.";
      setDemoStatus({ type: "success", message });
      toast.success(message);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        setErrors(apiErrors);
        const firstInvalid = DEMO_FIELD_ORDER.find((name) => apiErrors[name]);
        if (firstInvalid) focusDemoField(firstInvalid);
      }
      const message =
        err.response?.data?.message ||
        "Unable to submit the demo request. Please try again.";
      setDemoStatus({ type: "error", message });
      toast.error(message);
    } finally {
      setDemoSubmitting(false);
    }
  };

  return (
    <div className="landing-page" ref={pageRef}>
      <LandingHeader />

      <section className="landing-hero" id="platform">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <h1 className="lp-hero-item" style={{ "--lp-d": "0ms" }}>
              <span className="landing-hero-line landing-hero-line--blue">
                One Workforce
                <span className="landing-hero-dot" aria-hidden="true" />
              </span>
              <span className="landing-hero-line landing-hero-line--teal">
                One Platform
                <span className="landing-hero-dot" aria-hidden="true" />
              </span>
              <span className="visually-hidden">
                {" "}
                — HRMS software for employee management, payroll, attendance &amp;
                leave
              </span>
            </h1>

            <p
              className="landing-hero-sub lp-hero-item"
              style={{ "--lp-d": "90ms" }}
            >
              Hire, pay, manage, and grow your whole team — office and field - from
              one simple HRMS platform.
            </p>

            <ul className="landing-checklist">
              {HERO_BULLETS.map((text, index) => (
                <li
                  key={text}
                  className="lp-hero-item"
                  style={{ "--lp-d": `${160 + index * 70}ms` }}
                >
                  <img src={checkIcon} alt="" width={18} height={18} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="landing-hero-cta lp-hero-item"
              style={{ "--lp-d": "460ms" }}
              onClick={() => scrollToSection("how-it-works")}
            >
              <span className="landing-hero-cta-icon" aria-hidden="true">
                <img src={playIcon} alt="" width={16} height={16} />
              </span>
              See how it works
            </button>
          </div>

          <div className="landing-hero-visual" aria-hidden="true">
            <div className="landing-orbit">
              <span className="landing-orbit-ring landing-orbit-ring--1" />
              <span className="landing-orbit-ring landing-orbit-ring--2" />
              <span className="landing-orbit-ring landing-orbit-ring--3" />
              <span className="landing-orbit-ring landing-orbit-ring--4" />

              <div className="landing-orbit-sun">
                <img src={roundLogo} alt="" />
              </div>

              {ORBIT_ROLES.map((roleOrbit) => (
                <div
                  key={roleOrbit.name}
                  className="landing-orbit-slot"
                  style={{
                    "--track": roleOrbit.track,
                    "--duration": roleOrbit.duration,
                    "--start": roleOrbit.start,
                  }}
                >
                  <div className="landing-orbit-track">
                    <div className="landing-orbit-planet">
                      <span className="landing-orbit-badge">
                        <img
                          src={roleOrbit.icon}
                          alt=""
                          width={16}
                          height={16}
                        />
                        {roleOrbit.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="landing-hero-wave" aria-hidden="true">
          <svg
            viewBox="0 0 1600 140"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 28C220 110 380 138 560 128C820 114 980 48 1180 36C1360 26 1480 58 1600 78V140H0V28Z"
              fill="#1755A6"
            />
          </svg>
        </div>
      </section>

      <section className="landing-stats-section" aria-label="Key metrics">
        <div className="landing-stats-inner" ref={statsRef}>
          {STATS.map((s, index) => (
            <LandingStat
              key={s.label}
              value={s.value}
              label={s.label}
              play={statsInView}
              delayMs={index * 140}
            />
          ))}
        </div>

        <div className="landing-trust">
          <div className="landing-trust-title lp-reveal">
            <span className="landing-trust-rule" aria-hidden="true" />
            <p>Organizations That Trust US</p>
          </div>
          <div className="landing-logos">
            <div className="landing-logos-track">
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  className="landing-logos-set"
                  aria-hidden={copy === 1 ? true : undefined}
                >
                  {PARTNER_LOGOS.map((p) => (
                    <div
                      key={`${p.alt}-${copy}`}
                      className={`landing-logo-item ${p.className || ""}`}
                    >
                      <span className="landing-logo-frame">
                        <img src={p.src} alt={copy === 0 ? p.alt : ""} />
                      </span>
                      {p.text ? (
                        <span className="landing-logo-text-label">{p.text}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-who"
        id="who-its-for"
        onMouseEnter={() => setRoleRotatePaused(true)}
        onMouseLeave={() => setRoleRotatePaused(false)}
      >
        <div className="landing-who-header lp-reveal">
          <div className="landing-who-kicker">
            <span className="landing-who-rule" aria-hidden="true" />
            <p>WHO IT&apos;S FOR</p>
          </div>
          <h2>Built for every role, every kind of work.</h2>
          <p className="landing-who-sub">
            Whether your team works at a desk, on a factory floor, or across dozens of
            field sites — every role has its own view.
          </p>
          <div className="landing-tabs" role="tablist" aria-label="Roles">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeRole === tab}
                className={activeRole === tab ? "is-active" : ""}
                onClick={() => selectRole(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="landing-who-body lp-reveal" style={{ "--lp-d": "80ms" }}>
          <div className="landing-who-visual landing-who-visual--shot" aria-hidden="true">
            <img
              key={activeRole}
              src={role.shot}
              alt={`Workza ${activeRole} dashboard — HRMS view for the ${activeRole.toLowerCase()} role`}
              className="landing-who-shot"
            />
          </div>
          <div className="landing-who-copy" key={`${activeRole}-copy`}>
            <h3>{role.title}</h3>
            <p>{role.body}</p>
            <ul className="landing-who-bullets">
              {role.bullets.map((b) => (
                <li key={b}>
                  <img src={checkIcon} alt="" width={18} height={18} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-features-wave" aria-hidden="true">
          <img src={waveFeaturesTop} alt="" />
        </div>
        <div className="landing-features-inner">
          <div className="landing-features-header lp-reveal">
            <div className="landing-features-kicker">
              <span className="landing-features-rule" aria-hidden="true" />
              <p>FEATURES</p>
            </div>
            <h2>Everything your workforce needs, in one place.</h2>
            <p>
              One HRMS, every HR function — so nothing falls through the cracks
              between tools.
            </p>
          </div>

          <div className="landing-features-row landing-features-row--3">
            {FEATURES.slice(0, 3).map((f, index) => (
              <article
                key={f.title}
                className="landing-feature-card lp-reveal"
                style={{ "--lp-d": `${index * 90}ms` }}
              >
                <div className="landing-feature-icon">
                  <img src={f.icon} alt="" width={24} height={24} />
                </div>
                <div className="landing-feature-text">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="landing-features-row landing-features-row--2">
            {FEATURES.slice(3).map((f, index) => (
              <article
                key={f.title}
                className="landing-feature-card lp-reveal"
                style={{ "--lp-d": `${index * 90}ms` }}
              >
                <div className="landing-feature-icon">
                  <img src={f.icon} alt="" width={24} height={24} />
                </div>
                <div className="landing-feature-text">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-steps" id="solutions">
        <div className="landing-steps-inner">
          <div className="landing-steps-header lp-reveal">
            <div className="landing-steps-kicker">
              <span className="landing-steps-rule" aria-hidden="true" />
              <p>SOLUTIONS</p>
            </div>
            <h2>An HRMS built for how your people actually work.</h2>
            <p className="landing-who-sub">
              A delivery rider, a warehouse picker, and a finance analyst need very
              different things from HR software. Workza adapts to each.
            </p>
          </div>

          <div className="landing-steps-grid landing-steps-grid--2">
            {SOLUTIONS.map((sol, index) => (
              <article
                key={sol.to}
                className="landing-step lp-reveal"
                style={{ "--lp-d": `${index * 100}ms` }}
              >
                <h3>{sol.title}</h3>
                <p>{sol.body}</p>
                <Link to={sol.to} className="landing-solution-link">
                  {sol.cta} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-steps" id="how-it-works">
        <div className="landing-steps-inner">
          <div className="landing-steps-header lp-reveal">
            <div className="landing-steps-kicker">
              <span className="landing-steps-rule" aria-hidden="true" />
              <p>HOW IT WORKS</p>
            </div>
            <h2>Get started in three easy steps.</h2>
          </div>

          <div className="landing-steps-grid">
            {STEPS.map((s, index) => (
              <article
                key={s.num}
                className="landing-step lp-reveal"
                style={{ "--lp-d": `${index * 100}ms` }}
              >
                <div className="landing-step-num">
                  <span className="landing-step-num-rule" aria-hidden="true" />
                  <span>{s.num}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-steps landing-faq" id="faq">
        <div className="landing-steps-inner">
          <div className="landing-steps-header lp-reveal">
            <div className="landing-steps-kicker">
              <span className="landing-steps-rule" aria-hidden="true" />
              <p>FAQ</p>
            </div>
            <h2>Frequently asked questions</h2>
          </div>
          <FaqList faqs={HOME_FAQS} />
        </div>
      </section>

      <section className="landing-demo" id="demo">
        <div className="landing-demo-bg" aria-hidden="true">
          <img src={demoBg} alt="" />
        </div>
        <div className="landing-demo-inner">
          <div className="landing-demo-heading">
            <h2>See Workza on your data.</h2>
            <p>
              Book a 30-minute personalised walkthrough. We&apos;ll show you how
              Workza works for your team size, sector, and HR setup — no generic
              demos.
            </p>
          </div>
          <form
            className="landing-demo-form"
            onSubmit={onDemoSubmit}
            noValidate
          >
            <div className="landing-form-grid">
              <div className="landing-field">
                <label htmlFor="demo-fullName">Full name</label>
                <input
                  id="demo-fullName"
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="Priya Sharma"
                  maxLength={LIMITS.TEXT_SHORT}
                  value={demoForm.fullName}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={
                    errors.fullName ? "demo-fullName-error" : undefined
                  }
                  className={errors.fullName ? "is-invalid" : ""}
                  onChange={(e) => onDemoChange("fullName", e.target.value)}
                  onBlur={() => onDemoBlur("fullName")}
                />
                {errors.fullName ? (
                  <span id="demo-fullName-error" className="landing-field-error">
                    {errors.fullName}
                  </span>
                ) : null}
              </div>
              <div className="landing-field">
                <label htmlFor="demo-email">Work email</label>
                <input
                  id="demo-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="priya@company.com"
                  maxLength={LIMITS.EMAIL_MAX}
                  value={demoForm.email}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "demo-email-error" : undefined}
                  className={errors.email ? "is-invalid" : ""}
                  onChange={(e) => onDemoChange("email", e.target.value)}
                  onBlur={() => onDemoBlur("email")}
                />
                {errors.email ? (
                  <span id="demo-email-error" className="landing-field-error">
                    {errors.email}
                  </span>
                ) : null}
              </div>
              <div className="landing-field">
                <label htmlFor="demo-company">Company</label>
                <input
                  id="demo-company"
                  type="text"
                  name="company"
                  autoComplete="organization"
                  placeholder="Acme Pvt. Ltd."
                  maxLength={LIMITS.TEXT_SHORT}
                  value={demoForm.company}
                  aria-invalid={Boolean(errors.company)}
                  aria-describedby={
                    errors.company ? "demo-company-error" : undefined
                  }
                  className={errors.company ? "is-invalid" : ""}
                  onChange={(e) => onDemoChange("company", e.target.value)}
                  onBlur={() => onDemoBlur("company")}
                />
                {errors.company ? (
                  <span id="demo-company-error" className="landing-field-error">
                    {errors.company}
                  </span>
                ) : null}
              </div>
              <div className="landing-field">
                <label htmlFor="demo-phone">Phone</label>
                <input
                  id="demo-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+91 98765 43210"
                  maxLength={16}
                  value={demoForm.phone}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "demo-phone-error" : undefined}
                  className={errors.phone ? "is-invalid" : ""}
                  onChange={(e) => onDemoChange("phone", e.target.value)}
                  onBlur={() => onDemoBlur("phone")}
                />
                {errors.phone ? (
                  <span id="demo-phone-error" className="landing-field-error">
                    {errors.phone}
                  </span>
                ) : null}
              </div>
              <div className="landing-field">
                <label htmlFor="demo-teamSize">Team size</label>
                <LandingSelect
                  id="demo-teamSize"
                  name="teamSize"
                  label="Team size"
                  value={demoForm.teamSize}
                  options={TEAM_SIZE_OPTIONS}
                  placeholder="Select team size"
                  error={errors.teamSize}
                  errorId="demo-teamSize-error"
                  onChange={(value) => onDemoChange("teamSize", value)}
                  onBlur={() => onDemoBlur("teamSize")}
                />
                {errors.teamSize ? (
                  <span id="demo-teamSize-error" className="landing-field-error">
                    {errors.teamSize}
                  </span>
                ) : null}
              </div>
              <div className="landing-field">
                <label htmlFor="demo-workforceType">Workforce type</label>
                <LandingSelect
                  id="demo-workforceType"
                  name="workforceType"
                  label="Workforce type"
                  value={demoForm.workforceType}
                  options={WORKFORCE_TYPES}
                  placeholder="Select workforce type"
                  error={errors.workforceType}
                  errorId="demo-workforceType-error"
                  onChange={(value) => onDemoChange("workforceType", value)}
                  onBlur={() => onDemoBlur("workforceType")}
                />
                {errors.workforceType ? (
                  <span
                    id="demo-workforceType-error"
                    className="landing-field-error"
                  >
                    {errors.workforceType}
                  </span>
                ) : null}
              </div>
              <div className="landing-field landing-form-full">
                <label htmlFor="demo-goal">What are you hoping to solve?</label>
                <textarea
                  id="demo-goal"
                  name="goal"
                  rows={3}
                  placeholder="e.g. Manual payroll, attendance chaos for field teams…"
                  minLength={GOAL_MIN_LENGTH}
                  maxLength={LIMITS.TEXT_LONG}
                  value={demoForm.goal}
                  aria-invalid={Boolean(errors.goal)}
                  aria-describedby={errors.goal ? "demo-goal-error" : undefined}
                  className={errors.goal ? "is-invalid" : ""}
                  onChange={(e) => onDemoChange("goal", e.target.value)}
                  onBlur={() => onDemoBlur("goal")}
                />
                {errors.goal ? (
                  <span id="demo-goal-error" className="landing-field-error">
                    {errors.goal}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="submit"
              className="landing-btn landing-btn--primary landing-btn--block"
              disabled={demoSubmitting}
            >
              {demoSubmitting ? "Sending…" : "Request a demo"}
            </button>
            {demoStatus ? (
              <p
                className={`landing-form-status landing-form-status--${demoStatus.type}`}
                role="status"
              >
                {demoStatus.message}
              </p>
            ) : null}
            <p className="landing-form-note">
              No spam. No sales pressure. Just a product walkthrough built for
              your team.
            </p>
          </form>
        </div>
        <div className="landing-demo-wave" aria-hidden="true">
          <svg
            viewBox="0 0 1600 127"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 48.2752C0 48.2752 226.389 113.456 381.052 108.181C535.714 102.907 628.364 81.1659 798.309 92.0363C968.253 102.907 1461.17 75.4816 1600 0V127H0V48.2752Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

export default function Landing() {
  return (
    <ToastProvider>
      <LandingPage />
    </ToastProvider>
  );
}
