export interface QueryValidationIssue {
  path: string
  code: string
  message: string
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
