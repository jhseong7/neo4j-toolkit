import { Neo4jProperties } from "../types";
import { QueryBuilderException } from "./exception";
import { PathPatternBuilder } from "./path-pattern-builder";
import { mergeProperties, replaceQueryParameters } from "./util";
import {
  CreateClauseBuilder,
  MatchClauseBuilder,
  MergeClauseBuilder,
  OptionalMatchClauseBuilder,
  OrderByClauseBuilder,
  ReturnClauseBuilder,
  WhereClauseBuilder,
} from "./clause";
import { ParameterizedQuery } from "./type";

type PathBuilderFunction = (p: PathPatternBuilder) => unknown;
type WhereClauseBuilderFunction = (w: WhereClauseBuilder) => unknown;
type ReturnQueryBuilderFunction = (r: ReturnClauseBuilder) => unknown;
type OrderByBuilderFunction = (o: OrderByClauseBuilder) => unknown;

// NOTE: maybe better to add the builders to the nodes if they support add() methods

type QueryComponentMatch = {
  type: "MATCH";
  builder: MatchClauseBuilder;
};

type QueryComponentOptionalMatch = {
  type: "OPTIONAL MATCH";
  builder: OptionalMatchClauseBuilder;
};

type QueryComponentCreate = {
  type: "CREATE";
  builder: CreateClauseBuilder;
};

type QueryComponentMerge = {
  type: "MERGE";
  builder: MergeClauseBuilder;
};

type QueryComponentWhere = {
  type: "WHERE";
  builder: WhereClauseBuilder;
};

type QueryComponentReturn = {
  type: "RETURN";
  builder: ReturnClauseBuilder;
};

// NOTE: update to builder pattern
type QueryBuilderWith = {
  type: "WITH";
  withClause: string;
};

type QueryComponentOrderBy = {
  type: "ORDER BY";
  builder: OrderByClauseBuilder;
};

type QueryComponentSkip = {
  type: "SKIP";
  skip: number;
};

type QueryComponentLimit = {
  type: "LIMIT";
  limit: number;
};

type QueryComponentOffset = {
  type: "OFFSET";
  offset: number;
};

type QueryComponentFinish = {
  type: "FINISH";
};

type QueryComponentNode =
  | QueryComponentMatch
  | QueryComponentOptionalMatch
  | QueryComponentCreate
  | QueryComponentMerge
  | QueryComponentWhere
  | QueryComponentReturn
  | QueryBuilderWith
  | QueryComponentOrderBy
  | QueryComponentSkip
  | QueryComponentLimit
  | QueryComponentOffset
  | QueryComponentFinish;

export class QueryBuilder {
  // private _componentNodeList: QueryComponentNode[] = [];

  // Since each type of query can only have one component, we can use a map to store the component
  private _componentNodeMap: Map<
    QueryComponentNode["type"],
    QueryComponentNode
  > = new Map();

  private _aliasSet: Set<string> = new Set();

  static new() {
    return new QueryBuilder();
  }

  /**
   * Merge the alias list to the existing alias set + validate the uniqueness of the alias
   * @param aliasList
   */
  private _mergeAliasSet(aliasList: string[]) {
    for (const alias of aliasList) {
      if (this._aliasSet.has(alias)) {
        throw new QueryBuilderException(
          `Alias ${alias} is already in use. Aliases must be unique`
        );
      }

      this._aliasSet.add(alias);
    }
  }

  private _getComponentNode<T>(type: QueryComponentNode["type"]) {
    const componentNode = this._componentNodeMap.get(type) as T;
    if (!componentNode) {
      return null;
    }

    return componentNode as T;
  }

  /**
   * Create a new match statement including multiple path patterns
   *
   * The desired path pattern is given as a builder function
   *
   *
   * ```typescript
   * query.match((p) => {
   *  p.setNode({ alias: "n", labels: ["Person"] })
   *  .toRelationship({ alias: "r", label: "KNOWS" })
   *  .toNode({ alias: "m", labels: ["Person"] });
   * });
   * ```
   * @param builder
   * @returns
   */
  public match(...builders: PathBuilderFunction[]): QueryBuilder {
    if (builders.length === 0) {
      new QueryBuilderException("At least one path pattern must be provided");
    }

    // Create a match builder
    const matchBuilder = new MatchClauseBuilder();
    for (const builder of builders) {
      const pathBuilder = new PathPatternBuilder();
      builder(pathBuilder);
      matchBuilder.addPathPattern(pathBuilder);
    }

    const matchNode: QueryComponentMatch = {
      type: "MATCH",
      builder: matchBuilder,
    };

    this._componentNodeMap.set("MATCH", matchNode);

    return this;
  }

