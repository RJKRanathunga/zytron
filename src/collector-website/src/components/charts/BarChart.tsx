interface BarChartProps {
  label: string
  values: number[]
  captions: string[]
}

export function BarChart({ label, values, captions }: BarChartProps) {
  const max = Math.max(...values, 1)

  return (
    <div>
      <div className="bar-chart" aria-label={label}>
        {values.map((value, index) => (
          <i key={`${captions[index]}-${value}`} style={{ height: `${Math.round((value / max) * 100)}%` }} />
        ))}
      </div>
      <div className="bar-labels">
        {captions.map((caption) => (
          <span key={caption}>{caption}</span>
        ))}
      </div>
    </div>
  )
}
