import { Neo4jProperties } from "@/types";
import { IQueryBuilder, ParameterizedQuery } from "@/query-builder/type";
import {
  extractAliasFromSet,
  mergeProperties,
  replaceQueryParameters,
} from "../util";
import { QueryBuilderException } from "../exception";

export class SetClauseBuilder implements IQueryBuilder {
  private _aliasSet: Set<string> = new Set();
  private _properties: Neo4jProperties = {};
  private _statementList: string[] = [];

  private _mergeAliasSet(targetSet: Set<string>, sourceList: string[]) {
    for (const alias of sourceList) {
      if (targetSet.has(alias)) {
        throw new QueryBuilderException(
          `The alias ${alias} is already used. The alias must be unique`
        );
      }

      targetSet.add(alias);
    }
  }

  /**
   * Start a set clause
   * @param statement
   * @param properties
   * @returns
   */
  public set(
    statement: string,
    properties?: Neo4jProperties
  ): SetClauseBuilder {
    if (this._statementList.length > 0) {
      throw new QueryBuilderException("The set clause can only be called once");
    }

    this._statementList = [statement];
    this._properties = properties ?? {};

    const aliases = extractAliasFromSet(statement);
    this._mergeAliasSet(this._aliasSet, aliases);

    return this;
  }

  /**
   * Add a set clause
   * @param statement - The statement to add to the set clause e.g.) `n.name = 'John'`
   * @param properties - The properties to add to the set clause if a parameter query is used
   * @returns
   */
  public addSet(
    statement: string,
    properties?: Neo4jProperties
  ): SetClauseBuilder {
    const aliases = extractAliasFromSet(statement);
    this._mergeAliasSet(this._aliasSet, aliases);

    mergeProperties(this._properties, properties);

    this._statementList.push(statement);

    return this;
  }

  /**
   * Set the properties of the set clause
   * @param properties
   * @returns
   */
  public setProperties(properties: Neo4jProperties): SetClauseBuilder {
    mergeProperties(this._properties, properties);

    return this;
  }

  public toParameterizedQuery(): ParameterizedQuery {
    if (this._statementList.length === 0) {
      return {
        query: "",
        parameters: {},
      };
    }

    return {
      query: "SET " + this._statementList.join(", "),
      parameters: this._properties,
    };
  }

  public toRawQuery(): string {
    const { query, parameters } = this.toParameterizedQuery();

    return replaceQueryParameters(query, parameters);
  }
}
