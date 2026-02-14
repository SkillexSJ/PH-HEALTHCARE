import {
  IQueryConfig,
  IQueryParams,
  IQueryResult,
  PrismaCountArgs,
  PrismaFindManyArgs,
  PrismaModelDelegate,
  PrismaNumberFilter,
  PrismaStringFilter,
  PrismaWhereConditions,
} from "../interfaces/query.interface";

/**
 * QueryBuilder class - A powerful utility to build complex Prisma queries from URL query parameters
 * Supports: search, filter, pagination, sorting, field selection, and dynamic includes
 *
 * @param T - The model type being queried
 * @param TWhereInput - Type for where conditions (filtering)
 * @param TInclude - Type for relation includes
 */
export class QueryBuilder<
  T,
  TWhereInput = Record<string, unknown>,
  TInclude = Record<string, unknown>,
> {
  // Main query object for fetching data
  private query: PrismaFindManyArgs;
  // Separate query for counting total records (used for pagination meta)
  private countQuery: PrismaCountArgs;
  // Pagination state
  private page: number = 1;
  private limit: number = 10;
  private skip: number = 0;
  // Sorting defaults
  private sortBy: string = "createdAt";
  private sortOrder: "asc" | "desc" = "desc";
  // Field selection for partial data fetching
  private selectFields: Record<string, boolean> | undefined;

  /**
   * Initialize QueryBuilder with model, query params from request, and optional config
   * @param model - Prisma model delegate (e.g., prisma.user)
   * @param queryParams - Query parameters from request (e.g., req.query)
   * @param config - Configuration for searchable and filterable fields
   */
  constructor(
    private model: PrismaModelDelegate,
    private queryParams: IQueryParams,
    private config: IQueryConfig = {},
  ) {
    // Initialize main query with default structure
    this.query = {
      where: {},
      include: {},
      orderBy: {},
      skip: 0,
      take: 10,
    };

    // Initialize count query (mirrors where conditions for accurate total count)
    this.countQuery = {
      where: {},
    };
  }

  /**
   * Implements global search functionality across multiple fields
   * Example: /api/doctors?searchTerm=john -> searches in all configured searchable fields
   * Supports: direct fields, nested relations (user.name), and deep nested (specialties.specialty.title)
   */
  search(): this {
    const { searchTerm } = this.queryParams;
    const { searchableFields } = this.config;
    // Example: doctorSearchableFields = ['user.name', 'user.email', 'specialties.specialty.title']
    if (searchTerm && searchableFields && searchableFields.length > 0) {
      // Build OR conditions for each searchable field
      const searchConditions: Record<string, unknown>[] = searchableFields.map(
        (field) => {
          // Handle nested/relational fields (e.g., user.name or doctor.specialty.title)
          if (field.includes(".")) {
            const parts = field.split(".");

            // Handle 2-level nesting: user.name
            if (parts.length === 2) {
              const [relation, nestedField] = parts;

              // Case-insensitive partial match
              const stringFilter: PrismaStringFilter = {
                contains: searchTerm,
                mode: "insensitive" as const,
              };

              return {
                [relation]: {
                  [nestedField]: stringFilter,
                },
              };
              // Handle 3-level deep nesting: specialties.specialty.title
            } else if (parts.length === 3) {
              const [relation, nestedRelation, nestedField] = parts;

              const stringFilter: PrismaStringFilter = {
                contains: searchTerm,
                mode: "insensitive" as const,
              };

              // Use 'some' for array relations (e.g., doctor has many specialties)
              return {
                [relation]: {
                  some: {
                    [nestedRelation]: {
                      [nestedField]: stringFilter,
                    },
                  },
                },
              };
            }
          }
          // Handle direct/simple field (e.g., name, email)
          const stringFilter: PrismaStringFilter = {
            contains: searchTerm,
            mode: "insensitive" as const,
          };

          return {
            [field]: stringFilter,
          };
        },
      );

      // Apply OR conditions to main query (match ANY field)
      const whereConditions = this.query.where as PrismaWhereConditions;

      whereConditions.OR = searchConditions;

      // Apply same conditions to count query for accurate pagination
      const countWhereConditions = this.countQuery
        .where as PrismaWhereConditions;
      countWhereConditions.OR = searchConditions;
    }

    return this;
  }

  /**
   * Applies filtering based on query parameters
   * Example: /doctors?specialty=cardiology&appointmentFee[lt]=100
   * Result: { specialty: 'cardiology', appointmentFee: { lt: 100 } }
   * Supports: direct fields, nested relations, range operators (lt, gt, lte, gte, etc.)
   */
  filter(): this {
    const { filterableFields } = this.config;
    // Reserved query params that shouldn't be used for filtering
    const excludedField = [
      "searchTerm",
      "page",
      "limit",
      "sortBy",
      "sortOrder",
      "fields",
      "include",
    ];

    // Extract only filterable params from request
    const filterParams: Record<string, unknown> = {};

    Object.keys(this.queryParams).forEach((key) => {
      if (!excludedField.includes(key)) {
        filterParams[key] = this.queryParams[key];
      }
    });

    const queryWhere = this.query.where as Record<string, unknown>;
    const countQueryWhere = this.countQuery.where as Record<string, unknown>;

    // Process each filter parameter
    Object.keys(filterParams).forEach((key) => {
      const value = filterParams[key];

      // Skip empty values
      if (value === undefined || value === "") {
        return;
      }

      // Check if field is allowed to be filtered (security/config check)
      const isAllowedField =
        !filterableFields ||
        filterableFields.length === 0 ||
        filterableFields.includes(key);

      // Example filterable fields: ['specialties.specialty.title', 'appointmentFee']
      // Range filter: /doctors?appointmentFee[lt]=100&appointmentFee[gt]=50
      // Nested filter: /doctors?user.name=John => { user: { name: 'John' } }

      // Handle nested/relational filters
      if (key.includes(".")) {
        const parts = key.split(".");

        // Security check: only allow configured nested fields
        if (filterableFields && !filterableFields.includes(key)) {
          return;
        }

        // Handle 2-level nested filter: user.name
        if (parts.length === 2) {
          const [relation, nestedField] = parts;

          // Initialize relation object if not exists
          if (!queryWhere[relation]) {
            queryWhere[relation] = {};
            countQueryWhere[relation] = {};
          }

          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelation = countQueryWhere[relation] as Record<
            string,
            unknown
          >;

          // Set nested field value (auto-converted to proper type)
          queryRelation[nestedField] = this.parseFilterValue(value);
          countRelation[nestedField] = this.parseFilterValue(value);
          return;
        }
        // Handle 3-level deep nested filter: specialties.specialty.title
        else if (parts.length === 3) {
          const [relation, nestedRelation, nestedField] = parts;

          // Initialize with 'some' for array relations
          if (!queryWhere[relation]) {
            queryWhere[relation] = {
              some: {},
            };
            countQueryWhere[relation] = {
              some: {},
            };
          }

          const queryRelation = queryWhere[relation] as Record<string, unknown>;
          const countRelation = countQueryWhere[relation] as Record<
            string,
            unknown
          >;

          // Ensure 'some' exists
          if (!queryRelation.some) {
            queryRelation.some = {};
          }
          if (!countRelation.some) {
            countRelation.some = {};
          }

          const querySome = queryRelation.some as Record<string, unknown>;
          const countSome = countRelation.some as Record<string, unknown>;

          // Initialize nested relation
          if (!querySome[nestedRelation]) {
            querySome[nestedRelation] = {};
          }

          if (!countSome[nestedRelation]) {
            countSome[nestedRelation] = {};
          }

          const queryNestedRelation = querySome[nestedRelation] as Record<
            string,
            unknown
          >;
          const countNestedRelation = countSome[nestedRelation] as Record<
            string,
            unknown
          >;

          // Set the deeply nested field value
          queryNestedRelation[nestedField] = this.parseFilterValue(value);
          countNestedRelation[nestedField] = this.parseFilterValue(value);

          return;
        }
      }
      // Skip non-allowed fields
      if (!isAllowedField) {
        return;
      }

      // Handle range/operator filters: appointmentFee[lt]=100
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        queryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        countQueryWhere[key] = this.parseRangeFilter(
          value as Record<string, string | number>,
        );
        return;
      }

      // Handle direct simple filter: specialty=cardiology
      queryWhere[key] = this.parseFilterValue(value);
      countQueryWhere[key] = this.parseFilterValue(value);
    });
    return this;
  }

  /**
   * Implements pagination logic
   * Example: /doctors?page=2&limit=20
   * Calculates skip offset and applies to query
   */
  paginate(): this {
    const page = Number(this.queryParams.page) || 1;
    const limit = Number(this.queryParams.limit) || 10;

    this.page = page;
    this.limit = limit;
    // Calculate records to skip: page 2 with limit 10 = skip 10 records
    this.skip = (page - 1) * limit;

    this.query.skip = this.skip;
    this.query.take = this.limit;

    return this;
  }

  /**
   * Applies sorting to results
   * Example: /doctors?sortBy=user.name&sortOrder=asc
   * Supports nested sorting: user.name, specialty.title, etc.
   */
  sort(): this {
    const sortBy = this.queryParams.sortBy || "createdAt";
    const sortOrder = this.queryParams.sortOrder === "asc" ? "asc" : "desc";

    this.sortBy = sortBy;
    this.sortOrder = sortOrder;

    // Example: /doctors?sortBy=user.name&sortOrder=asc => orderBy: { user: { name: 'asc' } }

    // Handle nested sorting
    if (sortBy.includes(".")) {
      const parts = sortBy.split(".");

      // 2-level nested sort: user.name
      if (parts.length === 2) {
        const [relation, nestedField] = parts;

        this.query.orderBy = {
          [relation]: {
            [nestedField]: sortOrder,
          },
        };
        // 3-level deep nested sort: doctor.specialty.title
      } else if (parts.length === 3) {
        const [relation, nestedRelation, nestedField] = parts;

        this.query.orderBy = {
          [relation]: {
            [nestedRelation]: {
              [nestedField]: sortOrder,
            },
          },
        };
      } else {
        // Fallback for other cases
        this.query.orderBy = {
          [sortBy]: sortOrder,
        };
      }
    } else {
      // Direct field sort: createdAt, name, etc.
      this.query.orderBy = {
        [sortBy]: sortOrder,
      };
    }
    return this;
  }

  /**
   * Selects specific fields to return (reduces payload size)
   * Example: /doctors?fields=id,name,email
   * Note: Only direct fields supported, no nested selection yet
   * NOTE: 'select' and 'include' are mutually exclusive in Prisma
   */
  fields(): this {
    const fieldsParam = this.queryParams.fields;
    // Example output: select: { id: true, name: true, email: true }

    // Only select direct fields for now (no nested field selection)
    if (fieldsParam && typeof fieldsParam === "string") {
      const fieldsArray = fieldsParam?.split(",").map((field) => field.trim());
      this.selectFields = {};

      // Build select object: each field => true
      fieldsArray?.forEach((field) => {
        if (this.selectFields) {
          this.selectFields[field] = true;
        }
      });

      this.query.select = this.selectFields as Record<
        string,
        boolean | Record<string, unknown>
      >;

      // Remove include when using select (Prisma constraint)
      delete this.query.include;
    }
    return this;
  }

  /**
   * Manually includes related data
   * Example: queryBuilder.include({ user: true, specialties: true })
   * Used programmatically in controllers, not from query params
   */
  include(relation: TInclude): this {
    // If fields() was used, skip include (they're mutually exclusive)
    if (this.selectFields) {
      return this;
    }

    // Merge new relations with existing includes
    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...(relation as Record<string, unknown>),
    };

    return this;
  }

  /**
   * Dynamically includes relations based on query params
   * Example: /doctors?include=user,specialties
   * @param includeConfig - Map of allowed relations and their include objects
   * @param defaultInclude - Relations to always include (optional)
   */
  dynamicInclude(
    includeConfig: Record<string, unknown>,
    defaultInclude?: string[],
  ): this {
    // Skip if fields() was used
    if (this.selectFields) {
      return this;
    }

    const result: Record<string, unknown> = {};

    // Apply default includes first
    defaultInclude?.forEach((field) => {
      if (includeConfig[field]) {
        result[field] = includeConfig[field];
      }
    });

    const includeParam = this.queryParams.include as string | undefined;

    // Parse include param from URL
    if (includeParam && typeof includeParam === "string") {
      const requestedRelations = includeParam
        .split(",")
        .map((relation) => relation.trim());

      // Only include allowed/configured relations (security)
      requestedRelations.forEach((relation) => {
        if (includeConfig[relation]) {
          result[relation] = includeConfig[relation];
        }
      });
    }

    // Merge with existing includes
    this.query.include = {
      ...(this.query.include as Record<string, unknown>),
      ...result,
    };

    return this;
  }

  /**
   * Manually adds where conditions (programmatic filtering)
   * Example: queryBuilder.where({ isDeleted: false, status: 'ACTIVE' })
   * Deep merges with existing conditions to avoid overwriting
   */
  where(condition: TWhereInput): this {
    // Deep merge to preserve existing conditions from search/filter
    this.query.where = this.deepMerge(
      this.query.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    this.countQuery.where = this.deepMerge(
      this.countQuery.where as Record<string, unknown>,
      condition as Record<string, unknown>,
    );

    return this;
  }

  /**
   * Executes the built query and returns data with pagination metadata
   * Runs count and findMany in parallel for performance
   * @returns Promise with data array and meta information
   */
  async execute(): Promise<IQueryResult<T>> {
    // Execute both queries in parallel for better performance
    const [total, data] = await Promise.all([
      this.model.count(
        this.countQuery as Parameters<typeof this.model.count>[0],
      ),
      this.model.findMany(
        this.query as Parameters<typeof this.model.findMany>[0],
      ),
    ]);

    // Calculate total pages for pagination UI
    const totalPages = Math.ceil(total / this.limit);

    return {
      data: data as T[],
      meta: {
        page: this.page,
        limit: this.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Returns only the count without fetching data
   * Useful for analytics or checking if records exist
   */
  async count(): Promise<number> {
    return await this.model.count(
      this.countQuery as Parameters<typeof this.model.count>[0],
    );
  }

  /**
   * Returns the raw Prisma query object
   * Useful for debugging or custom modifications
   */
  getQuery(): PrismaFindManyArgs {
    return this.query;
  }

  /**
   * Deep merges two objects recursively
   * Prevents overwriting nested conditions when combining where clauses
   * Example: merging { user: { name: 'John' } } with { user: { age: 30 } }
   * Result: { user: { name: 'John', age: 30 } }
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      // Recursively merge nested objects
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (
          result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.deepMerge(
            result[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>,
          );
        } else {
          result[key] = source[key];
        }
      } else {
        // Directly assign primitive values and arrays
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Parses filter values to correct types
   * Converts: 'true' -> boolean, '123' -> number, ['a','b'] -> { in: ['a','b'] }
   */
  private parseFilterValue(value: unknown): unknown {
    // Convert string booleans to actual booleans
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }

    // Convert numeric strings to numbers
    if (typeof value === "string" && !isNaN(Number(value)) && value != "") {
      return Number(value);
    }

    // Convert arrays to Prisma 'in' operator: status=['ACTIVE','PENDING'] -> { in: [...] }
    if (Array.isArray(value)) {
      return { in: value.map((item) => this.parseFilterValue(item)) };
    }

    // Return as-is for other types
    return value;
  }

  /**
   * Parses range/operator filters from query params
   * Example: appointmentFee[gte]=50&appointmentFee[lte]=200
   * Result: { gte: 50, lte: 200 }
   * Supports: lt, lte, gt, gte, equals, not, contains, startsWith, endsWith, in, notIn
   */
  private parseRangeFilter(
    value: Record<string, string | number>,
  ): PrismaNumberFilter | PrismaStringFilter | Record<string, unknown> {
    const rangeQuery: Record<string, string | number | (string | number)[]> =
      {};

    Object.keys(value).forEach((operator) => {
      const operatorValue = value[operator];

      // Convert string numbers to actual numbers
      const parsedValue: string | number =
        typeof operatorValue === "string" && !isNaN(Number(operatorValue))
          ? Number(operatorValue)
          : operatorValue;

      // Map operators to Prisma filter syntax
      switch (operator) {
        case "lt": // Less than
        case "lte": // Less than or equal
        case "gt": // Greater than
        case "gte": // Greater than or equal
        case "equals": // Exact match
        case "not": // Not equal
        case "contains": // String contains
        case "startsWith": // String starts with
        case "endsWith": // String ends with
          rangeQuery[operator] = parsedValue;
          break;

        case "in": // Value in array
        case "notIn": // Value not in array
          if (Array.isArray(operatorValue)) {
            rangeQuery[operator] = operatorValue;
          } else {
            rangeQuery[operator] = [parsedValue];
          }
          break;
        default:
          break;
      }
    });

    // Return parsed query or original if no valid operators found
    return Object.keys(rangeQuery).length > 0 ? rangeQuery : value;
  }
}
