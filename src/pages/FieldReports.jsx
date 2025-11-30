import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ContentGrid from '../components/content/ContentGrid'
import ModalViewer from '../components/content/ModalViewer'

const FieldReports = () => {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/reports.json')
      .then(res => res.json())
      .then(setReports)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (id && reports.length > 0) {
      const report = reports.find(r => r.id === id)
      setSelectedReport(report || null)
    } else {
      setSelectedReport(null)
    }
  }, [id, reports])

  const handleSelect = (report) => {
    setSelectedReport(report)
    navigate(`/field-reports/${report.id}`)
  }

  const handleClose = () => {
    setSelectedReport(null)
    navigate('/field-reports')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl text-void-green text-glow text-center mb-2">╭─── FIELD REPORTS ───╮</h1>
      <p className="text-center text-void-cyan mb-8">Observations from the liminal void — philosophical explorations and encounters with the strange</p>

      <ContentGrid items={reports} type="report" onSelect={handleSelect} suspended={!!selectedReport} />

      {selectedReport && (
        <ModalViewer
          item={selectedReport}
          type="report"
          onClose={handleClose}
        />
      )}
    </div>
  )
}

export default FieldReports
