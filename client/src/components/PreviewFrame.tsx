interface PreviewFrameProps {
  port: number | null
}

export default function PreviewFrame({ port }: PreviewFrameProps) {
  if (!port) {
    return (
      <div className="flex-1 bg-[#f0f2f5] flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🌐</div>
          <div className="text-lg font-semibold text-gray-600">Waiting for preview...</div>
          <div className="text-sm mt-1">Send a prompt to start building</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[rgba(11,15,26,0.85)] text-primary px-2.5 py-0.5 rounded text-[10px] z-10">
        localhost:{port}
      </div>
      <iframe
        src={`http://localhost:${port}`}
        className="w-full h-full border-0"
        title="App Preview"
      />
    </div>
  )
}
