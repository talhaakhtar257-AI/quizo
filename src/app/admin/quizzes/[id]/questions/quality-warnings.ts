interface OptionLike {
  option_text: string;
  is_correct: boolean;
}

interface QuestionLike {
  question_text: string;
  options: OptionLike[];
}

// Flags common AI question-writing mistakes so the admin can catch them at a
// glance. These are warnings, not blockers — the admin always decides.
export function getQuestionWarnings(question: QuestionLike): string[] {
  const warnings: string[] = [];
  const options = question.options;
  const correct = options.find((option) => option.is_correct);
  const others = options.filter((option) => !option.is_correct);

  if (correct && others.length > 0) {
    const avgOtherLength =
      others.reduce((sum, option) => sum + option.option_text.length, 0) / others.length;
    if (avgOtherLength > 0 && correct.option_text.length > avgOtherLength * 1.3) {
      warnings.push("The correct answer is noticeably longer than the others.");
    }
  }

  const texts = options.map((option) => option.option_text.trim().toLowerCase());
  if (new Set(texts).size !== texts.length) {
    warnings.push("Two or more options are identical.");
  }

  if (question.question_text.trim().length < 20) {
    warnings.push("The question text is very short.");
  }

  if (options.some((option) => /all of the above|none of the above/i.test(option.option_text))) {
    warnings.push('An option says "all/none of the above".');
  }

  return warnings;
}