  /**
   * Add the MATCH component to the existing query
   * @param builderFunction
   * @returns
   */
  public addMatch(builderFunction: PathBuilderFunction): QueryBuilder {
    // Find if the MATCH component already exists
    const matchComponent = this._componentNodeMap.get(
      "MATCH"
    ) as QueryComponentMatch;

    if (!matchComponent) {
      // Return the match
      return this.match(builderFunction);
    }

    // Create a new path pattern builder
    const pathBuilder = new PathPatternBuilder();
    builderFunction(pathBuilder);

    // Add the path pattern to the existing list
    matchComponent.builder.addPathPattern(pathBuilder);

    return this;
  }

  /**
   * Add an OPTIONAL MATCH component to the query
   * @param builder
   * @returns
   */
  public optionalMatch(...builders: PathBuilderFunction[]): QueryBuilder {
    if (builders.length === 0) {
      new QueryBuilderException("At least one path pattern must be provided");
    }

    // Create a match builder
    const optionalMatchBuilder = new OptionalMatchClauseBuilder();
    for (const builder of builders) {
      const pathBuilder = new PathPatternBuilder();
      builder(pathBuilder);
      optionalMatchBuilder.addPathPattern(pathBuilder);
    }

    const optionalMatchNode: QueryComponentOptionalMatch = {
      type: "OPTIONAL MATCH",
      builder: optionalMatchBuilder,
    };

    this._componentNodeMap.set("OPTIONAL MATCH", optionalMatchNode);

    return this;
  }

  /**
   * Add the OPTIONAL MATCH component to the existing query
   * @param builderFunction
   * @returns
   */
  public addOptionalMatch(builderFunction: PathBuilderFunction): QueryBuilder {
    // Find if the MATCH component already exists
    const optionalMatchComponent = this._componentNodeMap.get(
      "OPTIONAL MATCH"
    ) as QueryComponentOptionalMatch;

    if (!optionalMatchComponent) {
      // Return the match
      return this.optionalMatch(builderFunction);
    }

    // Create a new path pattern builder
    const pathBuilder = new PathPatternBuilder();
    builderFunction(pathBuilder);

    // Add the path pattern to the existing list
    optionalMatchComponent.builder.addPathPattern(pathBuilder);

    return this;
  }

  /**
   * Add a CREATE component to the query
   * @param builder
   * @returns
   */
  public create(...builders: PathBuilderFunction[]): QueryBuilder {
    if (builders.length === 0) {
      new QueryBuilderException("At least one path pattern must be provided");
    }

    // Create a match builder
    const createBuilder = new CreateClauseBuilder();
    for (const builder of builders) {
      const pathBuilder = new PathPatternBuilder();
      builder(pathBuilder);
      createBuilder.addPathPattern(pathBuilder);
    }

    const createNode: QueryComponentCreate = {
      type: "CREATE",
      builder: createBuilder,
    };

    this._componentNodeMap.set("CREATE", createNode);

    return this;
  }

  /**
   * Add the CREATE component to the existing query
   * @param builderFunction
   * @returns
   */
  public addCreate(builderFunction: PathBuilderFunction): QueryBuilder {
    // Find if the MATCH component already exists
    const createComponent = this._componentNodeMap.get(
      "CREATE"
    ) as QueryComponentCreate;

    if (!createComponent) {
      // Return the match
      return this.create(builderFunction);
    }

    // Create a new path pattern builder
    const pathBuilder = new PathPatternBuilder();
    builderFunction(pathBuilder);

    // Add the path pattern to the existing list
    createComponent.builder.addPathPattern(pathBuilder);

    return this;
  }

  /**
   * Add a MERGE component to the query
   * @param builder
   * @returns
   */
  public merge(...builders: PathBuilderFunction[]): QueryBuilder {
    if (builders.length === 0) {
      new QueryBuilderException("At least one path pattern must be provided");
    }

    // Create a match builder
    const mergeBuilder = new MergeClauseBuilder();
    for (const builder of builders) {
      const pathBuilder = new PathPatternBuilder();
      builder(pathBuilder);
      mergeBuilder.addPathPattern(pathBuilder);
    }

    const mergeNode: QueryComponentMerge = {
      type: "MERGE",
      builder: mergeBuilder,
    };

    this._componentNodeMap.set("MERGE", mergeNode);

    return this;
  }

