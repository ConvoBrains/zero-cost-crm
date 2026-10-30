import { type DiscoveryInputType, type DiscoveryQuestion } from '../defaults.js';

export const DISCOVERY_INPUT_TYPES: readonly DiscoveryInputType[] = [
  'text',
  'textarea',
  'number',
] as const;

export interface DiscoveryQuestionRow {
  rowKey: string;
  id: string;
  section: string;
  prompt: string;
  input: DiscoveryInputType;
}

let rowSeq = 0;

function nextRowKey(id: string): string {
  rowSeq += 1;
  return `discovery-q-${rowSeq}-${id || 'new'}`;
}

export function questionsToRows(questions: readonly DiscoveryQuestion[]): DiscoveryQuestionRow[] {
  return questions.map((q) => ({
    rowKey: nextRowKey(q.id),
    id: q.id,
    section: q.section,
    prompt: q.prompt,
    input: q.input,
  }));
}

export function rowsToQuestions(rows: readonly DiscoveryQuestionRow[]): DiscoveryQuestion[] {
  return rows.map((r) => ({
    id: r.id.trim(),
    section: r.section.trim(),
    prompt: r.prompt.trim(),
    input: r.input,
  }));
}

export function validateDiscoveryQuestions(questions: readonly DiscoveryQuestion[]): string | null {
  const seenIds = new Set<string>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const id = q.id?.trim() ?? '';
    const section = q.section?.trim() ?? '';
    const prompt = q.prompt?.trim() ?? '';
    const input = q.input;

    if (!id) {
      return `Question #${i + 1} is missing an ID.`;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return `Question ID "${id}" is invalid. Use letters, numbers, hyphens, and underscores only.`;
    }
    if (seenIds.has(id)) {
      return `Duplicate question ID "${id}". IDs must be unique.`;
    }
    seenIds.add(id);

    if (!section) {
      return `Question "${id}" is missing a section.`;
    }
    if (!prompt) {
      return `Question "${id}" is missing a prompt.`;
    }
    if (!DISCOVERY_INPUT_TYPES.includes(input)) {
      return `Question "${id}" has an invalid input type "${input}". Must be text, textarea, or number.`;
    }
  }

  return null;
}

export function validateDiscoveryQuestionRows(
  rows: readonly DiscoveryQuestionRow[]
): string | null {
  return validateDiscoveryQuestions(rowsToQuestions(rows));
}
