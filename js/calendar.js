// Reminders without a server (from we go gim): calendar events the phone's own calendar fires, even with the app
// closed. Bills repeat monthly; spending habits ("log lunch") repeat on weekdays or weekends.
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
const stamp = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const hm = time => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time ?? '')); return m ? [+m[1], +m[2]] : [9, 0]; };
const clock = mins => `${pad(Math.floor(mins / 60) % 24)}${pad(mins % 60)}00`;

/** A bill due on `day` (1–28) each month at 09:00, reminding a day before. Floating local time. */
export function billEvent(bill, now = new Date()) {
  const day = Math.min(28, Math.max(1, +bill.day || 1));
  let d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return { uid: `tally-bill-${bill.id}`, title: bill.title, details: bill.details || '', start: `${ymd(d)}T090000`, end: `${ymd(d)}T093000`, rrule: `FREQ=MONTHLY;BYMONTHDAY=${day}`, alarm: '-P1D' };
}
/** A habit ("Dining on weekdays around 12:45"): a nudge 45 minutes after the usual time, on the matching days. */
export function habitEvent(h, now = new Date()) {
  const [hh, mm] = hm(h.at);
  const at = Math.min(hh * 60 + mm + 45, 23 * 60 + 50); // never past midnight
  const days = h.days === 'weekend' ? [0, 6] : [1, 2, 3, 4, 5];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (!days.includes(d.getDay())) d.setDate(d.getDate() + 1);
  const byday = days.map(i => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][i]).join(',');
  return { uid: `tally-habit-${h.category}-${h.days}`, title: h.title, details: h.details || '', start: `${ymd(d)}T${clock(at)}`, end: `${ymd(d)}T${clock(at + 5)}`, rrule: `FREQ=WEEKLY;BYDAY=${byday}`, alarm: '-PT0M' };
}
/** iCalendar text for a list of events. */
export function ics(events, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tally//reminders//EN', 'CALSCALE:GREGORIAN'];
  for (const e of events) lines.push('BEGIN:VEVENT', `UID:${e.uid}@tally`, `DTSTAMP:${stamp(now)}`, `DTSTART:${e.start}`, `DTEND:${e.end}`, `RRULE:${e.rrule}`,
    `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.details)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${e.alarm}`, 'END:VALARM', 'END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
/** Google Calendar "add event" link (Android can't open a downloaded .ics in Google Calendar). */
export const googleUrl = e => `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${e.start}/${e.end}`, details: e.details, recur: `RRULE:${e.rrule}` })}`;
