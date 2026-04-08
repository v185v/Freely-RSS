import { useState } from "react"

import type {
  ArticleDetailDto,
  ArticleListItemDto,
  FeedSummaryDto,
  FolderDto,
  TagDto,
} from "@freelyrss/shared-types"
import {
  Button,
  ListRow,
  ListSection,
  SplitLayout,
  SplitPane,
  Surface,
  TextInput,
  ThemeRoot,
} from "@freelyrss/ui"

type SourceRow = {
  description: string
  depth?: 0 | 1
  eyebrow: string
  id: string
  kind: "feed" | "folder" | "view"
  meta: string
  title: string
}

const folders: FolderDto[] = [
  {
    id: "folder-daily",
    kind: "regular",
    name: "Daily reading desk",
    parentId: null,
    sortOrder: 10,
  },
  {
    id: "folder-research",
    kind: "regular",
    name: "Research threads",
    parentId: null,
    sortOrder: 20,
  },
  {
    id: "folder-podcasts",
    kind: "regular",
    name: "Podcast watchlist",
    parentId: null,
    sortOrder: 30,
  },
]

const feeds: FeedSummaryDto[] = [
  {
    id: "feed-freelyrss",
    title: "FreelyRSS Engineering",
    displayTitle: "FreelyRSS Engineering",
    siteUrl: "https://freelyrss.dev",
    icon: null,
    folderId: "folder-daily",
    healthStatus: "healthy",
    unreadCount: 6,
    totalCount: 42,
    tagIds: ["tag-product"],
  },
  {
    id: "feed-rust-systems",
    title: "Rust Systems Weekly",
    displayTitle: "Rust Systems Weekly",
    siteUrl: "https://systems.example",
    icon: null,
    folderId: "folder-daily",
    healthStatus: "healthy",
    unreadCount: 3,
    totalCount: 18,
    tagIds: ["tag-ops"],
  },
  {
    id: "feed-query-notes",
    title: "Query Notes",
    displayTitle: "Query Notes",
    siteUrl: "https://query.example",
    icon: null,
    folderId: "folder-research",
    healthStatus: "degraded",
    unreadCount: 2,
    totalCount: 11,
    tagIds: ["tag-search"],
  },
  {
    id: "feed-night-audio",
    title: "Night Audio Digest",
    displayTitle: "Night Audio Digest",
    siteUrl: "https://audio.example",
    icon: null,
    folderId: "folder-podcasts",
    healthStatus: "paused",
    unreadCount: 0,
    totalCount: 5,
    tagIds: ["tag-audio"],
  },
]

const tags: TagDto[] = [
  {
    id: "tag-product",
    name: "product",
    scope: "article",
    color: "#7fe2c0",
    createdAt: "2026-04-08T00:00:00Z",
  },
  {
    id: "tag-ops",
    name: "ops",
    scope: "article",
    color: "#8eb6ff",
    createdAt: "2026-04-08T00:00:00Z",
  },
  {
    id: "tag-search",
    name: "search",
    scope: "article",
    color: "#f4b860",
    createdAt: "2026-04-08T00:00:00Z",
  },
  {
    id: "tag-audio",
    name: "audio",
    scope: "article",
    color: "#f38ba8",
    createdAt: "2026-04-08T00:00:00Z",
  },
]

function findTag(tagId: TagDto["id"]) {
  const tag = tags.find((entry) => entry.id === tagId)

  if (!tag) {
    throw new Error(`Unknown tag id: ${tagId}`)
  }

  return tag
}

