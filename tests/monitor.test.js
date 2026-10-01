const test = require('node:test'); const assert = require('node:assert/strict');
const { Recording } = require('../wechat/lib/recording');
function mount() {
  const files = {}, shared = [], storage = {};
  global.wx = {
    getStorageSync: key=>storage[key], setStorageSync: (key,value)=>storage[key]=value,
    env:{USER_DATA_PATH:'/local'}, getFileSystemManager:()=>({writeFileSync:(p,data)=>files[p]=data,unlinkSync:p=>delete files[p]}),
    shareFileMessage: options=>shared.push(options.filePath), showModal:()=>{},
    onBLECharacteristicValueChange:()=>{},offBLECharacteristicValueChange:()=>{},
    onBLEConnectionStateChange:()=>{},offBLEConnectionStateChange:()=>{},
    onBluetoothDeviceFound:()=>{},offBluetoothDeviceFound:()=>{},
    closeBLEConnection: options=>options.success({}),closeBluetoothAdapter:()=>{},
    stopBluetoothDevicesDiscovery:options=>{if(options.success)options.success({});if(options.complete)options.complete();}
  };
  let definition; global.Page = value=>definition=value;
  delete require.cache[require.resolve('../wechat/pages/monitor/monitor')];
  require('../wechat/pages/monitor/monitor');
  const page=Object.assign({},definition);page.data=JSON.parse(JSON.stringify(definition.data));
  page.setData = patch=>Object.assign(page.data,patch); page.draw=()=>{};page.onLoad();
  return {page,files,shared,storage};
}
test('monitor records parsed events and exports real local history', () => {
  const m=mount(),p=m.page;
  try {
    p.data.demo=true;p.startRecording();
    p.accept([{type:'raw',value:-10},{type:'raw',value:20},{type:'heart_rate',value:72}]);
    assert.equal(p.data.sampleCount,2);assert.equal(p.data.bpm,72);
    p.exportCsv();assert.equal(p.data.recording,false);assert.equal(p.data.history.length,1);
    assert.match(m.files[m.shared[0]],/simulation/);assert.match(m.files[m.shared[0]],/0,0.000000,-10,512/);
  } finally {p.onUnload();}
});
test('recording stops at limit and history retains only latest ten exports', () => {
  const m=mount(),p=m.page;
  try {
    p.record=new Recording(100,2,'hardware');p.data.recording=true;
    p.accept([{type:'raw',value:1},{type:'raw',value:2},{type:'raw',value:3}]);
    assert.equal(p.data.recording,false);assert.equal(p.record.samples.length,2);
    let clock=0;const original=Date.now;Date.now=()=>++clock;
    try{for(let i=0;i<12;i++)p.exportCsv();}finally{Date.now=original;}
    assert.equal(p.history.length,10);assert.equal(Object.keys(m.files).length,10);
  } finally {p.onUnload();}
});
test('simulation timer emits samples and unload clears timers', async () => {
  const m=mount(),p=m.page;
  await p.startDemo();
  try {
    assert.equal(p.data.demo,true);p.startRecording();
    await new Promise(resolve=>setTimeout(resolve,130));
    assert.ok(p.record.samples.length>0);assert.equal(p.record.source,'simulation');
  } finally {p.onUnload();}
  assert.equal(p.alive,false);
});
