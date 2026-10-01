# WeChat setup

1. Install WeChat DevTools and import the repository's `wechat/` directory.
2. Use a supported test AppID or your own AppID. `touristappid` in the checked-in project is only a development placeholder. Real-device preview and BLE permissions depend on your account and WeChat version.
3. Start **simulation** first. Set the rate before starting, click **Start new recording**, stop, then **Save / share CSV**. Synthetic exports include `source=simulation`.
4. For hardware, stop simulation, turn on Bluetooth, allow the permissions requested on your phone, and scan. Select your ECG device.
5. Select its ECG notify/indicate characteristic from the discovered list. Do not choose an arbitrary service by array index. Once confirmed, put its UUID and optional service UUID in `config.js`.
6. If your module requires the legacy start command, press **Send configured start command**. The uploaded code writes `0x04` to `0000FF93-0000-1000-8000-00805F9B34FB`; this is preserved as a configurable assumption, not automatically sent.
7. Enter the **actual raw sample rate** before recording. The default 512 Hz needs verification. No sample sequence counter is present in the reconstructed packet format: timestamps are sample-derived and cannot reveal dropped BLE samples.
8. Watch the packet and checksum counts. If no samples arrive, check your chosen UUID, module protocol, permissions and start command. Do not bypass checksum validation to make a plot appear.
9. Record, stop and save/share CSV. The latest ten exports appear in local history; exporting more removes the oldest managed file. Recording stops at 307,200 samples (10 minutes at 512 Hz; duration differs at other rates).
10. Copy an export to your computer and run the Python CSV command in the README.

The displayed quality field is the **raw quality code**, with no clinical label inferred. Sensor-reported heart rate may be unavailable or unreliable. There is no raw-to-mV conversion until ADC calibration is supplied.

## Packet assumptions

```
AA AA | payload length | payload bytes | checksum
checksum = (~sum(payload bytes)) & 0xFF
```

Maximum payload length: 169. `0x55` prefixes extended codes. Codes below `0x80` carry one byte; higher codes carry an explicit value length. Recovered mappings: `0x80` / two bytes = signed big-endian raw sample; `0x03` = reported heart rate; `0x02` = quality code. This contract comes from the original decoder and is covered by software tests; a recorded hardware byte stream is still needed for confirmation.

API references: [WeChat BLE notification](https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth-ble/wx.notifyBLECharacteristicValueChange.html), [WeChat characteristic value event](https://developers.weixin.qq.com/miniprogram/dev/api/device/bluetooth-ble/wx.onBLECharacteristicValueChange.html).
