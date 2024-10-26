import type { Neo4jPrimitive, Neo4jProperties } from "@/types";

import { QueryBuilderException } from "../exception";
import type { IQueryBuilder, ParameterizedQuery } from "../type";
import { replaceQueryParameters } from "../util";
import { CommonBuilder } from "./base-builder";

export type RelationPatternBuilderContructor = {
  alias?: string;
  label?: string;
  properties?: Neo4jProperties;
};

type RelationPatternBuilderValidationResult =
  | { success: true }
  | { success: false; message: string };

// Class to build a match query for single relations. This query cannot be used on it's own
export class RelationPatternBuilder
  extends CommonBuilder
  implements IQueryBuilder
{
  // The labels of the relationship to select
  private _label?: string;

  constructor(params?: RelationPatternBuilderContructor) {
    super();
    if (!params) return;

    this._alias = params.alias;
    this._label = params.label;
    this._rawProperties = params.properties;
  }

  /**
   * alternative constructor for the relationshipMatchBuilder
   * @param params
   * @returns
   */
  public static new(
    params?: RelationPatternBuilderContructor
  ): RelationPatternBuilder {
    return new RelationPatternBuilder(params);
  }

  /**
   * Check if the build query is valid. Checks if the alias is set, and at least one label or property is set
   * @returns true if the query is valid, false otherwise
   * @private
   */
  private _checkValid(): RelationPatternBuilderValidationResult {
    // NOTE: alias can be null, it will only cause an error when building the full query
    // if (!this._alias) return { success: false, message: "Alias is not set" };

    return {
      success: true,
    };
  }

  /**
   * Get the labels string for the query
   * @returns
   */
  private _getLabel(): string {
    if (!this._label) {
      return "";
    }

    return ":" + this._label;
  }

  /**
   * Set the alias of the relationship (overwrites the previous alias)
   * @param alias
   * @returns
   */
  public setAlias(alias: string): RelationPatternBuilder {
    if (this._alias) {
      this._printWarning(
        `Alias ${this._alias} will be overwritten with ${alias}`
      );
    }

    this._alias = alias;
    return this;
  }

  /**
   * Overwrite the labels/types of the relationship
   * @param labels The labels to replace the existing labels
   * @returns
   */
  public setLabel(label: string): RelationPatternBuilder {
    if (this._label) {
      this._printWarning(
        `Label ${this._label} will be overwritten with ${label}`
      );
    }

    this._label = label;
    return this;
  }

  /**
   * Set the properties of the relationship (overwrites the existing properties)
   * @param properties The properties to set
   * @returns
   */
  public setProperties(properties: Neo4jProperties): RelationPatternBuilder {
    this._rawProperties = properties;
    return this;
  }

  /**
   * Add a property to the relationship (append to the existing properties)
   * @param key The key of the property
   * @param value The value of the property
   * @returns
   */
  public addProperty(
    key: string,
    value: Neo4jPrimitive
  ): RelationPatternBuilder {
    if (!this._rawProperties) {
      this._rawProperties = {};
    }

    if (this._rawProperties[key]) {
      this._printWarning(
        `Property ${key} already exists. It will be overwritten`
      );
    }

    this._rawProperties[key] = value;
    return this;
  }

  /**
   * Add multiple properties to the relationship (append to the existing properties)
   * @param properties
   * @returns
   */
  public addProperties(properties: Neo4jProperties): RelationPatternBuilder {
    Object.entries(properties).forEach(([key, value]) => {
      this.addProperty(key, value);
    });

    return this;
  }

  /**
   * Get the relationship query part of the query
   *
   * ```cypher
   * (n:Person {name: "John Doe", age: 30})
   * ```
   */
  toParameterizedQuery(): ParameterizedQuery {
    const validationResult = this._checkValid();
    if (!validationResult.success) {
      throw new QueryBuilderException(validationResult.message);
    }

    const labels = this._getLabel();
    const properties = this._getParameterizedProperties();

    // In format: (alias:Label {properties}) or (alias {properties}) or (alias:Label)
    return {
      aliasSet: new Set([this._getAlias()]),
      query: `[${this._getAlias()}${labels}${properties.query}]`,
      parameters: properties.parameters,
    };
  }

  /**
   * Get the raw query string with all the parameters replaced with the actual values
   */
  toRawQuery(): string {
    const { query, parameters } = this.toParameterizedQuery();

    // Replace all the parameters with the actual values
    return replaceQueryParameters(query, parameters);
  }

  toString(): string {
    return this.toRawQuery();
  }
}
