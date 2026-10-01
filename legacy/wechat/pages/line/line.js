var wxCharts = require('../../utils/wxcharts');
var app = getApp();
var lineChart = null;
var queue = new Queue();
var count_test = 0
//数据接受
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
function complementToOriginal(complement) {
  // 检查补码的符号位
  var sign = (complement.charAt(0) === '1') ? -1 : 1;

  // 取得补码的绝对值部分
  var absoluteValue = '';
  for (var i = 1; i < complement.length; i++) {
    absoluteValue += (complement.charAt(i) === '0') ? '1' : '0';
  }

  // 将绝对值部分转换为十进制
  var decimalValue = parseInt(absoluteValue, 2);

  // 计算原码的值
  var originalValue = sign * decimalValue;

  return originalValue;
}
//开始收到数据5s后停止
function stopSheBei(){
  closeBluetoothAdapter()


}


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
function Queue() {
  // 属性
    this.items = []
    
  // 方法
  // 1.enqueue():将元素加入到队列中
  Queue.prototype.enqueue = element => {
    this.items.push(element)
  }

  // 2.dequeue():从队列中删除前端元素
  Queue.prototype.dequeue = () => {
    return this.items.shift()
  }

  // 3.front():查看前端的元素
  Queue.prototype.front = () => {
    return this.items[0]
  }

  // 4.isEmpty:查看队列是否为空
  Queue.prototype.isEmpty = () => {
    return this.items.length == 0;
  }

  // 5.size():查看队列中元素的个数
  Queue.prototype.size = () => {
    return this.items.length
  }

  // 6.toString():将队列中元素以字符串形式输出
  Queue.prototype.toString = () => {
    let resultString = ''
      for (let i of this.items){
        resultString += i + ' '
      }
      return resultString
    }
  }
//接受结束
Page({
    data: {
      command: [],
      devices: [],
      connected: false,
      chs: [],
      receiveData: [],
      receiveData_time:[],
      xin_lv: 0,
      raw_heart:[]
    },
    //画图
    touchHandler: function (e) {
        console.log(lineChart.getCurrentDataIndex(e));
        lineChart.showToolTip(e, {
             //background: '#7cb5ec',
            format: function (item, category) {
                return category + ' ' + item.name + ':' + item.data 
            }
        });
    },    
    createSimulationData: function () {
        var setquantity=50
        var categories = [];
        var data = [];
        var test = this.data.receiveData.slice(count_test,count_test+setquantity);
        var test_time = this.data.receiveData_time.slice(count_test,count_test+setquantity);
        data.push(test)
        categories.push(test_time)
        //categories.push(new Date().getSeconds());
        for (var i = 0; i < setquantity; i++) {
          //categories.push(new Date().getSeconds());
          // categories.push('2016-' + (i + 1));
        }
        test = test.filter(function(item){
          return typeof(item) != "undefined";
        })
        test_time = test_time.filter(function(item){
          return typeof(item) != "undefined";
        })
        console.log(test.length)
        console.log(test_time.length)
        if(test.length == setquantity){
          count_test+=1
          test.length = 0
        }
        console.log(test)
        console.log(test_time)
        
        // data[4] = null;
        return {
            categories: categories,
            data: data
        }
    },
    updateData: function () {
        var simulationData = this.createSimulationData();
        var tdata = [];
        var tdatat = [];
        tdata = simulationData.data[0]
        tdatat = simulationData.categories[0]
        console.log(tdata)
        var series = [{
            name: '心率',
            data: tdata,
            format: function (val, name) {
                return val.toFixed(2) + 'BPM';
            }
        }];
        lineChart.updateData({
            categories: tdatat,
            series: series
        });
    },
    onLoad: function (e) {
      setInterval(() => {
        this.setData({
          xin_lv: this.data.xin_lv,
        })
      }, 1000)
        // if(connected)
        // {
        //     console.log(ok);
        // }
        var windowWidth = 320;
        try {
            var res = wx.getSystemInfoSync();
            windowWidth = res.windowWidth;
        } catch (e) {
            console.error('getSystemInfoSync failed!');
        }
        
        var simulationData = this.createSimulationData();
        lineChart = new wxCharts({
            canvasId: 'lineCanvas',
            type: 'line',
            categories: simulationData.categories,
            animation: false,
            // background: '#f5f5f5',
            series: [{
                name: '心率1',
                data: simulationData.data,
                format: function (val, name) {
                    return val.toFixed(2) + 'BPM';
                }
            }],
            xAxis: {
                disableGrid: true
            },
            yAxis: {
                title: '心率(BPM)',
                format: function (val) {
                    return val.toFixed(2);
                },
                min: 0
            },
            width: windowWidth,
            height: 200,
            dataLabel: false,
            dataPointShape: false,
            extra: {
                lineStyle: 'curve'
            }
        });
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
     for(var i=0;i<20;i++){
       //var i=1;
       if(receive_data.getUint8(i) === SYNC && receive_data.getUint8(i+1) === SYNC && receive_data.getUint8(i+2)===0x04 && receive_data.getUint8(i+3)===0x80 && receive_data.getUint8(i+4) == 0x02)//校验通过
        {
        
          var raw_heart1=receive_data.getUint8(i+5)
          var raw_heart2=receive_data.getUint8(i+6)
          var raw_heart = raw_heart1*256+raw_heart2
          // var checksum = receive_data.getUint8(i)+receive_data.getUint8(i+1)+receive_data.getUint8(i+2)+receive_data.getUint8(i+3)+receive_data.getUint8(i+4)+receive_data.getUint8(i+5)+receive_data.getUint8(i+6)
          // checksum&=0xff
          // checksum=~checksum&0xff
          // if(checksum!=receive_data.getUint8())
          // return
          if(raw_heart>=32768)
           raw_heart=raw_heart-65536
          console.log(raw_heart)
          if(raw_heart != -22012){
          this.data.receiveData.push(raw_heart)
          // this.data.xin_lv = receive_data.getUint8(j+1)
          console.log(this.data.xin_lv)
          // console.log(receive_data.getUint8(j+1))
          // this.data.receiveData.push(receive_data.getUint8(j+1))
          this.data.receiveData_time.push(new Date().toTimeString().substring(0,8))
          console.log(this.data.receiveData)
          this.updateData()
         }
        // for(var j = i+2;j<19;j++){
        //   if(receive_data.getUint8(j) === 0x03)
        //   {
        //  this.data.xin_lv = receive_data.getUint8(j+1)
        //   console.log(this.data.xin_lv)
        //   // console.log(receive_data.getUint8(j+1))
        //   this.data.receiveData.push(receive_data.getUint8(j+1))
        //   this.data.receiveData_time.push(new Date().toTimeString().substring(0,8))
        //   // console.log(this.data.receiveData)
        //   this.updateData()
        // }
         
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


    // Component({
    //     properties:{
    //         connected:{
    //             type:Number,
    //             value: []
    //         }
    //     }
    // })
});