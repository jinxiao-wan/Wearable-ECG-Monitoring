class Recording {
  constructor(fs, limit, source) {
    if (!Number.isFinite(fs) || fs <= 80) throw new Error('Enter a sampling rate above 80 Hz');
    this.fs = fs; this.limit = limit; this.source = source; this.samples = []; this.started = new Date().toISOString();
  }
  append(value) {
    if (this.samples.length >= this.limit) return false;
    this.samples.push(value); return true;
  }
  csv() {
    const rows = ['sample_index,time_seconds,raw,sample_rate_hz,source'];
    this.samples.forEach((value, i) => rows.push([i, (i/this.fs).toFixed(6), value, this.fs, this.source].join(',')));
    return rows.join('\n') + '\n';
  }
}
module.exports = { Recording };
