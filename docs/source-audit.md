# Source audit

## Uploaded materials

- `心电滤波最终版.zip`: MATLAB scripts, db3 wavelet examples and duplicate copies of MIT-BIH record 100.
- `大眼仔仔小程序 (2)_1.zip`: WeChat pages, BLE parsing, charts and Excel-export code; bundled chart/Excel libraries; an old `.git` directory.
- `结题.zip`: screenshots, proposal, presentation and a nested RAR. The RAR was inspected and extracted for the audit: reports, a commercial plan, photographs, summaries and patent paperwork, with no recovered firmware or CAD sources.

The first-party originals are preserved in `legacy/`; old Git objects, local AppID configuration, bundled third-party libraries and private administrative documents are excluded. The rebuilt app uses native canvas and CSV instead of those bundled libraries. `docs/source-manifest.json` records hashes of the copied original source and record files. MATLAB text retains its original byte encoding in `legacy/`.

## Repairs and changes

| Original issue | Reconstruction |
| --- | --- |
| Fixed D:/E: paths | Repository-relative record argument |
| Flattening both ECG channels into one signal | Analyze a selected lead independently |
| `findpeaks` uses 500 while the record is 360 Hz | Use the header's sampling rate throughout |
| Beat count labelled BPM without duration | Separate count/duration and median-RR estimates |
| `main_1h` reads 60 seconds; `1hdata` duplicates record 100 | Explicit durations; reject requests exceeding the recording |
| Local `wavedec.m` shadows MATLAB's wavelet function | Original copy renamed `wavelet_original.m`; repaired wrapper has a distinct name |
| BLE decode assumes fixed notification length | Buffered packet parser with checksum and bounds checks |
| Fixed service array offsets | Discover primary services and notify/indicate characteristics |
| Repeated listeners / unmanaged timers | Session-scoped listeners and unload cleanup |
| Unbounded raw arrays | Bounded display buffer and explicit recording limit |
| Raw chart labelled BPM | Raw counts chart; reported BPM shown separately |
| Hardcoded history examples | Actual local CSV-export history |
| Disease labels without validated classification | No diagnostic labels in the rebuilt app |

The Python pipeline and browser demo are new reconstruction work. The rebuilt WeChat app is a simpler single-page interface implementing the recovered acquisition workflow, not a pixel-identical copy. CSV replaces XLSX export to reduce dependencies and connect directly to desktop analysis. The MATLAB baseline uses explicit bandpasses rather than claiming exact numerical reproduction of the original interleaved calculation. The original optional wavelet approach is retained separately.

## Unavailable / unverified

Physical flexible electrodes, hardware electronics, firmware, ADC calibration, BLE module identity and sample rate cannot be recreated from these software archives alone. Team documents describe a cloud/medical platform but do not contain its backend. MATLAB runtime and WeChat DevTools were unavailable here; hardware acquisition and phone export remain unverified.

## Illustrated project archive

At the user's request, the repository now includes selected original hardware, mechanical, PCB, prototype, software and team-process images in `demo/assets/`. Images from related-work and competitor slides are excluded so they are not confused with the team's own designs. The original reports and administrative pages are not republished. Source locations, source hashes, image preparation and published hashes are recorded in `docs/visual-sources.json`.

Illustrated notes in `hardware/`, `pcb/`, `mechanical/` and `docs/development-process.md` extend the software reconstruction to present the whole documented project. The archives were checked for native SolidWorks, STEP/STL, PCB CAD and Gerber files; none were found.
