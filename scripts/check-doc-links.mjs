import { access, readdir, readFile } from "node:fs/promises"
import path from "node:path"

const ROOT_DIR = process.cwd()
const SKIP_DIRS = new Set([".git", "node_modules", "target"])
const MARKDOWN_LINK_PATTERN = /\[[^\]]*]\(([^)]+)\)/g

const isExternalLink = (target) => /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(target)

const normalizeLinkTarget = (rawTarget) => {
  let target = rawTarget.trim()

  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1).trim()
  }

  target = target.replace(/\s+"[^"]*"$/, "")
  target = target.replace(/\s+'[^']*'$/, "")

  const hashIndex = target.indexOf("#")
  if (hashIndex >= 0) {
    target = target.slice(0, hashIndex)
  }

  const queryIndex = target.indexOf("?")
  if (queryIndex >= 0) {
    target = target.slice(0, queryIndex)
  }

  if (!target) {
    return null
  }

  try {
    return decodeURI(target)
  } catch {
    return target
  }
}

const getLineNumber = (content, index) => {
  return content.slice(0, index).split("\n").length
}

const collectMarkdownFiles = async (directory) => {
  const markdownFiles = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        markdownFiles.push(...(await collectMarkdownFiles(absolutePath)))
      }
      continue
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownFiles.push(absolutePath)
    }
  }

  return markdownFiles
}

const run = async () => {
  const markdownFiles = await collectMarkdownFiles(ROOT_DIR)
  const failures = []

  for (const markdownFile of markdownFiles) {
    const content = await readFile(markdownFile, "utf8")
    const links = content.matchAll(MARKDOWN_LINK_PATTERN)

    for (const match of links) {
      const rawTarget = match[1]
      const target = normalizeLinkTarget(rawTarget)

      if (!target || target.startsWith("#") || isExternalLink(target)) {
        continue
      }

      const resolvedPath = target.startsWith("/")
        ? path.resolve(ROOT_DIR, target.slice(1))
        : path.resolve(path.dirname(markdownFile), target)

      try {
        await access(resolvedPath)
      } catch {
        failures.push({
          file: path.relative(ROOT_DIR, markdownFile),
          line: getLineNumber(content, match.index ?? 0),
          target,
          resolvedPath: path.relative(ROOT_DIR, resolvedPath)
        })
      }
    }
  }

  if (failures.length > 0) {
    console.error("Broken Markdown links found:")
    for (const failure of failures) {
      console.error(
        `- ${failure.file}:${failure.line} -> ${failure.target} (resolved: ${failure.resolvedPath})`
      )
    }
    process.exit(1)
  }

  console.log(`Checked ${markdownFiles.length} Markdown files. No broken local links found.`)
}

await run()
