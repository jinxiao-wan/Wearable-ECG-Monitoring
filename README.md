# Wearable ECG Monitoring

A reconstruction of a 2022–2023 student wearable ECG project: Bluetooth acquisition in a WeChat mini program, offline signal processing, R-peak detection and heart-rate estimation.

The uploaded project describes a BMD101 ECG chip, a BLE module and flexible electrodes. This repository restores the software and provides a reproducible demo using the supplied MIT-BIH recording. Sensor firmware, PCB CAD files and the original cloud backend were not present in the supplied materials.

## Open the webpage online

The GitHub Pages deployment publishes `demo/` at:

**https://jinxiao-wan.github.io/Wearable-ECG-Monitoring/**

One-time activation: in repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. Then open **Actions → Publish ECG webpage → Run workflow**, keeping branch `main`. The website becomes available after the deployment succeeds. Future changes to `demo/` publish automatically. No local commands, Python installation or sensor are needed to view the webpage.

## Run the demo locally (optional)

```bash
git clone https://github.com/jinxiao-wan/Wearable-ECG-Monitoring.git
cd Wearable-ECG-Monitoring
python -m http.server 8000 --directory demo
```

Open **http://localhost:8000**. No Python packages or sensor are required for the included browser demo. It shows actual public ECG data, filtered samples and detected R peaks. The WeChat app also has a separate **synthetic simulation mode**.

## Run the analysis

Python 3.10 or newer:

```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / WSL / macOS:
# source .venv/bin/activate
python -m pip install -e .
python -m ecg.cli --seconds 60 --out outputs/minute
python -m ecg.cli --out outputs/full
```

Outputs: `summary.json`, `signal.csv` and `preview.json`. The default is lead MLII; `--channel 1` selects V5. `--record path/to/100` selects another compatible two-channel format-212 record. Each lead is processed separately.

A sensor export can use the same pipeline, with its actual sampling rate:

```bash
python -m ecg.cli --csv path/to/ecg-export.csv --sample-rate 512 --out outputs/sensor
```

**512 Hz is a configurable example, not a verified hardware specification.** Sensor exports remain in raw ADC counts until calibration is known. Dataset samples are in mV. Verify the device rate and packet protocol before interpreting timing or amplitude.

## What is included

| Folder | Purpose |
| --- | --- |
| `wechat/` | Rebuilt app: BLE discovery, characteristic selection, checksummed streaming decoding, live raw chart, simulation, bounded recording, CSV export and local history |
| `src/ecg/` | Python reader, offline filters, R-peak detector, annotation evaluation and packet parser |
| `matlab/` | Repaired channel-based analysis and optional original-style wavelet denoising |
| `demo/` | Static browser explorer of the first ten seconds, with minute-level measurements |
| `data/mitdb/` | One deduplicated copy of supplied record 100 |
| `legacy/` | Original first-party source for comparison; not the runnable app |
| `tests/` | Signal, annotation, parser, recording and mocked BLE tests |
| `docs/` | Setup, architecture, source audit, limitations and measured results |

## WeChat and MATLAB

Import **`wechat/`** in WeChat DevTools. Start with simulation, then follow [WeChat setup](docs/wechat-setup.md) for your real sensor. BLE hardware requires a supported real phone and the correct app configuration; it has not been tested here.

From the repository root in MATLAB:

```matlab
addpath('matlab');
result = analyze_ecg('data/mitdb/100', 60, 1);
```

This requires Signal Processing Toolbox. `wavelet_denoise` additionally requires Wavelet Toolbox. The repaired MATLAB files have not been executed in this environment.

## Measured baseline results

MLII only, one-to-one matching within ±100 ms against the supplied beat annotations:

| Window | Detected / annotated beats | False positives | False negatives | F1 |
| --- | ---: | ---: | ---: | ---: |
| First minute | 74 / 74 | 0 | 0 | 1.00000 |
| Complete record, 1,805.56 s | 2,274 / 2,273 | 1 | 0 | 0.99978 |

These are results on **one supplied record**, not clinical validation or performance on the whole MIT-BIH database. The detector is a simple fixed-threshold baseline, not a disease classifier. The original `1hdata` folder contains the same approximately 30-minute recording, so no one-hour result is claimed. See [validation](docs/validation.md).

## Checks

```bash
python -m unittest discover -s tests -v
npm test
```

Node.js 18 or newer is sufficient for the JavaScript tests; no npm dependencies are required. GitHub Actions repeats the checks and a first-minute analysis.

## Provenance and project credit

The original project was a team effort. Uploaded materials identify 万金筱 among the mini-program contributors; this reconstruction is maintained in Jinxiao Wan's repository. Original collaborators retain credit for their work. [Source audit](docs/source-audit.md) distinguishes recovered code, repaired components and unavailable parts.

Public database attribution and its separate license are in [data/README.md](data/README.md). No blanket license is assigned to original team code. Reports, personal contact details, project-member photos and patent documents are not copied into this public repository. This is a research and learning prototype, not a medical device or diagnostic service.
