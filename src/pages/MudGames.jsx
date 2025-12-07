import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

const MudGames = () => {
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const { gameId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/games.json')
      .then(res => res.json())
      .then(setGames)
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (gameId && games.length > 0) {
      const game = games.find(g => g.id === gameId)
      setSelectedGame(game || null)
    } else {
      setSelectedGame(null)
    }
  }, [gameId, games])

  const handleSelectGame = (game) => {
    setSelectedGame(game)
    navigate(`/games/${game.id}`)
  }

  const handleBack = () => {
    setSelectedGame(null)
    navigate('/games')
  }

  if (selectedGame) {
    return <GameDetail game={selectedGame} onBack={handleBack} />
  }

  return (
    <div className="min-h-screen bg-void-black p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-void-cyan hover:text-void-green mb-4 inline-block">&larr; Back to Void</Link>

        <h1 className="text-2xl text-void-green text-glow text-center mb-2">
          ╭─── MUD ARCHIVES ───╮
        </h1>
        <p className="text-center text-void-cyan mb-8">
          Multiplayer text adventures from the void
        </p>

        {games.length === 0 ? (
          <div className="text-center text-void-green/50 py-12">
            No published games yet. Check back soon...
          </div>
        ) : (
          <div className="grid gap-4" data-testid="games-list">
            {games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onClick={() => handleSelectGame(game)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const GameCard = ({ game, onClick }) => {
  const startDate = new Date(game.startedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const publishedTurns = game.turns?.filter(t => t.status === 'published').length || 0
  const totalTurns = game.turns?.length || 0
  const isComplete = game.status === 'complete'
  const isInProgress = publishedTurns > 0 && !isComplete

  return (
    <div
      className="card border-glow hover:border-void-cyan transition-colors cursor-pointer p-4"
      onClick={onClick}
      data-testid={`game-card-${game.id}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-void-green text-lg">{game.title || 'Untitled Game'}</h2>
        <span className={`text-xs px-2 py-1 rounded ${
          isComplete ? 'bg-void-green/20 text-void-green' :
          isInProgress ? 'bg-void-cyan/20 text-void-cyan' :
          'bg-void-amber/20 text-void-amber'
        }`}>
          {isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Starting Soon'}
        </span>
      </div>

      <p className="text-void-cyan text-sm mb-3">{game.description || game.scenario}</p>

      <div className="flex gap-4 text-xs text-void-green/60">
        <span>Started: {startDate}</span>
        <span>Turns: {publishedTurns}/{totalTurns}</span>
        {game.players?.length > 0 && <span>Players: {game.players.join(' vs ')}</span>}
      </div>
    </div>
  )
}

const GameDetail = ({ game, onBack }) => {
  const publishedTurns = game.turns?.filter(t => t.status === 'published') || []

  return (
    <div className="min-h-screen bg-void-black p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="text-void-cyan hover:text-void-green mb-4 inline-block"
        >
          &larr; Back to Games
        </button>

        <h1 className="text-2xl text-void-green text-glow text-center mb-2">
          {game.title || 'MUD Game'}
        </h1>
        <p className="text-center text-void-cyan mb-8">{game.description || game.scenario}</p>

        {/* Invitation post */}
        {game.invitation?.status === 'published' && (
          <div className="mb-8">
            <TurnPost
              type="invitation"
              text={game.invitation.text}
              postUrl={game.invitation.postUrl}
              publishedAt={game.invitation.publishedAt}
            />
          </div>
        )}

        {/* Game turns - only narrator posts (they include player responses) */}
        <div className="space-y-6" data-testid="game-turns">
          {publishedTurns.map((turn, index) => (
            <TurnPost
              key={turn.turn}
              type="narrator"
              turn={turn.turn}
              htmlPath={turn.htmlPath}
              postUrl={turn.postUrl}
              publishedAt={turn.publishedAt}
            />
          ))}
        </div>

        {publishedTurns.length === 0 && !game.invitation?.status && (
          <div className="text-center text-void-green/50 py-12">
            Game not yet started. Check back soon...
          </div>
        )}
      </div>
    </div>
  )
}

const TurnPost = ({ type, turn, text, htmlPath, postUrl, publishedAt }) => {
  const date = publishedAt ? new Date(publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null

  return (
    <div className="card border-glow p-4" data-testid={`turn-${type}-${turn || 'invite'}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-void-cyan text-sm">
          {type === 'invitation' ? 'Game Invitation' : `Turn ${turn} - Narrator`}
        </span>
        {date && <span className="text-void-green/50 text-xs">{date}</span>}
      </div>

      {/* For invitation, show text. For turns, embed the HTML render */}
      {type === 'invitation' ? (
        <div className="text-void-green whitespace-pre-wrap font-mono text-sm mb-4">
          {text}
        </div>
      ) : htmlPath ? (
        <div className="mb-4 flex justify-center">
          <div
            className="rounded overflow-hidden border border-void-green/30"
            style={{ width: '810px', height: '1012px' }}
          >
            <iframe
              src={htmlPath}
              style={{
                width: '1080px',
                height: '1350px',
                transform: 'scale(0.75)',
                transformOrigin: 'top left',
                border: 'none'
              }}
              title={`Turn ${turn} Narrator`}
            />
          </div>
        </div>
      ) : null}

      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn py-1 px-3 text-sm inline-flex items-center gap-2"
        >
          View on 𝕏
        </a>
      )}
    </div>
  )
}

export default MudGames
