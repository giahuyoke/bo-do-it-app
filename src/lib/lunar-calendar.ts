const PI = Math.PI;

function integer(value: number) {
  return Math.floor(value);
}

function julianDayFromDate(day: number, month: number, year: number) {
  const a = integer((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let result =
    day +
    integer((153 * m + 2) / 5) +
    365 * y +
    integer(y / 4) -
    integer(y / 100) +
    integer(y / 400) -
    32045;

  if (result < 2299161) {
    result =
      day +
      integer((153 * m + 2) / 5) +
      365 * y +
      integer(y / 4) -
      32083;
  }
  return result;
}

function newMoon(k: number) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const radians = PI / 180;
  let result =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * t2 -
    0.000000155 * t3;
  result +=
    0.00033 *
    Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * radians);

  const meanAnomalySun =
    359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const meanAnomalyMoon =
    306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const argumentLatitude =
    21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;

  const correction =
    (0.1734 - 0.000393 * t) * Math.sin(meanAnomalySun * radians) +
    0.0021 * Math.sin(2 * meanAnomalySun * radians) -
    0.4068 * Math.sin(meanAnomalyMoon * radians) +
    0.0161 * Math.sin(2 * meanAnomalyMoon * radians) -
    0.0004 * Math.sin(3 * meanAnomalyMoon * radians) +
    0.0104 * Math.sin(2 * argumentLatitude * radians) -
    0.0051 * Math.sin((meanAnomalySun + meanAnomalyMoon) * radians) -
    0.0074 * Math.sin((meanAnomalySun - meanAnomalyMoon) * radians) +
    0.0004 * Math.sin((2 * argumentLatitude + meanAnomalySun) * radians) -
    0.0004 * Math.sin((2 * argumentLatitude - meanAnomalySun) * radians) -
    0.0006 * Math.sin((2 * argumentLatitude + meanAnomalyMoon) * radians) +
    0.001 * Math.sin((2 * argumentLatitude - meanAnomalyMoon) * radians) +
    0.0005 * Math.sin((2 * meanAnomalyMoon + meanAnomalySun) * radians);

  const deltaT =
    t < -11
      ? 0.001 +
        0.000839 * t +
        0.0002261 * t2 -
        0.00000845 * t3 -
        0.000000081 * t * t3
      : -0.000278 + 0.000265 * t + 0.000262 * t2;

  return result + correction - deltaT;
}

function sunLongitude(julianDay: number) {
  const t = (julianDay - 2451545) / 36525;
  const t2 = t * t;
  const radians = PI / 180;
  const meanAnomaly =
    357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const meanLongitude =
    280.46645 + 36000.76983 * t + 0.0003032 * t2;
  const delta =
    (1.9146 - 0.004817 * t - 0.000014 * t2) *
      Math.sin(radians * meanAnomaly) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * radians * meanAnomaly) +
    0.00029 * Math.sin(3 * radians * meanAnomaly);
  let longitude = (meanLongitude + delta) * radians;
  longitude -= PI * 2 * integer(longitude / (PI * 2));
  return longitude;
}

function newMoonDay(k: number, timezone: number) {
  return integer(newMoon(k) + 0.5 + timezone / 24);
}

function sunLongitudeSector(dayNumber: number, timezone: number) {
  return integer((sunLongitude(dayNumber - 0.5 - timezone / 24) / PI) * 6);
}

function lunarMonth11(year: number, timezone: number) {
  const offset = julianDayFromDate(31, 12, year) - 2415021;
  const k = integer(offset / 29.530588853);
  let result = newMoonDay(k, timezone);
  if (sunLongitudeSector(result, timezone) >= 9) {
    result = newMoonDay(k - 1, timezone);
  }
  return result;
}

function leapMonthOffset(month11: number, timezone: number) {
  const k = integer((month11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let index = 1;
  let arc = sunLongitudeSector(newMoonDay(k + index, timezone), timezone);
  do {
    last = arc;
    index += 1;
    arc = sunLongitudeSector(newMoonDay(k + index, timezone), timezone);
  } while (arc !== last && index < 14);
  return index - 1;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
}

export function solarToVietnameseLunar(date: Date): LunarDate {
  const dayNumber = julianDayFromDate(
    date.getDate(),
    date.getMonth() + 1,
    date.getFullYear(),
  );
  const timezone = 7;
  const k = integer((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1, timezone);
  if (monthStart > dayNumber) monthStart = newMoonDay(k, timezone);

  let month11 = lunarMonth11(date.getFullYear(), timezone);
  let nextMonth11 = month11;
  let lunarYear: number;
  if (month11 >= monthStart) {
    lunarYear = date.getFullYear();
    month11 = lunarMonth11(date.getFullYear() - 1, timezone);
  } else {
    lunarYear = date.getFullYear() + 1;
    nextMonth11 = lunarMonth11(date.getFullYear() + 1, timezone);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const difference = integer((monthStart - month11) / 29);
  let lunarMonth = difference + 11;
  let leap = false;

  if (nextMonth11 - month11 > 365) {
    const leapDifference = leapMonthOffset(month11, timezone);
    if (difference >= leapDifference) {
      lunarMonth = difference + 10;
      if (difference === leapDifference) leap = true;
    }
  }

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && difference < 4) lunarYear -= 1;

  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap };
}

export function formatLunarDate(date: Date, includeMonth = false) {
  const lunar = solarToVietnameseLunar(date);
  const monthSuffix = lunar.leap ? " nhuận" : "";
  return includeMonth || lunar.day === 1
    ? `${lunar.day}/${lunar.month}${monthSuffix} ÂL`
    : `${lunar.day} ÂL`;
}
