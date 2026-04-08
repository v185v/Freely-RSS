import type { QueryDefinition, QueryNode, QuerySort } from "./ast.ts"
import type { QueryJsonObject, QueryJsonValue } from "./json.ts"
import { normalizeQueryDefinition } from "./normalize.ts"
import { assertValidQueryDefinition } from "./validate.ts"

function serializeNode(node: QueryNode): QueryJsonObject {
  if (node.kind === "group") {
    return {
      children: node.children.map((child) => serializeNode(child)),
      kind: node.kind,
      match: node.match,
    }
  }

  if (node.kind === "not") {
    return {
      child: serializeNode(node.child),
      kind: node.kind,
    }
  }

  return {
    field: node.field,
    kind: node.kind,
    operator: node.operator,
    value: Array.isArray(node.value) ? [...node.value] : node.value,
  }
}

function serializeSort(sort: QuerySort): QueryJsonObject {
  return {
    direction: sort.direction,
    field: sort.field,
    nulls: sort.nulls,
  }
}

function isJsonObject(value: QueryJsonValue): value is QueryJsonObject {
  return value !== null && !Array.isArray(value) && typeof value === "object"
}

export function serializeQueryDefinition(definition: QueryDefinition): QueryJsonObject {
  const normalized = normalizeQueryDefinition(assertValidQueryDefinition(definition))

  return {
    root: serializeNode(normalized.root),
    sort: normalized.sort.map((sort) => serializeSort(sort)),
    version: normalized.version,
  }
}

export function parseQueryDefinitionJson(value: QueryJsonValue): QueryDefinition {
  if (!isJsonObject(value)) {
    throw new Error("Serialized query definitions must be JSON objects.")
  }

  const definition = value as unknown as QueryDefinition

  return normalizeQueryDefinition(assertValidQueryDefinition(definition))
}
