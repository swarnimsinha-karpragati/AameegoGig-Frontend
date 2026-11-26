import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, UserPlus, Undo2, Trash2, History } from "lucide-react";

import MainLayout from "../layouts/MainLayout";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DataToolbar,
  Drawer,
  EmptyState,
  Input,
  Select,
  Textarea,
} from "../design-system";
import { getStoredUser } from "../utils/authStorage";
import { roleHasPermission } from "../utils/roles";
import { useAllEmployees } from "../hooks/useEmployees";
import {
  getAssets,
  getMyAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  assignAsset,
  returnAsset,
} from "../services/assetService";

const ASSET_TYPES = ["Hardware", "Software", "Vehicle", "Furniture", "Other"];
const STATUSES = ["Available", "Assigned", "Maintenance", "Retired"];
const CONDITIONS = ["Good", "Damaged", "Non-functional", "Missing parts"];
const STATUS_TONE = { Available: "success", Assigned: "info", Maintenance: "warning", Retired: "neutral", Returned: "success" };

const toOptions = (list) => list.map((v) => ({ value: v, label: v }));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const errorText = (err) => err?.response?.data?.message || "Something went wrong. Please try again.";
const holderLabel = (a) =>
  a.assignedEmployee ? `${a.assignedEmployee.name}${a.assignedEmployee.employeeCode ? ` (${a.assignedEmployee.employeeCode})` : ""}` : "—";

const EMPTY_FORM = {
  assetCode: "",
  assetName: "",
  assetType: "Hardware",
  serialNumber: "",
  location: "",
  purchaseDate: "",
  purchasePrice: "",
  warrantyExpiry: "",
  description: "",
  status: "Available",
};

const ASSETS_KEY = ["assets"];

export default function Assets() {
  const user = getStoredUser();
  const canManage = ["Admin", "HR"].includes(user?.role) || roleHasPermission(user?.role, "assets:manage");

  return (
    <MainLayout>
      <div className="wz-ds">{canManage ? <ManageAssets /> : <MyAssets />}</div>
    </MainLayout>
  );
}

/* ---------- Employee view: assets assigned to me ---------- */
function MyAssets() {
  const { data: assets = [], isLoading } = useQuery({
    queryKey: [...ASSETS_KEY, "my"],
    queryFn: async () => (await getMyAssets()).data?.data || [],
  });

  return (
    <Card title="My assets" subtitle="Company assets currently assigned to you" padded={false}>
      <DataTable
        rowKey="_id"
        loading={isLoading}
        rows={assets}
        columns={[
          { key: "assetCode", header: "Code" },
          { key: "assetName", header: "Asset" },
          { key: "assetType", header: "Type" },
          { key: "serialNumber", header: "Serial no.", render: (a) => a.serialNumber || "—" },
          { key: "assignedAt", header: "Assigned on", render: (a) => fmtDate(a.assignedAt) },
          { key: "assignmentNotes", header: "Notes", render: (a) => a.assignmentNotes || "—" },
        ]}
        emptyState={
          <EmptyState icon={<Package size={24} />} title="No assets assigned" description="Assets your company gives you will show up here." />
        }
      />
    </Card>
  );
}

