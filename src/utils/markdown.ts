// Strips reasoning/thinking blocks and inline tags (e.g. <situation N>) from a
// streaming response. Handles unclosed blocks (still streaming) by matching to end-of-string.
const THINK_BLOCK = /<(think|thinking|reasoning|reflection|analysis|scratchpad)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/gi

export const stripAngleTags = (text: string): string =>
  text
    .replace(THINK_BLOCK, '')
    .replace(/<[^>]*>/g, '')   // standalone tags like <situation 1>
    .replace(/<[^>]*$/, '')    // partial tag still arriving
    .replace(/\n{3,}/g, '\n\n')
    .trim()

// Escape HTML, then expand a tiny subset of markdown (bold, italic). XSS-safe because
// we escape before introducing any tags.
export const renderBasicMarkdown = (text: string): string => {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/\*\*((?:(?!\n\n)[\s\S])+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*((?:(?!\n\n)[\s\S])+?)\*/g, '<em>$1</em>')
  html = html.replace(/(?<=^|\W)_((?:(?!\n\n)[\s\S])+?)_(?=$|\W)/g, '<em>$1</em>')

  // Unclosed tags at end of stream
  html = html.replace(/\*\*([^<]*)$/, '<strong>$1</strong>')
  html = html.replace(/\*([^<]*)$/, '<em>$1</em>')
  html = html.replace(/(?<=^|\W)_([^<]*)$/, '<em>$1</em>')

  return html
}
