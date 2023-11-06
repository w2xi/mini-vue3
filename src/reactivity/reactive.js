import { track, trigger, ITERATE_KEY, MAP_KEY_ITERATE_KEY } from './effect.js'
import { isObject, hasOwn, isMap, isSet } from '../utils/index.js'

const reactiveMap = new Map()
export function reactive(obj) {
  const existingProxy = reactiveMap.get(obj)
  if (existingProxy) {
    return existingProxy
  }
  const proxy = createReactive(obj)
  reactiveMap.set(obj, proxy)

  return proxy
}
export function shallowReactive(obj) {
  return createReactive(obj, true)
}

export function readonly(obj) {
  return createReactive(obj, false, true)
}

export function shallowReadonly(obj) {
  return createReactive(obj, true, true)
}

const arrayInstrumentations = {}
;['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // 这里的 this 指向代理对象，先在代理对象中查找
    let res = originMethod.apply(this, args)
    if (res === false) {
      // res 为 false 说明没找到
      // 通过 this.raw 拿到原始数组，再去重新执行并更新 res
      res = originMethod.apply(this.raw, args)
    }

    return res
  }
})

// 一个标记变量，代表是否进行追踪，默认为 true，即允许追踪
export let shouldTrack = true
;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    // 禁止追踪
    shouldTrack = false
    // 原始方法的默认行为 (this 指向代理对象)
    const res = originMethod.apply(this, args)
    // 允许追踪
    shouldTrack = true

    return res
  }
})

function iterationMethod() {
  const target = this.raw
  // 获取原始迭代器方法
  const iterator = target[Symbol.iterator]()
  const wrap = val => (isObject(val) ? reactive(val) : val)
  // 建立响应式联系
  track(target, ITERATE_KEY)

  return {
    // 自定义迭代器
    next() {
      // 调用原始迭代器的 next 方法
      const { value, done } = iterator.next()
      return {
        done,
        // 包裹
        value: value ? [wrap(value[0]), wrap(value[1])] : value
      }
    },
    // 实现可迭代协议
    //! 解决 for (const [key,value] of p.entries()) {/**/} 报错：p.entries is not a function or its return value is not iterable
    [Symbol.iterator]() {
      return this
    }
  }
}

function valuesIterationMethod() {
  const target = this.raw
  const wrap = val => (isObject(val) ? reactive(val) : val)
  // 建立响应式
  track(target, ITERATE_KEY)
  // 拿到原始迭代器
  const itr = target.values()

  return {
    // 实现自定义迭代器
    next() {
      // 执行原始迭代器的 next 方法
      const { done, value } = itr.next()
      return {
        done,
        value: wrap(value)
      }
    },
    // 迭代器协议
    [Symbol.iterator]() {
      return this
    }
  }
}

function keysIterationMethod() {
  const target = this.raw
  const wrap = val => (isObject(val) ? reactive(val) : val)
  // track(target, ITERATE_KEY
  // 建立副作用函数 与 MAP_KEY_ITERATE_KEY 之间的响应关联 ( 解决 值更新导致 副作用函数重新执行 )
  track(target, MAP_KEY_ITERATE_KEY)
  const itr = target.keys()

  return {
    next() {
      const { done, value } = itr.next()
      return {
        done,
        value: wrap(value)
      }
    },
    [Symbol.iterator]() {
      return this
    }
  }
}

