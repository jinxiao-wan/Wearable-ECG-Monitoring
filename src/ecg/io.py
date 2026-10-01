"""Minimal readers for the two-channel WFDB 212 files supplied with the project."""
from pathlib import Path
import csv
import numpy as np

BEAT_CODES = set(range(1, 14)) | {16, 25, 30, 34, 35, 38, 41}

def read_record(record):
    record = Path(record)
    lines = record.with_suffix('.hea').read_text().splitlines()
    title = lines[0].split()
    if len(title) < 4 or int(title[1]) != 2:
        raise ValueError('This reader supports two-channel format 212 records only.')
    fs, expected = float(title[2].split('/')[0]), int(title[3])
    channels = [line.split() for line in lines[1:3]]
    if any(c[1] != '212' for c in channels) or channels[0][0] != channels[1][0]:
        raise ValueError('Expected two channels stored together in format 212.')
    if not np.isfinite(fs) or fs <= 0:
        raise ValueError('Invalid sampling frequency.')
    raw = np.fromfile(record.parent / channels[0][0], dtype=np.uint8)
    if raw.size != expected * 3:
        raise ValueError('Data length does not match the header.')
    b = raw.reshape(-1, 3).astype(np.int32)
    digital = np.column_stack((b[:, 0] + ((b[:, 1] & 15) << 8),
                              b[:, 2] + ((b[:, 1] >> 4) << 8)))
    digital[digital >= 2048] -= 4096
    values = np.empty(digital.shape, dtype=float)
    names = []
    for i, c in enumerate(channels):
        gain_spec = c[2].split('/')[0]
        gain = float(gain_spec.split('(')[0])
        baseline = float(gain_spec.split('(')[1].rstrip(')')) if '(' in gain_spec else float(c[4])
        if gain <= 0 or not np.isfinite(gain):
            raise ValueError('Invalid ADC gain.')
        if digital[0, i] != int(c[5]):
            raise ValueError('First ADC sample does not match the header.')
        values[:, i] = (digital[:, i] - baseline) / gain
        names.append(c[-1])
    return values, fs, names

def read_annotations(path):
    """Decode WFDB annotation words, including SKIP and auxiliary text records."""
    data = Path(path).read_bytes()
    index = time = 0
    result = []
    while index + 1 < len(data):
        word = int.from_bytes(data[index:index+2], 'little')
        index += 2
        if word == 0:
            break
        code, interval = word >> 10, word & 1023
        if code == 59:
            if index + 4 > len(data):
                raise ValueError('Truncated SKIP annotation.')
            # WFDB stores the high 16-bit word first, each word little endian.
            delta = (int.from_bytes(data[index:index+2], 'little') << 16) | int.from_bytes(data[index+2:index+4], 'little')
            if delta >= 2**31:
                delta -= 2**32
            time += delta
            index += 4
        elif code == 63:
            index += interval + (interval % 2)
            if index > len(data):
                raise ValueError('Truncated auxiliary annotation.')
        elif code not in (60, 61, 62):
            time += interval
            if code in BEAT_CODES:
                result.append(time)
    return np.asarray(result, dtype=int)

def read_csv(path, column='raw'):
    with Path(path).open(newline='', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    if not rows or column not in rows[0]:
        raise ValueError(f'CSV must contain a {column!r} column and samples.')
    return np.asarray([float(row[column]) for row in rows], dtype=float)
