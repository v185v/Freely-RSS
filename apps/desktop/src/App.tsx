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

const sourceClusters: Array<{
  description: string
  feeds: FeedSummaryDto[]
  folder: FolderDto
}> = [
  {
    folder: {
      id: "folder-daily",
      kind: "regular",
      name: "Daily reading desk",
      parentId: null,
      sortOrder: 10,
    },
    description:
      "A typed placeholder folder ready to become the real subscription tree in Step 15.",
    feeds: [
      {
        id: "feed-freelyrss",
        title: "FreelyRSS Engineering",
        displayTitle: "FreelyRSS Engineering",
        siteUrl: "https://freelyrss.dev",
        icon: null,
        folderId: "folder-daily",
        healthStatus: "healthy",
        unreadCount: 9,
        totalCount: 42,
        tagIds: ["tag-product"],
      },
      {
        id: "feed-distributed",
        title: "Distributed Systems Briefs",
        displayTitle: "Distributed Systems Briefs",
        siteUrl: "https://distributed.example",
        icon: null,
        folderId: "folder-daily",
        healthStatus: "degraded",
        unreadCount: 4,
        totalCount: 18,
        tagIds: ["tag-ops"],
      },
    ],
  },
  {
    folder: {
      id: "folder-weekend",
      kind: "regular",
      name: "Weekend longform",
      parentId: null,
      sortOrder: 20,
    },
    description:
      "Shows how feed summaries can stay in shared-types while packages/ui remains display-only.",
    feeds: [
      {
        id: "feed-longform",
        title: "Weekend Longform",
        displayTitle: "Weekend Longform",
        siteUrl: "https://longform.example",
        icon: null,
        folderId: "folder-weekend",
        healthStatus: "healthy",
        unreadCount: 3,
        totalCount: 7,
        tagIds: ["tag-longform"],
      },
    ],
  },
]

const articleQueue: ArticleListItemDto[] = [
  {
    id: "article-offline-architecture",
    feedId: "feed-freelyrss",
    feedTitle: "FreelyRSS Engineering",
    title: "Designing an offline-first RSS workspace without a monolith",
    author: "FreelyRSS",
    summary:
      "Shared types now define the shape of list items before any database or query layer is wired in.",
    publishedAt: "2026-04-08T09:00:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 7,
    state: {
      articleId: "article-offline-architecture",
      readState: "unread",
      starred: true,
      liked: false,
      importance: "high",
      readLater: true,
      readingProgress: 0,
      lastOpenedAt: null,
    },
    tagIds: ["tag-product"],
    attachmentCount: 0,
  },
  {
    id: "article-shared-query",
    feedId: "feed-distributed",
    feedTitle: "Distributed Systems Briefs",
    title: "How shared-query will keep rules, search and smart folders aligned",
    author: "Systems Desk",
    summary:
      "This mock article demonstrates a typed list DTO with status, timing and tag metadata.",
    publishedAt: "2026-04-07T13:30:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 12,
    state: {
      articleId: "article-shared-query",
      readState: "reading",
      starred: false,
      liked: true,
      importance: "normal",
      readLater: false,
      readingProgress: 0.52,
      lastOpenedAt: "2026-04-08T05:30:00Z",
    },
    tagIds: ["tag-ops"],
    attachmentCount: 1,
  },
  {
    id: "article-theme-contract",
    feedId: "feed-longform",
    feedTitle: "Weekend Longform",
    title: "Theme variables as the contract between app shells and design system",
    author: "UI Notes",
    summary:
      "A third list row to keep the mock queue structurally close to the real reader layout.",
    publishedAt: "2026-04-06T08:15:00Z",
    thumbnail: null,
    estimatedReadingMinutes: 5,
    state: {
      articleId: "article-theme-contract",
      readState: "read",
      starred: false,
      liked: false,
      importance: "low",
      readLater: false,
      readingProgress: 1,
      lastOpenedAt: "2026-04-08T04:00:00Z",
    },
    tagIds: ["tag-longform"],
    attachmentCount: 0,
  },
]

const readerTags: TagDto[] = [
  {
    id: "tag-product",
    name: "product",
    scope: "article",
    color: "#0f766e",
    createdAt: "2026-04-08T00:00:00Z",
  },
  {
    id: "tag-ops",
    name: "ops",
    scope: "article",
    color: "#b45309",
    createdAt: "2026-04-08T00:00:00Z",
  },
]

