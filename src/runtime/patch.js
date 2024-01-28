/**
 * @param {*} n1 old vnode
 * @param {*} n2 new vnode
 * @returns 
 */
export function patch(n1, n2) {
  // there are lots of assumption and only handle simpler cases

  // patch tag
  if (n1.tag === n2.tag) {
    const el = n2.el = n1.el
    // patch props
    const oldProps = n1.props || {}
    const nweProps = n2.props || {}
    for (const key in nweProps) {
      const oldValue = oldProps[key]
      const newValue = nweProps[key]
      if (oldValue !== newValue) {
        el.setAttribute(key, newValue)
      }
    }
    // patch children
    const oldChildren = n1.children
    const newChildren = n2.children
    if (typeof newChildren === 'string') {
      if (typeof oldChildren === 'string') {
        if (newChildren !== oldChildren) {
          el.textContent = newChildren
        }
      } else { 
        // oldChildren is a array, but we can just override it
        el.textContent = newChildren
      }
    } else {
      if (typeof oldChildren === 'string') {
        // discard oldChildren
        el.innerHTML = ''
        // mount newChildren
        newChildren.forEach(child => {
          mount(child, el)
        })
      } else {
        // both old and new is a array

        const commonLength = Math.min(oldChildren.length, newChildren.length)
        for (let i = 0; i < commonLength; i++) {
          patch(oldChildren[i], newChildren[i])
        }
        if (newChildren.length > oldChildren.length) {
          // to new node, just mount it 
          newChildren.slice(oldChildren.length).forEach(child => {
            mount(child, el)
          })
        } else if (newChildren.length < oldChildren.length) {
          oldChildren.slice(newChildren.length).forEach(child => {
            // unmount old el
            el.removeChild(child.el)
          })
        }
      }
    }
  } else {
    // ...

    // unmount old dom
    n1.parent.removeChild(n1.el)
    // mount new dom
    const el = n2.el = document.createElement(n2.tag)
    n1.parent.appendChild(el)
  }

  return n1.el
}