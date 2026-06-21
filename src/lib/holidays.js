// Romanian legal public holidays (Codul Muncii art. 139), incl. movable Orthodox feasts.
// Computed locally — no external calls.

// Orthodox Easter Sunday (Gregorian date) via the Meeus Julian algorithm + 13-day offset.
function orthodoxEaster(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April (Julian)
  const day = ((d + e + 114) % 31) + 1;
  const easter = new Date(year, month - 1, day);
  easter.setDate(easter.getDate() + 13); // Julian → Gregorian (valid 1900–2099)
  return easter;
}

export function romanianHolidays(year) {
  const easter = orthodoxEaster(year);
  const plus = (base, n) => { const x = new Date(base); x.setDate(x.getDate() + n); return x; };
  return [
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: new Date(year, 0, 2), name: "New Year's Day" },
    { date: new Date(year, 0, 6), name: "Epiphany" },
    { date: new Date(year, 0, 7), name: "St. John the Baptist" },
    { date: new Date(year, 0, 24), name: "Union Day" },
    { date: plus(easter, -2), name: "Good Friday" },
    { date: new Date(easter), name: "Orthodox Easter" },
    { date: plus(easter, 1), name: "Easter Monday" },
    { date: new Date(year, 4, 1), name: "Labour Day" },
    { date: new Date(year, 5, 1), name: "Children's Day" },
    { date: plus(easter, 49), name: "Pentecost" },
    { date: plus(easter, 50), name: "Pentecost Monday" },
    { date: new Date(year, 7, 15), name: "Dormition of the Mother of God" },
    { date: new Date(year, 10, 30), name: "St. Andrew's Day" },
    { date: new Date(year, 11, 1), name: "National Day" },
    { date: new Date(year, 11, 25), name: "Christmas Day" },
    { date: new Date(year, 11, 26), name: "Christmas Day" },
  ];
}

const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

// Holidays in a month (0-based) that fall on a weekday — these reduce working days.
// Deduped by day so coinciding feasts (e.g. Children's Day + Pentecost Monday) count once.
export function workdayHolidaysInMonth(year, monthIndex) {
  const seen = new Set();
  return romanianHolidays(year)
    .filter((h) => h.date.getFullYear() === year && h.date.getMonth() === monthIndex && !isWeekend(h.date))
    .filter((h) => { const k = h.date.getDate(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.date - b.date);
}

// Working days in a month = weekdays minus weekday public holidays.
export function workingDaysInMonth(year, monthIndex) {
  const days = new Date(year, monthIndex + 1, 0).getDate();
  let weekdays = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, monthIndex, d).getDay();
    if (dow !== 0 && dow !== 6) weekdays++;
  }
  return weekdays - workdayHolidaysInMonth(year, monthIndex).length;
}
