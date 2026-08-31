"use client";

import { useTransition } from "react";
import { Building2 } from "lucide-react";
import { Badge, EmptyState, Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, useToast } from "@/components/ui";
import { changeOrgPlan, setOrgSuspended } from "./actions";

export interface OrgRow {
  id: string;
  name: string;
  ownerEmail: string;
  plan: string;
  isSuspended: boolean;
  studentCount: number;
  quizCount: number;
  createdAt: string | null;
}

const PLAN_OPTIONS = ["free", "pro", "institution"] as const;

export function OrgsTable({ rows }: { rows: OrgRow[] }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Building2 className="size-10" />}
        title="No academies yet"
        description="Every academy that signs up will show up here."
      />
    );
  }

  function handlePlanChange(orgId: string, plan: string) {
    startTransition(async () => {
      try {
        await changeOrgPlan(orgId, plan);
        showToast("Plan updated", "success");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not change plan.", "danger");
      }
    });
  }

  function handleSuspendToggle(orgId: string, suspend: boolean) {
    startTransition(async () => {
      try {
        await setOrgSuspended(orgId, suspend);
        showToast(suspend ? "Academy suspended" : "Academy unsuspended", "success");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not update.", "danger");
      }
    });
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Academy</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Plan</TableHeaderCell>
          <TableHeaderCell>Students</TableHeaderCell>
          <TableHeaderCell>Quizzes</TableHeaderCell>
          <TableHeaderCell>Signed up</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-fg-secondary">{row.ownerEmail}</TableCell>
            <TableCell>
              <select
                value={row.plan}
                disabled={isPending}
                onChange={(event) => handlePlanChange(row.id, event.target.value)}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-fg capitalize disabled:opacity-60"
              >
                {PLAN_OPTIONS.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </TableCell>
            <TableCell>{row.studentCount}</TableCell>
            <TableCell>{row.quizCount}</TableCell>
            <TableCell className="text-fg-secondary">
              {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge variant={row.isSuspended ? "danger" : "success"}>
                  {row.isSuspended ? "Suspended" : "Active"}
                </Badge>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSuspendToggle(row.id, !row.isSuspended)}
                  className="text-xs font-medium text-fg-secondary underline decoration-dotted hover:text-fg disabled:opacity-60"
                >
                  {row.isSuspended ? "Unsuspend" : "Suspend"}
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
