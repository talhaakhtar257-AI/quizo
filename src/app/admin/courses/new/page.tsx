import { CourseForm } from "../CourseForm";

export default function NewCoursePage() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-fg">New course</h1>
      <div className="mt-6">
        <CourseForm />
      </div>
    </div>
  );
}
