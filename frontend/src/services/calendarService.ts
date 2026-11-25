/**
 * STAGE Platform — Calendar Integration Service
 * 
 * Supports RFC 5545 iCalendar generation, Google Calendar, Microsoft Outlook,
 * Apple Calendar deep-links, and local reminder alarms.
 */

export interface CalendarEventPayload {
  id: string;
  title: string;
  description: string;
  venueName: string;
  city: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "7:30 PM" or "19:30"
  bookingCode?: string;
  reminderAdvanceHours?: number;
}

function parseDateTimeToUTC(dateStr: string, timeStr?: string): { startUtc: string; endUtc: string } {
  // Assume default 19:30 IST (14:00 UTC) if time parsing is ambiguous
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10) || 2026;
  const month = parseInt(parts[1], 10) || 11;
  const day = parseInt(parts[2], 10) || 28;

  let hour = 19;
  let min = 30;

  if (timeStr) {
    const isPm = /pm/i.test(timeStr);
    const isAm = /am/i.test(timeStr);
    const digits = timeStr.replace(/[^0-9:]/g, "").split(":");
    if (digits.length >= 1) {
      let h = parseInt(digits[0], 10);
      if (isPm && h < 12) h += 12;
      if (isAm && h === 12) h = 0;
      hour = h;
    }
    if (digits.length >= 2) {
      min = parseInt(digits[1], 10) || 0;
    }
  }

  // Convert IST (UTC+5:30) to UTC
  const istDate = new Date(Date.UTC(year, month - 1, day, hour - 5, min - 30));
  const endDate = new Date(istDate.getTime() + 2 * 60 * 60 * 1000); // 2-hour duration

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return {
    startUtc: fmt(istDate),
    endUtc: fmt(endDate),
  };
}

export function generateGoogleCalendarUrl(event: CalendarEventPayload): string {
  const { startUtc, endUtc } = parseDateTimeToUTC(event.date, event.time);
  const location = `${event.venueName}, ${event.city}`;
  const details = `${event.description}\n\nBooking Reference: ${event.bookingCode || "N/A"}\nPlatform: STAGE Live Cultural Platform`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `STAGE: ${event.title}`,
    dates: `${startUtc}/${endUtc}`,
    details,
    location,
    trp: "true",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookCalendarUrl(event: CalendarEventPayload): string {
  const { startUtc, endUtc } = parseDateTimeToUTC(event.date, event.time);
  const location = `${event.venueName}, ${event.city}`;
  const details = `${event.description}\n\nBooking Reference: ${event.bookingCode || "N/A"}\nPlatform: STAGE Live`;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: `STAGE: ${event.title}`,
    startdt: startUtc,
    enddt: endUtc,
    body: details,
    location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function generateIcsContent(event: CalendarEventPayload): string {
  const { startUtc, endUtc } = parseDateTimeToUTC(event.date, event.time);
  const nowUtc = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const uid = event.bookingCode
    ? `stage-pass-${event.bookingCode}@stage.live`
    : `stage-event-${event.id}@stage.live`;
  const location = `${event.venueName}, ${event.city}`;
  const advHours = event.reminderAdvanceHours || 24;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//STAGE Platform//Cultural Events Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:STAGE Live",
    "X-WR-TIMEZONE:Asia/Kolkata",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:STAGE: ${event.title}`,
    `DESCRIPTION:${event.description}\\nBooking Reference: ${event.bookingCode || "N/A"}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    `TRIGGER:-PT${advHours}H`,
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${event.title} is starting in ${advHours} hours`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}

export function downloadIcsFile(event: CalendarEventPayload): void {
  const icsData = generateIcsContent(event);
  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `stage-${event.bookingCode || event.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

