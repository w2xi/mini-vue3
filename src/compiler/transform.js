import { NodeTypes } from './ast.js'

/**
 * AST 转换
 * @param {Object} root 根节点
 */
export function transform(root, options = {}) {
  // 1. 创建 context
  const context = createTransformContext(root, options)
  // 2. 遍历 ast
  traverseNode(root, context)

  createRootCodegen(root)
}

/**
 * 深度优先遍历 AST 节点
 * @param {Object} ast
 */
function traverseNode(ast, context) {
  context.currentNode = ast
  // 先序遍历

  const exitFns = []
  const transforms = context.nodeTransforms
  for (let i = 0; i < transforms.length; i++) {
    // 执行转换操作
    // 返回待执行的一个回调函数
    const onExit = transforms[i](context.currentNode, context)
    if (onExit) {
      exitFns.push(onExit)
    }
    // 由于转换函数可能移除当前节点，因此需要在转换函数执行之后检查当前节点是否存在，如果不存在，则直接返回
    if (!context.currentNode) return
  }

  const children = context.currentNode.children
  if (children) {
    children.forEach((child, index) => {
      context.parent = context.currentNode
      context.childIndex = index
      traverseNode(child, context)
    })
  }

  let size = exitFns.length
  // 回调函数反序执行，其本质和后续遍历没啥区别
  // 保证了 先处理子节点 再处理父节点
  while (size--) {
    exitFns[size]()
  }
}

function createTransformContext(
  root,
  { nodeTransforms = [] }
) {
  const context = {
    // 当前转换的节点
    currentNode: null,
    // 当前节点在父节点的 children 中的位置索引
    childIndex: 0,
    // 当前转换节点的父节点
    parent: null,
    // 用于替换节点的函数，接收新节点作为参数
    replaceNode(node) {
      // 替换节点
      context.parent.children[context.childIndex] = node
      // 更新当前节点
      context.currentNode = node
    },
    // 移除当前节点
    removeNode() {
      if (context.parent) {
        context.parent.children.splice(context.childIndex, 1)
        // 置空当前节点
        context.currentNode = null
      }
    },
    // 注册 nodeTransforms 数组 (解耦)
    nodeTransforms,
  }

  return context
}

function createRootCodegen(root) {
  const { children } = root
  if (children.length === 1) { 
    // 单根节点
    const child = children[0]
    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
      const codegenNode = child.codegenNode
      root.codegenNode = codegenNode
    } else {
      root.codegenNode = child
    }
  } else if (children.length > 1) { 
    // 多根节点
    // ...
  } else {
    // no children
  }
}

function createIdentifier(name) {
  return {
    type: 'Identifier',
    name
  }
}

function createArrayExpression(elements) {
  return {
    type: 'ArrayExpression',
    elements
  }
}

function createCallExpression(callee, args) {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    arguments: args
  }
}
