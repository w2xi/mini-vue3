import { NodeTypes } from "./ast"

/**
 * 模板解析
 * @param {String} str 模板字符串
 * @returns {Object}
 */
export function parse(str) {
  const context = {
    // 存储模板字符串
    source: str,
    // 前进 num 个字符
    advanceBy(num) {
      context.source = context.source.slice(num)
    },
    advanceSpaces() {
      // 匹配空格
      const match = /^[\t\r\n\f ]+/.exec(context.source)
      if (match) {
        context.advanceBy(match[0].length)
      }
    }
  }
  const nodes = parseChildren(context, [])
  // 根节点
  const root = {
    type: NodeTypes.ROOT,
    children: nodes
  }
  return root
}

/**
 * 解析子节点
 * @param {Object} context 上下文
 * @param {Array} ancestors 祖先节点
 */
function parseChildren(context, ancestors = []) {
  const nodes = []

  while (!isEnd(context, ancestors)) {
    let node
    const s = context.source

    if (s.startsWith('{{')) {
      // 解析插值表达式
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      if (s[1] === '/') {
        // 结束标签
      } else if (/[a-z]/i.test(s[1])) {
        // 解析开始标签
        node = parseElement(context, ancestors)
      }
    }
    if (!node) {
      node = parseText(context)
    }
    nodes.push(node)
  }

  /**
   * 举例:
   * const template = `
   *    <div>
   *      <p>Template</p>
   *    </div>
   * `
   * => ast
   * {
        "type": "Root",
        "children": [
          { "type": "Text", "content": "\n  "},
          {
            "type": "Element",
            "tag": "div",
            "props": [],
            "children": [
              { "type": "Text", "content": "\n    " },
              {
                "type": "Element",
                "tag": "p",
                "props": [],
                "children": [
                  { "type": "Text", "content": "Template" }
                ]
              },
              { "type": "Text", "content": "\n  " }
            ]
          },
          { "type": "Text", "content": "\n" }
        ]
      }
   * 
   */

  // whitespace handling strategy
  let removeWhitespace = false; // 标记是否需要移除节点
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'TEXT') {
      // 如果是文本节点
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        // 匹配 `\t\r\n\f `
        const prev = nodes[i - 1];
        const next = nodes[i + 1];

        if (
          !prev ||
          !next ||
          (prev.type === 'Element' &&
            next.type === 'Element' &&
            /[\r\n]/.test(node.content))
        ) {
          // 处理第一个 或 最后一个 或 连续多个 或 夹在中间的空白符文本节点

          removeWhitespace = true;
          nodes[i] = null;
        } else {
          node.content = ' ';
        }
      } else {
        // 将多个空格，换行等 替换为一个空字符串
        // 比如: `   abc   ` => ' abc '
        node.content = node.content.replace(/[\t\r\f\n ]+/g, ' ');
      }
    }
  }

  return removeWhitespace ? nodes.filter(Boolean) : nodes;
}

/**
 * 解析插值表达式
 * @param {*} context 上下文
 * @returns
 */
function parseInterpolation(context) {
  const { advanceBy } = context
  // 移除 {{
  advanceBy(2)
  const closeIndex = context.source.indexOf('}}')
  const rawContent = context.source.slice(0, closeIndex)
  // 去掉前后空格
  const content = rawContent.trim()
  advanceBy(rawContent.length)
  // 移除 }}
  advanceBy(2)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content
    }
  }
}

/**
 * 解析元素
 * @param {*} context 
 * @param {*} ancestors 
 * @returns 
 */
function parseElement(context, ancestors) {
  // 解析开始标签
  // <div></div>
  const element = parseTag(context)

  ancestors.push(element)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  if (context.source.startsWith(`</${element.tag}`)) {
    // 解析结束标签
    parseTag(context, 'end')
  } else {
    console.error(`缺失结束标签：${element.tag}`)
  }

  return element
}

/**
 * 解析标签
 * @param {*} context 
 * @param {*} type 
 * @returns 
 */
function parseTag(context, type = 'start') {
  const { source, advanceBy, advanceSpaces } = context
  // <div></div>
  // type=start: ['<div', 'div', index: 0, input: '<div>', groups: undefined]
  const match =
    type === 'start'
      ? /^<([a-z][^\t\r\n\f />]*)/i.exec(source) // 匹配开始标签
      : /^<\/([a-z][^\t\r\n\f />]*)/i.exec(source) // 匹配结束标签
  const tag = match[1]

  // 移除 <div
  advanceBy(match[0].length)
  // 移除多余空格
  advanceSpaces()

  const props = parseAttributes(context)

  // 暂时不处理自闭合标签
  // 移除 >
  advanceBy(1)

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children: []
  }
}

/**
 * 解析标签属性
 * @param {*} context
 * @returns {Array}
 * @example
 *
 * id="foo" class="bar"
 * =>
 * [{ type: 'Attribute', name: 'id', value: 'foo' }, { type: 'Attribute', name: 'class', value: 'bar' }]
 */
function parseAttributes(context) {
  const { advanceBy, advanceSpaces } = context
  const props = []

  // example: id="foo" class="bar"></div>
  while (!context.source.startsWith('>') && !context.source.startsWith('/>')) {
    const match = /([\w:-@]+)=/.exec(context.source)
    // 属性名称
    let name = match[1]
    // 移除 id
    advanceBy(name.length)
    // 移除 =
    advanceBy(1)

    let isStatic = true
    if (name.startsWith('@')) { // @click -> onClick
      isStatic = false 
      const eventName = name.slice(1)
      name = 'on' + eventName[0].toUpperCase() + eventName.slice(1)
    }

    let value = ''

    const quote = context.source[0]
    const isQuoted = quote === '"' || quote === "'"
    if (isQuoted) {
      advanceBy(1)
      const endIndex = context.source.indexOf(quote)
      value = context.source.slice(0, endIndex)
      advanceBy(value.length)
      advanceBy(1)
    } else {
      // 处理非引号包裹的属性值
    }
    // 移除空格
    advanceSpaces()

    props.push({
      type: NodeTypes.ATTRIBUTE,
      name,
      value,
      isStatic,
    })
  }

  return props
}

/**
 * 解析文本
 * @param {*} context 
 * @returns 
 * @examples
 * 
 * case 1: template</div>
 * case 2: template {{ msg }}</div>
 * ...
 */
function parseText(context) {
  let endIndex = context.source.length
  const ltIndex = context.source.indexOf('<')
  const delimiterIndex = context.source.indexOf('{{')

  if (ltIndex > -1 && ltIndex < endIndex) {
    endIndex = ltIndex
  }
  if (delimiterIndex > -1 && delimiterIndex < endIndex) {
    endIndex = delimiterIndex
  }

  const content = context.source.slice(0, endIndex)

  context.advanceBy(content.length)

  return {
    type: NodeTypes.TEXT,
    content
  }
}

/**
 * 是否解析结束
 * @param {*} context 
 * @param {*} ancestors 
 */
function isEnd(context, ancestors) {
  if (!context.source) return true
  // 与节点栈内全部的节点比较
  for (let i = ancestors.length - 1; i >= 0; --i) {
    if (context.source.startsWith(`</${ancestors[i].tag}`)) {
      return true
    }
  }
}

// console.log('开始解析:')
// const ast = parse(
//   `<div id="foo" class="bar"><p>{{ msg }}</p><p>Template</p></div>`
// )

// console.dir(ast, { depth: null })
