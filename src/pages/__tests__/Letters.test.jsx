import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Letters from "../Letters";

const mockSetParams = jest.fn();
const mockNavigate = jest.fn();
let mockSearch = "";
let mockAccess = {};
let mockTemplates = [];

jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");
    return {
      useNavigate: () => mockNavigate,
      useParams: () => ({ vendor: "acme" }),
      useSearchParams: () => {
        const [params, setParams] = React.useState(() => new URLSearchParams(mockSearch));
        const update = (next, options) => {
          mockSetParams(next.toString(), options);
          setParams(new URLSearchParams(next));
        };
        return [params, update];
      },
    };
  },
  { virtual: true }
);

jest.mock("../../layouts/MainLayout", () => ({ children }) => <div>{children}</div>);
jest.mock("../../utils/roles", () => ({ getLetterAccess: () => mockAccess }));
const mockUseLetterRecipients = jest.fn();
jest.mock("../../hooks/useLetters", () => ({
  useLetterRecipients: (...args) => mockUseLetterRecipients(...args),
  useLetterTemplates: () => ({ data: mockTemplates, isLoading: false, isError: false, refetch: jest.fn() }),
  useIssuedLetters: () => ({ data: { letters: [] }, isLoading: false, isError: false }),
  useLetterTemplateAction: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("../../components/letters/IssuedLetters", () => (props) => (
  <div data-testid="issued" data-focus={String(Boolean(props.focusHeading))}>
    <button onClick={() => props.onIssue()}>issued: issue</button>
    {props.recipientFilter && <span>filter: {props.recipientFilter.id}</span>}
  </div>
));
jest.mock("../../components/letters/OfferCandidates", () => (props) => (
  <div data-testid="offers" data-focus={String(Boolean(props.focusHeading))}>
    <button onClick={() => props.onSendOffer({ _id: "0000000000000000000000c1" })}>offers: send offer</button>
    <button onClick={() => props.onViewLetters({ _id: "0000000000000000000000c1" })}>offers: view letters</button>
    <button onClick={() => props.onConvert({ _id: "c2" })}>offers: convert</button>
    <button onClick={() => props.onViewEmployee({ _id: "c3", name: "Kiran", employeeCode: "EMP-7" })}>offers: view employee</button>
  </div>
));
jest.mock("../../components/letters/TemplateEditor", () => (props) => (
  <div data-testid="editor">
    editing {props.templateId}
    <button onClick={props.onExit}>editor: exit</button>
    <button onClick={() => props.onIssue(props.templateId)}>editor: try issuing</button>
  </div>
));
jest.mock("../../components/letters/IssueLetterPanel", () => (props) =>
  props.open ? (
    <div data-testid="panel">
      <span>
        panel:{props.templateId || "chooser"}|{props.templateKey || ""}|{props.initialRecipientId}|{props.initialRecipientType}|
        {JSON.stringify(props.recipientRule)}
      </span>
      <button onClick={() => props.onChangeTemplate("")}>panel: back to chooser</button>
      <button onClick={props.onClose}>panel: close</button>
      {props.onViewIssued && (
        <button onClick={() => props.onViewIssued({ _id: "0000000000000000000000e1" }, "employee")}>panel: view issued</button>
      )}
      {props.canAddCandidate && <span>panel: can add candidate</span>}
    </div>
  ) : null
);

const FULL = { canView: true, canEdit: true, canIssue: true, canManageOffers: true, canIssueConsultancyAgreement: true };
const lastUrl = () => mockSetParams.mock.calls[mockSetParams.mock.calls.length - 1][0];

const renderAt = (search, access = FULL) => {
  mockSearch = search;
  mockAccess = access;
  return render(<Letters />);
};

const TEMPLATES = [
  { _id: "t-offer", key: "offer", name: "Offer Letter", category: "Onboarding", recipientType: "candidate", status: "active", updatedAt: "2026-09-01" },
  { _id: "t-warn", key: "warning", name: "Warning Letter", category: "Disciplinary", recipientType: "employee", status: "active", updatedAt: "2026-09-01" },
  { _id: "t-cons", key: "consultancy-agreement", name: "Consultancy Agreement", category: "Consultancy", recipientType: "employee", recipientRule: "consultancy", status: "active", updatedAt: "2026-09-01" },
];
const homeHeading = () => screen.getByRole("heading", { name: "Issue a letter", level: 2 });

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLetterRecipients.mockReturnValue({ data: [] });
  mockTemplates = TEMPLATES;
});

it("starts on the Issue a letter tab with the home screen and does not move focus", () => {
  renderAt("");
  expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Issue a letter", "Issued letters", "Offer candidates"]);
  expect(screen.getByRole("tab", { name: "Issue a letter" })).toHaveAttribute("aria-selected", "true");
  expect(homeHeading()).not.toHaveFocus();
  expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  expect(mockSetParams).not.toHaveBeenCalled();
});

it("opens the issue panel from a home card and returns to the chooser when the letter is changed", async () => {
  renderAt("");
  await userEvent.click(screen.getByRole("button", { name: /Warning Letter/ }));
  expect(lastUrl()).toBe("issue=t-warn");
  expect(screen.getByText(/panel:t-warn\|\|\|\|null/)).toBeInTheDocument();

  await userEvent.click(screen.getByText("panel: back to chooser"));
  expect(lastUrl()).toBe("issue=pick");
  expect(screen.getByText(/panel:chooser/)).toBeInTheDocument();

  await userEvent.click(screen.getByText("panel: close"));
  expect(lastUrl()).toBe("");
  expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
});

it("redirects old template links into manage mode with replace", () => {
  renderAt("tab=templates&template=t1");
  expect(mockSetParams).toHaveBeenCalledTimes(1);
  expect(mockSetParams).toHaveBeenCalledWith("template=t1&manage=1", { replace: true });
  expect(screen.getByTestId("editor")).toHaveTextContent("editing t1");
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
});

it("redirects old generate links to the issue panel", () => {
  renderAt("generate=1&gTemplate=t2&recipient=0000000000000000000000e1&recipientType=employee");
  expect(mockSetParams).toHaveBeenCalledWith("recipient=0000000000000000000000e1&recipientType=employee&tab=issue&issue=t2", { replace: true });
  expect(screen.getByText(/panel:t2\|\|0000000000000000000000e1\|employee/)).toBeInTheDocument();
});

it("cleans ignored params once, with replace", () => {
  renderAt("tab=nope&manage=1&forRecipient=x", { ...FULL, canEdit: false });
  expect(mockSetParams).toHaveBeenCalledTimes(1);
  expect(mockSetParams).toHaveBeenCalledWith("", { replace: true });
  expect(homeHeading()).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Manage templates" })).not.toBeInTheDocument();
});

it("redirects and cleans an old link in a single replace", () => {
  renderAt("tab=templates&template=t1", { ...FULL, canEdit: false });
  expect(mockSetParams).toHaveBeenCalledTimes(1);
  expect(mockSetParams).toHaveBeenCalledWith("", { replace: true });
  expect(screen.queryByTestId("editor")).not.toBeInTheDocument();
});

it("hides the tabs in manage mode, moves focus to each new screen's heading and goes back", async () => {
  renderAt("");
  await userEvent.click(screen.getByRole("button", { name: "Manage templates" }));
  expect(lastUrl()).toBe("manage=1");
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Manage templates", level: 2 })).toHaveFocus();

  await userEvent.click(screen.getByText("Warning Letter"));
  expect(lastUrl()).toBe("manage=1&template=t-warn");
  await userEvent.click(screen.getByText("editor: try issuing"));
  expect(screen.getByText(/panel:t-warn/)).toBeInTheDocument();
  await userEvent.click(screen.getByText("panel: close"));
  await userEvent.click(screen.getByText("editor: exit"));
  expect(screen.getByRole("heading", { name: "Manage templates", level: 2 })).toHaveFocus();

  await userEvent.click(screen.getByRole("button", { name: "Back to letters" }));
  expect(lastUrl()).toBe("");
  expect(screen.getByRole("tablist")).toBeInTheDocument();
  expect(homeHeading()).toHaveFocus();
});

it("focuses Issued letters after View all, but keeps focus on the tab when switching tabs", async () => {
  renderAt("");
  await userEvent.click(screen.getByRole("tab", { name: "Offer candidates" }));
  expect(screen.getByTestId("offers")).toHaveAttribute("data-focus", "false");
  expect(screen.getByRole("tab", { name: "Offer candidates" })).toHaveFocus();
  await userEvent.click(screen.getByRole("tab", { name: "Issue a letter" }));
  await userEvent.click(screen.getByRole("button", { name: "View all issued letters" }));
  expect(lastUrl()).toBe("tab=issued");
  expect(screen.getByTestId("issued")).toHaveAttribute("data-focus", "true");
});

it("ignores manage mode for people who cannot edit templates", () => {
  renderAt("manage=1", { ...FULL, canEdit: false });
  expect(screen.queryByRole("heading", { name: "Manage templates" })).not.toBeInTheDocument();
  expect(homeHeading()).toBeInTheDocument();
});

it("opens the chooser from Issued letters", async () => {
  renderAt("tab=issued");
  await userEvent.click(screen.getByText("issued: issue"));
  expect(lastUrl()).toBe("tab=issued&issue=pick");
  expect(screen.getByText(/panel:chooser/)).toBeInTheDocument();
});

it("sends an offer by asking the panel for the offer template and the candidate", async () => {
  mockTemplates = [];
  renderAt("tab=offers");
  await userEvent.click(screen.getByText("offers: send offer"));
  expect(lastUrl()).toBe("tab=offers&issue=pick&issueKey=offer&recipient=0000000000000000000000c1&recipientType=candidate");
  expect(screen.getByText(/panel:chooser\|offer\|0000000000000000000000c1\|candidate/)).toBeInTheDocument();
});

it("shows a candidate's letters on Issued letters and focuses that screen", async () => {
  renderAt("tab=offers");
  await userEvent.click(screen.getByText("offers: view letters"));
  expect(lastUrl()).toBe("tab=issued&forRecipient=0000000000000000000000c1&forType=candidate");
  expect(screen.getByTestId("issued")).toHaveAttribute("data-focus", "true");
});

it("hands accepted candidates to Add employee and joined ones to the employee list", async () => {
  renderAt("tab=offers");
  await userEvent.click(screen.getByText("offers: convert"));
  expect(mockNavigate).toHaveBeenLastCalledWith("/acme/employees?prefillCandidate=c2");
  await userEvent.click(screen.getByText("offers: view employee"));
  expect(mockNavigate).toHaveBeenLastCalledWith("/acme/employees?search=EMP-7");
});

it("goes to the person's issued letters after issuing", async () => {
  renderAt("issue=t-warn&recipient=0000000000000000000000e1&recipientType=employee");
  await userEvent.click(screen.getByText("panel: view issued"));
  expect(lastUrl()).toBe("tab=issued&forRecipient=0000000000000000000000e1&forType=employee");
  expect(screen.getByText("filter: 0000000000000000000000e1")).toBeInTheDocument();
  expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
});

it("lets people who manage candidates add one from the issue panel", () => {
  renderAt("issue=t-offer");
  expect(screen.getByText("panel: can add candidate")).toBeInTheDocument();
});

it("does not offer adding a candidate to people who cannot manage candidates", () => {
  renderAt("issue=t-offer", { ...FULL, canManageOffers: false });
  expect(screen.getByTestId("panel")).toBeInTheDocument();
  expect(screen.queryByText("panel: can add candidate")).not.toBeInTheDocument();
});

it("limits consultancy-only issuers to the consultancy agreement, on the home screen and in the panel", () => {
  renderAt("issue=pick", { canView: true, canIssueConsultancyAgreement: true });
  expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Issue a letter", "Issued letters"]);
  expect(screen.getByRole("button", { name: /Consultancy Agreement/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Warning Letter/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Offer Letter/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Manage templates" })).not.toBeInTheDocument();
  expect(screen.getByText(/panel:chooser\|\|\|\|"consultancy"/)).toBeInTheDocument();
});

it("gives consultancy managers without Letters only the consultancy agreement, with no issued-letters screens", () => {
  renderAt("issue=pick", { canIssueConsultancyAgreement: true });
  expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Issue a letter"]);
  expect(screen.getByRole("button", { name: /Consultancy Agreement/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Warning Letter/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Recently issued" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "View all issued letters" })).not.toBeInTheDocument();
  expect(screen.getByText(/panel:chooser/)).toBeInTheDocument();
  expect(screen.queryByText("panel: view issued")).not.toBeInTheDocument();
});

it("never asks for a person whose id is malformed, even before the URL is cleaned", () => {
  renderAt("tab=bogus&recipient=abc&forRecipient=xyz&issueKey=offer");
  renderAt("tab=issued&forRecipient=xyz&forType=employee");
  for (const [params, options] of mockUseLetterRecipients.mock.calls) {
    expect(options.enabled && params.id).toBeFalsy();
  }
  expect(mockSetParams).toHaveBeenCalledWith("tab=issued", { replace: true });
});

it("looks up the filtered person once the URL is canonical", () => {
  renderAt("tab=issued&forRecipient=0000000000000000000000c1&forType=candidate");
  expect(mockUseLetterRecipients).toHaveBeenCalledWith(
    { recipientType: "candidate", id: "0000000000000000000000c1" },
    { enabled: true }
  );
  expect(mockSetParams).not.toHaveBeenCalled();
});

it("never opens the issue panel for view-only users", () => {
  renderAt("tab=issued&issue=t-warn", { canView: true });
  expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Issued letters"]);
  expect(screen.getByTestId("issued")).toBeInTheDocument();
  expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
});
