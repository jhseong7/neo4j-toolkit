export class OrderByBuilder {
  private _orderByStatements: string[] = [];

  public add(
    statement: string,
    direction: "ASC" | "DESC" = "ASC"
  ): OrderByBuilder {
    this._orderByStatements.push(`${statement} ${direction}`);
    return this;
  }

  public build(): string {
    return `ORDER BY ${this._orderByStatements.join(", ")}`;
  }
}
