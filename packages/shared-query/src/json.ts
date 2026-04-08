export type QueryJsonPrimitive = boolean | number | string | null

export interface QueryJsonObject {
  [key: string]: QueryJsonValue
}

export type QueryJsonValue = QueryJsonPrimitive | QueryJsonObject | QueryJsonValue[]
