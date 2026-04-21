use std::borrow::Cow;

const STRIP_BLOCK_TAGS: &[&str] = &[
    "script", "style", "noscript", "template", "iframe", "svg", "canvas", "form", "button",
];

const UNWRAP_TAGS: &[&str] = &["nav", "header", "footer", "aside"];

pub fn sanitize_html(source: &str) -> Option<String> {
    let mut cleaned = source.trim().to_owned();

    if cleaned.is_empty() {
        return None;
    }

    cleaned = remove_comments(&cleaned);

    for tag in STRIP_BLOCK_TAGS {
        cleaned = strip_tag_with_contents(&cleaned, tag);
    }

    for tag in UNWRAP_TAGS {
        cleaned = strip_open_close_tags(&cleaned, tag);
    }

    cleaned = strip_attributes(&cleaned);
    cleaned = collapse_blank_lines(&cleaned);

    let trimmed = cleaned.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}

fn remove_comments(source: &str) -> String {
    let mut output = String::with_capacity(source.len());
    let mut remaining = source;

    loop {
        let Some(start) = remaining.find("<!--") else {
            output.push_str(remaining);
            break;
        };

        output.push_str(&remaining[..start]);
        let after_start = &remaining[start + 4..];

        let Some(end) = after_start.find("-->") else {
            break;
        };

        remaining = &after_start[end + 3..];
    }

    output
}

fn strip_tag_with_contents(source: &str, tag_name: &str) -> String {
    let mut output = String::with_capacity(source.len());
    let mut cursor = 0;
    let lowercase = source.to_ascii_lowercase();
    let open_pattern = format!("<{tag_name}");
    let close_pattern = format!("</{tag_name}>");

    while let Some(relative_start) = lowercase[cursor..].find(&open_pattern) {
        let start = cursor + relative_start;
        output.push_str(&source[cursor..start]);

        let Some(relative_end) = lowercase[start..].find(&close_pattern) else {
            cursor = source.len();
            break;
        };

        cursor = start + relative_end + close_pattern.len();
    }

    if cursor < source.len() {
        output.push_str(&source[cursor..]);
    }

    output
}

fn strip_open_close_tags(source: &str, tag_name: &str) -> String {
    let mut output = source.to_owned();
    output = strip_simple_tag(&output, &format!("<{tag_name}"), '>');
    output = replace_case_insensitive(&output, &format!("</{tag_name}>"), "");
    output
}

fn strip_simple_tag(source: &str, prefix: &str, terminator: char) -> String {
    let mut output = String::with_capacity(source.len());
    let mut cursor = 0;
    let lowercase = source.to_ascii_lowercase();
    let prefix_lowercase = prefix.to_ascii_lowercase();

    while let Some(relative_start) = lowercase[cursor..].find(&prefix_lowercase) {
        let start = cursor + relative_start;
        output.push_str(&source[cursor..start]);

        let Some(relative_end) = source[start..].find(terminator) else {
            cursor = source.len();
            break;
        };

        cursor = start + relative_end + 1;
    }

    if cursor < source.len() {
        output.push_str(&source[cursor..]);
    }

    output
}

fn strip_attributes(source: &str) -> String {
    let mut output = String::with_capacity(source.len());
    let mut in_tag = false;
    let mut chars = source.chars().peekable();

    while let Some(character) = chars.next() {
        if character == '<' {
            in_tag = true;
            output.push(character);
            continue;
        }

        if !in_tag {
            output.push(character);
            continue;
        }

        if character == '>' {
            in_tag = false;
            output.push(character);
            continue;
        }

        if character.is_whitespace() {
            output.push(character);
            continue;
        }

        if character == '"' || character == '\'' {
            continue;
        }

        let mut attribute = String::from(character);

        while let Some(next_character) = chars.peek().copied() {
            if next_character.is_whitespace() || next_character == '>' || next_character == '=' {
                break;
            }

            attribute.push(next_character);
            chars.next();
        }

        let keep_attribute = matches!(
            attribute.as_str(),
            "src" | "href" | "alt" | "title" | "srcset" | "width" | "height"
        );

        if keep_attribute {
            output.push_str(&attribute);
        }

        if chars.peek().copied() == Some('=') {
            chars.next();
            let quote = chars.peek().copied();

            match quote {
                Some('"') | Some('\'') => {
                    let delimiter = quote.unwrap_or('"');
                    if keep_attribute {
                        output.push('=');
                        output.push(delimiter);
                    }
                    chars.next();

                    for value_character in chars.by_ref() {
                        if value_character == delimiter {
                            if keep_attribute {
                                output.push(delimiter);
                            }
                            break;
                        }

                        if keep_attribute {
                            output.push(value_character);
                        }
                    }
                }
                _ => {
                    if keep_attribute {
                        output.push('=');
                    }

                    while let Some(value_character) = chars.peek().copied() {
                        if value_character.is_whitespace() || value_character == '>' {
                            break;
                        }

                        if keep_attribute {
                            output.push(value_character);
                        }
                        chars.next();
                    }
                }
            }
        }
    }

    output
}

fn collapse_blank_lines(source: &str) -> String {
    let mut output = String::new();
    let mut blank_line_count = 0;

    for line in source.lines() {
        if line.trim().is_empty() {
            blank_line_count += 1;
            if blank_line_count > 1 {
                continue;
            }
        } else {
            blank_line_count = 0;
        }

        if !output.is_empty() {
            output.push('\n');
        }
        output.push_str(line.trim_end());
    }

    output
}

fn replace_case_insensitive(source: &str, needle: &str, replacement: &str) -> String {
    let mut output = String::with_capacity(source.len());
    let lowercase = source.to_ascii_lowercase();
    let needle_lowercase = needle.to_ascii_lowercase();
    let mut cursor = 0;

    while let Some(relative_match) = lowercase[cursor..].find(&needle_lowercase) {
        let start = cursor + relative_match;
        output.push_str(&source[cursor..start]);
        output.push_str(replacement);
        cursor = start + needle.len();
    }

    output.push_str(&source[cursor..]);
    output
}

pub fn collapse_whitespace(source: &str) -> Cow<'_, str> {
    if !source.contains(char::is_whitespace) {
        return Cow::Borrowed(source);
    }

    let mut output = String::with_capacity(source.len());
    let mut previous_was_whitespace = false;

    for character in source.chars() {
        if character.is_whitespace() {
            if previous_was_whitespace {
                continue;
            }
            output.push(' ');
            previous_was_whitespace = true;
        } else {
            output.push(character);
            previous_was_whitespace = false;
        }
    }

    Cow::Owned(output.trim().to_owned())
}
