import { compileToFunction } from '../compiler/compile.js'
import { effect } from '../reactivity/effect.js'
import { proxyRefs } from '../reactivity/ref.js'
import { isString } from "../utils/index.js"

export function createApp(options = {}) {
  const app = {
    mount(container) {
      if (isString(container)) {
        container = document.querySelector(container)
      }
      const template = container.innerHTML
      const render = compileToFunction(template)
      const setupFn = options.setup || noop
      const data = proxyRefs(setupFn())

      const reload = () => {
        const vnode = render(data)      
        container.innerHTML = ''
        _mount(vnode, container)
      }

      effect(() => {
        reload()
      })
    }
  }

  return app
}

function _mount(vnode, container) {
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
    vnode.children.forEach(child => {
        _mount(child, el)
    })
  } else { // text node
      el.textContent = vnode.children
  }

  container.appendChild(el)
}