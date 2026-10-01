// Streaming decoder. A BLE notification can split or concatenate packets.
class PacketParser {
  constructor() { this.buffer = []; this.validPackets = 0; this.badChecksums = 0; this.malformedPayloads = 0; }
  feed(chunk) {
    const bytes = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk;
    for (const byte of bytes) this.buffer.push(byte);
    const events = [];
    while (this.buffer.length >= 3) {
      if (this.buffer[0] !== 0xaa || this.buffer[1] !== 0xaa || this.buffer[2] > 169) { this.buffer.shift(); continue; }
      const length = this.buffer[2], total = length + 4;
      if (this.buffer.length < total) break;
      const payload = this.buffer.slice(3, 3 + length);
      const checksum = (~payload.reduce((a, b) => a + b, 0)) & 255;
      if (checksum !== this.buffer[3 + length]) { this.badChecksums++; this.buffer.shift(); continue; }
      this.buffer.splice(0, total);
      const decoded = this.decode(payload);
      if (decoded === null) this.malformedPayloads++;
      else { this.validPackets++; events.push(...decoded); }
    }
    return events;
  }
  decode(payload) {
    const events = []; let i = 0;
    while (i < payload.length) {
      let extended = 0;
      while (i < payload.length && payload[i] === 0x55) { extended++; i++; }
      if (i >= payload.length) return null;
      const code = payload[i++]; let length = 1;
      if (code >= 0x80) { if (i >= payload.length) return null; length = payload[i++]; }
      if (i + length > payload.length) return null;
      const values = payload.slice(i, i + length); i += length;
      if (extended) continue;
      if (code === 0x80 && length === 2) {
        let value = (values[0] << 8) | values[1]; if (value >= 32768) value -= 65536;
        events.push({ type: 'raw', value });
      } else if ((code === 2 || code === 3) && length === 1) {
        events.push({ type: code === 2 ? 'quality' : 'heart_rate', value: values[0] });
      }
    }
    return events;
  }
}
module.exports = { PacketParser };
