import { NodeTypes, createVNodeCall } from '../ast.js'

// 转换标签节点
export function transformElement(node, context) {
  // 将转换代码编写在退出阶段的回调函数中，
  // 这样可以保证该标签节点的子节点全部被处理完毕、
  return () => {
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }
    const type = node.type
    const tag = node.tag
    const props = node.props
    const children = node.children

    node.props.forEach(prop => {
      if (!prop.isStatic) {
        prop.value = `_ctx.${prop.value}`
      }
    })
    node.codegenNode = createVNodeCall(type, tag, props, children)
  }
}