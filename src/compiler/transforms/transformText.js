import { NodeTypes } from "../ast";

// 转换文本节点
export function transformText(node) {
  if (node.type !== NodeTypes.TEXT) {
    return
  }
}