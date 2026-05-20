import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import type { ArticleDetailDto } from "@freelyrss/shared-types"
import { fetchMobileArticleDetail, fetchMobileReaderSnapshot } from "./src/mobile-client"
import {
  type MobileTabId,
  buildMobileHomeModel,
  buildMobileOfflineCacheModel,
  buildMobileSharePayload,
  buildPrimaryAudioPlaybackModel,
  getPrimaryAudioAttachment,
  getSyncedNoteText,
} from "./src/mobile-selectors"

const tabs: Array<{ id: MobileTabId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "search", label: "Search" },
  { id: "notes", label: "Notes" },
  { id: "podcasts", label: "Podcasts" },
]

function formatDate(value: string | null) {
  if (!value) {
    return "No date"
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value))
}

function formatDuration(seconds: number | null) {
  if (!seconds) {
    return "Unknown length"
  }

  const minutes = Math.round(seconds / 60)

  return `${minutes} min`
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MobileTabId>("today")
  const [articleDetail, setArticleDetail] = useState<ArticleDetailDto | null>(null)
  const [draftNote, setDraftNote] = useState("")
  const [lastAppState, setLastAppState] = useState<AppStateStatus>(AppState.currentState)
  const [playbackIntent, setPlaybackIntent] = useState<"idle" | "paused" | "playing">("idle")
  const [sharedAt, setSharedAt] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<Awaited<
    ReturnType<typeof fetchMobileReaderSnapshot>
  > | null>(null)

  useEffect(() => {
    let active = true

    fetchMobileReaderSnapshot().then((nextSnapshot) => {
      if (active) {
        setSnapshot(nextSnapshot)
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setLastAppState)

    return () => {
      subscription.remove()
    }
  }, [])

  const model = useMemo(() => {
    if (!snapshot) {
      return null
    }

    return buildMobileHomeModel(snapshot, activeTab, searchText, selectedArticleId)
  }, [activeTab, searchText, selectedArticleId, snapshot])

  useEffect(() => {
    if (!model?.activeArticleId) {
      setArticleDetail(null)
      return
    }

    let active = true

    fetchMobileArticleDetail(model.activeArticleId).then((detail) => {
      if (active) {
        setArticleDetail(detail)
        setPlaybackIntent("idle")
        setSharedAt(null)
      }
    })

    return () => {
      active = false
    }
  }, [model?.activeArticleId])

  if (!snapshot || !model) {
    return (
      <SafeAreaView style={styles.loadingShell}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#7fe2c0" />
        <Text style={styles.loadingText}>Syncing mobile library</Text>
      </SafeAreaView>
    )
  }

  if (snapshot.scopeSummary.scopeViolations.length > 0) {
    return (
      <SafeAreaView style={styles.loadingShell}>
        <Text style={styles.loadingText}>Mobile scope contract violated</Text>
      </SafeAreaView>
    )
  }

  const activeAudio = getPrimaryAudioAttachment(articleDetail)
  const offlineModel = buildMobileOfflineCacheModel(articleDetail, snapshot.platform)
  const playbackModel = buildPrimaryAudioPlaybackModel(articleDetail, snapshot.platform)
  const sharePayload = buildMobileSharePayload(articleDetail, snapshot.platform)
  const syncedNote = getSyncedNoteText(articleDetail)

  const handleShareArticle = () => {
    if (!sharePayload) {
      return
    }

    setSharedAt(new Date().toISOString())
    void Share.share(sharePayload)
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>FreelyRSS Mobile</Text>
            <Text style={styles.title}>Reading queue</Text>
          </View>
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeLabel}>Synced</Text>
            <Text style={styles.syncBadgeValue}>{formatDate(snapshot.session.lastSyncedAt)}</Text>
          </View>
        </View>

        <View
          accessibilityLabel="Mobile scope status"
          style={styles.statusGrid}
          testID={`mobile-scope-${model.scopeMode}`}
        >
          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>{model.unreadCount}</Text>
            <Text style={styles.statusLabel}>Unread</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>{model.noteCount}</Text>
            <Text style={styles.statusLabel}>Notes</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>{model.podcastCount}</Text>
            <Text style={styles.statusLabel}>Audio</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>{model.offlineReadyCount}</Text>
            <Text style={styles.statusLabel}>Offline</Text>
          </View>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>Signed in</Text>
          <Text style={styles.accountValue}>{snapshot.session.accountEmail}</Text>
          <Text style={styles.accountMeta}>{snapshot.session.deviceName}</Text>
        </View>

        <View style={styles.capabilityGrid}>
          <View style={styles.capabilityCard}>
            <Text style={styles.capabilityLabel}>Offline cache</Text>
            <Text style={styles.capabilityValue}>
              {offlineModel?.statusLabel ?? "Select an article"}
            </Text>
            <Text style={styles.capabilityMeta}>
              {offlineModel?.articleCachePath ?? "No local article payload"}
            </Text>
          </View>
          <View style={styles.capabilityCard}>
            <Text style={styles.capabilityLabel}>Background resume</Text>
            <Text style={styles.capabilityValue}>
              {playbackModel?.backgroundResumeAvailable ? "Armed" : "Not available"}
            </Text>
            <Text style={styles.capabilityMeta}>
              {playbackModel
                ? `${playbackModel.resumeLabel} / app ${lastAppState}`
                : `No media session / app ${lastAppState}`}
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              accessibilityRole="button"
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchLabel}>Search synchronized articles</Text>
          <TextInput
            accessibilityLabel="Search synchronized articles"
            onChangeText={setSearchText}
            placeholder="Search title, source, notes, audio"
            placeholderTextColor="#7f897f"
            style={styles.searchInput}
            value={searchText}
          />
        </View>

        <View style={styles.queue}>
          {model.articles.map((article) => (
            <Pressable
              accessibilityRole="button"
              key={article.id}
              onPress={() => setSelectedArticleId(article.id)}
              style={[
                styles.articleCard,
                model.activeArticleId === article.id && styles.articleCardActive,
              ]}
            >
              <Text style={styles.articleMeta}>
                {article.feedTitle} / {formatDate(article.publishedAt)}
              </Text>
              <Text style={styles.articleTitle}>{article.title}</Text>
              <Text numberOfLines={3} style={styles.articleSummary}>
                {article.summary}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.readerCard}>
          {articleDetail ? (
            <>
              <Text style={styles.readerSource}>{articleDetail.feed.displayTitle}</Text>
              <Text style={styles.readerTitle}>{articleDetail.article.title}</Text>
              <Text style={styles.readerFacts}>
                {articleDetail.state.readState} /{" "}
                {Math.round(articleDetail.state.readingProgress * 100)}% read
              </Text>
              {(articleDetail.article.contentExtracted ?? "").split("\n\n").map((paragraph) => (
                <Text key={paragraph} style={styles.readerParagraph}>
                  {paragraph}
                </Text>
              ))}
              <View style={styles.noteCard}>
                <Text style={styles.panelTitle}>Notes</Text>
                <Text style={styles.panelText}>
                  {syncedNote ?? "No synchronized note for this article yet."}
                </Text>
                <TextInput
                  accessibilityLabel="Draft mobile note"
                  multiline
                  onChangeText={setDraftNote}
                  placeholder="Draft a quick mobile note"
                  placeholderTextColor="#7f897f"
                  style={styles.noteInput}
                  value={draftNote}
                />
              </View>
              <View style={styles.audioCard}>
                <Text style={styles.panelTitle}>Podcast</Text>
                <Text style={styles.panelText}>
                  {activeAudio && playbackModel
                    ? `${playbackModel.statusLabel} / ${activeAudio.mimeType ?? "Audio"} / ${formatDuration(activeAudio.duration)}`
                    : "No audio enclosure synchronized for this article."}
                </Text>
                {playbackModel ? (
                  <Text style={styles.panelText}>
                    Resume {playbackModel.resumeLabel} / {playbackModel.progressPercent}% complete
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={!playbackModel?.canPlay}
                  onPress={() =>
                    setPlaybackIntent((current) => (current === "playing" ? "paused" : "playing"))
                  }
                  style={[styles.playButton, !playbackModel?.canPlay && styles.playButtonDisabled]}
                >
                  <Text style={styles.playText}>
                    {playbackIntent === "playing"
                      ? "Pause episode"
                      : playbackModel?.canPlayOffline
                        ? "Play cached episode"
                        : "Play episode"}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.shareCard}>
                <Text style={styles.panelTitle}>Share</Text>
                <Text style={styles.panelText}>
                  {sharePayload
                    ? "System share sheet is ready for this article."
                    : "No synchronized share target for this article."}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={!sharePayload}
                  onPress={handleShareArticle}
                  style={[styles.shareButton, !sharePayload && styles.playButtonDisabled]}
                >
                  <Text style={styles.shareText}>Share article</Text>
                </Pressable>
                {sharedAt ? (
                  <Text style={styles.panelText}>Shared {formatDate(sharedAt)}</Text>
                ) : null}
              </View>
            </>
          ) : (
            <Text style={styles.readerParagraph}>No synchronized article matches this view.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: "#f3ead8",
    borderRadius: 8,
    padding: 14,
  },
  accountLabel: {
    color: "#5f665f",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  accountMeta: {
    color: "#5f665f",
    fontSize: 13,
    marginTop: 2,
  },
  accountValue: {
    color: "#151a16",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  articleCard: {
    backgroundColor: "#f9f3e7",
    borderColor: "#e0d5c3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  articleCardActive: {
    backgroundColor: "#ffffff",
    borderColor: "#7fe2c0",
  },
  articleMeta: {
    color: "#667167",
    fontSize: 12,
    fontWeight: "700",
  },
  articleSummary: {
    color: "#414941",
    fontSize: 14,
    lineHeight: 20,
  },
  articleTitle: {
    color: "#141a16",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  audioCard: {
    backgroundColor: "#f0f6f2",
    borderRadius: 8,
    gap: 8,
    padding: 14,
  },
  capabilityCard: {
    backgroundColor: "#e8f2ea",
    borderRadius: 8,
    flex: 1,
    minWidth: 150,
    padding: 14,
  },
  capabilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  capabilityLabel: {
    color: "#5f665f",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  capabilityMeta: {
    color: "#59645d",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  capabilityValue: {
    color: "#141a16",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kicker: {
    color: "#9fb9a8",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  loadingShell: {
    alignItems: "center",
    backgroundColor: "#101411",
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    color: "#f9f3e7",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  noteCard: {
    backgroundColor: "#f8f0df",
    borderRadius: 8,
    gap: 8,
    padding: 14,
  },
  noteInput: {
    backgroundColor: "#fffaf0",
    borderColor: "#d4c4aa",
    borderRadius: 8,
    borderWidth: 1,
    color: "#151a16",
    minHeight: 76,
    padding: 12,
    textAlignVertical: "top",
  },
  panelText: {
    color: "#414941",
    fontSize: 14,
    lineHeight: 20,
  },
  panelTitle: {
    color: "#151a16",
    fontSize: 15,
    fontWeight: "800",
  },
  playButton: {
    alignItems: "center",
    backgroundColor: "#151a16",
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  playButtonDisabled: {
    opacity: 0.45,
  },
  playText: {
    color: "#f9f3e7",
    fontSize: 14,
    fontWeight: "800",
  },
  queue: {
    gap: 10,
  },
  readerCard: {
    backgroundColor: "#fffaf0",
    borderRadius: 8,
    gap: 14,
    padding: 16,
  },
  readerFacts: {
    color: "#657066",
    fontSize: 13,
    fontWeight: "700",
  },
  readerParagraph: {
    color: "#273028",
    fontSize: 16,
    lineHeight: 25,
  },
  readerSource: {
    color: "#617069",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  readerTitle: {
    color: "#101411",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  scrollBody: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  searchBox: {
    gap: 8,
  },
  searchInput: {
    backgroundColor: "#f9f3e7",
    borderColor: "#d5d0c4",
    borderRadius: 8,
    borderWidth: 1,
    color: "#151a16",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  searchLabel: {
    color: "#dfe8dc",
    fontSize: 13,
    fontWeight: "800",
  },
  shell: {
    backgroundColor: "#101411",
    flex: 1,
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: "#7fe2c0",
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  shareCard: {
    backgroundColor: "#edf1ff",
    borderRadius: 8,
    gap: 8,
    padding: 14,
  },
  shareText: {
    color: "#101411",
    fontSize: 14,
    fontWeight: "900",
  },
  statusCard: {
    backgroundColor: "#1b211c",
    borderColor: "#2f3a31",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusLabel: {
    color: "#9fb9a8",
    fontSize: 12,
    fontWeight: "700",
  },
  statusValue: {
    color: "#f9f3e7",
    fontSize: 24,
    fontWeight: "900",
  },
  syncBadge: {
    alignItems: "flex-end",
    backgroundColor: "#223329",
    borderRadius: 8,
    padding: 10,
  },
  syncBadgeLabel: {
    color: "#9fb9a8",
    fontSize: 11,
    fontWeight: "800",
  },
  syncBadgeValue: {
    color: "#f9f3e7",
    fontSize: 13,
    fontWeight: "800",
  },
  tabButton: {
    backgroundColor: "#1b211c",
    borderColor: "#2f3a31",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#7fe2c0",
    borderColor: "#7fe2c0",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabText: {
    color: "#dfe8dc",
    fontSize: 13,
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#101411",
  },
  title: {
    color: "#f9f3e7",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
  },
})
