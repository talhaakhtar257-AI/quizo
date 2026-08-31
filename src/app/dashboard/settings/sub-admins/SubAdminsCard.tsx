"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Users2, Mail, X } from "lucide-react";
import { Button, Card, Input, Switch, UpgradePrompt, useToast } from "@/components/ui";
import { PERMISSION_KEYS, PERMISSION_LABELS, type SubAdminPermission } from "@/lib/permission-types";
import { parsePlanLimitError } from "@/lib/plan-limits";
import { inviteSubAdmin, revokeInvite, updateSubAdminPermission, removeSubAdmin } from "./actions";

export interface SubAdminRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  permissions: Record<SubAdminPermission, boolean>;
}

export interface PendingInviteRow {
  id: string;
  email: string;
  expiresAt: string;
}

export function SubAdminsCard({
  isOwner,
  hasSubAdminPlan,
  maxSubAdmins,
  subAdmins,
  invites,
}: {
  isOwner: boolean;
  hasSubAdminPlan: boolean;
  maxSubAdmins: number;
  subAdmins: SubAdminRow[];
  invites: PendingInviteRow[];
}) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [inviting, startInvite] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const activeAdmins = subAdmins.filter((s) => s.isActive);
  const seatsUsed = activeAdmins.length + invites.length;

  function handleInvite(event: FormEvent) {
    event.preventDefault();
    setLimitMessage(null);
    startInvite(async () => {
      try {
        const { emailSent } = await inviteSubAdmin(email);
        setEmail("");
        showToast(
          emailSent
            ? "Invite sent."
            : "Invite created, but the email could not be delivered (see Known limits in CLAUDE.md). Share the signup link directly.",
          emailSent ? "success" : "warning"
        );
      } catch (error) {
        const limitError = parsePlanLimitError(error);
        if (limitError) {
          setLimitMessage(limitError);
        } else {
          showToast(error instanceof Error ? error.message : "Could not send invite.", "danger");
        }
      }
    });
  }

  async function handleRevoke(inviteId: string) {
    setPendingKey(inviteId);
    try {
      await revokeInvite(inviteId);
      showToast("Invite revoked.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not revoke invite.", "danger");
    } finally {
      setPendingKey(null);
    }
  }

  async function handleToggle(userId: string, permission: SubAdminPermission, value: boolean) {
    const key = `${userId}:${permission}`;
    setPendingKey(key);
    try {
      await updateSubAdminPermission(userId, permission, value);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update permission.", "danger");
    } finally {
      setPendingKey(null);
    }
  }

  async function handleRemove(userId: string) {
    setPendingKey(userId);
    try {
      await removeSubAdmin(userId);
      showToast("Sub-admin removed.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not remove sub-admin.", "danger");
    } finally {
      setPendingKey(null);
    }
  }

  if (!hasSubAdminPlan) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Users2 className="size-5 text-secondary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-fg">Sub-Admins</h2>
        </div>
        <p className="mt-2 text-sm text-fg-secondary">
          Sub-admins are a Pro and Institution feature — upgrade to invite people who help run
          your academy with limited permissions.
        </p>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Users2 className="size-5 text-secondary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-fg">Sub-Admins</h2>
        </div>
        <p className="mt-2 text-sm text-fg-secondary">
          Only the academy owner can invite sub-admins or change their permissions.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users2 className="size-5 text-secondary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-fg">Sub-Admins</h2>
        </div>
        <span className="text-sm text-fg-secondary">
          {seatsUsed} / {maxSubAdmins} seats used
        </span>
      </div>
      <p className="mt-1 text-sm text-fg-secondary">
        Invite people to help run this academy. Every permission starts off — turn on only what
        each person needs.
      </p>

      <form onSubmit={handleInvite} className="mt-4 flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="Invite by email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teacher@example.com"
          />
        </div>
        <Button type="submit" loading={inviting} disabled={seatsUsed >= maxSubAdmins}>
          Send invite
        </Button>
      </form>
      {seatsUsed >= maxSubAdmins && (
        <p className="mt-2 text-xs text-fg-muted">
          You've used all {maxSubAdmins} sub-admin seats on your plan.
        </p>
      )}
      {limitMessage && (
        <div className="mt-3">
          <UpgradePrompt
            message={limitMessage}
            benefits="Upgrade for more sub-admin seats."
            onDismiss={() => setLimitMessage(null)}
          />
        </div>
      )}

      {invites.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-fg">Pending invites</h3>
          <ul className="mt-2 space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-fg">
                  <Mail className="size-4 text-fg-secondary" aria-hidden="true" />
                  {invite.email}
                </span>
                <button
                  type="button"
                  onClick={() => handleRevoke(invite.id)}
                  disabled={pendingKey === invite.id}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-danger-faint disabled:opacity-50"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeAdmins.length > 0 && (
        <div className="mt-6 space-y-6">
          <h3 className="text-sm font-semibold text-fg">Permissions</h3>
          {activeAdmins.map((admin) => (
            <div key={admin.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-fg">{admin.fullName}</p>
                  <p className="text-xs text-fg-secondary">{admin.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(admin.id)}
                  disabled={pendingKey === admin.id}
                  className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PERMISSION_KEYS.map((permission) => {
                  const key = `${admin.id}:${permission}`;
                  return (
                    <label
                      key={permission}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-fg"
                    >
                      {PERMISSION_LABELS[permission]}
                      <Switch
                        checked={admin.permissions[permission]}
                        disabled={pendingKey === key}
                        onCheckedChange={(value) => handleToggle(admin.id, permission, value)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeAdmins.length === 0 && invites.length === 0 && (
        <p className="mt-6 text-sm text-fg-muted">No sub-admins yet.</p>
      )}
    </Card>
  );
}
