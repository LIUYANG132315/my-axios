import axios from 'axios'
import qs from 'qs'
import router from '@/router'
import { Toast } from 'vant'
const warning = (code) => {
  const errorCode = {
    'TX0010': '操作失败',
    'TX2003':	'参数为空',
    'TX2004':	'邮箱重复',
    'TX2005':	'验证码错误',
    'TX2006':	'未发送验证码',
    'TX2007':	'电话号重复',
    'TX2008':	'用户不存在',
    'TX2009':	'已订阅3人',
    'TX2010':	'订阅重复',
    'TX2011':	'邮箱或密码错误',
    'TX2012':	'电话号长度错误',
    'TX2013':	'两次密码不一致',
    'TX2014':	'未登录或登录已过期'
  }
  Toast.fail({
    message: errorCode[code] ? errorCode[code] : `请求出错了：${code}`
  })
}

// create an axios instance
const service = axios.create({
  baseURL: '/dev', // 设置代理标准 (可根据环境变量配置)
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 60 * 1000
})

const CancelToken = axios.CancelToken
let _pending = [] // 存储每个ajax请求的取消函数和ajax标识(处于pending的请求)
const removeSamePending = (config, isReq = true) => {
  _pending = _pending.filter((item, i) => {
    if (item.target === config.url + '&' + config.method) {
      isReq && item.cancel('cancel')
      return false
    } else {
      return true
    }
  })
}

// 请求拦截器
service.interceptors.request.use(function(config) {
  removeSamePending(config) // 在一个ajax发送前执行一下取消 和它相同并且还处于pending 中的请求
  config.cancelToken = new CancelToken((c) => {
  // 这里的ajax标识 我是用请求地址&请求方式拼接的字符串
    _pending.push({ target: config.url + '&' + config.method, cancel: c })
  })
  return config
}, function(error) {
  console.log('请求错误：', error)
  return Promise.reject(error)
})

// 响应拦截器
service.interceptors.response.use(function(response) {
  removeSamePending(response.config, false) // 在一个ajax响应后再执行一下取消操作，把已经完成的请求从pending中移除

  const res = response.data
  const code = res.status
  if (code === 'TX0000') {
    return res.data
  } else {
    // 错误提示
    warning(code)
    if (code === 'TX2014') {
      router.replace(`/login?redirect=${router.currentRoute.fullPath}`)
    }
    return Promise.reject(res)
  }
}, function(error) {
  console.log(error)
  // 断网检测
  if (window.navigator.onLine) {
    if (error.message === 'cancel') {
      return Promise.reject('cancel') // 不去处理 取消的请求
    } else {
      alert(error.message)
      // warning( error.message );
    }
  } else {
    warning('没有网络!')
  }
  return Promise.reject(error)
})

// 快捷方法
export const getRequest = (url, params) => {
  return service({
    method: 'get',
    url: url,
    params: params
  })
}

// form 表单的方式
export const postRequest = (url, params) => {
  return service({
    method: 'post',
    url: url,
    data: params,
    transformRequest: [function(data) {
      return qs.stringify(data)
    }],
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
}

// post json
export const postJsonRequest = (url, params) => {
  return service({
    method: 'post',
    url: url,
    data: params
  })
}

// 上传文件
export const uploadFileRequest = (url, params, progressCb) => {
  return service({
    method: 'post',
    url: url,
    data: params,
    onUploadProgress: function(progressEvent) {
      // 上传进度
      if (progressEvent.lengthComputable) {
        progressCb && progressCb(progressEvent)
      }
    },
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export default service
