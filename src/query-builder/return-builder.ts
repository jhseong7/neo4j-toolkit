export class ReturnQueryBuilder {
  private _returnStatements: string[] = [];

  public add(statement: string, alias?: string): ReturnQueryBuilder {
    if (alias) {
      this._returnStatements.push(`${statement} AS ${alias}`);
    } else {
      this._returnStatements.push(statement);
    }

    return this;
  }

  public build(): string {
    return `RETURN ${this._returnStatements.join(", ")}`;
  }
}
