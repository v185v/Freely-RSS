import type {
  ReaderDocumentExportFormat,
  ReaderDocumentExportPresentation,
  ReaderFontFamily,
  ReaderFontScale,
  ReaderLineHeight,
  ReaderMarginMode,
  ReaderThemeTone,
} from "./types"

function buildThemeCss(themeTone: ReaderThemeTone) {
  if (themeTone === "daylight") {
    return `
      --page: #fbfaf7;
      --panel: #ffffff;
      --panel-soft: #f1eee8;
      --text: #1f2528;
      --muted: #5d666c;
      --faint: #788085;
      --border: #d9d2c8;
      --accent: #297a66;
      --highlight: rgba(41, 122, 102, 0.18);
    `
  }

  if (themeTone === "high-contrast") {
    return `
      --page: #000000;
      --panel: #080808;
      --panel-soft: #111111;
      --text: #ffffff;
      --muted: #e8e8e8;
      --faint: #bdbdbd;
      --border: #f8ff73;
      --accent: #f8ff73;
      --highlight: rgba(248, 255, 115, 0.32);
    `
  }

  return `
    --page: #05070c;
    --panel: #101620;
    --panel-soft: #151d28;
    --text: #f3f7f8;
    --muted: #b5c0c5;
    --faint: #7f8b91;
    --border: #2b3540;
    --accent: #7fe2c0;
    --highlight: rgba(127, 226, 192, 0.2);
  `
}

function buildFontFamilyCss(fontFamily: ReaderFontFamily) {
  switch (fontFamily) {
    case "technical":
      return `"Cascadia Code", "Consolas", monospace`
    case "sans":
      return `"Aptos", "Segoe UI Variable Text", "Segoe UI", sans-serif`
    default:
      return `"Iowan Old Style", "Palatino Linotype", Georgia, serif`
  }
}

function buildFontSize(fontScale: ReaderFontScale) {
  switch (fontScale) {
    case "compact":
      return "15px"
    case "large":
      return "18px"
    default:
      return "16px"
  }
}

function buildLineHeight(lineHeight: ReaderLineHeight) {
  switch (lineHeight) {
    case "tight":
      return "1.58"
    case "airy":
      return "1.92"
    default:
      return "1.72"
  }
}

function buildMeasure(marginMode: ReaderMarginMode) {
  switch (marginMode) {
    case "narrow":
      return "78ch"
    case "wide":
      return "58ch"
    default:
      return "68ch"
  }
}

export function buildDocumentCss(
  presentation: ReaderDocumentExportPresentation,
  format: ReaderDocumentExportFormat,
) {
  const printNote =
    format === "pdf"
      ? `
      body::before {
        content: "FreelyRSS PDF print source";
        display: block;
        max-width: var(--measure);
        margin: 0 auto 20px;
        color: var(--faint);
        font: 700 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
    `
      : ""

  return `<style>
    :root {
      ${buildThemeCss(presentation.themeTone)}
      --reader-font: ${buildFontFamilyCss(presentation.fontFamily)};
      --reader-size: ${buildFontSize(presentation.fontScale)};
      --reader-leading: ${buildLineHeight(presentation.lineHeight)};
      --measure: ${buildMeasure(presentation.marginMode)};
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 36px;
      background: var(--page);
      color: var(--text);
      font: var(--reader-size) / var(--reader-leading) var(--reader-font);
    }

    a {
      color: var(--accent);
    }

    .rss-export {
      display: grid;
      gap: 28px;
      max-width: calc(var(--measure) + 160px);
      margin: 0 auto;
    }

    .rss-export-summary,
    .rss-article {
      display: grid;
      gap: 22px;
      padding: 28px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--panel);
    }

    .rss-article__header,
    .rss-section {
      display: grid;
      gap: 12px;
      max-width: var(--measure);
    }

    .rss-eyebrow,
    dt {
      color: var(--faint);
      font: 700 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    h1,
    h2,
    h3,
    p,
    blockquote,
    pre,
    ol,
    ul,
    dl {
      margin: 0;
    }

    h1 {
      font-size: 2.1rem;
      line-height: 1.08;
    }

    h2 {
      font-size: 1.1rem;
      line-height: 1.2;
    }

    h3 {
      font-size: 1rem;
      line-height: 1.25;
    }

    p,
    blockquote,
    li,
    dd {
      color: var(--muted);
    }

    dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    dl > div {
      display: grid;
      gap: 4px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel-soft);
    }

    .rss-content {
      gap: 16px;
    }

    .rss-content p {
      color: var(--text);
    }

    .rss-content pre {
      overflow: auto;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--panel-soft);
      color: var(--muted);
      white-space: pre-wrap;
    }

    .rss-annotation {
      padding: 0.04em 0.16em;
      border: 1px solid var(--annotation-accent, var(--accent));
      border-radius: 0.34em;
      background: var(--highlight);
      color: inherit;
    }

    .rss-annotations ol,
    .rss-attachments ul {
      display: grid;
      gap: 12px;
      padding-left: 20px;
    }

    .rss-annotation-facts,
    .rss-annotation-note {
      color: var(--faint);
      font-size: 0.92em;
    }

    .rss-attachments li span {
      display: block;
      color: var(--faint);
      font-size: 0.92em;
    }

    ${printNote}

    @page {
      margin: 18mm;
      size: A4;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
        color: #111111;
      }

      .rss-export {
        max-width: none;
      }

      .rss-export-summary,
      .rss-article {
        break-inside: avoid;
        border-color: #d8d8d8;
        background: #ffffff;
      }

      a {
        color: #111111;
      }
    }
  </style>`
}
