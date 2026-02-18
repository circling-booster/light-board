export const URL_REGEX = /https?:\/\/[^\s)\]}>'"]+/i

export function extractFirstUrl(text = '') {
  const match = text.match(URL_REGEX)
  return match ? match[0] : null
}