const articles: ArticleListItemDto[] = [
  {
    id: "article-layout-shell",
    feedId: "feed-freelyrss",
    feedTitle: "FreelyRSS Engineering",
    title: "Turning the desktop shell into a stable three-pane reader skeleton",
    author: "FreelyRSS",
    summary:
      "Step 15 moves the app from a package demo to a reader-shaped shell with separated source, queue, and reading contexts.",
    publishedAt: "2026-04-08T08:40:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 6,
    state: {
      articleId: "article-layout-shell",
      readState: "reading",
      starred: true,
      liked: false,
      importance: "high",
      readLater: true,
      readingProgress: 0.46,
      lastOpenedAt: "2026-04-08T09:00:00Z",
    },
    tagIds: ["tag-product", "tag-ops"],
    attachmentCount: 0,
  },
  {
    id: "article-source-context",
    feedId: "feed-rust-systems",
    feedTitle: "Rust Systems Weekly",
    title: "Why layout state should stay separate from source and query state",
    author: "Systems Desk",
    summary:
      "The left pane should express context, not own the data access or query execution path that lands later.",
    publishedAt: "2026-04-08T06:15:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 8,
    state: {
      articleId: "article-source-context",
      readState: "unread",
      starred: false,
      liked: true,
      importance: "normal",
      readLater: false,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-ops"],
    attachmentCount: 0,
  },
  {
    id: "article-query-bridge",
    feedId: "feed-query-notes",
    feedTitle: "Query Notes",
    title: "Shared-query is ready, but the reader shell still needs a clean composition layer",
    author: "Query Notes",
    summary:
      "This placeholder article keeps Step 15 focused on structure before real search and filter execution arrive.",
    publishedAt: "2026-04-07T22:10:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 9,
    state: {
      articleId: "article-query-bridge",
      readState: "unread",
      starred: false,
      liked: false,
      importance: "normal",
      readLater: true,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-search"],
    attachmentCount: 1,
  },
  {
    id: "article-window-behavior",
    feedId: "feed-freelyrss",
    feedTitle: "FreelyRSS Engineering",
    title: "Making narrow-window behavior predictable before routing and async data land",
    author: "FreelyRSS",
    summary:
      "Responsive layout rules are part of the shell contract, not a cosmetic afterthought for the future reader.",
    publishedAt: "2026-04-07T18:00:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 5,
    state: {
      articleId: "article-window-behavior",
      readState: "read",
      starred: false,
      liked: false,
      importance: "low",
      readLater: false,
      readingProgress: 1,
      lastOpenedAt: "2026-04-08T04:20:00Z",
    },
    tagIds: ["tag-product"],
    attachmentCount: 0,
  },
]

const articleDetails: Record<string, ArticleDetailDto> = {
  "article-layout-shell": {
    article: {
      id: "article-layout-shell",
      feedId: "feed-freelyrss",
      sourceGuid: "layout-shell",
      title: "Turning the desktop shell into a stable three-pane reader skeleton",
      author: "FreelyRSS",
      summary:
        "The shell now reads like an application instead of a package showcase: source context on the left, article queue in the center, reading detail on the right.",
      contentRaw: null,
      contentExtracted:
        "Step 15 is intentionally about composition. The left pane carries source context, the center pane carries article selection, and the right pane carries reading context.\n\nNone of those concerns should own future database access. That separation keeps the shell thin and gives the next step a clean place to add navigation and view state without rewriting the visual skeleton.\n\nThe goal is not pixel polish alone. The shell must already behave predictably when the window narrows, when a source has no visible articles, and when selection changes leave the current article outside the filtered set.",
      canonicalUrl: "https://freelyrss.dev/articles/layout-shell",
      originalUrl: "https://freelyrss.dev/articles/layout-shell",
      publishedAt: "2026-04-08T08:40:00Z",
      fetchedAt: "2026-04-08T08:45:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 712,
      contentHash: "sha256:layout-shell",
    },
    feed: {
      id: "feed-freelyrss",
      title: "FreelyRSS Engineering",
      displayTitle: "FreelyRSS Engineering",
      siteUrl: "https://freelyrss.dev",
      icon: null,
    },
    state: articles[0].state,
    tags: [findTag("tag-product"), findTag("tag-ops")],
    attachments: [],
    annotations: [
      {
        id: "annotation-layout-shell",
        articleId: "article-layout-shell",
        type: "note",
        selectedText: "source context, article queue, and reading context",
        anchor: {
          endOffset: 54,
          path: ["article", "paragraph", 0],
          startOffset: 3,
        },
        note: "These three regions are the Step 15 contract. Data access and routing come later.",
        color: "#8eb6ff",
        createdAt: "2026-04-08T08:49:00Z",
      },
    ],
  },
  "article-source-context": {
    article: {
      id: "article-source-context",
      feedId: "feed-rust-systems",
      sourceGuid: "source-context",
      title: "Why layout state should stay separate from source and query state",
      author: "Systems Desk",
      summary:
        "Selection and context can live in the shell without turning the shell into the execution layer.",
      contentRaw: null,
      contentExtracted:
        "A common failure mode is to let the first interactive layout component absorb every future concern. The result is a giant app shell that owns source selection, search text, fetching, caching, and rendering rules.\n\nFreelyRSS should resist that. The reader shell only needs enough local state to prove that the three-pane layout is stable and that each region can evolve independently.\n\nOnce that line is held, Step 16 can add explicit navigation and view state sources instead of inheriting a monolithic component.",
      canonicalUrl: "https://systems.example/articles/source-context",
      originalUrl: "https://systems.example/articles/source-context",
      publishedAt: "2026-04-08T06:15:00Z",
      fetchedAt: "2026-04-08T06:20:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 655,
      contentHash: "sha256:source-context",
    },
    feed: {
      id: "feed-rust-systems",
      title: "Rust Systems Weekly",
      displayTitle: "Rust Systems Weekly",
      siteUrl: "https://systems.example",
      icon: null,
    },
    state: articles[1].state,
    tags: [findTag("tag-ops")],
    attachments: [],
    annotations: [],
  },
  "article-query-bridge": {
    article: {
      id: "article-query-bridge",
      feedId: "feed-query-notes",
      sourceGuid: "query-bridge",
      title: "Shared-query is ready, but the reader shell still needs a clean composition layer",
      author: "Query Notes",
      summary:
        "Query semantics are already centralized, but Step 15 deliberately stops before real filtering and persistence.",
      contentRaw: null,
      contentExtracted:
        "The presence of shared-query can tempt the shell to immediately absorb search orchestration. That would be a sequencing mistake.\n\nAt this stage the shell should still use placeholder data, because the layout contract has to settle before real query wiring arrives. The middle pane can already show article selection. The right pane can already show a reading surface. The left pane can already express folder and feed context.\n\nWhat it should not do yet is pretend to be the database or the search engine.",
      canonicalUrl: "https://query.example/articles/query-bridge",
      originalUrl: "https://query.example/articles/query-bridge",
      publishedAt: "2026-04-07T22:10:00Z",
      fetchedAt: "2026-04-07T22:15:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 602,
      contentHash: "sha256:query-bridge",
    },
    feed: {
      id: "feed-query-notes",
      title: "Query Notes",
      displayTitle: "Query Notes",
      siteUrl: "https://query.example",
      icon: null,
    },
    state: articles[2].state,
    tags: [findTag("tag-search")],
    attachments: [
      {
        id: "attachment-query-notes",
        articleId: "article-query-bridge",
        type: "file",
        url: "https://query.example/assets/sql-plan.json",
        mimeType: "application/json",
        duration: null,
        size: 2048,
        localCachePath: null,
      },
    ],
    annotations: [],
  },
  "article-window-behavior": {
    article: {
      id: "article-window-behavior",
      feedId: "feed-freelyrss",
      sourceGuid: "window-behavior",
      title: "Making narrow-window behavior predictable before routing and async data land",
      author: "FreelyRSS",
      summary:
        "The shell already needs strong fallback behavior when panes reflow or article selection changes.",
      contentRaw: null,
      contentExtracted:
        "Responsive behavior is part of the architecture here, not merely a CSS finish pass. If the three-pane shell collapses poorly, every later step inherits brittle assumptions.\n\nBy proving that the left and center panes stay readable and that the right pane can move below them cleanly, Step 15 removes a whole class of future integration noise.",
      canonicalUrl: "https://freelyrss.dev/articles/window-behavior",
      originalUrl: "https://freelyrss.dev/articles/window-behavior",
      publishedAt: "2026-04-07T18:00:00Z",
      fetchedAt: "2026-04-07T18:05:00Z",
      language: "en",
      thumbnail: null,
      wordCount: 430,
      contentHash: "sha256:window-behavior",
    },
    feed: {
      id: "feed-freelyrss",
      title: "FreelyRSS Engineering",
      displayTitle: "FreelyRSS Engineering",
      siteUrl: "https://freelyrss.dev",
      icon: null,
    },
    state: articles[3].state,
    tags: [findTag("tag-product")],
    attachments: [],
    annotations: [],
  },
}

const quickViewRows: SourceRow[] = [
  {
    id: "view-unread",
    kind: "view",
    title: "Unread desk",
    description: "Cross-source unread queue for the main reading session.",
    eyebrow: "view",
    meta: `${articles.filter((article) => article.state.readState !== "read").length} articles`,
  },
  {
    id: "view-reading",
    kind: "view",
    title: "Continue reading",
    description: "Articles already in progress, regardless of source.",
    eyebrow: "view",
    meta: `${articles.filter((article) => article.state.readState === "reading").length} articles`,
  },
  {
    id: "view-starred",
    kind: "view",
    title: "Starred focus",
    description: "Saved items to protect from cleanup and revisit later.",
    eyebrow: "view",
    meta: `${articles.filter((article) => article.state.starred).length} articles`,
  },
]

const subscriptionRows: SourceRow[] = folders.flatMap((folder) => {
  const folderFeeds = feeds.filter((feed) => feed.folderId === folder.id)
  const folderArticleCount = articles.filter((article) =>
    folderFeeds.some((feed) => feed.id === article.feedId),
  ).length
  const folderUnreadCount = articles.filter(
    (article) =>
      article.state.readState !== "read" && folderFeeds.some((feed) => feed.id === article.feedId),
  ).length

  return [
    {
      id: folder.id,
      kind: "folder",
      title: folder.name,
      description: `${folderFeeds.length} feeds grouped under this folder.`,
      eyebrow: "folder",
      meta: `${folderUnreadCount}/${folderArticleCount} unread`,
    },
    ...folderFeeds.map<SourceRow>((feed) => ({
      id: feed.id,
      kind: "feed",
      title: feed.displayTitle,
      description: feed.siteUrl ?? "No site URL yet.",
      depth: 1,
      eyebrow: feed.healthStatus,
      meta: `${feed.unreadCount}/${feed.totalCount} unread`,
    })),
  ]
})

const sourceSections: Array<{
  description: string
  rows: SourceRow[]
  title: string
}> = [
  {
    title: "Quick views",
    description: "Shell-owned context that does not reach into query execution.",
    rows: quickViewRows,
  },
  {
    title: "Subscription tree",
    description: "Folder and feed placeholders that mimic the future left navigation shape.",
    rows: subscriptionRows,
  },
]

const sourceLookup = new Map(
  sourceSections.flatMap((section) => section.rows).map((row) => [row.id, row]),
)

function filterArticlesBySource(sourceId: string) {
  switch (sourceId) {
    case "view-unread":
      return articles.filter((article) => article.state.readState !== "read")
    case "view-reading":
      return articles.filter((article) => article.state.readState === "reading")
    case "view-starred":
      return articles.filter((article) => article.state.starred)
    default: {
      const selectedFeed = feeds.find((feed) => feed.id === sourceId)
      if (selectedFeed) {
        return articles.filter((article) => article.feedId === selectedFeed.id)
      }

      const selectedFolder = folders.find((folder) => folder.id === sourceId)
      if (selectedFolder) {
        const folderFeedIds = feeds
          .filter((feed) => feed.folderId === selectedFolder.id)
          .map((feed) => feed.id)

        return articles.filter((article) => folderFeedIds.includes(article.feedId))
      }

      return articles
    }
  }
}

function formatArticleMeta(article: ArticleListItemDto) {
  const progress =
    article.state.readState === "reading"
      ? ` · ${Math.round(article.state.readingProgress * 100)}%`
      : ""
  const readingTime =
    article.estimatedReadingMinutes === null
      ? "No estimate"
      : `${article.estimatedReadingMinutes} min`

  return `${article.state.readState} · ${readingTime}${progress}`
}

function formatReaderProgress(progress: number) {
  return `${Math.round(progress * 100)}%`
}

function App() {
  const [selectedSourceId, setSelectedSourceId] = useState("view-unread")
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>("article-layout-shell")

  const activeSource = sourceLookup.get(selectedSourceId) ?? quickViewRows[0]
  const visibleArticles = filterArticlesBySource(selectedSourceId)
  const activeArticle =
    visibleArticles.find((article) => article.id === selectedArticleId) ??
    visibleArticles[0] ??
    null
  const activeDetail = activeArticle ? articleDetails[activeArticle.id] : null
  const readerParagraphs = activeDetail?.article.contentExtracted?.split("\n\n") ?? []

  return (
    <ThemeRoot>
      <main className="desktop-shell">
        <header className="desktop-shell__header">
          <div className="desktop-shell__title-block">
            <p className="desktop-shell__eyebrow">Stage 2 / Step 15</p>
            <h1>
              Desktop shell now behaves like a real three-pane reader, not a package showcase.
            </h1>
            <p className="desktop-shell__lead">
              This step locks in the source pane, article queue, and reading panel as separate UI
              concerns. The app still runs on mock data, but the composition boundary is now aligned
              with the implementation plan.
            </p>
          </div>
          <Surface className="desktop-summary" compact>
            <div className="desktop-summary__metrics">
              <div>
                <span className="desktop-summary__label">Sources</span>
                <strong>{feeds.length}</strong>
              </div>
              <div>
                <span className="desktop-summary__label">Visible</span>
                <strong>{visibleArticles.length}</strong>
              </div>
              <div>
                <span className="desktop-summary__label">Reading</span>
                <strong>
                  {articles.filter((article) => article.state.readState === "reading").length}
                </strong>
              </div>
            </div>
            <p className="desktop-summary__note">
              Step 15 keeps data fake on purpose. It proves layout behavior before Step 16 adds
              navigation and view-state structure.
            </p>
          </Surface>
        </header>

        <div className="desktop-workspace">
          <SplitLayout>
            <SplitPane aria-label="Source context" className="desktop-pane">
              <Surface className="desktop-pane__surface desktop-pane__surface--nav">
                <div className="desktop-pane__header">
                  <p className="desktop-pane__eyebrow">Left pane</p>
                  <h2>Sources</h2>
                  <p className="desktop-pane__description">
                    Folder and feed placeholders shaped like the future subscription tree.
                  </p>
                </div>

                <div className="desktop-pane__scroll">
                  {sourceSections.map((section) => (
                    <ListSection
                      description={section.description}
                      key={section.title}
                      title={section.title}
                    >
                      {section.rows.map((row) => (
                        <ListRow
                          active={row.id === activeSource.id}
                          className={
                            row.depth === 1
                              ? "desktop-source-row desktop-source-row--child"
                              : "desktop-source-row"
                          }
                          eyebrow={row.eyebrow}
                          key={row.id}
                          meta={row.meta}
                          onClick={() => setSelectedSourceId(row.id)}
                          summary={row.description}
                          title={row.title}
                        />
                      ))}
                    </ListSection>
                  ))}
                </div>

                <div className="desktop-pane__footer">
                  <Button size="sm" tone="ghost">
                    Add source
                  </Button>
                  <Button size="sm" tone="neutral">
                    Import OPML
                  </Button>
                </div>
              </Surface>
            </SplitPane>

            <SplitPane aria-label="Article queue" className="desktop-pane">
              <Surface className="desktop-pane__surface desktop-pane__surface--queue">
                <div className="desktop-pane__header">
                  <p className="desktop-pane__eyebrow">Middle pane</p>
                  <h2>{activeSource.title}</h2>
                  <p className="desktop-pane__description">{activeSource.description}</p>
                </div>

                <div className="desktop-pane__toolbar">
                  <TextInput
                    aria-label="Article search placeholder"
                    hint="Search wiring intentionally waits for the next step."
                    label="Queue search"
                    placeholder="Filter within the current pane"
                  />
                  <div className="desktop-pane__toolbar-actions">
                    <Button size="sm" tone="ghost">
                      View options
                    </Button>
                    <Button size="sm" tone="neutral">
                      Sort: newest
                    </Button>
                  </div>
                </div>

                <div className="desktop-pane__scroll">
                  {visibleArticles.length > 0 ? (
                    <ListSection
                      description={`${visibleArticles.length} placeholder articles visible for the current source context.`}
                      title="Article queue"
                    >
                      {visibleArticles.map((article) => (
                        <ListRow
                          active={activeArticle?.id === article.id}
                          className="desktop-article-row"
                          eyebrow={article.feedTitle}
                          key={article.id}
                          meta={formatArticleMeta(article)}
                          onClick={() => setSelectedArticleId(article.id)}
                          summary={article.summary ?? "No summary yet."}
                          title={article.title}
                        />
                      ))}
                    </ListSection>
                  ) : (
                    <div className="desktop-empty-state">
                      <p className="desktop-empty-state__eyebrow">Empty queue</p>
                      <h3>No placeholder articles are attached to this source yet.</h3>
                      <p>
                        The layout remains stable even when the selected feed has no visible
                        articles. Real fetching and persistence arrive in later phases.
                      </p>
                    </div>
                  )}
                </div>
              </Surface>
            </SplitPane>

            <SplitPane aria-label="Reading panel" className="desktop-pane">
              <Surface className="desktop-pane__surface desktop-pane__surface--reader">
                {activeDetail ? (
                  <>
                    <div className="desktop-pane__header">
                      <p className="desktop-pane__eyebrow">Right pane</p>
                      <h2>{activeDetail.article.title}</h2>
                      <p className="desktop-pane__description">
                        Reading context stays independent from source selection mechanics and future
                        query execution.
                      </p>
                    </div>

                    <div className="desktop-reader__facts">
                      <div>
                        <span className="desktop-reader__fact-label">Feed</span>
                        <strong>{activeDetail.feed.displayTitle}</strong>
                      </div>
                      <div>
                        <span className="desktop-reader__fact-label">State</span>
                        <strong>{activeDetail.state.readState}</strong>
                      </div>
                      <div>
                        <span className="desktop-reader__fact-label">Progress</span>
                        <strong>{formatReaderProgress(activeDetail.state.readingProgress)}</strong>
                      </div>
                      <div>
                        <span className="desktop-reader__fact-label">Tags</span>
                        <strong>{activeDetail.tags.length}</strong>
                      </div>
                    </div>

                    <div className="desktop-pane__scroll desktop-pane__scroll--reader">
                      <p className="desktop-reader__summary">{activeDetail.article.summary}</p>

                      <div className="desktop-reader__content">
                        {readerParagraphs.map((paragraph) => (
                          <p className="desktop-reader__paragraph" key={paragraph}>
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      <div className="desktop-reader__meta-group">
                        <div>
                          <span className="desktop-reader__fact-label">Tag labels</span>
                          <p>{activeDetail.tags.map((tag) => tag.name).join(", ")}</p>
                        </div>
                        <div>
                          <span className="desktop-reader__fact-label">Annotations</span>
                          <p>{activeDetail.annotations.length} placeholder note(s)</p>
                        </div>
                        <div>
                          <span className="desktop-reader__fact-label">Attachments</span>
                          <p>{activeDetail.attachments.length} linked asset slot(s)</p>
                        </div>
                      </div>
                    </div>

                    <div className="desktop-pane__footer">
                      <Button size="sm" tone="neutral">
                        Mark read
                      </Button>
                      <Button size="sm" tone="ghost">
                        Toggle star
                      </Button>
                      <Button size="sm" tone="ghost">
                        Add note
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="desktop-empty-state desktop-empty-state--reader">
                    <p className="desktop-empty-state__eyebrow">Reader idle</p>
                    <h3>Select an article once the queue has content.</h3>
                    <p>
                      The right pane already owns the reading surface, but it does not pull from a
                      real persistence layer yet.
                    </p>
                  </div>
                )}
              </Surface>
            </SplitPane>
          </SplitLayout>
        </div>
      </main>
    </ThemeRoot>
  )
}

export default App
