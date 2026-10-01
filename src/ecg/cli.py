import argparse
import csv
import json
from pathlib import Path
import numpy as np
from .io import read_record, read_annotations, read_csv
from .processing import analyze, evaluate

def main():
    parser = argparse.ArgumentParser(description='Offline ECG analysis; no hardware needed for record 100.')
    source = parser.add_mutually_exclusive_group()
    source.add_argument('--record', type=Path, default=None, help='WFDB record path without extension')
    source.add_argument('--csv', type=Path, help='WeChat CSV export with raw column')
    parser.add_argument('--sample-rate', type=float, help='Required for CSV; must match device configuration')
    parser.add_argument('--channel', type=int, default=0)
    parser.add_argument('--seconds', type=float, help='Omit to analyze the complete recording')
    parser.add_argument('--out', type=Path, default=Path('outputs/demo'))
    args = parser.parse_args()
    if args.csv:
        if args.sample_rate is None:
            parser.error('--sample-rate is required for raw CSV data')
        samples, fs, name, units = read_csv(args.csv), args.sample_rate, 'sensor raw', 'ADC counts'
        reference = None
    else:
        record = args.record or Path('data/mitdb/100')
        values, fs, names = read_record(record)
        if not 0 <= args.channel < values.shape[1]:
            parser.error('--channel is out of range')
        samples, name, units = values[:, args.channel], names[args.channel], 'mV'
        annotation_file = record.with_suffix('.atr')
        reference = read_annotations(annotation_file) if annotation_file.exists() else None
    if args.seconds is not None:
        if not np.isfinite(args.seconds) or args.seconds <= 0 or args.seconds > len(samples)/fs:
            parser.error('--seconds must be positive and no longer than the supplied recording')
        samples = samples[:round(args.seconds * fs)]
    filtered, peaks, summary = analyze(samples, fs)
    summary.update({'channel': name, 'units': units, 'source': str(args.csv or args.record or 'data/mitdb/100')})
    if reference is not None:
        reference = reference[reference < len(samples)]
        summary['annotation_evaluation'] = evaluate(peaks, reference, fs)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    peak_set = set(peaks.tolist())
    with (args.out/'signal.csv').open('w', newline='') as f:
        writer = csv.writer(f); writer.writerow(['time_seconds', 'raw', 'filtered', 'r_peak'])
        writer.writerows((i/fs, float(raw), float(clean), int(i in peak_set)) for i, (raw, clean) in enumerate(zip(samples, filtered)))
    # Small, self-contained browser artifact using actual data, not a screenshot.
    count = min(len(samples), round(10*fs))
    preview = {'fs': fs, 'raw': np.round(samples[:count], 5).tolist(),
               'filtered': np.round(filtered[:count], 5).tolist(), 'peaks': peaks[peaks<count].tolist(),
               'summary': summary}
    (args.out/'preview.json').write_text(json.dumps(preview))
    print(json.dumps({k: v for k, v in summary.items() if k != 'rr_intervals_seconds'}, indent=2))

if __name__ == '__main__':
    main()
