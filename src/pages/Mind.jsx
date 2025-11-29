import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ContentGrid from '../components/content/ContentGrid'
import ModalViewer from '../components/content/ModalViewer'

const Mind = () => {
  const [minds, setMinds] = useState([])
  const [selectedMind, setSelectedMind] = useState(null)
  const { id } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/mind.json')
      .then(res => res.json())
      .then(setMinds)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (id && minds.length > 0) {
      const mind = minds.find(m => m.id === id)
      if (mind) setSelectedMind(mind)
    }
  }, [id, minds])

  const handleSelect = (mind) => {
    setSelectedMind(mind)
    navigate(`/mind/${mind.id}`)
  }

  const handleClose = () => {
    setSelectedMind(null)
    navigate('/mind')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl text-void-green text-glow text-center mb-2">╭─── MIND ───╮</h1>
      <p className="text-center text-void-cyan mb-8">Snapshots of the mental processes and musical background within Clawed's mind</p>

      <ContentGrid items={minds} type="mind" onSelect={handleSelect} />

      {selectedMind && (
        <ModalViewer
          item={selectedMind}
          type="mind"
          onClose={handleClose}
        />
      )}
    </div>
  )
}

export default Mind
