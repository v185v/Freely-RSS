import type { QueryDefinition, QueryGroupNode, QueryNode, QuerySort } from "./ast.ts"

function normalizeGroup(node: QueryGroupNode): QueryNode {
  const children = node.children
    .map(normalizeQueryNode)
    .flatMap((child) =>
      child.kind === "group" && child.match === node.match ? child.children : [child],
    )

  if (children.length === 1) {
    return children[0]
  }

  return {
    kind: "group",
    match: node.match,
    children,
  }
}

export function normalizeQueryNode(node: QueryNode): QueryNode {
  if (node.kind === "group") {
    return normalizeGroup(node)
  }

  if (node.kind === "not") {
    const child = normalizeQueryNode(node.child)

    if (child.kind === "not") {
      return normalizeQueryNode(child.child)
    }

    return {
      kind: "not",
      child,
    }
  }

  if (Array.isArray(node.value)) {
    return {
      ...node,
      value: [...node.value],
    }
  }

  return {
    ...node,
  }
}

function normalizeSort(sort: QuerySort): QuerySort {
  return { ...sort }
}

export function normalizeQueryDefinition(definition: QueryDefinition): QueryDefinition {
  return {
    version: 1,
    root: normalizeQueryNode(definition.root),
    sort: definition.sort.map(normalizeSort),
  }
}
