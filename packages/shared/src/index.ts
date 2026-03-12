export enum UserRole {
  ADMIN = 'admin',
  COMMERCE = 'commerce',
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  commerceId: string | null;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
