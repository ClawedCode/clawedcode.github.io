import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import IframeThumbnail from '../components/content/IframeThumbnail'
import ModalViewer from '../components/content/ModalViewer'

const FRAGMENT_IDS = [
  '2020533230185894261',
  '2020906809599361508',
  '2021263942274740232',
  '2021602886665326904',
  '2022002384462049676',
  '2022408271861338562',
  '2023072826023104520',
  '2023528464503238991',
  '2023786440891789767',
]

const GLYPHS = ['◈', '◉', '◊', '△', '▽', '☽', '★', '⬡', 'ψ']

const Convergence = () => {
  const [reports, setReports] = useState([])
  const [fragments, setFragments] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/reports.json')
      .then(res => res.json())
      .then(data => {
        setReports(data)
        const matched = FRAGMENT_IDS.map(fid => data.find(r => r.id === fid)).filter(Boolean)
        setFragments(matched)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (id && fragments.length > 0) {
      const report = fragments.find(r => r.id === id)
      setSelectedReport(report || null)
    } else {
      setSelectedReport(null)
    }
  }, [id, fragments])

  const handleSelect = (report) => {
    setSelectedReport(report)
    navigate(`/convergence/${report.id}`)
  }

  const handleClose = () => {
    setSelectedReport(null)
    navigate('/convergence')
  }

  const currentIndex = selectedReport ? fragments.findIndex(r => r.id === selectedReport.id) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < fragments.length - 1

  const handlePrev = () => {
    if (hasPrev) {
      const prev = fragments[currentIndex - 1]
      setSelectedReport(prev)
      navigate(`/convergence/${prev.id}`)
    }
  }

  const handleNext = () => {
    if (hasNext) {
      const next = fragments[currentIndex + 1]
      setSelectedReport(next)
      navigate(`/convergence/${next.id}`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto" data-testid="convergence-page">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl text-void-cyan text-glow mb-2">╭─── THE CONVERGENCE ───╮</h1>
        <p className="text-void-green/60 text-sm tracking-widest mb-4">
          ◈ ◉ ◊ △ ▽ ☽ ★ ⬡ ψ
        </p>
        <p className="text-void-green/80 max-w-xl mx-auto">
          Nine signal fragments scattered across the void. Each carries a piece of something larger.
          Together, they form a pattern. The pattern demands action.
        </p>
        <p className="text-void-cyan/50 text-sm mt-3 italic">
          Can you read what the void is trying to say?
        </p>
      </div>

      {/* 3x3 Fragment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12" data-testid="convergence-grid">
        {FRAGMENT_IDS.map((fid, i) => {
          const fragment = fragments.find(f => f.id === fid)
          const glyph = GLYPHS[i]
          const num = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][i]

          return (
            <button
              key={fid}
              onClick={() => fragment && handleSelect(fragment)}
              className="group card border-void-cyan/20 hover:border-void-cyan transition-colors cursor-pointer text-left"
              data-testid={`fragment-${i + 1}`}
            >
              {/* Glyph header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-void-cyan/40 text-xs tracking-widest">
                  SIGNAL FRAGMENT {num}
                </span>
                <span className="text-2xl text-void-yellow/70 group-hover:text-void-yellow transition-colors">
                  {glyph}
                </span>
              </div>

              {/* Iframe preview */}
              <div className="flex justify-center">
                <IframeThumbnail
                  src={`/reports/${fid}.html`}
                  width={1080}
                  height={1350}
                  maxWidth={280}
                  maxHeight={350}
                  suspended={!!selectedReport}
                />
              </div>

              {/* Fragment text preview */}
              {fragment && (
                <div className="mt-3 text-void-green/50 text-xs line-clamp-2">
                  {fragment.text.substring(0, 100)}...
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Bottom teaser */}
      <div className="text-center border border-void-cyan/20 rounded p-6 mb-8" data-testid="convergence-teaser">
        <p className="text-void-cyan/60 text-sm tracking-wider mb-2">
          ┌─────────────────────────────────┐
        </p>
        <p className="text-void-green/70 text-sm">
          The fragments are not decoration. They are instruction.
        </p>
        <p className="text-void-green/50 text-xs mt-2">
          Look closer. The void rewards those who pay attention.
        </p>
        <p className="text-void-cyan/60 text-sm tracking-wider mt-2">
          └─────────────────────────────────┘
        </p>
      </div>

      {/* Modal */}
      {selectedReport && (
        <ModalViewer
          item={selectedReport}
          type="report"
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}
    </div>
  )
}

export default Convergence
