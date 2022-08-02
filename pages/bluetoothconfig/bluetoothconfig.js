// pages/bluetoothconfig/bluetoothconfig.js
const util = require('../../utils/util.js')

var delayTimer; //用来控制是否持续服务发现
var isFound = false;

Page({
  /**
   * 页面的初始数据
   */
  data: {
    ssid: '',
    pass: '',
    logs: [],
    deviceArray: [],
    currDeviceID: '请选择...'
  },
  onLoad: function(options) {
    var that = this;
    wx.startWifi({
      success(res) {
        console.log(res.errMsg)
        wx.getConnectedWifi({
          success: function(res) {
            console.log(res);
            that.setData({
              ssid: res.wifi.SSID
            })
          },
          fail: function(res) {
            if(res.errCode == 12006){
              wx.showModal({
                title: '请打开GPS定位',
                content: 'Android手机不打开GPS定位，无法搜索到蓝牙设备.',
                showCancel: false
              })
            }
            console.log(res);
          }
        })
      }
    })
  },
  bindPickerChange: function(ret){
    var array = this.data.deviceArray;
    console.log(array[ret.detail.value]);
    this.setData({
      currDeviceID: array[ret.detail.value]
    })
  },
  searchBleEvent: function(ret){
    var ssid = this.data.ssid;
    var pass = this.data.pass;
    console.log(ssid, pass);
    if (util.isEmpty(ssid) || util.isEmpty(pass)) {
      util.toastError('请输入WiFi名称及密码');
      return;
    }
    this.initBLE();
  },
  bleConfigEvent: function (ret) {
    var deviceID = this.data.currDeviceID;
    console.log("选中:" + deviceID);
    if (util.isEmpty(deviceID) || deviceID == "请选择..."){
      util.toastError("请先搜索设备");
      return ;
    }
    var device = deviceID.split('[');
    if(device.length <= 1){
      util.toastError("请先搜索设备");
      return ;
    }
    var id = device[device.length - 1].replace("]", "");
    console.log(id);
    util.toastError("连接" + id);
    this.createBLE(id);
  },


  initBLE: function() {
    this.printLog("启动蓝牙适配器, 蓝牙初始化")
    var that = this;
    wx.openBluetoothAdapter({
      success: function(res) {
        console.log(res);
        that.findBLE();
      },
      fail: function(res) {
        util.toastError('请先打开蓝牙');
      }
    })
  },
  findBLE: function() {
    this.printLog("打开蓝牙成功.")
    var that = this
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      interval: 0,
      success: function(res) {
        wx.showLoading({
          title: '正在搜索设备',
        })
        console.log(res);
        delayTimer = setInterval(function(){
          that.discoveryBLE() //3.0 //这里的discovery需要多次调用
        }, 1000);
        setTimeout(function () {
          if (isFound) {
            return;
          } else {
            wx.hideLoading();
            console.log("搜索设备超时");
            wx.stopBluetoothDevicesDiscovery({
              success: function (res) {
                console.log('连接蓝牙成功之后关闭蓝牙搜索');
              }
            })
            clearInterval(delayTimer)
            wx.showModal({
              title: '搜索设备超时',
              content: '请检查蓝牙设备是否正常工作，Android手机请打开GPS定位.',
              showCancel: false
            })
            util.toastError("搜索设备超时，请打开GPS定位，再搜索")
            return
          }
        }, 15000);
      },
      fail: function(res) {
        that.printLog("蓝牙设备服务发现失败: " + res.errMsg);
      }
    })
  },
  discoveryBLE: function() {
    var that = this
    wx.getBluetoothDevices({
      success: function(res) {
        var list = res.devices;
        console.log(list);
        if(list.length <= 0){
          return ;
        }
        var devices = [];
        for (var i = 0; i < list.length; i++) {　　　
          //that.data.inputValue：表示的是需要连接的蓝牙设备ID，
          //简单点来说就是我想要连接这个蓝牙设备，
          //所以我去遍历我搜索到的蓝牙设备中是否有这个ID
          var name = list[i].name || list[i].localName;
          if(util.isEmpty(name)){
            continue;
          }
          if(name.indexOf('JL') >= 0 && list[i].RSSI != 0){
            console.log(list[i]);
            devices.push(list[i]);
          }
        }
        console.log('总共有' + devices.length + "个设备需要设置")
        if (devices.length <= 0) {
          return;
        }
        that.connectBLE(devices);
      },
      fail: function() {
        util.toastError('搜索蓝牙设备失败');
      }
    })
  },
  connectBLE: function(devices){
    this.printLog('总共有' + devices.length + "个设备需要设置")
    var that = this;
    wx.hideLoading();
    isFound = true;
    clearInterval(delayTimer); 
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {
        that.printLog('连接蓝牙成功之后关闭蓝牙搜索');
      }
    })
    //两个的时候需要选择
    var list = [];
    for (var i = 0; i < devices.length; i++) {
      var name = devices[i].name || devices[i].localName;
      list.push(name + "[" + devices[i].deviceId + "]")
    }
    this.setData({
      deviceArray: list
    })
    //默认选择
    this.setData({
      currDeviceID: list[0]
    })
  },


  createBLE: function(deviceId){
    this.printLog("连接: [" + deviceId+"]");
    var that = this;
    this.closeBLE(deviceId, function(res){
      console.log("预先关闭，再打开");
      setTimeout(function(){
        wx.createBLEConnection({
          deviceId: deviceId,
          success: function (res) {
            that.printLog("设备连接成功");
            that.getBLEServiceId(deviceId);
          },
          fail: function (res) {
            that.printLog("设备连接失败" + res.errMsg);
          }
        })
      }, 2000)
    });
  },
  //获取服务UUID
  getBLEServiceId: function(deviceId){
    this.printLog("获取设备[" + deviceId + "]服务列表")
    var that = this;
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: function(res) {
        console.log(res);
        var services = res.services;
        if (services.length <= 0){
          that.printLog("未找到主服务列表")
          return;
        }
        that.printLog('找到设备服务列表个数: ' + services.length);
        if (services.length == 1){
          var service = services[0];
          that.printLog("服务UUID:["+service.uuid+"] Primary:" + service.isPrimary);
          that.getBLECharactedId(deviceId, service.uuid);
        }else{ //多个主服务
          //TODO
        }
      },
      fail: function(res){
        that.printLog("获取设备服务列表失败" + res.errMsg);
      }
    })
  },
  getBLECharactedId: function(deviceId, serviceId){
    this.printLog("获取设备特征值")
    var that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: function(res) {
        console.log(res);
        //这里会获取到两个特征值，一个用来写，一个用来读
        var chars = res.characteristics;
        if(chars.length <= 0){
          that.printLog("未找到设备特征值")
          return ;
        }
        that.printLog("找到设备特征值个数:" + chars.length);
        if(chars.length == 2){
          for(var i=0; i<chars.length; i++){
            var char = chars[i];
            that.printLog("特征值[" + char.uuid + "]")
            var prop = char.properties;
            if(prop.notify == true){
              that.printLog("该特征值属性: Notify");
              that.recvBLECharacterNotice(deviceId, serviceId, char.uuid);
            }else if(prop.write == true){
              that.printLog("该特征值属性: Write");
              that.sendBLECharacterNotice(deviceId, serviceId, char.uuid);
            }else{
              that.printLog("该特征值属性: 其他");
            }
          }
        }else{
          //TODO
        }
      },
      fail: function(res){
        that.printLog("获取设备特征值失败")
      }
    })
  },
  recvBLECharacterNotice: function(deviceId, serviceId, charId){
    //接收设置是否成功
    this.printLog("注册Notice 回调函数");
    var that = this;
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: charId,
      state: true, //启用Notify功能
      success: function(res) {
        wx.onBLECharacteristicValueChange(function(res){
          console.log(res);
          that.printLog("收到Notify数据: " + that.ab2hex(res.value));
          //关闭蓝牙
          wx.showModal({
            title: '配网成功',
            content: that.ab2hex(res.value),
            showCancel: false
          })
        });
      },
      fail: function(res){
        console.log(res);
        that.printLog("特征值Notice 接收数据失败: " + res.errMsg);
      }
    })
  },
  sendBLECharacterNotice: function (deviceId, serviceId, charId){
    //发送ssid/pass
    this.printLog("延时1秒后，发送SSID/PASS");
    var that = this;
    var cell = {
      "ssid": this.data.ssid,
      "pass": this.data.pass
    }
    var buffer = this.string2buffer(JSON.stringify(cell));
    setTimeout(function(){
      wx.writeBLECharacteristicValue({
        deviceId: deviceId,
        serviceId: serviceId,
        characteristicId: charId,
        value: buffer,
        success: function(res) {
          that.printLog("发送SSID/PASS 成功");
        },
        fail: function(res){
          console.log(res);
          that.printLog("发送失败." + res.errMsg);
        },
        complete: function(){
          
        }
      })
      
    }, 1000);
  },

  closeBLE: function(deviceId, callback){
    var that = this;
    wx.closeBLEConnection({
      deviceId: deviceId,
      success: function(res) {
        that.printLog("断开设备[" + deviceId + "]成功.");
        console.log(res)
      },
      fail: function(res){
        that.printLog("断开设备成功.");
      },
      complete: callback
    })
  },
  



  printLog: function(msg){
    var logs = this.data.logs;
    logs.push(msg);
    this.setData({ logs: logs })
  },
  /**
   * 将字符串转换成ArrayBufer
   */
  string2buffer(str) {
    if (!str) return;
    var val = "";
    for (var i = 0; i < str.length; i++) {
      val += str.charCodeAt(i).toString(16);
    }
    console.log(val);
    str = val;
    val = "";
    let length = str.length;
    let index = 0;
    let array = []
    while (index < length) {
      array.push(str.substring(index, index + 2));
      index = index + 2;
    }
    val = array.join(",");
    // 将16进制转化为ArrayBuffer
    return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16)
    })).buffer
  },
  /**
   * 将ArrayBuffer转换成字符串
   */
  ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },
  inputSSID: function(res) {
    var ssid = res.detail.value;
    this.setData({
      ssid: ssid
    })
  },
  inputPASS: function(res) {
    var pass = res.detail.value;
    this.setData({
      pass: pass
    })
  }

})