  /**
   * Add the MERGE component to the existing query
   * @param builderFunction
   * @returns
   */
  public addMerge(builderFunction: PathBuilderFunction): QueryBuilder {
    // Find if the MATCH component already exists
    const mergeComponent = this._componentNodeMap.get(
      "MERGE"
    ) as QueryComponentMerge;

    if (!mergeComponent) {
      // Return the match
      return this.merge(builderFunction);
    }

    // Create a new path pattern builder
    const pathBuilder = new PathPatternBuilder();
    builderFunction(pathBuilder);

    // Add the path pattern to the existing list
    mergeComponent.builder.addPathPattern(pathBuilder);

    return this;
  }

  /**
   * Add the WHERE clause to the query
   * @param builder
   * @returns
   */
  public where(builder: WhereClauseBuilderFunction) {
    // NOTE: this might change in the future
    if (this._componentNodeMap.has("WHERE")) {
      throw new QueryBuilderException(
        "The WHERE clause can only be called once"
      );
    }

    const whereBuilder = new WhereClauseBuilder();
    builder(whereBuilder);

    const whereNode: QueryComponentWhere = {
      type: "WHERE",
      builder: whereBuilder,
    };

    this._componentNodeMap.set("WHERE", whereNode);

    return this;
  }

  /**
   * Extend the WHERE clause of the previous where call.
   * If the where was not called before, it will throw an error
   * @param builder
   */
  public addWhere(builder: WhereClauseBuilderFunction) {
    const whereNode = this._componentNodeMap.get(
      "WHERE"
    ) as QueryComponentWhere;
    if (!whereNode) {
      throw new QueryBuilderException(
        "The WHERE clause must be called before addWhere"
      );
    }

    builder(whereNode.builder);

    return this;
  }

  /**
   * Add Return clauses to the query
   * @param returns
   */
  public return(returns: string[]): QueryBuilder;
  /**
   * Add a return statement to the query, an alias can be provided
   * @param statement
   * @param alias
   */
  public return(statement: string, alias?: string): QueryBuilder;
  /**
   * Add a return statement to the query with a builder function
   * @param builder
   */
  public return(builder: ReturnQueryBuilderFunction): QueryBuilder;
  /**
   * Add a return statement to the query with a builder function provider
   * @param builder
   */
  public return(builder: ReturnClauseBuilder): QueryBuilder;
  public return(
    arg1: ReturnQueryBuilderFunction | string | string[] | ReturnClauseBuilder,
    arg2?: string
  ): QueryBuilder {
    // Case 1: argument is a ReturnClauseBuilder
    if (arg1 instanceof ReturnClauseBuilder) {
      const returnNode: QueryComponentReturn = {
        type: "RETURN",
        builder: arg1,
      };

      this._componentNodeMap.set("RETURN", returnNode);

      return this;
    }

    // Case 2: argument is a function
    if (typeof arg1 === "function") {
      const builder = arg1;
      const returnBuilder = new ReturnClauseBuilder();
      builder(returnBuilder);

      const returnNode: QueryComponentReturn = {
        type: "RETURN",
        builder: returnBuilder,
      };

      this._componentNodeMap.set("RETURN", returnNode);

      return this;
    }

    // Case 3: argument is a string
    if (typeof arg1 === "string") {
      const returnBuilder = new ReturnClauseBuilder();
      returnBuilder.add(arg1, arg2);

      const returnNode: QueryComponentReturn = {
        type: "RETURN",
        builder: returnBuilder,
      };

      this._componentNodeMap.set("RETURN", returnNode);

      return this;
    }

    // Case 4: argument is an array of strings
    if (Array.isArray(arg1)) {
      const returnBuilder = new ReturnClauseBuilder();
      for (const statement of arg1) {
        returnBuilder.add(statement);
      }

      const returnNode: QueryComponentReturn = {
        type: "RETURN",
        builder: returnBuilder,
      };

      this._componentNodeMap.set("RETURN", returnNode);

      return this;
    }

    throw new QueryBuilderException("Invalid arguments provided to return");
  }

