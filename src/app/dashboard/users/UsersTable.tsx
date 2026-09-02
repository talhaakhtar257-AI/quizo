"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserX } from "lucide-react";
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
  useToast,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  approveEnrollment,
  bulkApproveEnrollments,
  moveEnrollmentToPending,
  rejectEnrollment,
} from "./actions";

export interface PendingEnrollmentRow {
  id: string;
  studentName: string;
  email: string;
  courseName: string;
  requestedAt: string | null;
}

export interface ApprovedEnrollmentRow {
  id: string;
  studentName: string;
  email: string;
  courseName: string;
  approvedAt: string | null;
}

export interface RejectedEnrollmentRow {
  id: string;
  studentName: string;
  email: string;
  courseName: string;
  rejectionReason: string | null;
}

type Tab = "pending" | "approved" | "rejected";

export function UsersTable({
  pending,
  approved,
  rejected,
}: {
  pending: PendingEnrollmentRow[];
  approved: ApprovedEnrollmentRow[];
  rejected: RejectedEnrollmentRow[];
}) {
  const [tab, setTab] = useState<Tab>("pending");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(
          [
            { key: "pending", label: "Pending", count: pending.length },
            { key: "approved", label: "Approved", count: approved.length },
            { key: "rejected", label: "Rejected", count: rejected.length },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.key
                ? "border-primary text-secondary"
                : "border-transparent text-fg-secondary hover:text-fg"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {tab === "pending" && <PendingTab rows={pending} />}
      {tab === "approved" && <ApprovedTab rows={approved} />}
      {tab === "rejected" && <RejectedTab rows={rejected} />}
    </div>
  );
}

function PendingTab({ rows }: { rows: PendingEnrollmentRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<PendingEnrollmentRow | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApprove(row: PendingEnrollmentRow) {
    setBusyId(row.id);
    try {
      const result = await approveEnrollment(row.id);
      showToast(`${row.studentName} approved for ${row.courseName}`, "success");
      if (!result.emailSent) {
        showToast("Approved, but the email could not be sent.", "warning");
      }
      router.refresh();
    } catch {
      showToast("Could not approve this enrollment", "danger");
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkApprove() {
    setBulkBusy(true);
    try {
      const result = await bulkApproveEnrollments(Array.from(selected));
      showToast(`${result.approvedCount} enrollment(s) approved`, "success");
      if (result.emailFailures > 0) {
        showToast(`${result.emailFailures} email(s) could not be sent.`, "warning");
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      showToast("Could not approve the selected enrollments", "danger");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await rejectEnrollment(rejectTarget.id, reason);
      showToast(`${rejectTarget.studentName} rejected`, "success");
      setRejectTarget(null);
      setReason("");
      router.refresh();
    } catch {
      showToast("Could not reject this enrollment", "danger");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="size-10" />}
        title="No pending requests"
        description="New enrollment requests will appear here for approval."
      />
    );
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <Button size="sm" onClick={handleBulkApprove} loading={bulkBusy}>
          Bulk approve ({selected.size})
        </Button>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-10">
              <input
                type="checkbox"
                checked={selected.size === rows.length}
                onChange={() =>
                  setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)))
                }
                className="size-4"
              />
            </TableHeaderCell>
            <TableHeaderCell>Student</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Course</TableHeaderCell>
            <TableHeaderCell>Requested</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  className="size-4"
                />
              </TableCell>
              <TableCell className="font-medium text-fg">{row.studentName}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.courseName}</TableCell>
              <TableCell>{row.requestedAt ? formatDate(row.requestedAt) : "—"}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" loading={busyId === row.id} onClick={() => handleApprove(row)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setRejectTarget(row)}>
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal
        open={!!rejectTarget}
        onClose={() => {
          setRejectTarget(null);
          setReason("");
        }}
        title={`Reject ${rejectTarget?.studentName}?`}
      >
        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Only visible to admins"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRejectTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReject} loading={busyId === rejectTarget?.id}>
            Reject
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ApprovedTab({ rows }: { rows: ApprovedEnrollmentRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.studentName.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.courseName.toLowerCase().includes(query)
    );
  }, [rows, search]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="size-10" />}
        title="No approved students yet"
        description="Approve pending requests to see them here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Input
          placeholder="Search by name, email, or course..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Student</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Course</TableHeaderCell>
            <TableHeaderCell>Approved</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-fg">{row.studentName}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.courseName}</TableCell>
              <TableCell>{row.approvedAt ? formatDate(row.approvedAt) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filtered.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-fg-secondary">
          <Search className="size-4" /> No students match &quot;{search}&quot;.
        </p>
      )}
    </div>
  );
}

function RejectedTab({ rows }: { rows: RejectedEnrollmentRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleMoveToPending(row: RejectedEnrollmentRow) {
    setBusyId(row.id);
    try {
      await moveEnrollmentToPending(row.id);
      showToast(`${row.studentName} moved to pending`, "success");
      router.refresh();
    } catch {
      showToast("Could not update this enrollment", "danger");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="size-10" />}
        title="No rejected requests"
        description="Requests you reject will appear here."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Student</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Course</TableHeaderCell>
          <TableHeaderCell>Reason</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-fg">{row.studentName}</TableCell>
            <TableCell>{row.email}</TableCell>
            <TableCell>{row.courseName}</TableCell>
            <TableCell>{row.rejectionReason || "—"}</TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="secondary"
                loading={busyId === row.id}
                onClick={() => handleMoveToPending(row)}
              >
                Move to pending
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
