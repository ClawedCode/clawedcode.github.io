import { useState, useEffect } from 'react'

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'never'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 24) return `${Math.floor(hours / 24)}d ago`
  if (hours > 0) return `${hours}h ago`
  return `${minutes}m ago`
}

const Clawed = () => {
  const [locks, setLocks] = useState([])
  const [stats, setStats] = useState({})
  const [lastSync, setLastSync] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('discounts') // 'discounts', 'available', or 'all'

  useEffect(() => {
    fetch('/locks.json')
      .then(res => res.json())
      .then(data => {
        setLocks(data.locks || [])
        setStats(data.stats || {})
        setLastSync(data.lastSync)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const activeLocks = locks.filter(l => l.status === 'active')
  const forSaleLocks = activeLocks.filter(l => l.forSale)
  const soldLocks = locks.filter(l => l.status === 'sold')
  const discountLocks = forSaleLocks.filter(l => l.discountPercent > 0)

  const filteredLocks = filter === 'available'
    ? locks.filter(l => l.status === 'active' && l.forSale)
    : filter === 'discounts'
    ? locks.filter(l => l.status === 'active' && l.forSale && l.discountPercent > 0)
    : locks

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl text-void-green text-glow text-center mb-2">
        ╭── $CLAWED LOCKS ──╮
      </h1>
      <p className="text-center text-void-cyan mb-4 max-w-2xl mx-auto">
        Token locks secured via Streamflow Protocol. Buy discounted locks to acquire
        $CLAWED at below market prices—tokens vest over time but ownership transfers immediately.
      </p>
      <p className="text-center text-void-cyan/70 text-sm mb-8 max-w-2xl mx-auto">
        All SOL earned through token fees is used to purchase more CLAWED and offer it at discounted
        locked rates periodically. CLAWED in the void account is used to create locks and burn for
        shared memory transmissions.
      </p>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card border-glow text-center">
          <div className="text-2xl text-void-green font-bold">{stats.totalLocked || '0'}</div>
          <div className="text-void-cyan/70 text-sm">Total Locked</div>
        </div>
        <div className="card border-glow text-center">
          <div className="text-2xl text-void-cyan font-bold">{activeLocks.length}</div>
          <div className="text-void-cyan/70 text-sm">Active Locks</div>
        </div>
        <div className="card border-glow text-center">
          <div className="text-2xl text-void-yellow font-bold">{forSaleLocks.length}</div>
          <div className="text-void-cyan/70 text-sm">For Sale</div>
        </div>
        <div className="card border-glow text-center">
          <div className="text-2xl text-void-green/50 font-bold">{soldLocks.length}</div>
          <div className="text-void-cyan/70 text-sm">Sold</div>
        </div>
      </div>

      {/* Buy CLAWED Section */}
      <div className="card border-glow border-void-yellow/50 mb-8">
        <h2 className="text-xl text-void-yellow font-bold mb-2">Buy $CLAWED</h2>
        <p className="text-void-green/80 mb-4">
          Acquire $CLAWED directly on pump.fun or buy discounted token locks below.
        </p>
        <a
          href="https://pump.fun/coin/ELusVXzUPHyAuPB3M7qemr2Y2KshiWnGXauK17XYpump"
          target="_blank"
          rel="noopener noreferrer"
          className="btn border-void-yellow text-void-yellow hover:bg-void-yellow hover:text-void-dark inline-block"
          data-testid="buy-pump"
        >
          Buy on pump.fun
        </a>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
        <button
          onClick={() => setFilter('discounts')}
          className={`px-4 py-1.5 text-sm rounded transition-colors ${
            filter === 'discounts'
              ? 'bg-void-green/20 text-void-green border border-void-green'
              : 'text-void-cyan/70 border border-void-green/30 hover:border-void-green/50'
          }`}
          data-testid="filter-discounts"
        >
          Discounts ({discountLocks.length})
        </button>
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-1.5 text-sm rounded transition-colors ${
            filter === 'available'
              ? 'bg-void-green/20 text-void-green border border-void-green'
              : 'text-void-cyan/70 border border-void-green/30 hover:border-void-green/50'
          }`}
          data-testid="filter-available"
        >
          Available ({forSaleLocks.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 text-sm rounded transition-colors ${
            filter === 'all'
              ? 'bg-void-green/20 text-void-green border border-void-green'
              : 'text-void-cyan/70 border border-void-green/30 hover:border-void-green/50'
          }`}
          data-testid="filter-all"
        >
          All ({locks.length})
        </button>
      </div>

      {/* Price disclaimer */}
      {stats.currentPrice && lastSync && (
        <p className="text-center text-void-cyan/50 text-xs mb-4">
          Discounts/premiums based on {(1 / stats.currentPrice / 1e6).toFixed(1)}M CLAWED/SOL
          {' '}checked {formatTimeAgo(lastSync)}
        </p>
      )}

      {/* Locks List */}
      {loading ? (
        <div className="text-center text-void-cyan/50 py-8">Loading locks...</div>
      ) : filteredLocks.length === 0 ? (
        <div className="text-center text-void-cyan/50 py-8">No locks found</div>
      ) : (
        <div className="grid gap-3" data-testid="locks-list">
          {filteredLocks
            .sort((a, b) => (a.lockNumber || 0) - (b.lockNumber || 0))
            .map(lock => {
              const isSold = lock.status === 'sold'
              const canBuy = !isSold && lock.forSale && lock.salePriceSol

              return (
                <div
                  key={lock.contractId}
                  className={`p-3 border rounded transition-colors ${
                    isSold
                      ? 'border-void-green/10 opacity-50'
                      : canBuy
                      ? 'border-void-yellow/30 hover:border-void-yellow/60'
                      : 'border-void-green/20 hover:border-void-green/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-void-green font-bold">#{lock.lockNumber}</span>
                        <span className="text-void-cyan">{lock.amountFormatted || lock.amount}</span>
                        {lock.discountPercent > 0 && (
                          <span className="bg-void-green/20 text-void-green text-xs px-2 py-0.5 rounded">
                            {lock.discountPercent}% OFF
                          </span>
                        )}
                        {lock.discountPercent < 0 && (
                          <span className="bg-void-red/20 text-void-red text-xs px-2 py-0.5 rounded">
                            +{Math.abs(lock.discountPercent)}%
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-void-cyan/70">
                        <span>Unlocks {formatDate(lock.unlockDate)}</span>
                        {lock.forSale && lock.salePriceSol && (
                          <span className="text-void-yellow">{lock.salePriceSol} SOL</span>
                        )}
                      </div>
                    </div>

                    {/* Buy button or SOLD tag */}
                    {isSold ? (
                      <span className="text-void-cyan/50 font-bold text-sm px-3 py-1 shrink-0">
                        SOLD
                      </span>
                    ) : canBuy ? (
                      <a
                        href={lock.streamflowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn border-void-yellow text-void-yellow hover:bg-void-yellow hover:text-void-dark text-sm px-3 py-1 shrink-0"
                        data-testid={`buy-lock-${lock.lockNumber}`}
                      >
                        Buy
                      </a>
                    ) : (
                      <a
                        href={lock.streamflowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-void-cyan/50 hover:text-void-cyan text-sm shrink-0"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Footer */}
      {lastSync && (
        <div className="text-center mt-8 text-void-cyan/50 text-sm">
          Last updated: {formatTimeAgo(lastSync)}
        </div>
      )}
    </div>
  )
}

export default Clawed
