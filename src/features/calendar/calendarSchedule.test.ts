import { describe, expect, it } from 'vitest';

import {
  formatDateInput,
  formatTimeInput,
  getDefaultStartAt,
  parseSchedule,
} from './calendarSchedule';

describe('calendar schedule helpers', () => {
  it('defaults to 7 PM today before evening', () => {
    const defaultStartAt = getDefaultStartAt(new Date(2026, 4, 31, 12, 42));

    expect(formatDateInput(defaultStartAt)).toBe('2026-05-31');
    expect(formatTimeInput(defaultStartAt)).toBe('19:00');
  });

  it('defaults to 7 PM tomorrow after evening starts', () => {
    const defaultStartAt = getDefaultStartAt(new Date(2026, 4, 31, 19, 5));

    expect(formatDateInput(defaultStartAt)).toBe('2026-06-01');
    expect(formatTimeInput(defaultStartAt)).toBe('19:00');
  });

  it('parses a valid future schedule', () => {
    const result = parseSchedule({
      dateValue: '2026-06-02',
      durationValue: '90',
      now: new Date(2026, 4, 31, 12, 0),
      timeValue: '19:30',
      titleValue: '  Date Night  ',
    });

    expect(result.error).toBeUndefined();
    expect(result.schedule).toEqual({
      durationMinutes: 90,
      startAt: new Date(2026, 5, 2, 19, 30),
      title: 'Date Night',
    });
  });

  it('rejects invalid calendar dates and times', () => {
    const invalidDate = parseSchedule({
      dateValue: '2026-02-31',
      durationValue: '90',
      now: new Date(2026, 0, 1),
      timeValue: '19:00',
      titleValue: 'Date Night',
    });
    const invalidTime = parseSchedule({
      dateValue: '2026-06-02',
      durationValue: '90',
      now: new Date(2026, 0, 1),
      timeValue: '24:00',
      titleValue: 'Date Night',
    });

    expect(invalidDate.error).toBe('Choose a valid date and time.');
    expect(invalidTime.error).toBe('Choose a valid date and time.');
  });

  it('rejects dates that are not in the future', () => {
    const result = parseSchedule({
      dateValue: '2026-05-31',
      durationValue: '90',
      now: new Date(2026, 4, 31, 20, 0),
      timeValue: '19:00',
      titleValue: 'Date Night',
    });

    expect(result.error).toBe('Choose a future date and time.');
  });
});
