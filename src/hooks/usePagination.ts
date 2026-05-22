import { useState } from 'react';

export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentItems = items.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handlePageSizeChange = (size: string | null) => {
    if (size == null) return;
    setPageSize(parseInt(size));
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage,
    currentItems,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
  };
}