  /**
   * Add a new return statement to the query
   * @param statement
   * @param alias
   * @returns
   */
  public addReturn(statement: string, alias?: string) {
    const returnNode = this._componentNodeMap.get(
      "RETURN"
    ) as QueryComponentReturn;

    if (returnNode) {
      returnNode.builder.add(statement, alias);
      return this;
    }

    return this.return(statement, alias);
  }

  /**
   * Add a FINISH statement to the end of the query
   * @returns
   */
  public finish() {
    const finishNode: QueryComponentFinish = {
      type: "FINISH",
    };

    this._componentNodeMap.set("FINISH", finishNode);

    return this;
  }

  /**
   * Add ORDER BY with a builder function
   * @param builder
   */
  public orderBy(builder: OrderByBuilderFunction): QueryBuilder;
  /**
   * Add ORDER BY with a builder function provider
   * @param builder
   */
  public orderBy(builder: OrderByClauseBuilder): QueryBuilder;
  /**
   * Add ORDER BY with a statement and direction
   * @param statement
   * @param direction
   */
  public orderBy(statement: string, direction?: "ASC" | "DESC"): QueryBuilder;
  public orderBy(
    arg1: string | OrderByBuilderFunction | OrderByClauseBuilder,
    direction: "ASC" | "DESC" = "ASC"
  ): QueryBuilder {
    if (arg1 instanceof OrderByClauseBuilder) {
      const orderByNode: QueryComponentOrderBy = {
        type: "ORDER BY",
        builder: arg1,
      };

      this._componentNodeMap.set("ORDER BY", orderByNode);

      return this;
    }

    if (typeof arg1 === "function") {
      const builder = arg1;

      const orderByBuilder = new OrderByClauseBuilder();
      builder(orderByBuilder);

      const orderByNode: QueryComponentOrderBy = {
        type: "ORDER BY",
        builder: orderByBuilder,
      };

      this._componentNodeMap.set("ORDER BY", orderByNode);

      return this;
    }

    if (typeof arg1 === "string") {
      const statement = arg1;

      if (this._componentNodeMap.has("ORDER BY")) {
        throw new QueryBuilderException(
          "The ORDER BY clause can only be called once"
        );
      }

      const orderByBuilder = new OrderByClauseBuilder();
      orderByBuilder.add(statement, direction);

      const orderByNode: QueryComponentOrderBy = {
        type: "ORDER BY",
        builder: orderByBuilder,
      };

      this._componentNodeMap.set("ORDER BY", orderByNode);

      return this;
    }

    throw new QueryBuilderException("Invalid arguments provided to orderBy");
  }

  /**
   * Add a new order by statement to the query
   * @param builder
   * @returns
   */
  public addOrderBy(statement: string, direction: "ASC" | "DESC" = "ASC") {
    // Get the existing ORDER BY component
    const existingOrderByNode = this._componentNodeMap.get(
      "ORDER BY"
    ) as QueryComponentOrderBy;

    if (existingOrderByNode) {
      existingOrderByNode.builder.add(statement, direction);
      return this;
    }

    const orderByNode: QueryComponentOrderBy = {
      type: "ORDER BY",
      builder: new OrderByClauseBuilder().add(statement, direction),
    };

    this._componentNodeMap.set("ORDER BY", orderByNode);

    return this;
  }

  /**
   * Set the skip for the query
   * @param skip
   * @returns
   */
  public skip(skip: number) {
    const skipNode: QueryComponentSkip = {
      type: "SKIP",
      skip,
    };

    this._componentNodeMap.set("SKIP", skipNode);

    return this;
  }

  /**
   * Set the limit for the query
   * @param limit
   * @returns
   */
  public limit(limit: number) {
    const limitNode: QueryComponentLimit = {
      type: "LIMIT",
      limit,
    };

    this._componentNodeMap.set("LIMIT", limitNode);

    return this;
  }

  /**
   * Set the offset for the query
   * @param offset
   * @returns
   */
  public offset(offset: number) {
    const offsetNode: QueryComponentOffset = {
      type: "OFFSET",
      offset,
    };

    this._componentNodeMap.set("OFFSET", offsetNode);

    return this;
  }

