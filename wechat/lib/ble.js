// No fixed service array positions. Notification listener is installed before subscribing.
const { PacketParser } = require('./protocol');
class BleSession {
  constructor(api, config, onEvents, onState) {
    this.api = api; this.config = config; this.onEvents = onEvents; this.onState = onState;
    this.deviceId = null; this.selected = null; this.closed = false;
    this.parser = new PacketParser();
    this.onValue = event => {
      if (!this.selected || event.deviceId !== this.deviceId ||
          event.serviceId.toUpperCase() !== this.selected.serviceId.toUpperCase() ||
          event.characteristicId.toUpperCase() !== this.selected.uuid.toUpperCase()) return;
      this.onEvents(this.parser.feed(event.value));
    };
    this.onConnection = event => {
      if (event.deviceId === this.deviceId && !event.connected) {
        this.selected = null; this.deviceId = null; this.parser = new PacketParser();
        this.onState('Device disconnected');
      }
    };
    api.onBLECharacteristicValueChange(this.onValue);
    api.onBLEConnectionStateChange(this.onConnection);
  }
  call(method, args = {}) {
    return new Promise((resolve, reject) => this.api[method](Object.assign({}, args, {success: resolve, fail: reject})));
  }
  async connect(deviceId) {
    if (this.connecting || this.closed) throw new Error('Session is busy or closed');
    this.connecting = true;
    await this.disconnect();
    if (this.closed) { this.connecting = false; throw new Error('Session closed'); }
    this.deviceId = deviceId;
    try {
      await this.call('createBLEConnection', {deviceId});
      if (this.closed || this.deviceId !== deviceId) {
        await this.call('closeBLEConnection', {deviceId});
        throw new Error('Connection cancelled');
      }
      const result = await this.call('getBLEDeviceServices', {deviceId});
      const candidates = []; this.commands = [];
      for (const service of result.services) {
        if (!service.isPrimary || (this.config.serviceUuid && service.uuid.toUpperCase() !== this.config.serviceUuid.toUpperCase())) continue;
        const info = await this.call('getBLEDeviceCharacteristics', {deviceId, serviceId: service.uuid});
        for (const characteristic of info.characteristics) {
          const item = Object.assign({serviceId: service.uuid}, characteristic);
          if (characteristic.properties.notify || characteristic.properties.indicate) candidates.push(item);
          if (characteristic.properties.write || characteristic.properties.writeNoResponse) this.commands.push(item);
        }
      }
      if (this.closed) { await this.disconnect(); throw new Error('Session closed during connection'); }
      if (!candidates.length) throw new Error('No notifying characteristic found');
      this.onState('Connected: choose the ECG notification characteristic');
      return candidates;
    } catch (error) { await this.disconnect(); throw error; }
    finally { this.connecting = false; }
  }
  async subscribe(item) {
    if (!this.deviceId) throw new Error('Connect a device first');
    if (this.selected) await this.call('notifyBLECharacteristicValueChange', {
      deviceId: this.deviceId, serviceId: this.selected.serviceId, characteristicId: this.selected.uuid, state: false});
    this.parser = new PacketParser(); this.selected = item;
    try {
      await this.call('notifyBLECharacteristicValueChange', {
        deviceId: this.deviceId, serviceId: item.serviceId, characteristicId: item.uuid, state: true});
      this.onState('Subscribed to ECG packets');
    } catch (error) { this.selected = null; throw error; }
  }
  async sendStart() {
    const item = (this.commands || []).find(c => c.uuid.toUpperCase() === this.config.commandUuid.toUpperCase());
    if (!this.deviceId || !item) throw new Error('Configured command characteristic is unavailable');
    await this.call('writeBLECharacteristicValue', {deviceId: this.deviceId, serviceId: item.serviceId,
      characteristicId: item.uuid, value: Uint8Array.from(this.config.startCommand).buffer});
  }
  async disconnect() {
    const deviceId = this.deviceId;
    this.selected = null; this.deviceId = null; this.parser = new PacketParser();
    if (deviceId) { try { await this.call('closeBLEConnection', {deviceId}); } catch (_) {} }
  }
  async destroy() {
    this.closed = true;
    this.api.offBLECharacteristicValueChange(this.onValue);
    this.api.offBLEConnectionStateChange(this.onConnection);
    await this.disconnect();
  }
}
module.exports = { BleSession };
