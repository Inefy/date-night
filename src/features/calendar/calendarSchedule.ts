import type { CalendarScheduleInput } from './calendarService';

type ParseScheduleInput = {
  dateValue: string;
  durationValue: string;
  now?: Date;
  timeValue: string;
  titleValue: string;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function getDefaultStartAt(now = new Date()) {
  const startAt = new Date(now);

  startAt.setSeconds(0, 0);
  startAt.setMinutes(0);

  if (now.getHours() < 18) {
    startAt.setHours(19);
  } else {
    startAt.setDate(startAt.getDate() + 1);
    startAt.setHours(19);
  }

  return startAt;
}

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatTimeInput(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseSchedule({
  dateValue,
  durationValue,
  now = new Date(),
  timeValue,
  titleValue,
}: ParseScheduleInput): { error?: string; schedule?: CalendarScheduleInput } {
  const title = titleValue.trim();
  const dateMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeValue.trim().match(/^(\d{1,2}):(\d{2})$/);
  const durationMinutes = Number(durationValue);

  if (!title) {
    return { error: 'Add a calendar title.' };
  }

  if (!dateMatch) {
    return { error: 'Use date format YYYY-MM-DD.' };
  }

  if (!timeMatch) {
    return { error: 'Use time format HH:MM.' };
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 720) {
    return { error: 'Duration must be between 15 and 720 minutes.' };
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const startAt = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    startAt.getFullYear() !== year ||
    startAt.getMonth() !== month - 1 ||
    startAt.getDate() !== day ||
    startAt.getHours() !== hour ||
    startAt.getMinutes() !== minute
  ) {
    return { error: 'Choose a valid date and time.' };
  }

  if (startAt.getTime() <= now.getTime()) {
    return { error: 'Choose a future date and time.' };
  }

  return {
    schedule: {
      durationMinutes,
      startAt,
      title,
    },
  };
}
