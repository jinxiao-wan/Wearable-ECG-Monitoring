# Validation

Local environment: Python 3.12, NumPy 2.3.5, SciPy 1.17.0. Tests exercise separate lead decoding and calibration, annotation decoding, known synthetic heart rate and negative complexes, flat signal behaviour, invalid input handling, one-to-one matching, packet fragmentation, checksum recovery, recording limits and mocked BLE discovery/subscription/cleanup.

Local checks passed: **8 Python tests and 10 JavaScript tests**, including mini-program simulation and export behaviour under mocked WeChat APIs. JavaScript syntax and demo asset loading were checked; no installed Chromium, WeChat DevTools or MATLAB runtime was available for native UI/runtime verification.

Commands:

```bash
python -m unittest discover -s tests -v
npm test
python -m ecg.cli --seconds 60 --out outputs/minute
python -m ecg.cli --out outputs/full
```

## Real-data baseline

Both runs use **lead MLII of record 100**, the supplied annotations and a ±100 ms one-to-one matching tolerance. Readable machine results are committed in `docs/results/`. These results validate the reconstruction on this record only; no training/test split, disease classifier or multi-record benchmark is claimed.

| Window | Duration (s) | Predicted beats | Reference beats | TP | FP | FN | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| First minute | 60 | 74 | 74 | 74 | 0 | 0 | 1 | 1 | 1 |
| Complete record | 1805.5556 | 2274 | 2273 | 2273 | 1 | 0 | 0.999560 | 1 | 0.999780 |

First-minute median-RR BPM: 73.9726. Full-record median-RR BPM: 75.2613. Count-based full-record BPM: 75.5668. Beat matching counts beat annotation types and ignores non-beat markers, including the initial rhythm marker.

The display and detection filters use SciPy [sosfiltfilt](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.sosfiltfilt.html) and [find_peaks](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.find_peaks.html). Forward/backward filtering is offline. Matching tolerance and this recording's favourable signal conditions materially affect the scores.

## Pending physical validation

- Verify captured packet bytes, UART/BLE format, sample rate, ADC scale and quality semantics.
- Run the app in WeChat DevTools and on a real phone; test device permissions, disconnect/reconnect, long recordings and CSV sharing.
- Execute MATLAB with Signal Processing Toolbox; exercise the optional wavelet function with Wavelet Toolbox.
- Benchmark additional records, noisy traces and different leads before interpreting detector performance more broadly.

Original denoising code estimated SNR from raw-vs-filtered residuals without clean ground truth. We do not report this as a validated noise-removal score. No disease diagnosis is produced.
