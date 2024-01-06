export function createVNodeCall(context, tag, props, children) {
  if (context) {
    // context.helper(CREATE_ELEMENT_VNODE);
  }

  return {
    type: 'Element',
    tag,
    props,
    children
  }
}
