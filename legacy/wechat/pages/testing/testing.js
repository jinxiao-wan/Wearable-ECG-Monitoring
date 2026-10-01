var XLSX = require('../../utils/xlsx.mini.min.js')
function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    } 
  }
  return -1;
}
function ab2hex(buffer) {
  const hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function(bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('')
}
function stringToBytes(str) {
  var array = new Uint8Array(str.length);
  for (var i = 0, l = str.length; i < l; i++) {
    array[i] = str.charCodeAt(i);
  }
  console.log(array);
  return array.buffer;
}
function  rec_check(data) {
  var data = new DataView(data);
  var check_sum = 0;
  for (let i = 0; i < 8; i++) {
    check_sum += data.getUint8(i + 2);
  }
  return (check_sum & 0xff);
}
function zhuanHua(Buffer){
  // var Buffer = new Array(256)
  var Rx=0,Len,checksum=0,Sta=0,check,quality=200,SYNC=0xAA,EXCODE=0x55;
  if (Buffer[Rx] === SYNC | Buffer[Rx+1] === SYNC)
  {
    Rx = 3
    Len = Buffer[Rx-1]
    while(Rx<3+Len){
      checksum += Buffer[Rx]
      Rx++;
    }
    check = Buffer[Rx]
    checksum &= 0xFF
    checksum = ~checksum & 0xFF
    // 校验错误 丢弃数据包
    console.log(checksum)
    console.log(check)
    if(checksum != check)
    {
      Rx = 0
      Sta = 0
      checksum = 0
    }
    else Sta = 1
  }
  //校验成功
  if(Sta === 1){
    var byteParsed = 0,code,length,extendeCodeLevel,rawValue = 0
    
    while(byteParsed < Len){
      extendeCodeLevel = 0
      while(Buffer[3+byteParsed] === EXCODE){
        extendeCodeLevel++
        byteParsed++
      }
      code = Buffer[3+byteParsed]
      byteParsed++
      if(code>=0x80){
        length = Buffer[3+byteParsed]
        byteParsed++
      }
      else length=1
      switch(code){
        case 0x80:
          if(quality >0){
            rawValue = Buffer[3+byteParsed]
            rawValue <<= 8
            rawValue |= Buffer[4+byteParsed]
          }
        case 0x02:
          quality = Buffer[3+byteParsed]
          break
        case 0x03:
          rawValue = Buffer[3+byteParsed]
          console.log('成功')
      }
      byteParsed += length
    }
    return rawValue
  }
  Rx = 0
  Sta = 0
  checksum = 0
}

// wx.navigateTo({
//   url: 'pages/line/line',
// })

function shujujiema(receive_da){
  var SYNC=0xAA,EXCODE=0x55
  
  for(var i=0;i<20;i++){
  if(receive_da.getUint8(i) === SYNC && receive_da.getUint8(++i) === SYNC)//校验通过
  {
    for(var j = i;j<20;j++){
      if(receive_da.getUint8(j) === 0x03){
        return receive_da.getUint8(j+1)
      }
    }
  }
  
}
}
Page({

  /**
   * 页面的初始数据
   */
  data: {
    command: [],
    devices: [],
    connected: false,
    chs: [],
    receiveData: [],
  },
  //提取收到的心电数据
  getBMDArray:function(cur_BMD){
    var BMDArray = []
    for(let i = 0;i<cur_BMD.length;i++){
      BMDArray.push(Math.abs(cur_BMD))
      return BMDArray
    }
  },
  openBluetoothAdapter() {
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('openBluetoothAdapter success', res)
        this.startBluetoothDevicesDiscovery()
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            console.log('onBluetoothAdapterStateChange', res)
            if (res.available) {
              this.startBluetoothDevicesDiscovery()
            }
          })
        }
      }
    })
  },
  getBluetoothAdapterState() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        console.log('getBluetoothAdapterState', res)
        if (res.discovering) {
          this.onBluetoothDeviceFound()
        } else if (res.available) {
          this.startBluetoothDevicesDiscovery()
        }
      }
    })
  },
  startBluetoothDevicesDiscovery() {
    if (this._discoveryStarted) {
      return
    }
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: (res) => {
        console.log('startBluetoothDevicesDiscovery success', res)
        this.onBluetoothDeviceFound()
      },
    })
  },
  stopBluetoothDevicesDiscovery() {
    wx.stopBluetoothDevicesDiscovery()
  },
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
        const foundDevices = this.data.devices
        const idx = inArray(foundDevices, 'deviceId', device.deviceId)
        const data = {}
        if (idx === -1) {
          data[`devices[${foundDevices.length}]`] = device
        } else {
          data[`devices[${idx}]`] = device
        }
        this.setData(data)
      })
    })
  },
  createBLEConnection(e) {
    const ds = e.currentTarget.dataset
    const deviceId = ds.deviceId
    const name = ds.name
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        this.setData({
          connected: true,
          name,
          deviceId,
        })
        this.getBLEDeviceServices(deviceId)
      }
    })
    this.stopBluetoothDevicesDiscovery()
  },
  closeBLEConnection() {
    wx.closeBLEConnection({
      deviceId: this.data.deviceId
    })
    this.setData({
      connected: false,
      chs: [],
      canWrite: false,
    })
  },
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
          console.log(res)
          if (res.services[3].isPrimary) {
            console.log(res)
            this.getBLEDeviceCharacteristics(deviceId, res.services[3].uuid)
          }
          if (res.services[1].isPrimary) {
            console.log(res)
            this.getBLEDeviceCharacteristics(deviceId, res.services[1].uuid)
            return
          }
      }
    })
  },
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          if (item.properties.read) {
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
            })
          }
          if (item.uuid === "0000FF93-0000-1000-8000-00805F9B34FB") {
            this.setData({
              canWrite: true
            })
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            let buffer = new ArrayBuffer(1)
            let dataView = new DataView(buffer)
            dataView.setUint8(0,0x04)
            wx.writeBLECharacteristicValue({
              characteristicId: item.uuid,
              deviceId: deviceId,
              serviceId: serviceId,
              value: buffer,
              success:function(res){
                console.log("成功"+res.errMsg)
              }
            })
            return
          }
          if (item.properties.notify || item.properties.indicate) {
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
            })
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
    // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((characteristic) => {
      const idx = inArray(this.data.chs, 'uuid', characteristic.characteristicId)
      const data = {}
      //console.log(ab2hex(characteristic.value))
      var receive_data = new DataView(characteristic.value)
      //this.data.receiveData.push(shujujiema(receive_data))
      //解码。。。
      var SYNC=0xAA,EXCODE=0x55
      for(var i=0;i<19;i++){
       if(receive_data.getUint8(i) === SYNC && receive_data.getUint8(i+1) === SYNC)//校验通过
        {
        for(var j = i;j<19;j++){
          if(receive_data.getUint8(j) === 0x03){
          console.log(receive_data.getUint8(j+1))
          this.data.receiveData.push(receive_data.getUint8(j+1))
          console.log(this.data.receiveData)
        }
        }
  }
}
        
      
      //console.log(this.data.receiveData)
      if (idx === -1) {
        data[`chs[${this.data.chs.length}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      }
      // data[`chs[${this.data.chs.length}]`] = {
      //   uuid: characteristic.characteristicId,
      //   value: ab2hex(characteristic.value)
      // }
      this.setData(data)
    })
  },
  
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this._discoveryStarted = false
  },
  //导出数据源
  exportData() {
      // 构建一个表的数据
    let sheet = [] 
    this.data.receiveData.forEach(item => {
      let rowcontent = []
      //console.log(typeof(item))
      rowcontent.push(item)
      sheet.push(rowcontent)
    })

    // XLSX插件使用
    var ws = XLSX.utils.aoa_to_sheet(sheet);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "data");
    var fileData = XLSX.write(wb, {
      bookType: "xlsx",
      type: 'base64'
    });

    let fileName = "test" + ".xlsx"  //文件名中不能含有 / \ : ? *等符号，且不加上xlsx后缀，导出文件将没有格式
    let filePath =`${wx.env.USER_DATA_PATH}` + '/' + fileName  
    console.log(filePath)

    // 写文件
    const fs = wx.getFileSystemManager()
    // fs.writeFile({
    //   filePath: filePath,
    //   data: fileData,
    //   encoding: 'base64',

    //   success:(res)=>{
    //     console.log(res)
    //     const sysInfo = wx.getSystemInfoSync()
    //     // 导出
    //     console.log(sysInfo)
    //     if (sysInfo.platform.toLowerCase().indexOf('windows') >= 0){
    //       // 电脑PC端导出
    //       wx.saveFileToDisk({
    //         filePath: filePath,
    //         success(res) {
    //           console.log(res)
    //         },
    //         fail(res) {
    //           console.error(res)
    //           util.tips("导出失败")
    //         }
    //       })
    //     }else{
    //        // 手机端导出
    //        wx.saveFile({
    //         tempFilePath: filePath,
    //         success(res) {
    //           console.log(res)
    //         },
    //         fail(res) {
    //           console.error(res)
    //           util.tips("导出失败")
    //         }
    //        })
    //        // 打开文档
    //        wx.openDocument({
    //         filePath: filePath,
    //         showMenu: true,
    //         success: function (res) {
    //           console.log('打开文档成功')
    //         },
    //         fail: console.error
    //        })
    //     }
    //   },
    //   fail(res){
    //     console.error(res)
    //     if (res.errMsg.indexOf('locked')) {
    //       wx.showModal({
    //         title: '提示',
    //         content: '文档已打开，请先关闭',
    //       })
    //     }
    //   }
    //  })

    try {
      const res = fs.writeFileSync(
        filePath,
        fileData,
        'base64'
      )
      console.log(res)
      // 打开文档
      wx.openDocument({
        filePath: filePath,
        showMenu: true,
        fileType: 'xlsx',
        success: (res) => {
          console.log(res)
        },
        fail: (res) => {
          console.log(res)
        }
      })

      //直接转发文件到聊天，不打开
      // wx.shareFileMessage({
      //   filePath,
      //   success:(e)=>{
      //     console.log(e)
      //   }
      // })
    } catch (e) {
      console.error(e)
      if (e.errMsg.indexOf('locked')) {
        wx.showModal({
          title: '提示',
          content: '文档已打开，请先关闭',
        })
      }
    }
    wx.getSavedFileList({
      success: (result) => {
        console.log(result.fileList)
      },
    })

    
  }
 
})