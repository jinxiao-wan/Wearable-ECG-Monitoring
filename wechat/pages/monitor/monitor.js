const config = require('../../config');
const { BleSession } = require('../../lib/ble');
const { Recording } = require('../../lib/recording');
Page({
  data: {status: 'Ready', devices: [], characteristics: [], connected: false, demo: false,
    recording: false, sampleRate: config.sampleRateHz, sampleCount: 0, bpm: '--', quality: '--',
    history: [], packetCount: 0, badChecksums: 0},
  onLoad() {
    this.alive = true; this.plot = []; this.history = wx.getStorageSync('ecg-history') || [];
    this.setData({history: this.history});
    this.session = new BleSession(wx, config, events => this.accept(events), status => {
      if (this.alive) {
        this.setData({status, connected: !!this.session.deviceId});
        if (!this.session.deviceId && this.data.recording && !this.data.demo) this.stopRecording();
      }
    });
    this.onFound = event => {
      if (!this.alive) return;
      const devices = this.data.devices.slice();
      event.devices.forEach(device => {
        const index = devices.findIndex(d => d.deviceId === device.deviceId);
        if (index < 0) devices.push(device); else devices[index] = device;
      });
      this.setData({devices});
    };
    wx.onBluetoothDeviceFound(this.onFound);
    this.drawTimer = setInterval(() => { if (this.alive) this.draw(); }, 100);
  },
  error(error) { if (this.alive) wx.showModal({title: 'ECG', content: error.errMsg || error.message || String(error), showCancel: false}); },
  async scan() {
    try {
      await this.session.call('openBluetoothAdapter');
      await this.session.call('startBluetoothDevicesDiscovery', {allowDuplicatesKey: false});
      this.setData({status: 'Scanning nearby BLE devices'});
    } catch (error) { this.error(error); }
  },
  async stopScan() { try { await this.session.call('stopBluetoothDevicesDiscovery'); } catch (_) {} },
  async connect(event) {
    this.stopDemo(); this.stopRecording(); this.plot = [];
    try {
      await this.stopScan();
      const characteristics = await this.session.connect(event.currentTarget.dataset.id);
      if (!this.alive) { await this.session.destroy(); return; }
      this.setData({connected: true, characteristics, bpm: '--', quality: '--'});
      const chosen = config.notifyUuid && characteristics.find(c => c.uuid.toUpperCase() === config.notifyUuid.toUpperCase());
      if (chosen) await this.session.subscribe(chosen);
    } catch (error) { if (this.alive) this.setData({connected: false, characteristics: []}); this.error(error); }
  },
  async subscribe(event) {
    this.stopRecording(); this.plot = [];
    try { await this.session.subscribe(this.data.characteristics[Number(event.currentTarget.dataset.index)]); }
    catch (error) { this.error(error); }
  },
  async sendStart() { try { await this.session.sendStart(); } catch (error) { this.error(error); } },
  async disconnect() {
    this.stopDemo(); this.stopRecording(); await this.session.disconnect();
    if (this.alive) this.setData({connected: false, characteristics: [], status: 'Disconnected', bpm: '--', quality: '--'});
  },
  changeRate(event) { this.setData({sampleRate: event.detail.value}); },
  startRecording() {
    if (!this.data.demo && !this.session.selected) return this.error(new Error('Select a notification characteristic or start simulation'));
    try {
      this.record = new Recording(Number(this.data.sampleRate), config.maxSamples, this.data.demo ? 'simulation' : 'hardware');
      this.setData({recording: true, sampleCount: 0});
    } catch (error) { this.error(error); }
  },
  stopRecording() { if (this.alive) this.setData({recording: false}); },
  accept(events) {
    if (!this.alive) return;
    const update = {};
    events.forEach(event => {
      if (event.type === 'raw') {
        this.plot.push(event.value);
        if (this.data.recording && this.record && !this.record.append(event.value)) {
          this.stopRecording(); update.status = 'Recording limit reached: export this session';
        }
      } else if (event.type === 'heart_rate') update.bpm = event.value;
      else if (event.type === 'quality') update.quality = event.value;
    });
    if (this.plot.length > config.plotSamples) this.plot.splice(0, this.plot.length-config.plotSamples);
    if (this.record) update.sampleCount = this.record.samples.length;
    update.packetCount = this.session.parser.validPackets; update.badChecksums = this.session.parser.badChecksums;
    this.setData(update);
  },
  async startDemo() {
    await this.disconnect();
    const fs = Number(this.data.sampleRate);
    if (!Number.isFinite(fs) || fs <= 80 || fs > 4096) return this.error(new Error('Simulation rate must be 81–4096 Hz'));
    this.plot = []; let index = 0;
    this.setData({demo: true, bpm: 72, quality: 'simulated', status: 'SIMULATION: synthetic waveform, no sensor'});
    this.demoTimer = setInterval(() => {
      const events = [];
      for (let i = 0; i < Math.round(fs/10); i++, index++) {
        const t = index/fs, phase = (t % (60/72)) - 0.25;
        const value = Math.round(900*Math.exp(-phase*phase/0.0005) + 45*Math.sin(2*Math.PI*t*0.3));
        events.push({type: 'raw', value});
      }
      this.accept(events);
    }, 100);
  },
  stopDemo() { clearInterval(this.demoTimer); this.demoTimer = null; if (this.alive) this.setData({demo: false}); },
  draw() {
    if (!this.plot.length) return;
    const ctx = wx.createCanvasContext('ecg', this);
    const width = this.canvasWidth || 300, height = 220;
    ctx.clearRect(0, 0, width, height); ctx.setStrokeStyle('#dce9e9'); ctx.setLineWidth(1);
    for (let y = 20; y < height; y += 20) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
    ctx.stroke(); const min = Math.min(...this.plot), max = Math.max(...this.plot), span = Math.max(1, max-min);
    ctx.beginPath(); ctx.setStrokeStyle('#16836a'); ctx.setLineWidth(1.5);
    this.plot.forEach((value, i) => { const x = i*width/Math.max(1,this.plot.length-1), y = height-15-(value-min)*(height-30)/span;
      if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y); });
    ctx.stroke(); ctx.draw();
  },
  onReady() { wx.createSelectorQuery().in(this).select('#ecg').boundingClientRect(rect => { if (rect) this.canvasWidth = rect.width; }).exec(); },
  exportCsv() {
    if (!this.record || !this.record.samples.length) return this.error(new Error('Record some samples first'));
    this.stopRecording();
    const filePath = `${wx.env.USER_DATA_PATH}/ecg-${Date.now()}.csv`;
    try {
      wx.getFileSystemManager().writeFileSync(filePath, this.record.csv(), 'utf8');
      this.history.unshift({filePath, started: this.record.started, source: this.record.source,
        samples: this.record.samples.length, sampleRate: this.record.fs});
      if (this.history.length > 10) {
        const old = this.history.pop();
        try { wx.getFileSystemManager().unlinkSync(old.filePath); } catch (_) {}
      }
      wx.setStorageSync('ecg-history', this.history); this.setData({history: this.history, status: 'CSV saved locally'});
      if (wx.shareFileMessage) wx.shareFileMessage({filePath, fail: error => this.error(error)});
      else wx.showModal({title: 'CSV saved', content: filePath, showCancel: false});
    } catch (error) { this.error(error); }
  },
  shareHistory(event) {
    const entry = this.history[Number(event.currentTarget.dataset.index)];
    if (wx.shareFileMessage) wx.shareFileMessage({filePath: entry.filePath, fail: error => this.error(error)});
    else this.error(new Error('Sharing requires a supported WeChat version on a real phone'));
  },
  onUnload() {
    this.alive = false; clearInterval(this.drawTimer); clearInterval(this.demoTimer);
    wx.offBluetoothDeviceFound(this.onFound); this.session.destroy();
    wx.stopBluetoothDevicesDiscovery({complete: () => wx.closeBluetoothAdapter()});
  }
});
