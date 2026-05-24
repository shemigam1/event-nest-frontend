import { useState } from "react";
import { useNavigate } from "react-router";
import {
  useGetEventContractsQuery,
  useCreateContractMutation,
  useUpdateContractMutation,
  useRescindContractMutation,
  useCancelContractMutation,
  useFundEscrowMutation,
  useGetEscrowQuery,
  useAddMilestoneMutation,
  useApproveMilestoneMutation,
  useReleaseMilestoneMutation,
  useDisputeMilestoneMutation,
} from "../contractsApi";
import { useGetEventVendorApplicationsQuery } from '../vendorsApi';
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Icons } from "@/components/ui/Icon";

/* ─── constants ──────────────────────────────────────── */

const STATUS_STYLE = {
  DRAFT:         { bg: "var(--surface-subtle)", fg: "var(--text-2)", label: "Draft" },
  SIGNED:        { bg: "#EAF1FE", fg: "var(--mp-blue)", label: "Signed" },
  ACTIVE:        { bg: "#E6F4EA", fg: "#0F9D58", label: "Active" },
  COMPLETED:     { bg: "#E6F4EA", fg: "#0F7B3E", label: "Completed" },
  CANCELLED:     { bg: "#FBE9E9", fg: "#D62828", label: "Cancelled" },
  COUNTERSIGNED: { bg: "#EAF1FE", fg: "var(--mp-blue)", label: "Countersigned" },
};

const MILESTONE_STYLE = {
  PENDING: { bg: "#FEF4E2", fg: "#B8770A", label: "Pending" },
  APPROVED: { bg: "#EAF1FE", fg: "var(--mp-blue)", label: "Approved" },
  RELEASED: { bg: "#E6F4EA", fg: "#0F9D58", label: "Released" },
  DISPUTED: { bg: "#FBE9E9", fg: "#D62828", label: "Disputed" },
};

function ngn(v) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Badge({ style, label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: style.bg,
        color: style.fg,
      }}
    >
      {label}
    </span>
  );
}

/* ─── ContractsTab ───────────────────────────────────── */

