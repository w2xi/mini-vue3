export const NodeTypes = {
  // AST
  ROOT: 'Root',
  ELEMENT: 'Element',
  TEXT: 'Text',
  SIMPLE_EXPRESSION: 'Simple_Expression',
  INTERPOLATION: 'Interpolation',
  ATTRIBUTE: 'Attribute',
  DIRECTIVE: 'Directive',
}

export function createVNodeCall(type, tag, props, children) {
  return {
    type,
    tag,
    props,
    children
  }
}
