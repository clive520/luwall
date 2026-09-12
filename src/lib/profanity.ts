// 不雅詞庫與可愛 Emoji 替換對照表
const PROFANITY_PATTERNS = [
  /幹/gi,
  /操/gi,
  /靠北/gi,
  /靠杯/gi,
  /三小/gi,
  /白痴/gi,
  /白癡/gi,
  /智障/gi,
  /北七/gi,
  /機掰/gi,
  /雞掰/gi,
  /fuck/gi,
  /bitch/gi,
  /shit/gi,
  /asshole/gi,
];

const CUTE_EMOJIS = ['🌸', '🐱', '✨', '🍀', '🌈', '🍭', '⭐', '🎈'];

export function filterProfanity(text: string): string {
  let result = text;
  let emojiIndex = 0;

  for (const pattern of PROFANITY_PATTERNS) {
    result = result.replace(pattern, () => {
      const emoji = CUTE_EMOJIS[emojiIndex % CUTE_EMOJIS.length];
      emojiIndex++;
      return emoji;
    });
  }

  return result;
}