/* ---------- Admin / HR view ---------- */
function ManageAssets() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null); // { tone, text }

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignForm, setAssignForm] = useState({ employeeId: "", assignmentNotes: "" });
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnForm, setReturnForm] = useState({ conditionOnReturn: "Good", reasonForReturn: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  const { data: assets = [], isLoading, isError, refetch } = useQuery({
    queryKey: [...ASSETS_KEY, "all"],
    queryFn: async () => (await getAssets()).data?.data || [],
  });
  const { data: employees = [] } = useAllEmployees({ enabled: !!assignTarget });

  const done = (text) => {
    setNotice({ tone: "success", text });
    queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
  };
  const failed = (err) => setNotice({ tone: "error", text: errorText(err) });

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? updateAsset(editing._id, payload) : createAsset(payload)),
    onSuccess: () => {
      done(editing ? "Asset updated" : "Asset added");
      setFormOpen(false);
    },
    onError: (err) => setFormError(errorText(err)),
  });
  const assignMutation = useMutation({
    mutationFn: () => assignAsset(assignTarget._id, assignForm),
    onSuccess: () => {
      done(`${assignTarget.assetName} assigned`);
      setAssignTarget(null);
    },
    onError: failed,
  });
  const returnMutation = useMutation({
    mutationFn: () => returnAsset(returnTarget._id, returnForm),
    onSuccess: () => {
      done(`${returnTarget.assetName} returned`);
      setReturnTarget(null);
    },
    onError: failed,
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(deleteTarget._id),
    onSuccess: () => {
      done("Asset deleted");
      setDeleteTarget(null);
    },
    onError: (err) => {
      failed(err);
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (!q) return true;
      return [a.assetCode, a.assetName, a.serialNumber, a.assignedEmployee?.name, a.assignedEmployee?.employeeCode]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [assets, search, statusFilter]);

  const counts = useMemo(
    () => STATUSES.reduce((acc, s) => ({ ...acc, [s]: assets.filter((a) => a.status === s).length }), {}),
    [assets]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      assetCode: a.assetCode || "",
      assetName: a.assetName || "",
      assetType: a.assetType || "Hardware",
      serialNumber: a.serialNumber || "",
      location: a.location || "",
      purchaseDate: toDateInput(a.purchaseDate),
      purchasePrice: a.purchasePrice ? String(a.purchasePrice) : "",
      warrantyExpiry: toDateInput(a.warrantyExpiry),
      description: a.description || "",
      status: a.status === "Returned" ? "Available" : a.status,
    });
    setFormError("");
    setFormOpen(true);
  };
  const submitForm = (e) => {
    e.preventDefault();
    if (!form.assetCode.trim() || !form.assetName.trim()) {
      setFormError("Asset code and name are required");
      return;
    }
    const payload = { ...form };
    // Status is only editable for unassigned assets; Assigned is set by Assign.
    if (!editing || editing.assignedEmployee) delete payload.status;
    saveMutation.mutate(payload);
  };
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const employeeOptions = employees
    .filter((emp) => !emp.isDeleted)
    .map((emp) => ({ value: emp._id, label: `${emp.name}${emp.employeeCode ? ` (${emp.employeeCode})` : ""}` }));

  return (
    <>
      {notice && (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: notice.tone === "error" ? "#fdecec" : "#e9f7ef",
            color: notice.tone === "error" ? "#a32020" : "#1d6b3a",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} style={{ background: "none", border: 0, cursor: "pointer", color: "inherit" }} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge tone="neutral">Total {assets.length}</Badge>
        {STATUSES.map((s) => (
          <Badge key={s} tone={STATUS_TONE[s]}>
            {s} {counts[s] || 0}
          </Badge>
        ))}
      </div>

      <Card title="Assets" subtitle="Company assets and who they are assigned to" padded={false}>
        <div style={{ padding: "12px 16px 0" }}>
          <DataToolbar
            search={{ value: search, onChange: setSearch, placeholder: "Search code, name, serial or employee" }}
            actions={
              <>
                <Select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[{ value: "", label: "All statuses" }, ...toOptions(STATUSES)]}
                />
                <Button icon={<Plus size={16} />} onClick={openCreate}>
                  Add asset
                </Button>
              </>
            }
          />
        </div>
        <DataTable
          rowKey="_id"
          loading={isLoading}
          rows={filtered}
          getRowLabel={(a) => a.assetName}
          columns={[
            { key: "assetCode", header: "Code" },
            { key: "assetName", header: "Asset" },
            { key: "assetType", header: "Type" },
            { key: "serialNumber", header: "Serial no.", render: (a) => a.serialNumber || "—" },
            { key: "status", header: "Status", render: (a) => <Badge tone={STATUS_TONE[a.status] || "neutral"}>{a.status}</Badge> },
            { key: "assignedEmployee", header: "Assigned to", render: holderLabel },
            { key: "assignedAt", header: "Since", render: (a) => (a.assignedEmployee ? fmtDate(a.assignedAt) : "—") },
            { key: "location", header: "Location", render: (a) => a.location || "—" },
          ]}
          rowActions={(a) => [
            !a.assignedEmployee && ["Available", "Returned"].includes(a.status) && {
              label: "Assign",
              icon: <UserPlus size={16} />,
              onClick: () => {
                setAssignForm({ employeeId: "", assignmentNotes: "" });
                setAssignTarget(a);
              },
            },
            a.assignedEmployee && {
              label: "Return",
              icon: <Undo2 size={16} />,
              onClick: () => {
                setReturnForm({ conditionOnReturn: "Good", reasonForReturn: "" });
                setReturnTarget(a);
              },
            },
            { label: "Edit", icon: <Pencil size={16} />, onClick: () => openEdit(a) },
            { label: "History", icon: <History size={16} />, onClick: () => setHistoryTarget(a) },
            !a.assignedEmployee && { label: "Delete", icon: <Trash2 size={16} />, danger: true, onClick: () => setDeleteTarget(a) },
          ].filter(Boolean)}
          emptyState={
            isError ? (
              <EmptyState title="Couldn't load assets" action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />
            ) : (
              <EmptyState
                icon={<Package size={24} />}
                title={assets.length ? "No assets match your filters" : "No assets yet"}
                description={assets.length ? "Try a different search or status." : "Add laptops, phones, vehicles and other company assets to track who has them."}
                action={!assets.length && <Button icon={<Plus size={16} />} onClick={openCreate}>Add asset</Button>}
              />
            )
          }
        />
      </Card>

      {/* Add / edit */}
      <Drawer
        open={formOpen}
        title={editing ? "Edit asset" : "Add asset"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" form="asset-form" loading={saveMutation.isPending}>
              {editing ? "Save changes" : "Add asset"}
            </Button>
          </>
        }
      >
        <form id="asset-form" onSubmit={submitForm} style={{ display: "grid", gap: 14 }}>
          {formError && <div role="alert" style={{ color: "#a32020" }}>{formError}</div>}
          <Input label="Asset code" required value={form.assetCode} onChange={setField("assetCode")} placeholder="e.g. LAP-001" />
          <Input label="Asset name" required value={form.assetName} onChange={setField("assetName")} placeholder="e.g. Dell Latitude 5440" />
          <Select label="Type" required value={form.assetType} onChange={setField("assetType")} options={toOptions(ASSET_TYPES)} />
          {editing && !editing.assignedEmployee && (
            <Select
              label="Status"
              value={form.status}
              onChange={setField("status")}
              options={toOptions(["Available", "Maintenance", "Retired"])}
              helperText="Use Assign to give the asset to an employee."
            />
          )}
          <Input label="Serial number" value={form.serialNumber} onChange={setField("serialNumber")} />
          <Input label="Location" value={form.location} onChange={setField("location")} placeholder="e.g. Head office" />
          <Input label="Purchase date" type="date" value={form.purchaseDate} onChange={setField("purchaseDate")} />
          <Input label="Purchase price" type="number" min="0" value={form.purchasePrice} onChange={setField("purchasePrice")} />
          <Input label="Warranty expiry" type="date" value={form.warrantyExpiry} onChange={setField("warrantyExpiry")} />
          <Textarea label="Description" rows={3} value={form.description} onChange={setField("description")} />
        </form>
      </Drawer>

      {/* Assign */}
      <ConfirmDialog
        open={!!assignTarget}
        title={`Assign ${assignTarget?.assetName || "asset"}`}
        confirmLabel="Assign"
        loading={assignMutation.isPending}
        confirmDisabled={!assignForm.employeeId}
        onConfirm={() => assignMutation.mutate()}
        onCancel={() => setAssignTarget(null)}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Select
            label="Employee"
            required
            value={assignForm.employeeId}
            onChange={(e) => setAssignForm((f) => ({ ...f, employeeId: e.target.value }))}
            placeholder="Select an employee"
            options={employeeOptions}
          />
          <Textarea
            label="Notes"
            rows={2}
            value={assignForm.assignmentNotes}
            onChange={(e) => setAssignForm((f) => ({ ...f, assignmentNotes: e.target.value }))}
            placeholder="e.g. Includes charger and bag"
          />
        </div>
      </ConfirmDialog>

      {/* Return */}
      <ConfirmDialog
        open={!!returnTarget}
        title={`Return ${returnTarget?.assetName || "asset"}`}
        message={returnTarget ? `Currently with ${holderLabel(returnTarget)}.` : ""}
        confirmLabel="Mark returned"
        loading={returnMutation.isPending}
        onConfirm={() => returnMutation.mutate()}
        onCancel={() => setReturnTarget(null)}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Select
            label="Condition"
            value={returnForm.conditionOnReturn}
            onChange={(e) => setReturnForm((f) => ({ ...f, conditionOnReturn: e.target.value }))}
            options={toOptions(CONDITIONS)}
            helperText="Anything other than Good moves the asset to Maintenance."
          />
          <Textarea
            label="Reason"
            rows={2}
            value={returnForm.reasonForReturn}
            onChange={(e) => setReturnForm((f) => ({ ...f, reasonForReturn: e.target.value }))}
          />
        </div>
      </ConfirmDialog>

      {/* Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="destructive"
        title="Delete asset?"
        message={deleteTarget ? `${deleteTarget.assetCode} · ${deleteTarget.assetName} and its history will be removed.` : ""}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* History */}
      <Drawer
        open={!!historyTarget}
        title="Assignment history"
        subtitle={historyTarget ? `${historyTarget.assetCode} · ${historyTarget.assetName}` : ""}
        onClose={() => setHistoryTarget(null)}
      >
        {historyTarget?.assignmentHistory?.length ? (
          <ol style={{ display: "grid", gap: 12, margin: 0, paddingLeft: 18 }}>
            {[...historyTarget.assignmentHistory].reverse().map((h) => (
              <li key={h._id}>
                <strong>{h.employeeName || "Employee"}</strong>
                {h.employeeCode ? ` (${h.employeeCode})` : ""}
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {fmtDate(h.assignedAt)} → {h.returnedAt ? fmtDate(h.returnedAt) : "now"}
                  {h.returnedAt && h.conditionOnReturn ? ` · returned ${h.conditionOnReturn}` : ""}
                </div>
                {(h.assignmentNotes || h.reasonForReturn) && (
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {[h.assignmentNotes, h.reasonForReturn].filter(Boolean).join(" · ")}
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="Never assigned" description="This asset has not been assigned to anyone yet." />
        )}
      </Drawer>
    </>
  );
}
