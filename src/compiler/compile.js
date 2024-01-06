import { parse } from './parse.js'
import { generate } from './codegen.js'
import { transform } from './transform.js'

/**
 * 将模板编译为渲染函数字符串
 * @param {String} template 模板
 * @returns {String} 渲染函数字符串
 */
export function baseCompile(template) {
  // 将模板解析为 AST
  const ast = parse(template)
  // 将模板 AST 转换为 JS AST
  transform(ast)
  // const jsAST = templateAST.codegenNode
  // 生成渲染函数字符串 ( `return function render() {/*...*/}` )
  const code = generate(ast)

  return code
}

/**
 * 将模板编译为渲染函数
 * @param {String} template 模板
 * @returns
 */
export function compileToFunction(template) {
  const { code } = baseCompile(template)
  const render = new Function(code)()
  return render
}
