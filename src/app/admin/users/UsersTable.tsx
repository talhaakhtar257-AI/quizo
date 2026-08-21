"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserX } from "lucide-react";
import {
  Badge,
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
import { approveUser, bulkApprove, deactivateUser, moveToPending, rejectUser } from "./actions";
import { AssignQuizModal } from "./AssignQuizModal";

export interface PendingUserRow {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface ActiveUserRow {
  id: string;
  fullName: string;
  email: string;
  quizzesAssigned: number;
  quizzesCompleted: number;
  averageScore: number | null;
}

export interface RejectedUserRow {
  id: string;
  fullName: string;
  email: string;
  rejectionReason: string | null;
}

type Tab = "pending" | "active" | "rejected";

export function UsersTable({
  pending,
  active,
  rejected,
}: {
  pending: PendingUserRow[];
  active: ActiveUserRow[];
  rejected: RejectedUserRow[];
}) {
  const [tab, setTab] = useState<Tab>("pending");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(
          [
            { key: "pending", label: "Pending", count: pending.length },
            { key: "active", label: "Active", count: active.length },
            { key: "rejected", label: "Rejected", count: rejected.length },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.key
                ? "border-primary text-primary"
                : "border-transparent text-fg-secondary hover:text-fg"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {tab === "pending" && <PendingTab rows={pending} />}
      {tab === "active" && <ActiveTab rows={active} />}
      {tab === "rejected" && <RejectedTab rows={rejected} />}
    </div>
  );
}

function PendingTab({ rows }: { rows: PendingUserRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<PendingUserRow | null>(null);
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

  async function handleApprove(row: PendingUserRow) {
    setBusyId(row.id);
    try {
      const result = await approveUser(row.id);
      showToast(`${row.fullName} approved`, "success");
      if (!result.emailSent) {
        showToast("Approved, but the approval email could not be sent.", "warning");
      }
      router.refresh();
    } catch {
      showToast("Could not approve this user", "danger");
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkApprove() {
    setBulkBusy(true);
    try {
      const result = await bulkApprove(Array.from(selected));
      showToast(`${result.approvedCount} user(s) approved`, "success");
      if (result.emailFailures > 0) {
        showToast(`${result.emailFailures} approval email(s) could not be sent.`, "warning");
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      showToast("Could not approve the selected users", "danger");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await rejectUser(rejectTarget.id, reason);
      showToast(`${rejectTarget.fullName} rejected`, "success");
      setRejectTarget(null);
      setReason("");
      router.refresh();
    } catch {
      showToast("Could not reject this user", "danger");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="size-10" />}
        title="No pending signups"
        description="New signups will appear here for approval."
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
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Signed up</TableHeaderCell>
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
              <TableCell className="font-medium text-fg">{row.fullName}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{formatDate(row.createdAt)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={busyId === row.id}
                    onClick={() => handleApprove(row)}
                  >
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
        title={`Reject ${rejectTarget?.fullName}?`}
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

function ActiveTab({ rows }: { rows: ActiveUserRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [assignTarget, setAssignTarget] = useState<ActiveUserRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ActiveUserRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) => row.fullName.toLowerCase().includes(query) || row.email.toLowerCase().includes(query)
    );
  }, [rows, search]);

  function confirmDeactivate() {
    if (!deactivateTarget) return;
    startTransition(async () => {
      try {
        await deactivateUser(deactivateTarget.id);
        showToast(`${deactivateTarget.fullName} deactivated`, "success");
        setDeactivateTarget(null);
        router.refresh();
      } catch {
        showToast("Could not deactivate this user", "danger");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="size-10" />}
        title="No active students yet"
        description="Approve pending signups to see them here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Assigned</TableHeaderCell>
            <TableHeaderCell>Completed</TableHeaderCell>
            <TableHeaderCell>Average score</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-fg">{row.fullName}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.quizzesAssigned}</TableCell>
              <TableCell>{row.quizzesCompleted}</TableCell>
              <TableCell>
                {row.averageScore !== null ? (
                  <Badge variant="info">{row.averageScore}%</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setAssignTarget(row)}>
                    Assign quiz
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeactivateTarget(row)}>
                    Deactivate
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filtered.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-fg-secondary">
          <Search className="size-4" /> No students match &quot;{search}&quot;.
        </p>
      )}

      {assignTarget && (
        <AssignQuizModal
          open={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          userId={assignTarget.id}
          userName={assignTarget.fullName}
        />
      )}

      <Modal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        title={`Deactivate ${deactivateTarget?.fullName}?`}
      >
        <p className="text-sm text-fg-secondary">
          This revokes their access to log in. You can move them back to Pending later from the
          Rejected tab.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeactivate} loading={isPending}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function RejectedTab({ rows }: { rows: RejectedUserRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleMoveToPending(row: RejectedUserRow) {
    setBusyId(row.id);
    try {
      await moveToPending(row.id);
      showToast(`${row.fullName} moved to pending`, "success");
      router.refresh();
    } catch {
      showToast("Could not update this user", "danger");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UserX className="size-10" />}
        title="No rejected users"
        description="Users you reject will appear here."
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Reason</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium text-fg">{row.fullName}</TableCell>
            <TableCell>{row.email}</TableCell>
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
