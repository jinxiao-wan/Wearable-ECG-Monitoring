import tempfile
import unittest
from pathlib import Path
import numpy as np
from ecg.io import read_record, read_annotations
from ecg.processing import analyze, evaluate
from ecg.protocol import PacketParser
ROOT = Path(__file__).resolve().parents[1]

def packet(payload):
    return bytes([170,170,len(payload),*payload,(~sum(payload))&255])

class ECGTests(unittest.TestCase):
    def test_record_header_calibration_and_separate_channels(self):
        x, fs, names = read_record(ROOT/'data/mitdb/100')
        self.assertEqual(x.shape,(650000,2)); self.assertEqual(fs,360)
        self.assertEqual(names,['MLII','V5']); np.testing.assert_allclose(x[0],[-0.145,-0.065])
        self.assertFalse(np.array_equal(x[:,0],x[:,1]))

    def test_annotations_have_known_first_beat(self):
        ann = read_annotations(ROOT/'data/mitdb/100.atr')
        self.assertEqual(ann[0],77); self.assertEqual(len(ann),2273)
        self.assertTrue(np.all(np.diff(ann)>0))

    def test_synthetic_rate_and_baseline_suppression(self):
        fs=360; t=np.arange(20*fs)/fs; centers=np.arange(0.5,20,60/72)
        x=0.3*np.sin(2*np.pi*0.2*t)
        for c in centers: x+=np.exp(-((t-c)/0.015)**2)
        filtered, peaks, result=analyze(x,fs)
        self.assertAlmostEqual(result['median_rr_bpm'],72,delta=1)
        metrics=evaluate(peaks,np.round(centers*fs).astype(int),fs)
        self.assertGreater(metrics['f1'],0.95)
        self.assertLess(np.std(filtered-x),0.3)
        _,neg_peaks,neg=analyze(-x,fs); self.assertAlmostEqual(neg['median_rr_bpm'],72,delta=1)
        np.testing.assert_array_equal(peaks,neg_peaks)

    def test_flat_trace_no_invented_heart_rate(self):
        _,peaks,result=analyze(np.zeros(3600),360)
        self.assertEqual(len(peaks),0); self.assertIsNone(result['median_rr_bpm'])

    def test_invalid_inputs(self):
        for x,fs in [(np.ones(10),360),(np.array([np.nan]*1000),360),(np.ones((1000,2)),360),(np.ones(1000),50)]:
            with self.assertRaises(ValueError): analyze(x,fs)

    def test_one_to_one_evaluation(self):
        m=evaluate(np.array([100,101,300]),np.array([100,200]),360)
        self.assertEqual((m['true_positives'],m['false_positives'],m['false_negatives']),(1,2,1))

    def test_parser_all_boundaries_and_checksum_recovery(self):
        p=packet([128,2,255,156,3,72,2,0])
        expected=[{'type':'raw','value':-100},{'type':'heart_rate','value':72},{'type':'quality','value':0}]
        for split in range(len(p)+1):
            parser=PacketParser(); self.assertEqual(parser.feed(p[:split])+parser.feed(p[split:]),expected)
        parser=PacketParser(); bad=p[:-1]+bytes([p[-1]^1])
        self.assertEqual(parser.feed(b'\x00'+bad+p),expected); self.assertEqual(parser.bad_checksums,1)

    def test_skip_and_aux_annotations(self):
        def word(code, value): return ((code<<10)|value).to_bytes(2,'little')
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'test.atr'
            p.write_bytes(word(59,0)+b'\x00\x00\xe8\x03'+word(1,2)+word(63,3)+b'abc\0'+word(1,10)+b'\0\0')
            np.testing.assert_array_equal(read_annotations(p),[1002,1012])

if __name__=='__main__': unittest.main()
