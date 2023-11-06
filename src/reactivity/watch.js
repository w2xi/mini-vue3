import { effect } from './effect.js'
import { traverse } from '../utils/index.js'

/**
 * 观测的响应式数据变化，执行回调
 * @param {Object|Function} source 对象或者getter
 * @param {Function} cb 回调函数
 */
export function watch(source, cb, options = {}) {
  // 定义旧值和新值
  let oldValue, newValue
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    // 递归读取对象属性
    getter = () => traverse(source)
  }
  // 存储用户注册的过期回调
  let cleanup
  function onInvalidate(fn) {
    cleanup = fn
  }

  // 提取 scheduler 为一个独立的函数
  const job = () => {
    // 执行副作用函数 得到新值
    newValue = effectFn()
    if (cleanup) {
      // 调用过期回调
      cleanup()
    }
    cb(newValue, oldValue, onInvalidate)
    // 更新旧值
    oldValue = newValue
  }

  const effectFn = effect(getter, {
    // 懒执行
    lazy: true,
    scheduler() {
      // flush: 'pre'(组件更新前) | 'post'(组件更新后) | sync (同步，默认方式)
      if (options.flush === 'post') {
        const p = Promise.resolve()
        p.then(job)
      } else {
        job()
      }
    }
  })

  if (options.immediate) {
    // 表示立即执行回调
    job()
  } else {
    oldValue = effectFn()
  }
}
