"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, UserX } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import { assignQuiz, getUnassignImpact, unassignQuiz } from "./actions";

export interface AssignableUser {
  id: string;
  fullName: string;
  email: string;
}

export interface AssignedRow {
  userId: string;
  fullName: string;
  email: string;
  deadline: string | null;
  assignedAt: string;
  attemptsUsed: number;
  bestScore: number | null;
}

export function AssignForm({
  quizId,
  isPublished,
  assignableUsers,
  assignedUsers,
}: {
  quizId: string;
  isPublished: boolean;
  assignableUsers: AssignableUser[];
  assignedUsers: AssignedRow[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<AssignedRow | null>(null);
  const [impact, setImpact] = useState<{ attemptCount: number } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assignableUsers;
    return assignableUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }, [assignableUsers, search]);

  function toggle(userId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      if (current.size === filtered.length) return new Set();
      return new Set(filtered.map((user) => user.id));
    });
  }

  async function handleAssign() {
    if (selected.size === 0) return;
    setAssigning(true);
    try {
      const result = await assignQuiz(quizId, Array.from(selected), deadline || null);
      showToast(`Assigned to ${result.assignedCount} student(s)`, "success");
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not assign this quiz", "danger");
    } finally {
      setAssigning(false);
    }
  }

  async function openUnassign(row: AssignedRow) {
    setUnassignTarget(row);
    setLoadingImpact(true);
    const result = await getUnassignImpact(quizId, row.userId);
    setImpact(result);
    setLoadingImpact(false);
  }

  function confirmUnassign() {
    if (!unassignTarget) return;
    startTransition(async () => {
      try {
        await unassignQuiz(quizId, unassignTarget.userId);
        showToast(`Unassigned ${unassignTarget.fullName}`, "success");
        setUnassignTarget(null);
        setImpact(null);
        router.refresh();
      } catch {
        showToast("Could not unassign this student", "danger");
      }
    });
  }

  return (
    <div className="space-y-8">
      {!isPublished ? (
        <Card className="flex items-center gap-3 border-warning/40 bg-warning-bg p-4 text-warning">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="text-sm font-medium">Publish this quiz before assigning.</p>
        </Card>
      ) : (
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-fg">Assign to students</h2>

          {assignableUsers.length === 0 ? (
            <p className="text-sm text-fg-secondary">
              Every active student is already assigned to this quiz.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div className="max-w-sm flex-1 min-w-[200px]">
                  <Input
                    label="Search"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Input
                  label="Deadline (optional)"
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                />
                <Button type="button" variant="secondary" onClick={toggleAll}>
                  {selected.size === filtered.length ? "Clear all" : "Select all"}
                </Button>
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {filtered.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-surface-raised"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggle(user.id)}
                      className="size-4"
                    />
                    <span className="font-medium text-fg">{user.fullName}</span>
                    <span className="text-fg-muted">{user.email}</span>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <p className="p-3 text-sm text-fg-secondary">No students match &quot;{search}&quot;.</p>
                )}
              </div>

              <Button onClick={handleAssign} loading={assigning} disabled={selected.size === 0}>
                Assign ({selected.size} selected)
              </Button>
            </>
          )}
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">Already assigned</h2>

        {assignedUsers.length === 0 ? (
          <EmptyState
            icon={<UserX className="size-10" />}
            title="No one assigned yet"
            description="Assign this quiz to active students above."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Assigned</TableHeaderCell>
                <TableHeaderCell>Deadline</TableHeaderCell>
                <TableHeaderCell>Attempts used</TableHeaderCell>
                <TableHeaderCell>Best score</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedUsers.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <div className="font-medium text-fg">{row.fullName}</div>
                    <div className="text-xs text-fg-muted">{row.email}</div>
                  </TableCell>
                  <TableCell>{formatDate(row.assignedAt)}</TableCell>
                  <TableCell>{row.deadline ? formatDate(row.deadline) : "—"}</TableCell>
                  <TableCell>{row.attemptsUsed}</TableCell>
                  <TableCell>
                    {row.bestScore !== null ? (
                      <Badge variant="info">{row.bestScore}%</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="danger" onClick={() => openUnassign(row)}>
                      Unassign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Modal
        open={!!unassignTarget}
        onClose={() => {
          setUnassignTarget(null);
          setImpact(null);
        }}
        title={`Unassign ${unassignTarget?.fullName}?`}
      >
        {loadingImpact ? (
          <p className="text-sm text-fg-secondary">Checking their progress...</p>
        ) : (impact?.attemptCount ?? 0) > 0 ? (
          <p className="text-sm text-warning">
            This student has already started or completed {impact?.attemptCount} attempt(s) on
            this quiz. Unassigning removes their access to it, but their existing attempt history
            is kept.
          </p>
        ) : (
          <p className="text-sm text-fg-secondary">
            This student has not started this quiz yet. They will lose access to it.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setUnassignTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmUnassign} loading={isPending}>
            Unassign
          </Button>
        </div>
      </Modal>
    </div>
  );
}
