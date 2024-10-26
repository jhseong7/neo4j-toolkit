/**
 * Builder object for selective clauses such as CREATE, MERGE, MATCH, OPTIONAL MATCH, etc.
 */

import type { Neo4jProperties } from "@/types";
import {
  extractAliasFromPath,
  mergeProperties,
  replaceQueryParameters,
} from "../util";
import { QueryBuilderException } from "../exception";
import { IQueryBuilder, ParameterizedQuery } from "../type";
import { PathPatternBuilder } from "../path-pattern-builder";

type PathPatternBuilderFunction = (builder: PathPatternBuilder) => unknown;
type PathPatternRepresentive = PathPatternBuilder | string;

/**
 * Common logic for the merge and create clause builder
 */
export class PathPatternCommonClauseBuilder implements IQueryBuilder {
  protected _queryPrefix: string = "";

  constructor(queryPrefix: string) {
    this._queryPrefix = queryPrefix;
  }

  protected pathPatternBuilders: PathPatternRepresentive[] = [];

  protected _mergeAliasSet(targetSet: Set<string>, sourceSet: Set<string>) {
    for (const alias of sourceSet) {
      // NOTE: the same alias can be used multiple times in the same query, so this check is not needed
      // if (targetSet.has(alias)) {
      //   throw new QueryBuilderException(
      //     `The alias ${alias} is already in the set of aliases`
      //   );
      // }

      targetSet.add(alias);
    }
  }

  /**
   * Add a direct path pattern to the create clause
   * @param path
   */
  public addPathPattern(path: string): PathPatternCommonClauseBuilder;

  /**
   * Add a path pattern builder to the create clause
   * @param buidler
   */
  public addPathPattern(
    builder: PathPatternBuilderFunction
  ): PathPatternCommonClauseBuilder;

  /**
   * Add the finised builder to the create clause
   * @param builder
   */
  public addPathPattern(
    builder: PathPatternBuilder
  ): PathPatternCommonClauseBuilder;

  public addPathPattern(
    arg1: PathPatternBuilderFunction | string | PathPatternBuilder
  ): PathPatternCommonClauseBuilder {
    // Case of direct statement
    if (typeof arg1 === "string") {
      this.pathPatternBuilders.push(arg1);
      return this;
    }

    if (arg1 instanceof PathPatternBuilder) {
      this.pathPatternBuilders.push(arg1);
      return this;
    }

    // Let the builder run
    const pathPatternBuilder = new PathPatternBuilder();
    arg1(pathPatternBuilder);
    this.pathPatternBuilders.push(pathPatternBuilder);

    return this;
  }

  /**
   * Builder the query and parameters
   * @returns
   */
  public toParameterizedQuery(): ParameterizedQuery {
    const queryList: string[] = [];
    const parameters: Neo4jProperties = {};
    const aliasSet = new Set<string>();

    // For each of the path patterns in order
    for (const pathPattern of this.pathPatternBuilders) {
      if (typeof pathPattern === "string") {
        // Extract the aliases from the statement
        const aliases = extractAliasFromPath(pathPattern);

        // Add the aliases to the alias set, throw if the alias is already in the set
        this._mergeAliasSet(aliasSet, new Set(aliases));

        queryList.push(pathPattern);
        continue;
      }

      const {
        query: pathQuery,
        parameters: pathParameters,
        aliases,
      } = pathPattern.toParameterizedQuery();

      // Add the aliases to the alias set, throw if the alias is already in the set
      this._mergeAliasSet(aliasSet, new Set(aliases));

      queryList.push(pathQuery);
      mergeProperties(parameters, pathParameters);
    }

    // Return the query and parameters
    return {
      aliasSet: new Set(aliasSet),
      query:
        queryList.length > 0
          ? this._queryPrefix + " " + queryList.join(", ")
          : "",
      parameters,
    };
  }

  /**
   * Return the raw query
   * @returns
   */
  public toRawQuery(): string {
    const { query, parameters } = this.toParameterizedQuery();
    return replaceQueryParameters(query, parameters);
  }
}

/**
 * Create clause builder
 */
export class CreateClauseBuilder extends PathPatternCommonClauseBuilder {
  constructor() {
    super("CREATE");
  }

  public static new(): CreateClauseBuilder {
    return new CreateClauseBuilder();
  }
}

/**
 * Merge clause builder
 */
export class MergeClauseBuilder extends PathPatternCommonClauseBuilder {
  constructor() {
    super("MERGE");
  }

  public static new(): MergeClauseBuilder {
    return new MergeClauseBuilder();
  }
}

/**
 * Match clause builder
 */
export class MatchClauseBuilder extends PathPatternCommonClauseBuilder {
  constructor() {
    super("MATCH");
  }

  public static new(): MatchClauseBuilder {
    return new MatchClauseBuilder();
  }
}

/**
 * Optional match clause builder
 */
export class OptionalMatchClauseBuilder extends PathPatternCommonClauseBuilder {
  constructor() {
    super("OPTIONAL MATCH");
  }

  public static new(): OptionalMatchClauseBuilder {
    return new OptionalMatchClauseBuilder();
  }
}