// 重写 Set / Map 的方法
const mutableInstrumentations = {
  /******** Set ********/
  add(val) {
    // 拿到原始对象 (this 指向代理对象)
    const target = this.raw
    const hadKey = target.has(val)
    if (hadKey) {
      // 值已经存在
      return target
    } else {
      const res = target.add(val)
      // 手动触发依赖执行，指定操作类型为 ADD
      trigger(target, val, 'ADD')
      return res
    }
  },
  /******** Set | Map ********/
  delete(val) {
    // 拿到原始对象 (this 指向代理对象)
    const target = this.raw
    const hadKey = target.has(val)
    const res = target.delete(val)
    if (hadKey) {
      // key 存在才触发响应
      // 手动触发依赖执行，指定操作类型为 ADD
      trigger(target, val, 'ADD')
    }
    return res
  },
  /******** Map ********/
  get(key) {
    // 拿到原始对象
    const target = this.raw
    const hadKey = target.has(key)
    // 收集依赖
    track(target, key)
    if (hadKey) {
      // 如果存在 key，则拿到结果
      // 但是如果得到的结果 res 仍然是可代理的数据，那么需要使用 reactive 包装后的响应式数据
      const res = target.get(key)
      return isObject(res) ? reactive(res) : res
    }
  },
  set(key, val) {
    const target = this.raw
    const hadKey = target.has(key)
    const oldVal = target.get(key)
    const res = target.set(key, val)
    if (!hadKey) {
      // key 不存在，表示新增操作，需要触发 ADD 操作类型 ( ITERATE_KEY )
      trigger(target, key, 'ADD')
    } else if (oldVal !== val && oldVal === oldVal && val === val) {
      // key 存在，且值变了（排除NaN），则是 SET 类型的操作
      // 触发响应
      trigger(target, key, 'SET')
    }
    return res
  },
  forEach(callback, thisArg) {
    // 如果 val 是对象，则将其转为响应式数据
    const wrap = val => (isObject(val) ? reactive(val) : val)
    const target = this.raw
    // 与 ITERATE_KEY 建立响应式联系
    // 因为任何 改变对象 size 值的操作 (add / delete) 都需要触发响应
    track(target, ITERATE_KEY)
    // 调用原始对象的 forEach
    target.forEach((value, key) => {
      callback.call(thisArg, wrap(value), key, this)
    })
  },
  // 集合迭代器方法 (Symbol.iterator)
  [Symbol.iterator]: iterationMethod,
  // map[Symbol.iterator] === map.entries 二者等价
  entries: iterationMethod,
  keys: keysIterationMethod,
  values: valuesIterationMethod
}

/**
 * 将对象转为响应式对象
 * @param {Object} obj 代理对象
 * @param {Boolean} isShallow 是否浅响应
 * @param {Boolean} isReadonly 是否只读
 * @returns
 */
function createReactive(obj, isShallow = false, isReadonly = false) {
  const proxy = new Proxy(obj, {
    get(target, prop, receiver) {
      if (prop === 'raw') {
        return target
      }
      if (isSet(target) || isMap(target)) {
        // 如果 target 是 Set 或 Map 类型
        if (prop === 'size') {
          // 收集依赖 建立 ITERATE_KEY 到副作用函数之间的联系
          track(target, ITERATE_KEY)
          // 修正 receiver
          return Reflect.get(target, prop, target)
        }
        if (hasOwn(mutableInstrumentations, prop)) {
          // 强制绑定 this 指向为 target (解决实际执行方法时 this 指向代理对象的问题)
          return mutableInstrumentations[prop]
        }
      }
      // 拦截数组的基本方法
      if (Array.isArray(target) && hasOwn(arrayInstrumentations, prop)) {
        return Reflect.get(arrayInstrumentations, prop, receiver)
      }
      if (!isReadonly && typeof prop !== 'symbol') {
        // 非只读 且 非symbol类型 才建立响应式联系
        track(target, prop)
      }
      const result = Reflect.get(target, prop, receiver)
      if (isShallow) {
        // 浅响应
        return result
      }
      if (isObject(result)) {
        return isReadonly ? readonly(result) : reactive(result)
      }
      return result
    },
    set(target, prop, newVal, receiver) {
      if (isReadonly) {
        console.warn(`prop "${prop}" in ${target} is readonly`)
        return true
      }
      const oldVal = target[prop]
      const type = Array.isArray(target)
        ? Number(prop) < target.length
          ? 'SET'
          : 'ADD'
        : hasOwn(target, prop)
        ? 'SET'
        : 'ADD'
      const res = Reflect.set(target, prop, newVal, receiver)

      if (target === receiver.raw) {
        // 说明 receiver 是 target 的代理对象
        if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
          // 排除 NaN 类型
          trigger(target, prop, type, newVal)
        }
      }
      return res // 一定要有返回值: Boolean 类型
    },
    // 拦截 prop in obj
    has(target, prop) {
      track(target, prop)
      return Reflect.has(target, prop)
    },
    // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/ownKeys
    // 拦截 for ... in | Object.keys | Reflect.ownKeys | ... 扩展符
    ownKeys(target) {
      // 如果目标对象 target 是数组，则使用 length 属性建立响应联系
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, prop) {
      if (isReadonly) {
        console.warn(`prop "${prop}" in ${target} is readonly`)
        return true
      }
      const hadKey = hasOwn(target, prop)
      // 执行删除操作
      const res = Reflect.deleteProperty(target, prop)
      if (res && hadKey) {
        // 只有当被删除的属性是对象自己的属性并且成功删除时，才触发更新
        trigger(target, prop, 'DELETE')
      }
      return res
    }
  })
  return proxy
}
