import { NodeTypes } from './ast.js'
import {
  CREATE_ELEMENT_VNODE,
  helperNameMap,
  TO_DISPLAY_STRING
} from './runtimeHelpers.js'

/**
 * 代码生成
 * @param {Object} ast JS AST
 * @returns {String}
 */
export function generate(ast) {
  // 创建上下文
  const context = createCodegenContext()
  genCode(ast.codegenNode, context)

  return {
    code: context.code // 渲染函数代码
  }
}

/**
 * 以渲染函数为例，生成类似 `function render(...)  { return ... }` 代码字符串
 with(ctx) {...}
 * @param {Object} node JS AST
 * @param {Object} context
 */
 function genCode(node, context) {
  // 工具函数
  const { push, indent, deIndent } = context
  const fnName = 'render'
  const args = ['_ctx']
  const signature = args.join(', ')

  // 用于最后将代码字符串转为函数
  // new Function(code)
  push(`return `)
  push(`function ${fnName}(`)

  // 生成函数参数代码字符串
  // genNodeList(node.params, context)
  push(signature)
  push(`) `)
  push(`{`)
  // 缩进
  indent()
  push(`const { h, toDisplayString: _toDisplayString } = MiniVue`)
  indent()
  push(`return `)
  // 为函数体生成代码，这里递归地调用 genNode 函数
  // node.body.forEach(n => genNode(n, context))
  genNode(node, context)
  // 取消缩进
  deIndent()
  push(`}`)
}

/**
 * 根据节点类型生成对应代码
 * @param {*} node
 * @param {*} context
 */
function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
      break
  }
}

/**
 * 生成调用表达式
 * @param {*} node
 * @param {*} context
 * @example
 *
 * 三个参数依次是：tag props children
 * createElementVNode('div', {}, [])
 */
function genElement(node, context) {
  const { push, helper } = context
  const { tag, props, children } = node
  // push(`${helper(CREATE_ELEMENT_VNODE)}('${tag}', `)
  push(`h('${tag}', `)

  if (props) {
    genProps(props, context)
  } else {
    push('null, ')
  }
  if (children) {
    genChildren(children, context)
  } else {
    push('null')
  }
  push(`)`)
}

// props: [
//   { type: 'Attribute', name: 'id', value: 'foo' },
//   { type: 'Attribute', name: 'class', value: 'bar' }
// ]
// => { id: 'foo', class: 'bar' }
//
function genProps(props, context) {
  const { push } = context
  if (!props.length) {
    push('{}, ')
    return
  }
  push('{ ')

  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    const key = prop ? prop.name : ''
    const value = prop ? prop.value : prop
    push(JSON.stringify(key))
    push(': ')
    push(prop.isStatic ? JSON.stringify(value) : value)

    if (i < props.length - 1) {
      push(', ')
    }
  }
  push(' }, ')
}

function genChildren(children, context) {
  genArrayExpression(children, context)
}

function genText(node, context) {
  const { push } = context
  push(`'${node.content}'`)
}

/**
 * @param {*} node
 * @param {*} context
 * @example
 *
 * { type: 'Interpolation', content: { type: 'Expression', content: '_ctx.msg' } }
 * =>
 * _ctx.msg
 */
function genInterpolation(node, context) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

function genExpression(node, context) {
  context.push(node.content)
}

/**
 * 生成数组表达式
 * @param {Object} node
 * @param {Object} context
 */
function genArrayExpression(node, context) {
  const { push } = context
  // 追加方括号
  push('[')
  // 为数组元素生成代码
  genNodeList(node, context)
  push(']')
}

/**
 * 生成节点列表
 * @param {Array} nodes
 * @param {Object} context
 */
function genNodeList(nodes, context) {
  const { push } = context

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (typeof node === 'string') {
      push(`'${node}'`)
    } else {
      genNode(node, context)
    }
    // 最后一个参数不需要逗号
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

function createCodegenContext() {
  const context = {
    code: '',
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code) {
      context.code += code
    },
    // 当前缩进级别，初始值为0，即没有缩进
    currentIndent: 0,
    // 换行，即在代码字符串后面追加 \n 字符，且换行时应该保留缩进，追加 currentIndent * 2 个字符
    newLine() {
      context.code += '\n' + '  '.repeat(context.currentIndent * 2)
    },
    // 用来缩进，即让 currentIndent 自增后，调用 newLine 函数
    indent() {
      context.currentIndent++
      context.newLine()
    },
    // 取消缩进，即让 currentIndent 自减后，调用 newLine 函数
    deIndent() {
      context.currentIndent--
      context.newLine()
    }
  }

  return context
}
