"""Streaming packet parser reconstructed from the supplied WeChat decoder."""
class PacketParser:
    def __init__(self):
        self.buffer = bytearray()
        self.valid_packets = 0
        self.bad_checksums = 0
        self.malformed_payloads = 0

    def feed(self, chunk):
        self.buffer.extend(chunk)
        events = []
        while len(self.buffer) >= 3:
            if self.buffer[:2] != b'\xaa\xaa':
                del self.buffer[0]
                continue
            length = self.buffer[2]
            if length > 169:
                del self.buffer[0]
                continue
            total = length + 4
            if len(self.buffer) < total:
                break
            payload = self.buffer[3:3+length]
            if ((~sum(payload)) & 255) != self.buffer[3+length]:
                self.bad_checksums += 1
                del self.buffer[0]
                continue
            del self.buffer[:total]
            decoded = self._decode(payload)
            if decoded is None:
                self.malformed_payloads += 1
            else:
                self.valid_packets += 1
                events.extend(decoded)
        return events

    @staticmethod
    def _decode(payload):
        events = []
        i = 0
        while i < len(payload):
            extended = 0
            while i < len(payload) and payload[i] == 0x55:
                extended += 1; i += 1
            if i >= len(payload):
                return None
            code = payload[i]; i += 1
            length = 1
            if code >= 0x80:
                if i >= len(payload):
                    return None
                length = payload[i]; i += 1
            if i+length > len(payload):
                return None
            value = payload[i:i+length]; i += length
            if extended:
                continue
            if code == 0x80 and length == 2:
                events.append({'type': 'raw', 'value': int.from_bytes(value, 'big', signed=True)})
            elif code in (2, 3) and length == 1:
                events.append({'type': 'quality' if code == 2 else 'heart_rate', 'value': value[0]})
        return events
