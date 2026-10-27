import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import workzaLogo from "../assets/landing/workza-logo.png";

export const FIELD_HRMS_PATH = "/solutions/blue-collar-field-hrms";
export const OFFICE_HRMS_PATH = "/solutions/white-collar-office-hrms";

export const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

/** Real <a href="/#id"> for crawlers; smooth-scrolls in place when already on the homepage. */
function SectionLink({ id, onNavigate, className, children }) {
  const { pathname } = useLocation();
  return (
    <Link
      to={`/#${id}`}
      className={className}
      onClick={(e) => {
        onNavigate?.();
        if (pathname !== "/") return;
        e.preventDefault();
        scrollToSection(id);
      }}
    >
      {children}
    </Link>
  );
}

export function LandingHeader() {
  const [navOpen, setNavOpen] = useState(false);
  const close = () => setNavOpen(false);

  return (
    <header className={`landing-nav${navOpen ? " is-open" : ""}`}>
      <Link to="/" className="landing-logo" aria-label="Workza home" onClick={close}>
        <img src={workzaLogo} alt="Workza" />
      </Link>

      <nav className="landing-nav-links" id="landing-nav-links" aria-label="Primary">
        <SectionLink id="features" onNavigate={close}>Features</SectionLink>
        <Link to={FIELD_HRMS_PATH} onClick={close}>Field HRMS</Link>
        <Link to={OFFICE_HRMS_PATH} onClick={close}>Office HRMS</Link>
        <SectionLink id="how-it-works" onNavigate={close}>How it works</SectionLink>
        <SectionLink id="faq" onNavigate={close}>FAQ</SectionLink>
      </nav>

      <div className="landing-nav-actions">
        <Link to="/login" className="landing-btn landing-btn--text">
          Login
        </Link>
        <SectionLink id="demo" onNavigate={close} className="landing-btn landing-btn--primary">
          Request a demo
        </SectionLink>
      </div>
      <button
        type="button"
        className="landing-nav-toggle"
        aria-label={navOpen ? "Close menu" : "Open menu"}
        aria-expanded={navOpen}
        aria-controls="landing-nav-links"
        onClick={() => setNavOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <Link to="/" className="landing-footer-brand" aria-label="Workza home">
        <img src={workzaLogo} alt="Workza" />
      </Link>
      <nav className="landing-footer-links" aria-label="Footer">
        <SectionLink id="features">HRMS Features</SectionLink>
        <SectionLink id="who-its-for">Who it&apos;s for</SectionLink>
        <Link to={FIELD_HRMS_PATH}>Blue-collar &amp; field HRMS</Link>
        <Link to={OFFICE_HRMS_PATH}>White-collar &amp; office HRMS</Link>
        <SectionLink id="how-it-works">How it works</SectionLink>
        <SectionLink id="faq">FAQ</SectionLink>
        <SectionLink id="demo">Request a demo</SectionLink>
        <Link to="/privacy-policy">Privacy policy</Link>
        <Link to="/login">Login</Link>
      </nav>
      <p className="landing-footer-copy">
        © 2026 Kar Pragati Technologies Pvt. Ltd.
      </p>
    </footer>
  );
}

/** Native <details> keeps answers in the HTML for crawlers; FAQPage JSON-LD mirrors the same list. */
export function FaqList({ faqs }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return (
    <div className="landing-faq-list">
      {faqs.map(({ q, a }) => (
        <details key={q} className="landing-faq-item">
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  );
}
