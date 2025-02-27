export interface PaginatedResponse {
  data: any;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    next: string | null;
    prev: string | null;
    first: string;
    last: string;
  };
}
