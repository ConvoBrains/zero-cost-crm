import { describe, expect, it } from 'vitest';
import {
  questionsToRows,
  rowsToQuestions,
  validateDiscoveryQuestions,
  validateDiscoveryQuestionRows,
  type DiscoveryQuestionRow,
} from '../../src/lib/discoveryQuestions';
import type { DiscoveryQuestion } from '../../src/defaults';

describe('questionsToRows / rowsToQuestions', () => {
  it('converts questions to editor rows and back', () => {
    const questions: DiscoveryQuestion[] = [
      {
        id: 'budget',
        section: 'Discovery',
        prompt: 'Annual budget?',
        input: 'number',
      },
      {
        id: 'pain_point',
        section: 'Problems',
        prompt: 'Main challenge?',
        input: 'textarea',
      },
    ];

    const rows = questionsToRows(questions);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('budget');
    expect(rows[0].section).toBe('Discovery');
    expect(rows[0].prompt).toBe('Annual budget?');
    expect(rows[0].input).toBe('number');
    expect(rows[0].rowKey).toBeDefined();

    const back = rowsToQuestions(rows);
    expect(back).toEqual(questions);
  });

  it('trims whitespace on rowsToQuestions', () => {
    const rows: DiscoveryQuestionRow[] = [
      {
        rowKey: 'k1',
        id: '  timeline  ',
        section: '  Timeline  ',
        prompt: '  When to start?  ',
        input: 'text',
      },
    ];

    expect(rowsToQuestions(rows)).toEqual([
      {
        id: 'timeline',
        section: 'Timeline',
        prompt: 'When to start?',
        input: 'text',
      },
    ]);
  });
});

describe('validateDiscoveryQuestions', () => {
  it('accepts an empty array of questions', () => {
    expect(validateDiscoveryQuestions([])).toBeNull();
  });

  it('accepts valid questions with text, textarea, and number inputs', () => {
    const questions: DiscoveryQuestion[] = [
      { id: 'q1', section: 'General', prompt: 'Prompt 1', input: 'text' },
      { id: 'q2', section: 'General', prompt: 'Prompt 2', input: 'textarea' },
      { id: 'q3-num_val', section: 'Stats', prompt: 'Prompt 3', input: 'number' },
    ];
    expect(validateDiscoveryQuestions(questions)).toBeNull();
  });

  it('rejects questions missing an ID', () => {
    const questions: DiscoveryQuestion[] = [
      { id: '', section: 'General', prompt: 'Prompt', input: 'text' },
    ];
    expect(validateDiscoveryQuestions(questions)).toBe('Question #1 is missing an ID.');
  });

  it('rejects questions with invalid ID characters', () => {
    const questions: DiscoveryQuestion[] = [
      { id: 'budget question', section: 'General', prompt: 'Prompt', input: 'text' },
    ];
    expect(validateDiscoveryQuestions(questions)).toBe(
      'Question ID "budget question" is invalid. Use letters, numbers, hyphens, and underscores only.'
    );
  });

  it('rejects duplicate question IDs', () => {
    const questions: DiscoveryQuestion[] = [
      { id: 'budget', section: 'General', prompt: 'Prompt 1', input: 'text' },
      { id: 'budget', section: 'Details', prompt: 'Prompt 2', input: 'number' },
    ];
    expect(validateDiscoveryQuestions(questions)).toBe(
      'Duplicate question ID "budget". IDs must be unique.'
    );
  });

  it('rejects questions missing a section', () => {
    const questions: DiscoveryQuestion[] = [
      { id: 'budget', section: '  ', prompt: 'Prompt', input: 'text' },
    ];
    expect(validateDiscoveryQuestions(questions)).toBe('Question "budget" is missing a section.');
  });

  it('rejects questions missing a prompt', () => {
    const questions: DiscoveryQuestion[] = [
      { id: 'budget', section: 'General', prompt: '', input: 'text' },
    ];
    expect(validateDiscoveryQuestions(questions)).toBe('Question "budget" is missing a prompt.');
  });

  it('rejects invalid input types', () => {
    const questions: any[] = [
      { id: 'budget', section: 'General', prompt: 'Prompt', input: 'checkbox' },
    ];
    expect(validateDiscoveryQuestions(questions)).toBe(
      'Question "budget" has an invalid input type "checkbox". Must be text, textarea, or number.'
    );
  });
});

describe('validateDiscoveryQuestionRows', () => {
  it('validates rows equivalent to questions', () => {
    const rows: DiscoveryQuestionRow[] = [
      { rowKey: '1', id: 'q1', section: '', prompt: 'Prompt', input: 'text' },
    ];
    expect(validateDiscoveryQuestionRows(rows)).toBe('Question "q1" is missing a section.');
  });
});
