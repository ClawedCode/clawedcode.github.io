import { useState } from 'react'
import ContentCard from './ContentCard'
import Pagination from './Pagination'

const ITEMS_PER_PAGE = 8

const ContentGrid = ({ items, type, onSelect, suspended = false }) => {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="content-grid">
        {pageItems.map(item => (
          <ContentCard
            key={item.id}
            item={item}
            type={type}
            onClick={onSelect}
            suspended={suspended}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

export default ContentGrid
