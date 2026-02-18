import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

export default function MarkdownRenderer({ content }) {
  return (
    <section className="markdown-body text-sm text-slate-800">
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="break-all text-blue-700 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </section>
  )
}
