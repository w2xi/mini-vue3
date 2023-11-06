import { shouldTrack } from './reactive.js'
import { isMap } from '../utils/index.js'

export const ITERATE_KEY = Symbol()
export const MAP_KEY_ITERATE_KEY = Symbol()

const bucket = new WeakMap()

// 当前注册（激活）的副作用函数
let activeEffect
//! 副作用函数栈，activeEffect 指向栈顶，保证 activeEffect 始终指向正确的副作用函数
//! 用来解决 effect 嵌套问题
const effectStack = []

// 用来注册副作用函数
export function effect(fn, options = {}) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    const result = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
    return result
  }
  // activeEffect.deps 用来存储与该副作用函数相关联的依赖集合
  effectFn.deps = []
  effectFn.options = options
  if (!options.lazy) {
    // 执行副作用函数
    effectFn()
  }
  return effectFn
}

// 在 get 拦截器中调用 track 函数追踪变化
export function track(target, prop) {
  // 如果 当前副作用函数不存在 或 禁止追踪时，直接返回
  if (!activeEffect || !shouldTrack) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(prop)
  if (!deps) {
    depsMap.set(prop, (deps = new Set()))
  }
  deps.add(activeEffect) // 收集副作用函数
  activeEffect.deps.push(deps)
}

// 在 set 拦截器中调用 trigger 函数触发变化
export function trigger(target, prop, type, newVal) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(prop)
  //! 解决无限循环问题
  const effectsToRun = new Set()
  effects &&
    effects.forEach(effectFn => {
      //! 用来解决 在副作用函数中执行 proxy.count++ 类似问题，即
      //! 如果 trigger 触发执行的副作用函数和当前正在执行的副作用函数相同，则不触发执行
      if (activeEffect !== effectFn) {
        effectsToRun.add(effectFn)
      }
    })
  // 只有操作类型是 `ADD` | `DELETE` | `SET` 且目标对象是 Map
  // 才触发与 ITERATE_KEY 相关联的副作用函数重新执行
  if (
    type === 'ADD' ||
    type === 'DELETE' ||
    (type === 'SET' && isMap(target))
  ) {
    const iterateEffects = depsMap.get(ITERATE_KEY)
    iterateEffects &&
      iterateEffects.forEach(effectFn => {
        if (activeEffect !== effectFn) {
          effectsToRun.add(effectFn)
        }
      })
  }
  // 如果 操作类型为 `ADD` | 'DELETE' 且 目标对象是 Map 类型，触发 MAP_KEY_ITERATE_KEY 相关联的副作用函数
  // 处理 for (const key of map.keys()) {/*...*/}
  if ((type === 'ADD' || type === 'DELETE') && isMap(target)) {
    const iterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY)
    iterateEffects &&
      iterateEffects.forEach(effectFn => {
        if (activeEffect !== effectFn) {
          effectsToRun.add(effectFn)
        }
      })
  }
  if (type === 'ADD' && Array.isArray(target)) {
    // 如果是新增操作且 target 是数组，说明需要触发 length 属性对应的 副作用函数的执行
    const lengthEffects = depsMap.get('length')
    lengthEffects &&
      lengthEffects.forEach(effectFn => {
        if (activeEffect !== effectFn) {
          effectsToRun.add(effectFn)
        }
      })
  }
  if (Array.isArray(target) && prop === 'length') {
    // 设置数组长度
    depsMap.forEach((effects, key) => {
      // 只有当 key 是数组索引且 key 大于等于新设置的数组长度时才会触发执行
      if (key >= newVal) {
        effects.forEach(effectFn => {
          if (activeEffect !== effectFn) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }
  // 触发依赖更新
  effectsToRun.forEach(effectFn => {
    const options = effectFn.options
    if (options.scheduler) {
      options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}

// 清除依赖关系
function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    // 依赖集合
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  // 重置
  effectFn.deps.length = 0
}
