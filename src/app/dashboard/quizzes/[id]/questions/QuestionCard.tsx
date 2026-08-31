"use client";

import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DifficultyIndicator,
  Input,
  Modal,
  Textarea,
  type Difficulty,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { getQuestionWarnings } from "./quality-warnings";
import type { UpdateQuestionInput } from "./actions";

export interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
}

export interface Question {
  id: string;
  difficulty: Difficulty;
  question_text: string;
  explanation: string;
  is_approved: boolean;
  options: QuestionOption[];
}

interface DraftState {
  difficulty: Difficulty;
  questionText: string;
  explanation: string;
  options: { id: string; text: string }[];
  correctIndex: number;
}

function toDraft(question: Question): DraftState {
  return {
    difficulty: question.difficulty,
    questionText: question.question_text,
    explanation: question.explanation,
    options: question.options.map((option) => ({ id: option.id, text: option.option_text })),
    correctIndex: question.options.findIndex((option) => option.is_correct),
  };
}

export function QuestionCard({
  question,
  selected,
  onToggleSelect,
  onApprove,
  onDelete,
  onSave,
}: {
  question: Question;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSave: (input: UpdateQuestionInput) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => toDraft(question));
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const warnings = getQuestionWarnings(question);

  function startEdit() {
    setDraft(toDraft(question));
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        difficulty: draft.difficulty,
        questionText: draft.questionText,
        explanation: draft.explanation,
        options: draft.options.map((option, index) => ({
          id: option.id,
          text: option.text,
          isCorrect: index === draft.correctIndex,
        })),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-fg" htmlFor={`difficulty-${question.id}`}>
            Difficulty
          </label>
          <select
            id={`difficulty-${question.id}`}
            value={draft.difficulty}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                difficulty: event.target.value as Difficulty,
              }))
            }
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <Textarea
          label="Question (include the scenario)"
          rows={4}
          value={draft.questionText}
          onChange={(event) =>
            setDraft((current) => ({ ...current, questionText: event.target.value }))
          }
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">Options — select the correct one</p>
          {draft.options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={draft.correctIndex === index}
                onChange={() => setDraft((current) => ({ ...current, correctIndex: index }))}
                aria-label={`Mark option ${index + 1} as correct`}
                className="size-4 shrink-0"
              />
              <Input
                value={option.text}
                onChange={(event) => {
                  const next = [...draft.options];
                  next[index] = { ...next[index], text: event.target.value };
                  setDraft((current) => ({ ...current, options: next }));
                }}
                className="flex-1"
              />
            </div>
          ))}
        </div>

        <Textarea
          label="Explanation"
          rows={2}
          value={draft.explanation}
          onChange={(event) =>
            setDraft((current) => ({ ...current, explanation: event.target.value }))
          }
        />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label="Select question"
            className="size-4"
          />
          <DifficultyIndicator difficulty={question.difficulty} />
        </div>
        <div className="flex items-center gap-2">
          {question.is_approved ? (
            <Badge variant="success">Approved</Badge>
          ) : (
            <Badge variant="neutral">Pending</Badge>
          )}
          {warnings.length > 0 && (
            <span title={warnings.join(" ")} className="text-warning">
              <AlertTriangle className="size-4" />
            </span>
          )}
        </div>
      </div>

      <div className="rounded-md bg-info-bg p-3 text-sm font-medium text-fg whitespace-pre-line">
        {question.question_text}
      </div>

      <ul className="space-y-1.5">
        {question.options.map((option) => (
          <li
            key={option.id}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
              option.is_correct
                ? "border-success/40 bg-success-bg text-success"
                : "border-border text-fg"
            )}
          >
            {option.is_correct && <Check className="size-4 shrink-0" />}
            {option.option_text}
          </li>
        ))}
      </ul>

      {question.explanation && (
        <p className="text-xs text-fg-muted">{question.explanation}</p>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-0.5 text-xs text-warning">
          {warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        {!question.is_approved && (
          <Button
            size="sm"
            variant="secondary"
            loading={approving}
            onClick={async () => {
              setApproving(true);
              try {
                await onApprove();
              } finally {
                setApproving(false);
              }
            }}
          >
            Approve
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={startEdit}>
          Edit
        </Button>
        <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(true)}>
          Delete
        </Button>
      </div>

      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete this question?"
      >
        <p className="text-sm text-fg-secondary">This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await onDelete();
                setDeleteConfirm(false);
              } finally {
                setDeleting(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
