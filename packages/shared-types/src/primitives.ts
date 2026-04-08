export type Nullable<T> = T | null

export type ISODateTimeString = string
export type UrlString = string
export type LanguageCode = string
export type HexColor = string
export type CachePath = string

export type JsonPrimitive = boolean | number | string | null

export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
