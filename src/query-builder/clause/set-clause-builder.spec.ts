import { SetClauseBuilder } from "./set-clause-builder";

describe("SetClauseBuilder", () => {
  it("Test empty", () => {
    const builder = new SetClauseBuilder();
    expect(builder.toRawQuery()).toBe(""); // Empty if no properties or statements
  });

  it("Test single statement input", () => {
    const TEST_STATEMENT = "n.name = $name";

    const builder = new SetClauseBuilder().set(TEST_STATEMENT);

    expect(builder.toRawQuery()).toBe("SET " + TEST_STATEMENT);
  });

  it("Test single statement with properties", () => {
    const TEST_STATEMENT = "n.name = $name";

    const builder = new SetClauseBuilder().set(TEST_STATEMENT, {
      name: "value",
    });

    expect(builder.toRawQuery()).toBe(
      `SET ${TEST_STATEMENT.replace("$name", '"value"')}`
    );
  });

  it("Test single statement, multiple values", () => {
    const TEST_STATEMENT = "n.name = $name, m.age = $age";

    const builder = new SetClauseBuilder().set(TEST_STATEMENT, {
      name: "value",
      age: 10,
    });

    expect(builder.toRawQuery()).toBe(`SET n.name = "value", m.age = 10`);
  });

  it("Test multiple statements with properties set", () => {
    const builder = new SetClauseBuilder()
      .set("n.name = $name")
      .addSet("m.age = $age")
      .setProperties({
        name: "value",
        age: 10,
      });

    expect(builder.toRawQuery()).toBe(`SET n.name = "value", m.age = 10`);
  });

  it("Test multiple statements", () => {
    const builder = new SetClauseBuilder()
      .set('n.name = "value"')
      .addSet("m.age = 10");

    expect(builder.toRawQuery()).toBe('SET n.name = "value", m.age = 10');
  });
});
