/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * QUERY BUILDER TYPE DEFINITIONS
 * These interfaces define the structure for the QueryBuilder utility
 * They mirror Prisma's query API while providing type safety
 */

/**
 * Arguments for Prisma findMany operations
 * Used to fetch multiple records with various filters and options
 */
export interface PrismaFindManyArgs {
  where?: Record<string, unknown>; // Filter conditions (e.g., { status: 'ACTIVE' })
  include?: Record<string, unknown>; // Relations to include (e.g., { user: true })
  select?: Record<string, boolean | Record<string, unknown>>; // Fields to return (e.g., { id: true, name: true })
  orderBy?: Record<string, unknown> | Record<string, unknown>[]; // Sorting (e.g., { createdAt: 'desc' })
  skip?: number; // Number of records to skip (pagination)
  take?: number; // Number of records to fetch (limit)
  cursor?: Record<string, unknown>; // Cursor-based pagination
  distinct?: string[] | string; // Remove duplicates by field(s)
  [key: string]: unknown; // Allow additional Prisma properties
}

/**
 * Arguments for Prisma count operations
 * Used to count records matching certain criteria
 * Similar to findMany but returns a number instead of data
 */
export interface PrismaCountArgs {
  where?: Record<string, unknown>; // Filter conditions
  include?: Record<string, unknown>; // Relations (rarely used in count)
  select?: Record<string, boolean | Record<string, unknown>>; // Fields (rarely used in count)
  orderBy?: Record<string, unknown> | Record<string, unknown>[]; // Sorting (not needed for count)
  skip?: number; // Skip records before counting
  take?: number; // Limit records to count
  cursor?: Record<string, unknown>; // Cursor for pagination
  distinct?: string[] | string; // Count distinct values
  [key: string]: unknown; // Allow additional Prisma properties
}

/**
 * Generic Prisma model delegate interface
 * Represents any Prisma model (User, Doctor, Patient, etc.)
 * Provides findMany and count methods for querying
 */
export interface PrismaModelDelegate {
  findMany(args?: any): Promise<any[]>; // Fetch multiple records
  count(args?: any): Promise<number>; // Count matching records
}

/**
 * Query parameters received from HTTP request
 * Typically extracted from req.query in Express
 * Example: /api/doctors?searchTerm=john&page=1&limit=10&sortBy=name&sortOrder=asc
 */
export interface IQueryParams {
  searchTerm?: string; // Global search term (searches across multiple fields)
  page?: string; // Current page number (default: 1)
  limit?: string; // Records per page (default: 10)
  sortBy?: string; // Field to sort by (e.g., 'createdAt', 'user.name')
  sortOrder?: "asc" | "desc"; // Sort direction (ascending or descending)
  fields?: string; // Comma-separated fields to select (e.g., 'id,name,email')
  includes?: string; // Comma-separated relations to include (e.g., 'user,specialties')
  [key: string]: string | undefined; // Additional filter params (e.g., specialty=cardiology)
}

/**
 * Configuration for QueryBuilder behavior
 * Defines which fields can be searched and filtered (security & feature control)
 */
export interface IQueryConfig {
  searchableFields?: string[]; // Fields to search when searchTerm is provided
  // Example: ['user.name', 'user.email', 'specialties.specialty.title']
  filterableFields?: string[]; // Fields allowed to be filtered
  // Example: ['specialty', 'appointmentFee', 'user.gender']
}

/**
 * Prisma string filter operators
 * Used for text-based filtering with various matching strategies
 * Example: { name: { contains: 'john', mode: 'insensitive' } }
 */
export interface PrismaStringFilter {
  contains?: string; // Partial match (e.g., 'john' matches 'John Doe')
  startsWith?: string; // Match from beginning (e.g., 'Dr.' matches 'Dr. Smith')
  endsWith?: string; // Match from end (e.g., '.com' matches 'email@test.com')
  mode?: "insensitive" | "default"; // Case sensitivity ('insensitive' = case-insensitive)
  equals?: string; // Exact match
  in?: string[]; // Match any value in array (e.g., ['ACTIVE', 'PENDING'])
  notIn?: string[]; // Exclude values (e.g., NOT IN ['DELETED', 'BANNED'])
  lt?: string; // Less than (alphabetically)
  lte?: string; // Less than or equal
  gt?: string; // Greater than (alphabetically)
  gte?: string; // Greater than or equal
  not?: PrismaStringFilter | string; // Negation (NOT equal to)
}

/**
 * Prisma number filter operators
 * Used for numeric and date-based filtering with comparison operators
 * Example: { appointmentFee: { gte: 50, lte: 200 } }
 */
export interface PrismaNumberFilter {
  equals?: number; // Exact match (e.g., age = 30)
  in?: number[]; // Match any value (e.g., [25, 30, 35])
  notIn?: number[]; // Exclude values (e.g., NOT IN [0, -1])
  lt?: number; // Less than (e.g., price < 100)
  lte?: number; // Less than or equal (e.g., age <= 65)
  gt?: number; // Greater than (e.g., salary > 50000)
  gte?: number; // Greater than or equal (e.g., rating >= 4)
  not?: PrismaNumberFilter | number; // Negation (NOT equal to)
}

/**
 * Prisma logical operators for complex queries
 * Allows combining multiple conditions with AND, OR, NOT logic
 * Example: { OR: [{ status: 'ACTIVE' }, { status: 'PENDING' }] }
 */
export interface PrismaWhereConditions {
  OR?: Record<string, unknown>[]; // Match ANY condition (logical OR)
  // Example: name contains 'john' OR email contains 'john'
  AND?: Record<string, unknown>[]; // Match ALL conditions (logical AND)
  // Example: status = 'ACTIVE' AND verified = true
  NOT?: Record<string, unknown>[]; // Match NONE of the conditions (logical NOT)
  // Example: NOT (status = 'DELETED')
  [key: string]: unknown; // Other filter conditions
}

/**
 * Standard response format for paginated queries
 * Contains both the data array and pagination metadata
 * Used by QueryBuilder.execute() method
 */
export interface IQueryResult<T> {
  data: T[]; // Array of records (typed to specific model)
  meta: {
    page: number; // Current page number
    limit: number; // Records per page
    total: number; // Total number of matching records
    totalPages: number; // Total pages available (calculated: total / limit)
  };
}
