const test = require('node:test'); const assert = require('node:assert/strict');
const { PacketParser } = require('../wechat/lib/protocol');
const { Recording } = require('../wechat/lib/recording');
const { BleSession } = require('../wechat/lib/ble');
function packet(payload) { return [170,170,payload.length,...payload,(~payload.reduce((a,b)=>a+b,0))&255]; }
const p = packet([0x80,2,0xff,0x9c,3,72,2,0]);
test('every split boundary preserves signed samples, heart rate, and quality', () => {
  for(let split=0;split<=p.length;split++) {
    const parser = new PacketParser(); const events = [...parser.feed(p.slice(0,split)),...parser.feed(p.slice(split))];
    assert.deepEqual(events,[{type:'raw',value:-100},{type:'heart_rate',value:72},{type:'quality',value:0}]);
    assert.equal(parser.validPackets,1);
  }
});
test('noise, concatenated packets, checksum errors, and trailing partial sync', () => {
  const parser = new PacketParser(), corrupt = p.slice(); corrupt[corrupt.length-1] ^= 1;
  const events = parser.feed([0,12,...corrupt,...p,...p,170]);
  assert.equal(events.length,6); assert.equal(parser.badChecksums,1);
  assert.equal(parser.feed(p.slice(1)).length,3);
});
test('malformed payloads are discarded atomically and extended codes ignored', () => {
  const parser = new PacketParser();
  assert.deepEqual(parser.feed(packet([3,72,0x80,2,0])),[]);
  assert.equal(parser.malformedPayloads,1);
  assert.deepEqual(parser.feed(packet([0x55,3,88,3,60])),[{type:'heart_rate',value:60}]);
});
test('one-byte notifications and bounded recovery from oversized lengths', () => {
  const parser = new PacketParser(); let events=[];
  [170,170,255,...p].forEach(b=>events.push(...parser.feed(Uint8Array.from([b]).buffer)));
  assert.equal(events[0].value,-100); assert.ok(parser.buffer.length<3);
});
test('recording keeps sample-derived timestamps, source, and limits', () => {
  const rec = new Recording(100,2,'simulation'); assert.equal(rec.append(4),true); rec.append(5);
  assert.equal(rec.append(6),false); assert.match(rec.csv(),/1,0.010000,5,100,simulation/);
  assert.throws(()=>new Recording(0,2,'hardware'));
});
function mock() {
  const calls = [], handlers = {};
  const api = {
    onBLECharacteristicValueChange: f=>{handlers.value=f;calls.push('listen');},
    offBLECharacteristicValueChange:()=>calls.push('off-value'),
    onBLEConnectionStateChange:f=>handlers.connection=f,
    offBLEConnectionStateChange:()=>calls.push('off-connection')
  };
  for (const method of ['createBLEConnection','closeBLEConnection','getBLEDeviceServices','getBLEDeviceCharacteristics','notifyBLECharacteristicValueChange','writeBLECharacteristicValue']) {
    api[method] = args => {
      calls.push(method);
      if (method==='getBLEDeviceServices') args.success({services:[{uuid:'svc',isPrimary:true}]});
      else if (method==='getBLEDeviceCharacteristics') args.success({characteristics:[
        {uuid:'notify',properties:{notify:true}}, {uuid:'command',properties:{write:true}}]});
      else args.success({});
    };
  }
  return {api,calls,handlers};
}
test('BLE discovery, notification filtering, explicit command, and cleanup', async () => {
  const m=mock(),received=[];
  const session=new BleSession(m.api,{serviceUuid:'',commandUuid:'command',startCommand:[4]},e=>received.push(...e),()=>{});
  const choices=await session.connect('device'); assert.equal(choices.length,1);
  assert.ok(!m.calls.includes('writeBLECharacteristicValue'));
  await session.subscribe(choices[0]); assert.ok(m.calls.indexOf('listen')<m.calls.indexOf('notifyBLECharacteristicValueChange'));
  m.handlers.value({deviceId:'other',serviceId:'svc',characteristicId:'notify',value:Uint8Array.from(p).buffer});
  assert.equal(received.length,0);
  m.handlers.value({deviceId:'device',serviceId:'svc',characteristicId:'notify',value:Uint8Array.from(p).buffer});
  assert.equal(received.length,3); await session.sendStart(); await session.destroy();
  assert.ok(m.calls.includes('off-value')); assert.equal(session.deviceId,null);
});
test('failed notification subscription is not left selected', async () => {
  const m=mock(); m.api.notifyBLECharacteristicValueChange=args=>args.fail(new Error('denied'));
  const s=new BleSession(m.api,{serviceUuid:''},()=>{},()=>{});
  const c=await s.connect('device'); await assert.rejects(()=>s.subscribe(c[0])); assert.equal(s.selected,null);
});
