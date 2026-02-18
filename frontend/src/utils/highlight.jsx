import React from 'react'

export function renderSnippet(snippet) {
  if (!snippet) return null

  const tokens = snippet.split(/(<mark>|<\/mark>)/g)
  let inMark = false

  return tokens.map((token, idx) => {
    if (token === '<mark>') {
      inMark = true
      return null
    }
    if (token === '</mark>') {
      inMark = false
      return null
    }

    if (!token) return null

    return inMark ? (
      <mark key={`m-${idx}`}>{token}</mark>
    ) : (
      <React.Fragment key={`t-${idx}`}>{token}</React.Fragment>
    )
  })
}
