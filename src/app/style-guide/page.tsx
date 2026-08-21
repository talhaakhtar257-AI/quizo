"use client";

import { useState, type ReactNode } from "react";
import { Inbox } from "lucide-react";
import {
  Button,
  Input,
  Card,
  Badge,
  DifficultyIndicator,
  Modal,
  useToast,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  EmptyState,
  LoadingSpinner,
  Skeleton,
  ThemeToggle,
} from "@/components/ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useToast();

  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Style Guide</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Every shared component, in every state. Reuse these — never build
            a one-off.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-sm gap-4">
          <Input label="Full name" placeholder="Ada Lovelace" />
          <Input
            label="Email"
            type="email"
            defaultValue="not-an-email"
            error="Enter a valid email address"
          />
        </div>
      </Section>

      <Section title="Cards">
        <Card>
          <h3 className="text-lg font-semibold text-fg">Card heading</h3>
          <p className="mt-1 text-sm text-fg-secondary">
            Cards sit on top of the grey page background.
          </p>
        </Card>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Approved</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="danger">Rejected</Badge>
          <Badge variant="info">Note</Badge>
          <Badge variant="neutral">Draft</Badge>
        </div>
      </Section>

      <Section title="Difficulty indicator">
        <div className="flex flex-wrap gap-6">
          <DifficultyIndicator difficulty="easy" />
          <DifficultyIndicator difficulty="medium" />
          <DifficultyIndicator difficulty="hard" />
        </div>
      </Section>

      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example modal"
        >
          <p className="text-sm text-fg-secondary">
            Closes on Escape or by clicking outside.
          </p>
        </Modal>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => showToast("Saved successfully", "success")}
          >
            Success
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast("Check your input", "warning")}
          >
            Warning
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast("Something went wrong", "danger")}
          >
            Danger
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast("Heads up", "info")}
          >
            Info
          </Button>
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Ada Lovelace</TableCell>
              <TableCell>
                <Badge variant="success">Active</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Alan Turing</TableCell>
              <TableCell>
                <Badge variant="warning">Pending</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={<Inbox className="size-10" />}
          title="No quizzes yet"
          description="Create your first quiz to see it here."
          action={<Button size="sm">Create quiz</Button>}
        />
      </Section>

      <Section title="Loading / Skeleton">
        <div className="flex items-center gap-6">
          <LoadingSpinner />
          <div className="w-48 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </Section>
    </div>
  );
}
