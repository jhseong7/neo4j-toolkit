import { RelationPatternBuilder } from "./component";

describe("RelationBuilder", () => {
  it("Test [r]", () => {
    const builder = RelationPatternBuilder.new().setAlias("r");

    expect(builder.toRawQuery()).toBe("[r]");
  });

  it("Test [r:REL]", () => {
    const randomLabel =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = RelationPatternBuilder.new()
      .setAlias("r")
      .setLabel(randomLabel);

    expect(builder.toRawQuery()).toBe(`[r:${randomLabel}]`);
  });

  it("Test overwrite label", () => {
    const randomLabel1 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const randomLabel2 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = RelationPatternBuilder.new()
      .setAlias("r")
      .setLabel(randomLabel1)
      .setLabel(randomLabel2);

    expect(builder.toRawQuery()).toBe(`[r:${randomLabel2}]`);
  });

  it("Test properties [r {prop1: 'value1'}]", () => {
    const builder = RelationPatternBuilder.new()
      .setAlias("r")
      .addProperty("prop1", "value1");

    expect(builder.toRawQuery()).toBe(`[r {prop1: "value1"}]`);
  });

  it("Test multiple properties", () => {
    const builder = RelationPatternBuilder.new().setAlias("r").addProperties({
      prop1: "value1",
      prop2: 10,
    });

    expect(builder.toRawQuery()).toBe(`[r {prop1: "value1", prop2: 10}]`);
  });

  it("Test properties for various types", () => {
    const builder = RelationPatternBuilder.new()
      .setAlias("r")
      .addProperty("prop1", "value1")
      .addProperty("prop2", 10)
      .addProperty("prop3", true);

    expect(builder.toRawQuery()).toBe(
      `[r {prop1: "value1", prop2: 10, prop3: true}]`
    );
  });

  it("Test overwrite multiple properties", () => {
    const builder = RelationPatternBuilder.new()
      .setAlias("r")
      .addProperty("prop1", "value1")
      .addProperty("prop2", 10)
      .addProperty("prop3", true)
      .setProperties({ prop4: "value4" });

    expect(builder.toRawQuery()).toBe(`[r {prop4: "value4"}]`);
  });

  it("Test label and properties together", () => {
    const randomRelation =
      "Random" + Math.floor(Math.random() * 1000).toString(36);
    const builder = RelationPatternBuilder.new()
      .setAlias("r")
      .setLabel(randomRelation)
      .addProperty("prop1", "value1");

    expect(builder.toRawQuery()).toBe(
      `[r:${randomRelation} {prop1: "value1"}]`
    );
  });

  it("Test labels and multiple properties together", () => {
    const randomRelation1 =
      "Random" + Math.floor(Math.random() * 1000).toString(36);

    const builder = RelationPatternBuilder.new()
      .setAlias("r")
      .setLabel(randomRelation1)
      .addProperties({
        prop1: "value1",
        prop2: 10,
      });

    expect(builder.toRawQuery()).toBe(
      `[r:${randomRelation1} {prop1: "value1", prop2: 10}]`
    );
  });
});
