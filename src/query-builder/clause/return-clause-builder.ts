import { QueryBuilderException } from "../exception";
import { IQueryBuilder, ParameterizedQuery } from "../type";
import { extractAliasFromSet } from "../util";

export class ReturnClauseBuilder implements IQueryBuilder {
  private _returnStatements: string[] = [];

  // Alias set to validate the statements given by the user
  private _aliasSet: Set<string> = new Set();

  constructor(params: { aliases?: string[] } = {}) {
    const { aliases = [] } = params;

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

  public add(statement: string, alias?: string): ReturnClauseBuilder {
    // Special case for asterisk
    if (statement === "*") {
      this._returnStatements.push(statement);
      return this;
    }

    // Validate the alias
    if (!this._checkAlias(statement)) {
      throw new QueryBuilderException(
        `The alias is not defined in the query. Please provide an alias included in the previous statements: ${statement}`
      );
    }

    if (alias) {
      this._returnStatements.push(`${statement} AS ${alias}`);
    } else {
      this._returnStatements.push(statement);
    }

    return this;
  }

  public toParameterizedQuery(): ParameterizedQuery {
    if (this._returnStatements.length === 0) {
      return {
        query: "",
        parameters: {},
      };
    }

    return {
      query: `RETURN ${this._returnStatements.join(", ")}`,
      parameters: {},
    };
  }

  public toRawQuery(): string {
    return this.toParameterizedQuery().query;
  }
}
