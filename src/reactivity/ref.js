import { reactive } from './reactive.js'

export function ref(val) {
  // 包裹对象
  const wrapper = {
    value: val
  }
  // 在 wrapper 对象上定义不可枚举属性: __v_isRef
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })
  // 将包裹对象变为响应式数据
  return reactive(wrapper)
}

// 抽离重复结构 封装成 toRef 函数
export function toRef(obj, prop) {
  const wrapper = {
    get value() {
      return obj[prop]
    },
    set value(val) {
      obj[prop] = val
    }
  }
  // 定于不可枚举属性: __v_isRef
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })

  return wrapper
}
// 如果响应式数据键非常多，直接调用 toRefs 一次性转换
export function toRefs(obj) {
  const ret = {}
  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }
  return ret
}

/**
 * 使用该函数对 toRefs 函数返回的结果进行代理 实现自动脱 ref
 * 在实际的 Vue.js 开发中，组件中的 setup 函数的返回结果会传递给 proxyRefs 进行处理
 * 源码：packages/runtime-core/src/component.ts 795 行
 * @param {Object} obj
 * @returns Proxy
 */
export function proxyRefs(obj) {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      // 自动脱 ref
      return value.__v_isRef ? value.value : value
    },
    set(target, prop, newVal, receiver) {
      const value = target[prop]
      if (value.__v_isRef) {
        value.value = newVal
        return true
      }
      return Reflect.set(target, prop, newVal, receiver)
    }
  })
}
