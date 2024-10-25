import { Neo4jProperties } from "../types";
import { QueryBuilderException } from "./exception";
import { OrderByBuilder } from "./order-by-builder";
import { PathPatternBuilder } from "./path-pattern-builder";
import { ReturnQueryBuilder } from "./return-builder";
import { mergeProperties, replaceQueryParameters } from "./util";
import { WhereClauseBuilder } from "./where-clause-builder";

type PathBuilderFunction = (p: PathPatternBuilder) => unknown;
type WhereClauseBuilderFunction = (w: WhereClauseBuilder) => unknown;
type ReturnQueryBuilderFunction = (r: ReturnQueryBuilder) => unknown;
type OrderByBuilderFunction = (o: OrderByBuilder) => unknown;

// NOTE: maybe better to add the builders to the nodes if they support add() methods

type QueryComponentMatch = {
  type: "MATCH";
  pathBuilderList: PathPatternBuilder[];
};

type QueryComponentCreate = {
  type: "CREATE";
  pathBuilderList: PathPatternBuilder[];
};

type QueryComponentMerge = {
  type: "MERGE";
  pathBuilderList: PathPatternBuilder[];
};

type QueryComponentWhere = {
  type: "WHERE";
  whereBuilder: WhereClauseBuilder;
};

type QueryComponentReturn = {
  type: "RETURN";
  builder: ReturnQueryBuilder;
};

type QueryBuilderWith = {
  type: "WITH";
  withClause: string;
};

type QueryComponentOrderBy = {
  type: "ORDER BY";
  orderByBuilder: OrderByBuilder;
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

type QueryComponentNode =
  | QueryComponentMatch
  | QueryComponentCreate
  | QueryComponentMerge
  | QueryComponentWhere
  | QueryComponentReturn
  | QueryBuilderWith
  | QueryComponentOrderBy
  | QueryComponentSkip
  | QueryComponentLimit
  | QueryComponentOffset;

/**
 * Entry point for the query builder.
 * This will return sub-builders for each type of query
 *
 * MATCH | CREATE | CALL | LOAD CSV
 */
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

    // Get all the pathPatternBuilders
    const pathPatternBuilders = builders.map((builder) => {
      const pathBuilder = new PathPatternBuilder();
      builder(pathBuilder);
      return pathBuilder;
    });

    const matchNode: QueryComponentMatch = {
      type: "MATCH",
      pathBuilderList: pathPatternBuilders,
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
    matchComponent.pathBuilderList.push(pathBuilder);

    return this;
  }

  /**
   * Add the WHERE clause to the query
   * @param builder
   * @returns
   */
  public where(builder: WhereClauseBuilderFunction) {
    const whereBuilder = new WhereClauseBuilder();
    builder(whereBuilder);

    const whereNode: QueryComponentWhere = {
      type: "WHERE",
      whereBuilder,
    };

    this._componentNodeMap.set("WHERE", whereNode);

    return this;
  }

  /**
   * Add the RETURN clause to the query
   * @param returnClause
   * @returns
   */
  public return(returns: string[]): QueryBuilder;
  public return(statement: string, alias?: string): QueryBuilder;
  public return(builder: ReturnQueryBuilderFunction): QueryBuilder;
  public return(
    arg1: ReturnQueryBuilderFunction | string | string[],
    arg2?: string
  ): QueryBuilder {
    // Case 1: argument is a function
    if (typeof arg1 === "function") {
      const builder = arg1;
      const returnBuilder = new ReturnQueryBuilder();
      builder(returnBuilder);

      const returnNode: QueryComponentReturn = {
        type: "RETURN",
        builder: returnBuilder,
      };

      this._componentNodeMap.set("RETURN", returnNode);

      return this;
    }

    // Case 2: argument is a string
    if (typeof arg1 === "string") {
      const returnBuilder = new ReturnQueryBuilder();
      returnBuilder.add(arg1, arg2);

      const returnNode: QueryComponentReturn = {
        type: "RETURN",
        builder: returnBuilder,
      };

      this._componentNodeMap.set("RETURN", returnNode);

      return this;
    }

    // Case 3: argument is an array of strings
    if (Array.isArray(arg1)) {
      const returnBuilder = new ReturnQueryBuilder();
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
   * Add the WITH clause to the query
   * @param withClause
   * @returns
   */
  public orderBy(statement: string, direction: "ASC" | "DESC" = "ASC") {
    const orderByBuilder = new OrderByBuilder();
    orderByBuilder.add(statement, direction);

    const orderByNode: QueryComponentOrderBy = {
      type: "ORDER BY",
      orderByBuilder,
    };

    this._componentNodeMap.set("ORDER BY", orderByNode);

    return this;
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
      existingOrderByNode.orderByBuilder.add(statement, direction);
      return this;
    }

    const orderByNode: QueryComponentOrderBy = {
      type: "ORDER BY",
      orderByBuilder: new OrderByBuilder().add(statement, direction),
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

  public toParameterizedQuery() {
    let query = "";
    const parameters: Neo4jProperties = {};

    // Get the components in order of (MATCH, CREATE, MERGE, WHERE, RETURN)

    // Match component
    const matchComponent = this._componentNodeMap.get(
      "MATCH"
    ) as QueryComponentMatch;
    if (matchComponent) {
      // For each path builder --> build the path pattern
      for (const pathBuilder of matchComponent.pathBuilderList) {
        const {
          aliases,
          query: pathQuery,
          parameters: pathParameters,
        } = pathBuilder.toParameterizedQuery();

        this._mergeAliasSet(aliases);

        query += `MATCH ${pathQuery}\n`;
        mergeProperties(parameters, pathParameters);
      }
    }

    // Where component
    const whereComponent = this._componentNodeMap.get(
      "WHERE"
    ) as QueryComponentWhere;
    if (whereComponent) {
      // Add the alias of the builder to the builder set
      whereComponent.whereBuilder.setAliasList(Array.from(this._aliasSet));

      const { query: whereQuery, parameters: whereParameters } =
        whereComponent.whereBuilder.toParameterizedQuery();
      query += `WHERE ${whereQuery}\n`;

      console.log({ whereParameters, whereQuery });

      mergeProperties(parameters, whereParameters);
    }

    // Return component
    const returnComponent = this._componentNodeMap.get(
      "RETURN"
    ) as QueryComponentReturn;
    if (returnComponent) {
      query += returnComponent.builder.build() + "\n";
    }

    // Order by component
    const orderByComponent = this._componentNodeMap.get(
      "ORDER BY"
    ) as QueryComponentOrderBy;
    if (orderByComponent) {
      query += orderByComponent.orderByBuilder.build() + "\n";
    }

    // Skip component
    const skipComponent = this._componentNodeMap.get(
      "SKIP"
    ) as QueryComponentSkip;
    if (skipComponent) {
      query += `SKIP ${skipComponent.skip}\n`;
    }

    // Limit component
    const limitComponent = this._componentNodeMap.get(
      "LIMIT"
    ) as QueryComponentLimit;
    if (limitComponent) {
      query += `LIMIT ${limitComponent.limit}\n`;
    }

    // Offset component
    const offsetComponent = this._componentNodeMap.get(
      "OFFSET"
    ) as QueryComponentOffset;
    if (offsetComponent) {
      query += `OFFSET ${offsetComponent.offset}\n`;
    }

    return { query, parameters };
  }

  public toRawQuery() {
    const { query, parameters } = this.toParameterizedQuery();
    return replaceQueryParameters(query, parameters);
  }
}
