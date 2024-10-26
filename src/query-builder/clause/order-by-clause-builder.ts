import { IQueryBuilder, ParameterizedQuery } from "../type";
import { extractAliasFromSet } from "../util";

export class OrderByClauseBuilder implements IQueryBuilder {
  private _orderByStatements: string[] = [];

  private _aliasSet: Set<string> = new Set();

  constructor(params?: { aliases?: string[] }) {
    const { aliases = [] } = params ?? {};

    this._aliasSet = new Set(aliases);
  }

  private _checkAlias(statement: string) {
    const aliases = extractAliasFromSet(statement);

    for (const alias of aliases) {
      if (!this._aliasSet.has(alias)) {
        return false;
      }
    }

    return true;
  }

  public add(
    statement: string,
    direction: "ASC" | "DESC" = "ASC"
  ): OrderByClauseBuilder {
    if (!this._checkAlias(statement)) {
      throw new Error(
        `The alias is not defined in the query. Please provide an alias included in the previous statements: ${statement}`
      );
    }

    if (direction !== "ASC" && direction !== "DESC") {
      throw new Error(`The direction must be either 'ASC' or 'DESC'`);
    }

    this._orderByStatements.push(`${statement} ${direction}`);
    return this;
  }

  public toParameterizedQuery(): ParameterizedQuery {
    if (this._orderByStatements.length === 0) {
      return {
        query: "",
        parameters: {},
      };
    }

    return {
      query: `ORDER BY ${this._orderByStatements.join(", ")}`,
      parameters: {},
    };
  }

  public toRawQuery(): string {
    return this.toParameterizedQuery().query;
  }
}
