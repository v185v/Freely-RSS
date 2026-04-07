export class ConfigValidationError extends Error {
  constructor(path, message) {
    super(`${path}: ${message}`)
    this.name = "ConfigValidationError"
    this.path = path
  }
}