const readerArticle: ArticleDetailDto = {
  article: {
    id: "article-offline-architecture",
    feedId: "feed-freelyrss",
    sourceGuid: "offline-architecture",
    title: "The desktop host now composes shared DTOs instead of inventing local shapes.",
    author: "FreelyRSS",
    summary:
      "Step 13 introduces a package-owned contract for feeds, folders, article rows, article detail, tags, annotations, rules, smart folders and sync placeholders.",
    contentRaw: null,
    contentExtracted:
      "The right pane is still mock content, but its data shape now comes from @freelyrss/shared-types rather than ad hoc objects inside App.tsx. That keeps UI primitives presentation-only while giving the next steps a stable contract for real queries and persistence.",
    canonicalUrl: "https://freelyrss.dev/articles/offline-architecture",
    originalUrl: "https://freelyrss.dev/articles/offline-architecture",
    publishedAt: "2026-04-08T09:00:00Z",
    fetchedAt: "2026-04-08T09:02:00Z",
    language: "en",
    thumbnail: null,
    wordCount: 680,
    contentHash: "sha256:offline-architecture",
  },
  feed: {
    id: "feed-freelyrss",
    title: "FreelyRSS Engineering",
    displayTitle: "FreelyRSS Engineering",
    siteUrl: "https://freelyrss.dev",
    icon: null,
  },
  state: articleQueue[0].state,
  tags: readerTags,
  attachments: [],
  annotations: [
    {
      id: "annotation-step13",
      articleId: "article-offline-architecture",
      type: "note",
      selectedText: "package-owned contract",
      anchor: {
        endOffset: 66,
        path: ["article", "paragraph", 0],
        startOffset: 45,
      },
      note: "Shared types are now the hand-off boundary before shared-query and the real reader state arrive.",
      color: "#0f766e",
      createdAt: "2026-04-08T09:10:00Z",
    },
  ],
}

function formatFeedMeta(feed: FeedSummaryDto) {
  return `${feed.unreadCount} unread`
}

function formatArticleMeta(article: ArticleListItemDto) {
  const readState = article.state.readState
  const readingTime =
    article.estimatedReadingMinutes === null
      ? "No estimate"
      : `${article.estimatedReadingMinutes} min`

  return `${readState} · ${readingTime}`
}

function App() {
  return (
    <ThemeRoot>
      <main className="desktop-shell">
        <header className="desktop-shell__header">
          <div className="desktop-shell__title-block">
            <p className="desktop-shell__eyebrow">Stage 2 / Step 13</p>
            <h1>Shared domain types now define what the desktop shell is allowed to consume.</h1>
            <p className="desktop-shell__lead">
              `packages/shared-types` now owns the feed, folder, article, annotation, rule, smart
              folder, AI, and sync DTO boundaries. The desktop app keeps using shared UI primitives,
              but its mock data is no longer ad hoc.
            </p>
          </div>
          <div className="desktop-shell__controls">
            <TextInput
              aria-label="Search demo"
              hint="The input is still a UI primitive, while the surrounding shell copy is now backed by typed DTO mocks."
              label="Quick search"
              placeholder="Search feeds, tags, or commands"
            />
            <div className="desktop-shell__actions">
              <Button tone="ghost">Typed shell data</Button>
              <Button tone="primary">Query layer next</Button>
            </div>
          </div>
        </header>

        <SplitLayout>
          <SplitPane>
            {sourceClusters.map((cluster, index) => (
              <Surface compact key={cluster.folder.id}>
                <ListSection
                  actions={index === 0 ? <Button size="sm">Add source</Button> : undefined}
                  description={cluster.description}
                  title={cluster.folder.name}
                >
                  {cluster.feeds.map((feed) => (
                    <ListRow
                      active={index === 0 && feed.id === "feed-freelyrss"}
                      eyebrow={feed.healthStatus}
                      key={feed.id}
                      meta={formatFeedMeta(feed)}
                      summary={`${feed.totalCount} retained articles in this typed placeholder feed.`}
                      title={feed.displayTitle}
                    />
                  ))}
                </ListSection>
              </Surface>
            ))}

            <Surface compact className="desktop-note">
              <p className="desktop-note__label">Why this matters</p>
              <p>
                Step 13 freezes the TypeScript contract between application shells and future query
                or persistence layers without pushing business semantics down into `packages/ui`.
              </p>
            </Surface>
          </SplitPane>

          <SplitPane>
            <Surface className="desktop-panel">
              <ListSection
                actions={
                  <Button size="sm" tone="ghost">
                    Filter
                  </Button>
                }
                description="The middle pane still shows demo content, but each row is now typed as an article list DTO."
                title="Article queue"
              >
                {articleQueue.map((article, index) => (
                  <ListRow
                    active={index === 0}
                    eyebrow={article.feedTitle}
                    key={article.id}
                    meta={formatArticleMeta(article)}
                    summary={article.summary ?? "No summary available yet."}
                    title={article.title}
                  />
                ))}
              </ListSection>
            </Surface>
          </SplitPane>

          <SplitPane>
            <Surface className="desktop-panel desktop-panel--reader">
              <div className="desktop-reader__meta">
                <span>{readerArticle.feed.displayTitle}</span>
                <span>{readerArticle.state.readState}</span>
              </div>
              <h2 className="desktop-reader__title">{readerArticle.article.title}</h2>
              <p className="desktop-reader__body">{readerArticle.article.summary}</p>
              <p className="desktop-reader__body">{readerArticle.article.contentExtracted}</p>
              <p className="desktop-reader__body">
                Typed tags: {readerArticle.tags.map((tag) => tag.name).join(", ")}. Typed
                annotations: {readerArticle.annotations.length}. Attachment slots:{" "}
                {readerArticle.attachments.length}.
              </p>
              <div className="desktop-reader__toolbar">
                <Button tone="neutral">Mark as typed</Button>
                <Button tone="ghost">Inspect DTO boundary</Button>
              </div>
            </Surface>
          </SplitPane>
        </SplitLayout>
      </main>
    </ThemeRoot>
  )
}

export default App
