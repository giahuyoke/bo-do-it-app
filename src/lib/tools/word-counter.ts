export interface TextCounts {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  /** At 200 words a minute; formatting is left to the caller. */
  readingMinutes: number;
}

const wordsPerMinute = 200;
const hasLetterOrDigit = /[\p{L}\p{N}]/u;

/** Characters as people see them: "👍🏽" or "à" built from parts count once. */
function graphemes(text: string) {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(text)].map(
      (part) => part.segment,
    );
  }
  return [...text];
}

export function countText(text: string): TextCounts {
  const characters = graphemes(text);
  // A Vietnamese syllable is its own word, so whitespace splitting fits; a
  // lone "-" or "…" is not a word.
  const words = text.split(/\s+/).filter((token) => hasLetterOrDigit.test(token)).length;
  return {
    characters: characters.length,
    charactersNoSpaces: characters.filter((char) => !/^\s+$/u.test(char)).length,
    words,
    lines: text ? text.split(/\r?\n/).length : 0,
    sentences: text
      .split(/[.!?…]+(?=\s|$)/u)
      .filter((sentence) => hasLetterOrDigit.test(sentence)).length,
    paragraphs: text.split(/\r?\n\s*\r?\n/).filter((block) => block.trim()).length,
    readingMinutes: words / wordsPerMinute,
  };
}