export default function ContractsTab({ eventId }) {
  const [showCreate, setShowCreate] = useState(false);
  const contractsQ = useGetEventContractsQuery(eventId);
  const _cd = contractsQ.data;
  const contracts = Array.isArray(_cd) ? _cd : (_cd?.content ?? []);

  if (contractsQ.isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2].map((k) => (
          <div
            key={k}
            style={{
              background: "white",
              borderRadius: 12,
              border: "1px solid var(--border)",
              height: 80,
              animation: "pulse 1.4s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (contractsQ.isError) {
    return (
      <div
        style={{
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
        }}
      >
        <Icons.alert size={28} style={{ color: "var(--error)" }} />
        <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 14 }}>
          Could not load contracts.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={contractsQ.refetch}
          style={{ marginTop: 12 }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 className="mp-h2" style={{ margin: 0, color: "var(--text-1)" }}>
            Contracts
          </h2>
          <p
            style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-2)" }}
          >
            Manage vendor contracts and escrow for this event.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
          + New contract
        </Button>
      </div>

      {contracts.length === 0 ? (
        <div
          style={{
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
          }}
        >
          <Icons.list
            size={32}
            style={{ color: "var(--text-3)", marginBottom: 12 }}
          />
          <p
            className="mp-h3"
            style={{ margin: "0 0 4px", color: "var(--text-1)" }}
          >
            No contracts yet
          </p>
          <p
            style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 20px" }}
          >
            Create a contract with an accepted vendor to get started.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowCreate(true)}
          >
            Create first contract
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {contracts.map((c) => (
            <ContractCard key={c.id} contract={c} eventId={eventId} />
          ))}
        </div>
      )}

      {showCreate && (
        <ContractModal
          eventId={eventId}
          onDismiss={() => setShowCreate(false)}
        />
      )}
    </>
  );
}

/* ─── ContractCard ───────────────────────────────────── */

function ContractCard({ contract, eventId }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");

  const [fundEscrow, fundState] = useFundEscrowMutation();
  const [rescind, rescindState] = useRescindContractMutation();
  const [cancel, cancelState] = useCancelContractMutation();

  const busy =
    fundState.isLoading ||
    rescindState.isLoading ||
    cancelState.isLoading;

  const s = STATUS_STYLE[contract.status] ?? STATUS_STYLE.DRAFT;
  const isDone =
    contract.status === "COMPLETED" || contract.status === "CANCELLED";
  const hasEscrow = ["ACTIVE", "COMPLETED", "CANCELLED"].includes(
    contract.status,
  );

  async function run(action, label) {
    setErr("");
    try {
      await action().unwrap();
    } catch (e) {
      setErr(e?.data?.message ?? `Failed to ${label}`);
    }
  }

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* header row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((x) => !x)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((x) => !x)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              className="mp-h3"
              style={{ margin: 0, color: "var(--text-1)", fontSize: 15 }}
            >
              {contract.title}
            </span>
            <Badge style={s} label={s.label} />
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>
            {(contract.eventTitle || contract.eventName) && (
              <>Event: <strong>{contract.eventTitle ?? contract.eventName}</strong>{" · "}</>
            )}
            Vendor: <strong>{contract.vendorBusinessName ?? contract.vendorName}</strong>
            {" · "}
            {ngn(contract.totalValue ?? contract.amount)}
            {fmtDate(contract.createdAt) && (
              <> · Created {fmtDate(contract.createdAt)}</>
            )}
          </div>
        </div>
        <Icons.chevronD
          size={16}
          style={{
            color: "var(--text-3)",
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {/* expanded body */}
      {expanded && (
        <div style={{ padding: "20px 20px 24px" }}>
          {contract.description && (
            <p
              style={{
                fontSize: 14,
                color: "var(--text-2)",
                margin: "0 0 8px",
              }}
            >
              {contract.description}
            </p>
          )}
          {contract.terms && (
            <div
              style={{
                background: "var(--surface-subtle)",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 13,
                color: "var(--text-2)",
                margin: "0 0 16px",
                whiteSpace: "pre-wrap",
              }}
            >
              <strong
                style={{
                  color: "var(--text-1)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Terms
              </strong>
              {contract.terms}
            </div>
          )}

          {/* timestamps */}
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {contract.signedAt && (
              <TimestampChip
                label="Signed"
                value={fmtDate(contract.signedAt)}
              />
            )}
            {contract.fundedAt && (
              <TimestampChip
                label="Funded"
                value={fmtDate(contract.fundedAt)}
              />
            )}
            {contract.activatedAt && (
              <TimestampChip
                label="Activated"
                value={fmtDate(contract.activatedAt)}
              />
            )}
            {contract.completedAt && (
              <TimestampChip
                label="Completed"
                value={fmtDate(contract.completedAt)}
              />
            )}
            {contract.terminatedAt && (
              <TimestampChip
                label="Terminated"
                value={fmtDate(contract.terminatedAt)}
              />
            )}
          </div>

          {/* action buttons */}
          {!isDone && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: err ? 8 : 0,
              }}
            >
              {contract.status === "DRAFT" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              )}
              {contract.status === "SIGNED" && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(() => fundEscrow(contract.id), "fund escrow")
                    }
                  >
                    {fundState.isLoading ? "Funding…" : "Fund escrow"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => rescind(contract.id), "rescind")}
                  >
                    {rescindState.isLoading ? "Rescinding…" : "Rescind"}
                  </Button>
                </>
              )}
              {contract.conversationId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(`/messages?c=${contract.conversationId}`)
                  }
                >
                  Message vendor
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => run(() => cancel(contract.id), "cancel")}
              >
                {cancelState.isLoading ? "Cancelling…" : "Cancel contract"}
              </Button>
            </div>
          )}
          {isDone && contract.conversationId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/messages?c=${contract.conversationId}`)}
              style={{ marginBottom: err ? 8 : 0 }}
            >
              Message vendor
            </Button>
          )}
          {err && (
            <p
              style={{ fontSize: 13, color: "var(--error)", margin: "6px 0 0" }}
            >
              {err}
            </p>
          )}

          {/* escrow panel */}
          {hasEscrow && (
            <EscrowPanel
              contractId={contract.id}
              contractStatus={contract.status}
            />
          )}
        </div>
      )}

      {editing && (
        <ContractModal
          eventId={eventId}
          contract={contract}
          onDismiss={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function TimestampChip({ label, value }) {
  return (
    <div style={{ fontSize: 12, color: "var(--text-2)" }}>
      <span style={{ fontWeight: 600, color: "var(--text-1)" }}>{label}: </span>
      {value}
    </div>
  );
}

/* ─── EscrowPanel ────────────────────────────────────── */

function EscrowPanel({ contractId, contractStatus }) {
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [disputingMilestone, setDisputingMilestone] = useState(null);
  const escrowQ = useGetEscrowQuery(contractId);
  const [approveMilestone, approveState] = useApproveMilestoneMutation();
  const [releaseMilestone, releaseState] = useReleaseMilestoneMutation();
  const [disputeMilestone, disputeState] = useDisputeMilestoneMutation();
  const [err, setErr] = useState("");

  const escrow = escrowQ.data;
  const canAddMilestone = ["FUNDED", "ACTIVE"].includes(contractStatus);
  const canRelease = contractStatus === "ACTIVE";

  async function handleApprove(milestoneId) {
    setErr("");
    try {
      await approveMilestone({ contractId, milestoneId }).unwrap();
    } catch (e) {
      setErr(e?.data?.message ?? "Failed to approve milestone");
    }
  }

  async function handleRelease(milestoneId) {
    setErr("");
    try {
      await releaseMilestone({ contractId, milestoneId }).unwrap();
    } catch (e) {
      setErr(e?.data?.message ?? "Failed to release milestone");
    }
  }

  async function handleDispute(milestoneId, reason) {
    setErr("");
    try {
      await disputeMilestone({ contractId, milestoneId, reason }).unwrap();
      setDisputingMilestone(null);
    } catch (e) {
      setErr(e?.data?.message ?? "Failed to raise dispute");
    }
  }

  if (escrowQ.isLoading) {
    return (
      <div
        style={{
          marginTop: 20,
          borderTop: "1px solid var(--border)",
          paddingTop: 16,
          height: 60,
          background: "var(--surface-subtle)",
          borderRadius: 8,
          animation: "pulse 1.4s ease-in-out infinite",
        }}
      />
    );
  }

  if (escrowQ.isError || !escrow) {
    return (
      <div
        style={{
          marginTop: 20,
          borderTop: "1px solid var(--border)",
          paddingTop: 16,
          fontSize: 13,
          color: "var(--text-2)",
        }}
      >
        Escrow data unavailable.
      </div>
    );
  }

  const milestones = escrow.milestones ?? [];
  const totalMilestoneAmount = milestones.reduce(
    (s, m) => s + Number(m.amount ?? 0),
    0,
  );

  return (
    <div
      style={{
        marginTop: 20,
        borderTop: "1px solid var(--border)",
        paddingTop: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-1)",
          }}
        >
          Escrow account
        </h4>
        {canAddMilestone && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddMilestone(true)}
          >
            + Add milestone
          </Button>
        )}
      </div>

      {/* summary */}
      <div
        style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}
      >
        <EscrowStat label="Total" value={ngn(escrow.totalAmount)} />
        <EscrowStat
          label="Released"
          value={ngn(escrow.releasedAmount)}
          accent="success"
        />
        <EscrowStat label="Pending" value={ngn(escrow.pendingAmount)} />
        {milestones.length > 0 && (
          <EscrowStat label="In milestones" value={ngn(totalMilestoneAmount)} />
        )}
      </div>

      {/* milestones */}
      {milestones.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
          No milestones added yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              canRelease={canRelease}
              busy={approveState.isLoading || releaseState.isLoading || disputeState.isLoading}
              onApprove={() => handleApprove(m.id)}
              onRelease={() => handleRelease(m.id)}
              onDispute={() => setDisputingMilestone(m)}
            />
          ))}
        </div>
      )}

      {err && (
        <p style={{ fontSize: 13, color: "var(--error)", margin: "8px 0 0" }}>
          {err}
        </p>
      )}

      {showAddMilestone && (
        <AddMilestoneModal
          contractId={contractId}
          onDismiss={() => setShowAddMilestone(false)}
        />
      )}

      {disputingMilestone && (
        <DisputeReasonModal
          milestone={disputingMilestone}
          onSubmit={(reason) => handleDispute(disputingMilestone.id, reason)}
          onDismiss={() => setDisputingMilestone(null)}
          busy={disputeState.isLoading}
        />
      )}
    </div>
  );
}

function EscrowStat({ label, value, accent }) {
  const color = accent === "success" ? "#0F9D58" : "var(--text-1)";
  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ color: "var(--text-2)", marginBottom: 1 }}>{label}</div>
      <div style={{ fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

/* ─── MilestoneRow ───────────────────────────────────── */

function MilestoneRow({
  milestone: m,
  canRelease,
  busy,
  onApprove,
  onRelease,
  onDispute,
}) {
  const ms = MILESTONE_STYLE[m.status] ?? MILESTONE_STYLE.PENDING;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--surface-subtle)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-1)" }}>
          {m.title}
        </div>
        {m.description && (
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
            {m.description}
          </div>
        )}
        {m.disputeReason && (
          <div style={{ fontSize: 12, color: "#D62828", marginTop: 2 }}>
            Dispute: {m.disputeReason}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-1)",
          whiteSpace: "nowrap",
        }}
      >
        {ngn(m.amount)}
      </div>
      <Badge style={ms} label={ms.label} />
      {m.status === "PENDING" && (
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={onApprove}
          >
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={onDispute}
          >
            Raise dispute
          </Button>
        </>
      )}
      {m.status === "APPROVED" && canRelease && (
        <Button variant="primary" size="sm" disabled={busy} onClick={onRelease}>
          Release
        </Button>
      )}
      {m.releasedAt && (
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          Released {fmtDate(m.releasedAt)}
        </span>
      )}
    </div>
  );
}

/* ─── ContractModal (create / edit) ─────────────────── */

function ContractModal({ eventId, contract, onDismiss }) {
  const isEdit = !!contract;

  const appsQ = useGetEventVendorApplicationsQuery(
    { eventId, status: "ACCEPTED" },
    { skip: isEdit },
  );
  const acceptedApps = appsQ.data ?? [];

  const [createContract, createState] = useCreateContractMutation();
  const [updateContract, updateState] = useUpdateContractMutation();

  const [form, setForm] = useState({
    vendorAppId: "",
    title: contract?.title ?? "",
    description: contract?.description ?? "",
    terms: contract?.terms ?? "",
    amount: contract?.amount ? String(contract.amount) : "",
  });
  const [err, setErr] = useState("");

  const busy = createState.isLoading || updateState.isLoading;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectedApp = acceptedApps.find((a) => a.id === form.vendorAppId);
  const canSubmit =
    form.title.trim() && Number(form.amount) >= 1 && (isEdit || selectedApp);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      if (isEdit) {
        const body = {};
        if (form.title.trim()) body.title = form.title.trim();
        if (form.description.trim()) body.scope = form.description.trim();
        if (form.terms.trim()) body.terms = form.terms.trim();
        if (form.amount) body.totalValue = Number(form.amount);
        await updateContract({ contractId: contract.id, ...body }).unwrap();
      } else {
        await createContract({
          eventId,
          title: form.title.trim(),
          scope: form.description.trim() || undefined,
          terms: form.terms.trim() || undefined,
          totalValue: Number(form.amount),
          vendorId: selectedApp.vendorProfileId,
        }).unwrap();
      }
      onDismiss();
    } catch (e) {
      setErr(
        e?.data?.message ??
          (isEdit ? "Failed to update contract" : "Failed to create contract"),
      );
    }
  }

  return (
    <Modal
      open
      onClose={onDismiss}
      label={isEdit ? "Edit contract" : "New contract"}
      width={520}
    >
      <div style={{ padding: 24 }}>
        <h3
          className="mp-h3"
          style={{ margin: "0 0 20px", color: "var(--text-1)" }}
        >
          {isEdit ? "Edit contract" : "New contract"}
        </h3>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {!isEdit && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  marginBottom: 6,
                }}
              >
                Vendor *
              </label>
              {appsQ.isLoading ? (
                <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
                  Loading vendors…
                </p>
              ) : acceptedApps.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
                  No accepted vendor applications for this event.
                </p>
              ) : (
                <select
                  value={form.vendorAppId}
                  onChange={set("vendorAppId")}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    fontSize: 14,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "white",
                    color: "var(--text-1)",
                  }}
                >
                  <option value="">Select a vendor…</option>
                  {acceptedApps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.businessName ?? a.vendorEmail}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Title *
            </label>
            <Input
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Photography services contract"
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Amount (₦) *
            </label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={set("amount")}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Brief description of the vendor's deliverables…"
              rows={3}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid var(--border)",
                borderRadius: 8,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                color: "var(--text-1)",
                background: "white",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Terms & conditions
            </label>
            <textarea
              value={form.terms}
              onChange={set("terms")}
              placeholder="Detailed terms, payment schedule, cancellation policy…"
              rows={4}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid var(--border)",
                borderRadius: 8,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                color: "var(--text-1)",
                background: "white",
              }}
            />
          </div>

          {err && (
            <p style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>
              {err}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 4,
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onDismiss}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!canSubmit || busy}
            >
              {busy
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create contract"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ─── AddMilestoneModal ──────────────────────────────── */

function AddMilestoneModal({ contractId, onDismiss }) {
  const [addMilestone, state] = useAddMilestoneMutation();
  const [form, setForm] = useState({ title: "", description: "", amount: "" });
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canSubmit = form.title.trim() && Number(form.amount) >= 1;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await addMilestone({
        contractId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        amount: Number(form.amount),
      }).unwrap();
      onDismiss();
    } catch (e) {
      setErr(e?.data?.message ?? "Failed to add milestone");
    }
  }

  return (
    <Modal open onClose={onDismiss} label="Add milestone" width={440}>
      <div style={{ padding: 24 }}>
        <h3
          className="mp-h3"
          style={{ margin: "0 0 20px", color: "var(--text-1)" }}
        >
          Add milestone
        </h3>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Title *
            </label>
            <Input
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Pre-event setup"
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Amount (₦) *
            </label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={set("amount")}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="What the vendor needs to deliver for this milestone…"
              rows={3}
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid var(--border)",
                borderRadius: 8,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                color: "var(--text-1)",
                background: "white",
              }}
            />
          </div>

          {err && (
            <p style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>
              {err}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 4,
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onDismiss}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!canSubmit || state.isLoading}
            >
              {state.isLoading ? "Adding…" : "Add milestone"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

/* ─── DisputeReasonModal ─────────────────────────────── */

function DisputeReasonModal({ milestone, onSubmit, onDismiss, busy }) {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length >= 10;

  function handleSubmit(e) {
    e.preventDefault();
    if (canSubmit) onSubmit(reason.trim());
  }

  return (
    <Modal open onClose={onDismiss} label="Raise dispute" width={440}>
      <div style={{ padding: 24 }}>
        <h3 className="mp-h3" style={{ margin: "0 0 6px", color: "var(--text-1)" }}>
          Raise a dispute
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 20px" }}>
          Milestone: <strong>{milestone.title}</strong>
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-1)",
                marginBottom: 6,
              }}
            >
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you are disputing this milestone (min. 10 characters)…"
              rows={4}
              required
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid var(--border)",
                borderRadius: 8,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                color: "var(--text-1)",
                background: "white",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <Button type="button" variant="secondary" size="md" onClick={onDismiss}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="md" disabled={!canSubmit || busy}>
              {busy ? "Submitting…" : "Submit dispute"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
