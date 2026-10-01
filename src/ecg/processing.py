"""Offline filtering and a transparent baseline R-peak detector; not a diagnostic model."""
import numpy as np
from scipy.signal import butter, sosfiltfilt, find_peaks

def analyze(samples, fs):
    x = np.asarray(samples, dtype=float)
    if x.ndim != 1 or x.size < 2 * fs or not np.isfinite(x).all():
        raise ValueError('Provide at least two seconds of finite, single-channel samples.')
    if not np.isfinite(fs) or fs <= 80:
        raise ValueError('Sampling rate must exceed 80 Hz for the 40 Hz passband.')
    # Preserve morphology for display; use a separate QRS-focused band for detection.
    filtered = sosfiltfilt(butter(3, [0.5, 40], btype='bandpass', fs=fs, output='sos'), x)
    qrs = sosfiltfilt(butter(3, [5, 20], btype='bandpass', fs=fs, output='sos'), x)
    magnitude = np.abs(qrs)
    median = np.median(magnitude)
    mad = np.median(np.abs(magnitude - median))
    threshold = max(median + 5 * mad, np.percentile(magnitude, 99) * 0.25)
    peaks, _ = find_peaks(magnitude, height=threshold,
                         prominence=threshold * 0.5, distance=max(1, int(0.28 * fs)))
    # Refine QRS candidates on the display signal, including negative complexes.
    refined = []
    radius = max(1, round(0.06 * fs))
    for peak in peaks:
        left, right = max(0, peak-radius), min(x.size, peak+radius+1)
        refined.append(left + int(np.argmax(np.abs(filtered[left:right]))))
    peaks = np.unique(refined)
    rr = np.diff(peaks) / fs
    bpm = float(60 / np.median(rr)) if rr.size else None
    summary = {'sample_rate_hz': float(fs), 'samples': int(x.size),
               'duration_seconds': float(x.size/fs), 'detected_beats': int(peaks.size),
               'median_rr_bpm': bpm, 'count_based_bpm': float(peaks.size * 60 * fs / x.size),
               'rr_intervals_seconds': rr.tolist(),
               'method': 'offline 0.5–40 Hz bandpass; 5–20 Hz QRS candidates; median RR'}
    return filtered, peaks, summary

def evaluate(peaks, reference, fs, tolerance_seconds=0.1):
    """One-to-one time matching against beat annotations within +/- tolerance."""
    peaks, reference = np.sort(peaks), np.sort(reference)
    i = j = matches = 0
    tolerance = round(tolerance_seconds * fs)
    while i < len(peaks) and j < len(reference):
        delta = peaks[i] - reference[j]
        if abs(delta) <= tolerance:
            matches += 1; i += 1; j += 1
        elif delta < 0:
            i += 1
        else:
            j += 1
    fp, fn = len(peaks)-matches, len(reference)-matches
    precision = matches / len(peaks) if len(peaks) else 0.0
    recall = matches / len(reference) if len(reference) else 0.0
    return {'reference_beats': int(len(reference)), 'true_positives': matches,
            'false_positives': fp, 'false_negatives': fn, 'precision': precision,
            'recall': recall, 'f1': 2*precision*recall/(precision+recall) if precision+recall else 0.0,
            'tolerance_seconds': tolerance_seconds}
