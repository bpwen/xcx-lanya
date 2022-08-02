// lanya.js
const util = require('../../utils/util.js')

var delayTimer; //用来控制是否持续服务发现
var isFound = false;

function ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
}

Page({
    data: {
        ssid: '',
        pass: '',
        logs: [],
        deviceArray: [],
        currDeviceID: '请选择...',
        id_text: '',
        list: [],
        msg: '',
        devices: []
    },
    onLoad() {
        console.log(1)
    },
    //点击蓝牙按钮
    onClick(){
        let _this = this;
        wx.showModal({
            title: '提示',
            content: '是否确认连接蓝牙设备',
            success: function (res) {
                if (res.confirm) {  
                    _this.openLanya()
                } else {   
                console.log('点击取消回调')
                }
            }
        })
    },
    //打开蓝牙-初始化蓝牙适配器模块
    openLanya(){
        let _this = this;
        wx.openBluetoothAdapter({
            success: function (res) {
                _this.suoLanya()
            },
            fail: function (res) {
                wx.showModal({
                    content: '请开启手机蓝牙后再试'
                })
            }
        })
    },
    //开始搜索附近蓝牙设备
    suoLanya(){
        var that = this
        //开始搜索蓝牙
        wx.startBluetoothDevicesDiscovery({
            allowDuplicatesKey: false,
            interval: 0,
            success: function (res) {
                wx.showLoading({
                    title: '正在搜索设备',
                })
                console.log('开始搜索蓝牙', res)
            },
            fail: function(res) {
                that.printLog("蓝牙设备服务发现失败: " + res.errMsg);
            }
        })
        //发现设备
        wx.getBluetoothDevices({
            success: function (res) {
                console.log('发现设备1', res)

                if (res.devices[0]) { 
                    console.log(ab2hex(res.devices[0].advertisData))                                 
                }
            }
        })

        //监听发现设备
        wx.onBluetoothDeviceFound(function (devices) {
            console.log('发现设备2:', devices.devices)
            for (let i = 0; i < devices.devices.length; i++) {
                //检索指定设备
                if (devices.devices[i].name == '设备name') {
                    that.setData({
                        deviceId: devices.devices[i].deviceId
                    })
                    //关闭搜索
                    that.stopBluetoothDevicesDiscovery();
                    console.log('已找到指定设备:', devices.devices[i].deviceId);  
                }
            }
        })
    }
})
