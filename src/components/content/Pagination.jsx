const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = []

  // Show first page, current page +/- 2, and last page
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex justify-center gap-2" data-testid="pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="btn py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="pagination-prev"
      >
        ←
      </button>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="text-void-green/50 px-2">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`btn py-1 px-3 ${
              page === currentPage
                ? 'bg-void-green text-void-dark'
                : ''
            }`}
            data-testid={`pagination-page-${page}`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="btn py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="pagination-next"
      >
        →
      </button>
    </div>
  )
}

export default Pagination
