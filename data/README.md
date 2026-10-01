# Sample data

The three supplied folders (`100`, `1min`, `1hdata`) contain duplicate copies of record 100, not distinct one-minute and one-hour recordings. We keep one copy in `mitdb/`.

The header declares two channels (MLII and V5), 360 Hz and 650,000 samples: **1,805.56 seconds, approximately 30.09 minutes**. A one-hour analysis requires another recording; the CLI rejects durations longer than the available data.

Contains information from the **MIT-BIH Arrhythmia Database v1.0.0**, provided by PhysioNet, available under the **Open Data Commons Attribution License v1.0 (ODC-By-1.0)**.

- Source: https://physionet.org/content/mitdb/1.0.0/
- License: https://physionet.org/content/mitdb/view-license/1.0.0/
- Citation: Moody GB, Mark RG. The impact of the MIT-BIH Arrhythmia Database. IEEE Engineering in Medicine and Biology Magazine 20(3):45–50, 2001. DOI: 10.1109/51.932724.
- PhysioNet citation: Goldberger AL et al. PhysioBank, PhysioToolkit, and PhysioNet: Components of a new research resource for complex physiologic signals. Circulation 101(23):e215–e220, 2000. DOI: 10.1161/01.CIR.101.23.e215.

`100.hea`, `100.dat` and `100.atr` are copied unchanged from the uploaded archive. `demo/sample.json` and `demo/sample-signal.csv` are derived first-minute extracts, with filtered values and detected peaks added by this reconstruction. Source hashes are listed in `docs/source-manifest.json`. The record has not been independently downloaded and compared byte-for-byte with PhysioNet.
