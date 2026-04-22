export interface QueryValidationIssue {
  path: string
  code: string
  message: string
}

export interface QueryTextRange {
  column: number
  end: number
  line: number
  start: number
}

function getTextPosition(input: string, index: number) {
  let line = 1
  let column = 1

  for (let cursor = 0; cursor < index; cursor += 1) {
    if (input[cursor] === "\n") {
      line += 1
      column = 1
      continue
    }

    column += 1
  }

  return {
    line,
    column,
  }
}

export class QueryValidationError extends Error {
  readonly issues: QueryValidationIssue[]

  constructor(issues: QueryValidationIssue[]) {
    super(
      issues.length === 1
        ? issues[0].message
        : `Query validation failed with ${issues.length} issues.`,
    )

    this.name = "QueryValidationError"
    this.issues = issues
  }
}

export class QueryTextParseError extends Error {
  readonly code: string
  readonly input: string
  readonly range: QueryTextRange

  constructor(input: string, start: number, end: number, code: string, message: string) {
    super(message)

    const position = getTextPosition(input, start)

    this.name = "QueryTextParseError"
    this.code = code
    this.input = input
    this.range = {
      start,
      end,
      line: position.line,
      column: position.column,
    }
  }
}