  private _appendQueryContext(
    queryContext: ParameterizedQuery,
    parameterizedQuery: ParameterizedQuery,
    mergeAliasSet = false
  ) {
    queryContext.query += parameterizedQuery.query + "\n";
    mergeProperties(queryContext.parameters, parameterizedQuery.parameters);

    if (mergeAliasSet && parameterizedQuery.aliasSet && queryContext.aliasSet) {
      for (const alias of parameterizedQuery.aliasSet) {
        queryContext.aliasSet.add(alias);
      }
    }
  }

  public toParameterizedQuery() {
    const queryContext: ParameterizedQuery = {
      aliasSet: new Set(),
      query: "",
      parameters: {},
    };

    // Get the components in order of (MATCH, CREATE, MERGE, WHERE, RETURN)

    // Match component
    const matchComponent = this._getComponentNode<QueryComponentMatch>("MATCH");
    if (matchComponent) {
      this._appendQueryContext(
        queryContext,
        matchComponent.builder.toParameterizedQuery(),
        true // Merge the alias set (selective components)
      );
    }

    // Optional Match component
    const optionalMatchComponent =
      this._getComponentNode<QueryComponentOptionalMatch>("OPTIONAL MATCH");
    if (optionalMatchComponent) {
      this._appendQueryContext(
        queryContext,
        optionalMatchComponent.builder.toParameterizedQuery(),
        true // Merge the alias set (selective components)
      );
    }

    // Merge component
    const mergeComponent = this._getComponentNode<QueryComponentMerge>("MERGE");
    if (mergeComponent) {
      this._appendQueryContext(
        queryContext,
        mergeComponent.builder.toParameterizedQuery(),
        true // Merge the alias set (selective components)
      );
    }

    // Create component
    const createComponent =
      this._getComponentNode<QueryComponentCreate>("CREATE");
    if (createComponent) {
      this._appendQueryContext(
        queryContext,
        createComponent.builder.toParameterizedQuery(),
        true // Merge the alias set (selective components)
      );
    }

    // Where component
    const whereComponent = this._getComponentNode<QueryComponentWhere>("WHERE");
    if (whereComponent) {
      // Inject the alias list from the selective components (match, create, merge, optional match etc..)
      whereComponent.builder.setAliasList(Array.from(queryContext.aliasSet!));
      this._appendQueryContext(
        queryContext,
        whereComponent.builder.toParameterizedQuery()
      );
    }

    // Order by component
    const orderByComponent = this._componentNodeMap.get(
      "ORDER BY"
    ) as QueryComponentOrderBy;
    if (orderByComponent) {
      // Add the alias list from the selective components (match, create, merge, optional match etc..)
      orderByComponent.builder.setAliasList(Array.from(queryContext.aliasSet!));
      this._appendQueryContext(
        queryContext,
        orderByComponent.builder.toParameterizedQuery()
      );
    }

    // Skip component
    const skipComponent = this._componentNodeMap.get(
      "SKIP"
    ) as QueryComponentSkip;
    if (skipComponent) {
      queryContext.query += `SKIP ${skipComponent.skip}\n`;
    }

    // Limit component
    const limitComponent = this._componentNodeMap.get(
      "LIMIT"
    ) as QueryComponentLimit;
    if (limitComponent) {
      queryContext.query += `LIMIT ${limitComponent.limit}\n`;
    }

    // Offset component
    const offsetComponent = this._componentNodeMap.get(
      "OFFSET"
    ) as QueryComponentOffset;
    if (offsetComponent) {
      queryContext.query += `OFFSET ${offsetComponent.offset}\n`;
    }

    // Return component
    const returnComponent =
      this._getComponentNode<QueryComponentReturn>("RETURN");
    const finishComponent =
      this._getComponentNode<QueryComponentFinish>("FINISH");
    // Only one of RETURN or FINISH can be present
    if (returnComponent && finishComponent) {
      throw new QueryBuilderException(
        "Both RETURN and FINISH components cannot be present in the query"
      );
    }
    if (returnComponent) {
      // Add the alias list from the selective components (match, create, merge, optional match etc..)
      returnComponent.builder.setAliasList(Array.from(queryContext.aliasSet!));
      this._appendQueryContext(
        queryContext,
        returnComponent.builder.toParameterizedQuery()
      );
    }
    if (finishComponent) {
      queryContext.query += "FINISH\n";
    }

    return queryContext;
  }

  public toRawQuery() {
    const { query, parameters } = this.toParameterizedQuery();
    return replaceQueryParameters(query, parameters);
  }
}
