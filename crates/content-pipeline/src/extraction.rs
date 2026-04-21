use std::cmp::Ordering;

use freelyrss_core_domain::{LanguageCode, UrlString};
use scraper::{ElementRef, Html, Selector};
use url::Url;

use crate::{
    ContentPipelineError, ContentPipelineInput, ProcessedContent, sanitize::collapse_whitespace,
    sanitize::sanitize_html,
};

pub struct DefaultContentPipeline;

impl DefaultContentPipeline {
    pub fn process(
        &self,
        input: &ContentPipelineInput,
    ) -> Result<ProcessedContent, ContentPipelineError> {
        let document = Html::parse_document(&input.html);
        let document_url = input
            .document_url
            .as_ref()
            .map(|value| Url::parse(value.as_str()))
            .transpose()
            .map_err(|_| ContentPipelineError::InvalidUrl {
                value: input
                    .document_url
                    .as_ref()
                    .map(ToString::to_string)
                    .unwrap_or_default(),
            })?;
        let candidate = select_best_candidate(&document);
        let cleaned_html = candidate
            .as_ref()
            .map(ElementRef::html)
            .and_then(|html| sanitize_html(&html))
            .or_else(|| sanitize_html(&input.html));
        let extracted_text = candidate
            .as_ref()
            .map(|candidate| extract_candidate_text(*candidate))
            .or_else(|| extract_document_text(&document));
        let normalized_text = extracted_text
            .as_deref()
            .map(str::trim)
            .filter(|text| !text.is_empty());
        let thumbnail_url =
            find_thumbnail_url(&document, candidate.as_ref(), document_url.as_ref())?;
        let language = normalized_text.and_then(estimate_language);
        let word_count = normalized_text
            .map(estimate_word_count)
            .filter(|count| *count > 0);

        Ok(ProcessedContent {
            cleaned_html,
            extracted_text: normalized_text.map(ToOwned::to_owned),
            thumbnail_url,
            language,
            word_count,
        })
    }
}

fn select_best_candidate(document: &Html) -> Option<ElementRef<'_>> {
    let mut best_candidate: Option<(i64, ElementRef<'_>)> = None;

    for candidate in document.select(content_candidate_selector()) {
        let score = score_candidate(candidate);

        if score <= 0 {
            continue;
        }

        match &best_candidate {
            Some((best_score, _)) if *best_score >= score => {}
            _ => best_candidate = Some((score, candidate)),
        }
    }

    best_candidate.map(|(_, candidate)| candidate)
}

fn score_candidate(candidate: ElementRef<'_>) -> i64 {
    let text = extract_candidate_text(candidate);
    let text_length = text.chars().count() as i64;

    if text_length < 80 {
        return 0;
    }

    let paragraph_count = candidate.select(paragraph_selector()).count() as i64;
    let image_count = candidate.select(image_selector()).count() as i64;
    let link_text_length = candidate
        .select(link_selector())
        .map(extract_candidate_text)
        .map(|text| text.chars().count() as i64)
        .sum::<i64>();
    let class_weight = candidate
        .value()
        .attr("class")
        .map(class_name_score)
        .unwrap_or(0)
        + candidate
            .value()
            .attr("id")
            .map(class_name_score)
            .unwrap_or(0);
    let tag_weight = match candidate.value().name() {
        "article" => 900,
        "main" => 750,
        "section" => 250,
        "div" => 80,
        "body" => 10,
        _ => 0,
    };

    text_length + paragraph_count * 140 + image_count * 30 + class_weight + tag_weight
        - link_text_length
}

fn class_name_score(value: &str) -> i64 {
    let normalized = value.to_ascii_lowercase();
    let positive_terms = [
        "article", "content", "entry", "post", "story", "body", "main",
    ];
    let negative_terms = [
        "nav", "footer", "aside", "sidebar", "comment", "share", "menu",
    ];
    let positive_score = positive_terms
        .into_iter()
        .filter(|term| normalized.contains(term))
        .count() as i64
        * 120;
    let negative_score = negative_terms
        .into_iter()
        .filter(|term| normalized.contains(term))
        .count() as i64
        * 170;

    positive_score - negative_score
}

fn find_thumbnail_url(
    document: &Html,
    candidate: Option<&ElementRef<'_>>,
    document_url: Option<&Url>,
) -> Result<Option<UrlString>, ContentPipelineError> {
    for selector in meta_image_selectors() {
        if let Some(image) = document.select(selector).next()
            && let Some(raw_url) = image.value().attr("content")
            && let Some(url) = resolve_url(document_url, raw_url)?
        {
            return Ok(Some(url));
        }
    }

    if let Some(candidate) = candidate
        && let Some(image) = candidate.select(image_selector()).next()
        && let Some(raw_url) = image.value().attr("src")
        && let Some(url) = resolve_url(document_url, raw_url)?
    {
        return Ok(Some(url));
    }

    if let Some(image) = document.select(image_selector()).next()
        && let Some(raw_url) = image.value().attr("src")
        && let Some(url) = resolve_url(document_url, raw_url)?
    {
        return Ok(Some(url));
    }

    Ok(None)
}

