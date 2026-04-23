/**
 * Pagination Service to calculate range for Supabase
 */
export const getPaginationRange = (page = 1, pageSize = 10) => {
  const limit = Math.max(1, parseInt(pageSize));
  const pageNum = Math.max(1, parseInt(page));
  const from = (pageNum - 1) * limit;
  const to = from + limit - 1;

  return { from, to, limit, page: pageNum };
};

/**
 * Format paginated response metadata
 */
export const getPaginationMeta = (totalCount, page, pageSize) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    total: totalCount,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages
  };
};
