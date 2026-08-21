"use client";

import { useEffect, useState } from "react";
import { Button, Modal, useToast } from "@/components/ui";
import { assignQuiz, getPublishedQuizzesForAssignment } from "../quizzes/[id]/assign/actions";

interface QuizOption {
  id: string;
  title: string;
  courseTitle: string;
}

export function AssignQuizModal({
  open,
  onClose,
  userId,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}) {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<QuizOption[] | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuizzes(null);
    getPublishedQuizzesForAssignment().then(setQuizzes);
  }, [open]);

  async function handleAssign(quizId: string) {
    setAssigningId(quizId);
    try {
      await assignQuiz(quizId, [userId], null);
      showToast(`Assigned to ${userName}`, "success");
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not assign this quiz", "danger");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Assign a quiz to ${userName}`}>
      {quizzes === null ? (
        <p className="text-sm text-fg-secondary">Loading published quizzes...</p>
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-fg-secondary">No published quizzes yet.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-fg">{quiz.title}</p>
                <p className="text-xs text-fg-muted">{quiz.courseTitle}</p>
              </div>
              <Button
                size="sm"
                loading={assigningId === quiz.id}
                onClick={() => handleAssign(quiz.id)}
              >
                Assign
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