fn resolve_url(
    document_url: Option<&Url>,
    raw_value: &str,
) -> Result<Option<UrlString>, ContentPipelineError> {
    let trimmed = raw_value.trim();

    if trimmed.is_empty() {
        return Ok(None);
    }

    let resolved = match document_url {
        Some(base_url) => base_url.join(trimmed).or_else(|_| Url::parse(trimmed)),
        None => Url::parse(trimmed),
    }
    .map_err(|_| ContentPipelineError::InvalidUrl {
        value: trimmed.to_owned(),
    })?;

    Ok(Some(UrlString::try_from(resolved.to_string()).map_err(
        |_| ContentPipelineError::InvalidUrl {
            value: trimmed.to_owned(),
        },
    )?))
}

fn extract_candidate_text(candidate: ElementRef<'_>) -> String {
    let joined = candidate.text().collect::<Vec<_>>().join(" ");
    collapse_whitespace(&joined).into_owned()
}

fn extract_document_text(document: &Html) -> Option<String> {
    let body = document.select(body_selector()).next()?;
    let text = extract_candidate_text(body);
    (!text.is_empty()).then_some(text)
}

fn estimate_language(text: &str) -> Option<LanguageCode> {
    let mut latin_letters = 0usize;
    let mut cjk = 0usize;
    let mut hiragana_katakana = 0usize;
    let mut hangul = 0usize;

    for character in text.chars() {
        if character.is_ascii_alphabetic() {
            latin_letters += 1;
            continue;
        }

        match character {
            '\u{3040}'..='\u{30ff}' => hiragana_katakana += 1,
            '\u{4e00}'..='\u{9fff}' => cjk += 1,
            '\u{ac00}'..='\u{d7af}' => hangul += 1,
            _ => {}
        }
    }

    let language = if hangul >= 8 && hangul >= hiragana_katakana && hangul >= cjk / 2 {
        Some("ko")
    } else if hiragana_katakana >= 6 {
        Some("ja")
    } else if cjk >= 8 {
        Some("zh")
    } else if latin_letters >= 24 {
        Some("en")
    } else {
        None
    }?;

    LanguageCode::try_from(language).ok()
}

fn estimate_word_count(text: &str) -> usize {
    let cjk_count = text
        .chars()
        .filter(|character| matches!(character, '\u{3040}'..='\u{30ff}' | '\u{4e00}'..='\u{9fff}' | '\u{ac00}'..='\u{d7af}'))
        .count();

    let latin_word_count = count_latin_words(text);

    match cjk_count.cmp(&0) {
        Ordering::Greater if cjk_count > latin_word_count * 2 => cjk_count + latin_word_count,
        _ => latin_word_count.max(1),
    }
}

fn count_latin_words(text: &str) -> usize {
    let mut count = 0usize;
    let mut in_word = false;

    for character in text.chars() {
        if character.is_alphanumeric() {
            if !in_word {
                count += 1;
                in_word = true;
            }
        } else {
            in_word = false;
        }
    }

    count
}

fn body_selector() -> &'static Selector {
    static BODY_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| Selector::parse("body").expect("valid selector"));
    &BODY_SELECTOR
}

fn content_candidate_selector() -> &'static Selector {
    static CONTENT_CANDIDATE_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| {
            Selector::parse("article, main, section, div, body").expect("valid selector")
        });
    &CONTENT_CANDIDATE_SELECTOR
}

fn image_selector() -> &'static Selector {
    static IMAGE_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| Selector::parse("img[src]").expect("valid selector"));
    &IMAGE_SELECTOR
}

fn link_selector() -> &'static Selector {
    static LINK_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| Selector::parse("a").expect("valid selector"));
    &LINK_SELECTOR
}

fn paragraph_selector() -> &'static Selector {
    static PARAGRAPH_SELECTOR: std::sync::LazyLock<Selector> =
        std::sync::LazyLock::new(|| Selector::parse("p").expect("valid selector"));
    &PARAGRAPH_SELECTOR
}

