// Verify these values against your actual BLE module before a hardware session.
module.exports = {
  sampleRateHz: 512, // reconstruction default; NOT confirmed by the uploaded files
  serviceUuid: '', // empty: discover all primary services
  notifyUuid: '', // empty: user chooses from discovered notify/indicate characteristics
  commandUuid: '0000FF93-0000-1000-8000-00805F9B34FB', // found in the original source
  startCommand: [0x04], // explicit button; never sent automatically
  maxSamples: 512 * 60 * 10,
  plotSamples: 1000
};
