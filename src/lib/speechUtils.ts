export interface WordComparisonItem {
  word: string;
  cleanWord: string;
  status: 'correct' | 'retry';
}

export interface ComparisonSummary {
  words: WordComparisonItem[];
  accuracy: number;
  matchedCount: number;
  totalCount: number;
}

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[.,!?;:"'()—-]/g, '')
    .trim();
}

const CONTRACTION_EQUIVALENTS: Record<string, string[]> = {
  lets: ['let', 'us'],
  dont: ['do', 'not'],
  ill: ['i', 'will'],
  id: ['i', 'would'],
  im: ['i', 'am'],
  ive: ['i', 'have'],
  whats: ['what', 'is'],
  its: ['it', 'is'],
  thats: ['that', 'is'],
  youre: ['you', 'are'],
  were: ['we', 'are'],
  theyre: ['they', 'are'],
};

/**
 * Compares spoken transcript against the target sentence.
 * Marks words green ('correct') if spoken accurately, or orange ('retry') if missed/mispronounced.
 */
export function compareTranscriptWithTarget(
  targetSentence: string,
  spokenTranscript: string
): ComparisonSummary {
  const rawTargetWords = targetSentence.split(/\s+/).filter(Boolean);
  const spokenTokens = spokenTranscript
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);

  const spokenSet = new Set(spokenTokens);

  let matchedCount = 0;
  const words: WordComparisonItem[] = rawTargetWords.map((rawWord) => {
    const cleanWord = normalizeToken(rawWord);
    if (!cleanWord) {
      return { word: rawWord, cleanWord, status: 'correct' };
    }

    let isMatch = spokenSet.has(cleanWord);

    // Check contractions equivalence
    if (!isMatch && CONTRACTION_EQUIVALENTS[cleanWord]) {
      const expanded = CONTRACTION_EQUIVALENTS[cleanWord];
      isMatch = expanded.every((part) => spokenSet.has(part));
    }

    // Check slight stem/plural similarity if spoken word is very close
    if (!isMatch && cleanWord.length >= 5) {
      for (const spoken of spokenTokens) {
        if (
          spoken.length >= 4 &&
          (cleanWord.startsWith(spoken) || spoken.startsWith(cleanWord)) &&
          Math.abs(cleanWord.length - spoken.length) <= 2
        ) {
          isMatch = true;
          break;
        }
      }
    }

    if (isMatch) {
      matchedCount += 1;
    }

    return {
      word: rawWord,
      cleanWord,
      status: isMatch ? 'correct' : 'retry',
    };
  });

  const totalCount = words.length || 1;
  const accuracy = Math.round((matchedCount / totalCount) * 100);

  return {
    words,
    accuracy,
    matchedCount,
    totalCount,
  };
}
