import { createVNodeCall } from './ast.js'
import { dump } from './util.js'

/**
 * AST 转换
 * @param {Object} root 根节点
 */
export function transform(root) {
  // 1. 创建 context
  const context = createTransformContext(root)

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

function createTransformContext(root, options = {}) {
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
    nodeTransforms: [
      // transformRoot,
      transformElement,
      transformText,
      transformExpression
    ]
  }

  return context
}

function createRootCodegen(root) {
  const { children } = root
  const child = children[0]
  if (child.type === 'Element' && child.codegenNode) {
    const codegenNode = child.codegenNode
    root.codegenNode = codegenNode
  } else {
    root.codegenNode = child
  }
}

// =============================== transform 工具函数 ===============================

function transformExpression(node) {
  if (node.type === 'Interpolation') {
    node.content = processExpression(node.content)
    // node.jsNode = {
    //   type: 'Interpolation',
    //   content: node.content
    // }
  }
}

function processExpression(node) {
  node.content = `_ctx.${node.content}`
  return node
}

// 转换标签节点
function transformElement(node, context) {
  // 将转换代码编写在退出阶段的回调函数中，
  // 这样可以保证该标签节点的子节点全部被处理完毕、
  return () => {
    if (node.type !== 'Element') {
      return
    }
    const tag = node.tag
    const props = node.props
    const children = node.children

    node.codegenNode = createVNodeCall(context, tag, props, children)

    // 1. 创建 h 调用函数
    // h 函数的第一个参数是标签名称，因此以 node.tag 来创建一个字符串字面量节点
    // 作为第一个参数
    // const callExp = createCallExpression('h', [createStringLiteral(node.tag)])
    // // 2. 处理 h 函数调用的参数
    // // 处理 props
    // node.props.length && callExp.arguments.push(...node.props)
    // // 处理 children
    // node.children.length === 1
    //   ? // 如果当前标签节点只有一个子节点，则直接使用子节点的 jsNode 作为参数
    //     callExp.arguments.push(node.children[0].jsNode)
    //   : // 如果当前标签节点有多个子节点，则创建一个 ArrayExpression 节点作为参数
    //     callExp.arguments.push(
    //       // 数组的每个元素都是子节点的 jsNode
    //       createArrayExpression(node.children.map(c => c.jsNode))
    //     )
    // // 3. 将当前标签节点对应的 JS AST 添加到 jsNode 属性下
    // node.jsNode = callExp
  }
}

// 转换文本节点
function transformText(node) {
  if (node.type !== 'Text') {
    return
  }
  // node.jsNode = createStringLiteral(node.content)
}

/**
 * 转换根节点
 * @param {Object} node
 * @returns
 */
function transformRoot(node) {
  // 将逻辑编写在退出阶段的回调函数中，保证子节点全部被处理完毕
  return () => {
    if (node.type !== 'Root') {
      return
    }
    // node 是根节点，根节点的第一个子节点就是模板的根节点，
    // 当然，这里我们暂时不考虑模板存在多个根节点的情况
    const vnodeJSAST = node.children[0].jsNode
    // 创建 render 函数的声明语句节点，将 vnodeJSAST 作为 render 函数体的返回语句
    node.jsNode = {
      type: 'FunctionDecl',
      id: { type: 'Identifier', name: 'render' },
      params: [],
      body: [
        {
          type: 'ReturnStatement',
          return: vnodeJSAST
        }
      ]
    }
  }
}

function createStringLiteral(value) {
  return {
    type: 'StringLiteral',
    value
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
