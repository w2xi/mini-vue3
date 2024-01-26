export function isObject(val) {
  return val && typeof val === 'object'
}
  
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key)
}

// 递归遍历 obj
export function traverse(obj, seen = new Set()) {
  // 避免循环引用
  if (seen.has(obj)) return
  seen.add(obj)
  for (let key in obj) {
    if (isObject(obj[key])) {
      traverse(obj[key])
    } else {
      obj[key]
    }
  }
  return obj
}

export function isSet(val) {
  return type(val, 'set')
}

export function isMap(val) {
  return type(val, 'map')
}

export function isString(val) {
  return type(val, 'string')
}

export function isFunction(val) {
  return type(val, 'function')
}

const toString = Object.prototype.toString
function type(val, type) {
  const str = toString.call(val)
  const matched = str.match(/\[object (\w+)\]/)
  if (matched) {
    return matched[1].toLowerCase() === type.toLowerCase()
  }
  return false
}
