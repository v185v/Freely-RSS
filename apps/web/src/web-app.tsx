import { Button, ListRow, ListSection, Surface, ThemeRoot } from "@freelyrss/ui"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { fetchRemoteArticleDetail, fetchRemoteReaderSnapshot } from "./remote-client"

const queryClient = new QueryClient()

function formatDate(value: string | null) {
  if (!value) {
    return "No date"
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function WebReader() {
  const [selectedFeedId, setSelectedFeedId] = useState<string>("all")
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")
  const snapshotQuery = useQuery({
    queryKey: ["web-reader-snapshot"],
    queryFn: fetchRemoteReaderSnapshot,
  })
  const snapshot = snapshotQuery.data
  const normalizedSearch = searchText.trim().toLowerCase()
  const visibleArticles = useMemo(() => {
    if (!snapshot) {
      return []
    }

    return snapshot.articles.filter((article) => {
      const matchesFeed = selectedFeedId === "all" || article.feedId === selectedFeedId
      const haystack =
        `${article.title} ${article.summary ?? ""} ${article.feedTitle}`.toLowerCase()
      const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch)

      return matchesFeed && matchesSearch
    })
  }, [normalizedSearch, selectedFeedId, snapshot])
  const selectedArticleVisible =
    selectedArticleId !== null &&
    visibleArticles.some((article) => article.id === selectedArticleId)
  const activeArticleId =
    selectedArticleVisible && selectedArticleId
      ? selectedArticleId
      : (visibleArticles[0]?.id ?? null)
  const articleDetailQuery = useQuery({
    enabled: activeArticleId !== null,
    queryKey: ["web-reader-article", activeArticleId],
    queryFn: async () => {
      if (!activeArticleId) {
        throw new Error("Missing active article id")
      }

      return fetchRemoteArticleDetail(activeArticleId)
    },
  })

  if (snapshotQuery.isLoading) {
    return (
      <main className="web-shell web-shell--loading">
        <Surface>
          <p className="web-kicker">Remote reader</p>
          <h1>Loading synchronized library</h1>
        </Surface>
      </main>
    )
  }

  if (!snapshot) {
    return (
      <main className="web-shell web-shell--loading">
        <Surface>
          <p className="web-kicker">Remote reader</p>
          <h1>Remote snapshot unavailable</h1>
        </Surface>
      </main>
    )
  }

  if (snapshot.scopeSummary.scopeViolations.length > 0) {
    return (
      <main className="web-shell web-shell--loading">
        <Surface>
          <p className="web-kicker">Remote reader</p>
          <h1>Web scope contract violated</h1>
        </Surface>
      </main>
    )
  }

  const detail = articleDetailQuery.data

  return (
    <main
      className="web-shell"
      data-scope-blockers={snapshot.scopeSummary.blockingRequirements}
      data-scope-mode={snapshot.scope.mode}
    >
      <header className="web-header">
        <div>
          <p className="web-kicker">Remote synchronized entry</p>
          <h1>FreelyRSS Web</h1>
          <p>
            Read synchronized articles from your account without invoking desktop-only storage,
            fetching, cache, or AI controls.
          </p>
        </div>
        <Surface className="web-session" compact>
          <span>Signed in</span>
          <strong>{snapshot.session.accountEmail}</strong>
          <small>
            {snapshot.session.deviceName} synced {formatDate(snapshot.session.lastSyncedAt)}
          </small>
        </Surface>
      </header>

      <section className="web-metrics" aria-label="Remote library summary">
        <Surface compact>
          <span>Sources</span>
          <strong>{snapshot.feeds.length}</strong>
        </Surface>
        <Surface compact>
          <span>Articles</span>
          <strong>{snapshot.articles.length}</strong>
        </Surface>
        <Surface compact>
          <span>Mode</span>
          <strong>Read only</strong>
        </Surface>
      </section>

      <section className="web-workspace">
        <Surface className="web-pane" compact>
          <ListSection title="Sources" description="Remote source filters">
            <ListRow
              active={selectedFeedId === "all"}
              eyebrow="Library"
              meta={`${snapshot.articles.length} synced`}
              onClick={() => setSelectedFeedId("all")}
              summary="All synchronized articles"
              title="All articles"
            />
            {snapshot.feeds.map((feed) => (
              <ListRow
                active={selectedFeedId === feed.id}
                eyebrow={feed.healthStatus}
                key={feed.id}
                meta={`${feed.unreadCount} unread`}
                onClick={() => setSelectedFeedId(feed.id)}
                summary={`${feed.totalCount} synchronized`}
                title={feed.displayTitle}
              />
            ))}
          </ListSection>
        </Surface>

        <Surface className="web-pane" compact>
          <div className="web-pane__header">
            <div>
              <p className="web-kicker">Queue</p>
              <h2>{visibleArticles.length} articles</h2>
            </div>
            <label className="web-search">
              <span>Search remote snapshot</span>
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            </label>
          </div>
          <div className="web-article-list">
            {visibleArticles.map((article) => (
              <ListRow
                active={activeArticleId === article.id}
                eyebrow={formatDate(article.publishedAt)}
                key={article.id}
                meta={article.state.readState}
                onClick={() => setSelectedArticleId(article.id)}
                summary={article.summary ?? "No summary synchronized."}
                title={article.title}
              />
            ))}
          </div>
        </Surface>

        <Surface className="web-pane web-reader" compact>
          {!activeArticleId ? (
            <div className="web-empty">
              <p className="web-kicker">Reader</p>
              <h2>No synchronized article matches the current filters.</h2>
            </div>
          ) : detail ? (
            <article>
              <p className="web-kicker">{detail.feed.displayTitle}</p>
              <h2>{detail.article.title}</h2>
              <div className="web-reader__facts">
                <span>{formatDate(detail.article.publishedAt)}</span>
                <span>{detail.state.readState}</span>
                <span>{Math.round(detail.state.readingProgress * 100)}% read</span>
              </div>
              <p className="web-reader__summary">{detail.article.summary}</p>
              {(detail.article.contentExtracted ?? "").split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="web-reader__tags">
                {detail.tags.map((tag) => (
                  <span key={tag.id}>{tag.name}</span>
                ))}
              </div>
              <Button disabled tone="neutral">
                Remote read-only entry
              </Button>
            </article>
          ) : (
            <div className="web-empty">
              <p className="web-kicker">Reader</p>
              <h2>Loading article snapshot</h2>
            </div>
          )}
        </Surface>
      </section>
    </main>
  )
}

export function WebApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRoot tone="midnight">
        <WebReader />
      </ThemeRoot>
    </QueryClientProvider>
  )
}
