const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

function parseLocalToUTC(localDateTimeString, tz) {
  const d = dayjs.tz(localDateTimeString, tz);
  return d.utc().toDate();
}

function utcToLocalString(utcDate, tz) {
  return dayjs.utc(utcDate).tz(tz).format();
}

module.exports = { parseLocalToUTC, utcToLocalString, dayjs };
