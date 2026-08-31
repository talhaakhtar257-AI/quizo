"use client";

import { useState, type ReactNode } from "react";
import { Inbox, MoreHorizontal } from "lucide-react";
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
          <Button variant="outline">Outline</Button>
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

      <Section title="Accordion (shadcn)">
        <Accordion type="single" collapsible className="max-w-md">
          <AccordionItem value="a">
            <AccordionTrigger>Is Quizo really free?</AccordionTrigger>
            <AccordionContent>
              Yes — the Free plan gives you 3 courses with up to 25 students
              each, forever.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Can students cheat?</AccordionTrigger>
            <AccordionContent>
              Questions and options are shuffled every attempt, so no two
              screens look the same.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Tabs (shadcn)">
        <Tabs defaultValue="builder" className="max-w-md">
          <TabsList>
            <TabsTrigger value="builder">Quiz Builder</TabsTrigger>
            <TabsTrigger value="student">Student View</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="builder" className="text-sm text-fg-secondary">
            Type a topic and AI generates questions instantly.
          </TabsContent>
          <TabsContent value="student" className="text-sm text-fg-secondary">
            One question at a time, adaptive difficulty.
          </TabsContent>
          <TabsContent value="analytics" className="text-sm text-fg-secondary">
            See exactly how your students are performing.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Select (shadcn)">
        <Select defaultValue="adaptive">
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Difficulty mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adaptive">Adaptive</SelectItem>
            <SelectItem value="easy_only">Easy only</SelectItem>
            <SelectItem value="medium_only">Medium only</SelectItem>
            <SelectItem value="hard_only">Hard only</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Switch (shadcn)">
        <div className="flex items-center gap-3">
          <Switch id="notif" defaultChecked />
          <label htmlFor="notif" className="text-sm text-fg">
            Email me when a student enrolls
          </label>
        </div>
      </Section>

      <Section title="Dropdown menu (shadcn)">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              <MoreHorizontal className="size-4" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Edit course</DropdownMenuItem>
            <DropdownMenuItem>Regenerate invite code</DropdownMenuItem>
            <DropdownMenuItem className="text-danger">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>
    </div>
  );
}
