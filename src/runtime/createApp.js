import { compileToFunction } from '../compiler/compile.js'
import { effect } from '../reactivity/effect.js'
import { proxyRefs } from '../reactivity/ref.js'
import { patch } from './patch.js'
import { isString, isFunction } from "../utils/index.js"

export function createApp(options = {}) {
  const app = {
    mount(container) {
      if (isString(container)) {
        container = document.querySelector(container)
      }
      const template = container.innerHTML
      let render
      if (isFunction(options.render)) { // 用户自定义渲染函数
        render = options.render
      } else {
        ({ render } = compileToFunction(template))
      }
      const setupFn = options.setup || noop
      const data = proxyRefs(setupFn())

      let oldVNode
      const reload = () => {
        const vnode = render(data)
        if (oldVNode) {
          vnode.el = patch(oldVNode, vnode)
        } else {
          container.innerHTML = ''
          _mount(vnode, container)
        }
        oldVNode = vnode
      }

      effect(() => {
        reload()
      })
    }
  }

  return app
}

function _mount(vnode, container) {
  const el = vnode.el = document.createElement(vnode.tag)
  // handle props
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
  // handle children
  if (vnode.children) {
    if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        _mount(child, el)
      })
    } else { // text node
      el.textContent = vnode.children
    }
  }
  container.appendChild(el)
}