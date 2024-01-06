import { compileToFunction } from './compile.js'
import { effect } from '../reactivity/effect.js'
import { proxyRefs } from '../reactivity/ref.js'
import { h } from './h.js'

let _mount = mount

export function createApp(options = {}) {
  function $mount(container) {
    let template = ''
    if (typeof container === 'string') {
      template = document.querySelector(container).innerHTML
      container = document.querySelector(container)
    } else {
      template = container.innerHTML
    }
    const render = compileToFunction(template)
    const setupFn = options.setup || noop
    const data = proxyRefs(setupFn())

    const reload = () => {
      const vnode = render(data, { h, _toDisplayString: function toString(val) { return val && val.toString() } })      
      container.innerHTML = ''
      _mount(vnode, container)  
    }

    effect(() => {
      reload()
    })
  }
  
  return {
    mount: $mount,
  }
}

function mount(vnode, container) {
  const el = document.createElement(vnode.tag)

  if (vnode.props) {
      for (let key in vnode.props) {
          if (key.startsWith('on')) { // 事件绑定
              const eventName = key.slice(2).toLowerCase()
              el.addEventListener(eventName, vnode.props[key])
          } else {
              el.setAttribute(key, vnode.props[key])
          }
      }
  }
  if (Array.isArray(vnode.children)) {
    if (vnode.children.length === 1 && typeof vnode.children[0] != 'object') {
      el.textContent = vnode.children[0]
    } else {
      vnode.children.forEach(child => {
          mount(child, el)
      })
    }
  } else { // string
      el.textContent = vnode.children
  }

  container.appendChild(el)
}