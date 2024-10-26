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

  public setAliasList(aliases: string[]): ReturnClauseBuilder {
    this._aliasSet = new Set(aliases);
    return this;
  }

  public add(statement: string, alias?: string): ReturnClauseBuilder {
    // Special case for asterisk
    if (statement === "*") {
      this._returnStatements.push(statement);
      return this;
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

    // Validate the statements on build
    for (const statement of this._returnStatements) {
      if (!this._checkAlias(statement)) {
        throw new QueryBuilderException(
          `The alias in the statement is not valid. Check if the alias is in the match, create, with, merge or optional match clause`
        );
      }
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
