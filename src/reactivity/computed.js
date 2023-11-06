import { trigger, track } from './effect.js'
import { effect } from './effect.js'

/**
 * 计算属性
 * @param {Function|Object} fn
 * @returns
 */
export function computed(fn) {
  // 缓存上一次计算的值
  let value
  // 标识是否是脏数据. 如果是脏数据需要重新计算求值，否则从缓存拿
  let dirty = true
  const getter = typeof fn === 'function' ? fn : fn.get
  const setter = fn.set
  let obj

  const effectFn = effect(getter, {
    // 依赖项发生变化 执行调度函数
    scheduler() {
      if (!dirty) {
        dirty = true
        // 当计算属性依赖的响应式数据变化时，手动调用 trigger 触发响应 执行副作用函数
        trigger(obj, 'value')
      }
    },
    lazy: true // 懒执行 (副作用函数)
  })

  obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty = false
      }
      // 当读取 value 时，手动追踪依赖
      track(obj, 'value')
      return value
    },
    set value(newVal) {
      if (typeof setter === 'function') {
        setter(newVal)
      }
    }
  }
  return obj
}