fn meta_image_selectors() -> &'static [Selector] {
    static META_IMAGE_SELECTORS: std::sync::LazyLock<Vec<Selector>> =
        std::sync::LazyLock::new(|| {
            vec![
                Selector::parse("meta[property='og:image'][content]").expect("valid selector"),
                Selector::parse("meta[property='og:image:url'][content]").expect("valid selector"),
                Selector::parse("meta[name='twitter:image'][content]").expect("valid selector"),
            ]
        });

    &META_IMAGE_SELECTORS
}

#[cfg(test)]
mod tests {
    use freelyrss_core_domain::{LanguageCode, UrlString};

    use super::DefaultContentPipeline;
    use crate::ContentPipelineInput;

    #[test]
    fn extracts_main_article_body_and_cleans_noise() {
        let pipeline = DefaultContentPipeline;
        let result = pipeline
            .process(&ContentPipelineInput {
                document_url: Some(
                    UrlString::try_from("https://example.com/articles/shell".to_owned())
                        .expect("valid url"),
                ),
                html: r#"
                  <html>
                    <body>
                      <nav><a href="/home">Home</a></nav>
                      <article class="post-content">
                        <header><h1>Stable shell boundaries</h1></header>
                        <p>The shell should not absorb every future concern.</p>
                        <p>Reader state, query state, and durable storage should remain separate.</p>
                        <script>alert("bad")</script>
                      </article>
                      <aside>Promoted links</aside>
                    </body>
                  </html>
                "#
                .to_owned(),
            })
            .expect("pipeline should succeed");

        let cleaned_html = result.cleaned_html.expect("cleaned html");
        let extracted_text = result.extracted_text.expect("extracted text");

        assert!(cleaned_html.contains("Stable shell boundaries"));
        assert!(!cleaned_html.contains("<script"));
        assert!(!cleaned_html.contains("Promoted links"));
        assert!(!cleaned_html.contains("Home"));
        assert!(extracted_text.contains("The shell should not absorb every future concern."));
        assert!(extracted_text.contains("Reader state, query state, and durable storage"));
        assert_eq!(
            result.language,
            Some(LanguageCode::try_from("en").expect("valid language")),
        );
        assert!(result.word_count.expect("word count") >= 15);
    }

    #[test]
    fn prefers_meta_thumbnail_and_resolves_relative_image_urls() {
        let pipeline = DefaultContentPipeline;
        let result = pipeline
            .process(&ContentPipelineInput {
                document_url: Some(
                    UrlString::try_from("https://example.com/articles/opml".to_owned())
                        .expect("valid url"),
                ),
                html: r#"
                  <html>
                    <head>
                      <meta property="og:image" content="/images/opml-cover.png" />
                    </head>
                    <body>
                      <article>
                        <p>OPML import and export should round-trip through the same shell-owned structure.</p>
                        <img src="/images/fallback.png" alt="fallback" />
                      </article>
                    </body>
                  </html>
                "#
                .to_owned(),
            })
            .expect("pipeline should succeed");

        assert_eq!(
            result.thumbnail_url,
            Some(
                UrlString::try_from("https://example.com/images/opml-cover.png".to_owned())
                    .expect("valid url"),
            ),
        );
    }

    #[test]
    fn falls_back_to_first_content_image_when_meta_thumbnail_is_missing() {
        let pipeline = DefaultContentPipeline;
        let result = pipeline
            .process(&ContentPipelineInput {
                document_url: Some(
                    UrlString::try_from("https://example.com/articles/query".to_owned())
                        .expect("valid url"),
                ),
                html: r#"
                  <html>
                    <body>
                      <article class="entry-content">
                        <p>The query builder now owns a single explicit article query object.</p>
                        <img src="cover.png" alt="cover" />
                      </article>
                    </body>
                  </html>
                "#
                .to_owned(),
            })
            .expect("pipeline should succeed");

        assert_eq!(
            result.thumbnail_url,
            Some(
                UrlString::try_from("https://example.com/articles/cover.png".to_owned())
                    .expect("valid url"),
            ),
        );
    }

    #[test]
    fn estimates_cjk_language_and_word_count() {
        let pipeline = DefaultContentPipeline;
        let result = pipeline
            .process(&ContentPipelineInput {
                document_url: None,
                html: r#"
                  <html>
                    <body>
                      <article>
                        <p>这是一个用于验证正文提取和语言估算的测试段落。</p>
                        <p>它应该被识别为中文，并且字数估算不应为空。</p>
                      </article>
                    </body>
                  </html>
                "#
                .to_owned(),
            })
            .expect("pipeline should succeed");

        assert_eq!(
            result.language,
            Some(LanguageCode::try_from("zh").expect("valid language")),
        );
        assert!(result.word_count.expect("word count") >= 20);
        assert!(
            result
                .extracted_text
                .expect("extracted text")
                .contains("正文提取和语言估算"),
        );
    }
}
