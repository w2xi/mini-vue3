export const NodeTypes = {
  // AST
  ROOT: 'ROOT',
  ELEMENT: 'ELEMENT',
  TEXT: 'TEXT',
  SIMPLE_EXPRESSION: 'SIMPLE_EXPRESSION',
  INTERPOLATION: 'INTERPOLATION',
  ATTRIBUTE: 'ATTRIBUTE',
  DIRECTIVE: 'DIRECTIVE',
}

export function createVNodeCall(type, tag, props, children) {
  return {
    type,
    tag,
    props,
    children
  }
}
