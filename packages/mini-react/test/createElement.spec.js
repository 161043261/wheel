import React from "../core/React";
import { it, expect, describe } from "vitest";

describe("createElement", () => {
  it("props === null", () => {
    const vNode = React.createElement("div", null, "child");

    // 快照测试
    expect(vNode).toMatchInlineSnapshot(
      {
        type: "div",
        props: {
          children: [
            {
              type: "TEXT_ELEMENT",
              props: { nodeValue: "child", children: [] },
            },
          ],
        },
      },
      `
      {
        "props": {
          "children": [
            {
              "props": {
                "children": [],
                "nodeValue": "child",
              },
              "type": "TEXT_ELEMENT",
            },
          ],
        },
        "type": "div",
      }
    `,
    );
  });

  it("props !== null", () => {
    const vNode = React.createElement("div", { id: "vNode" }, "child");
    // 快照测试
    expect(vNode).toMatchInlineSnapshot(
      {
        type: "div",
        props: {
          id: "vNode",
          children: [
            {
              type: "TEXT_ELEMENT",
              props: { nodeValue: "child", children: [] },
            },
          ],
        },
      },
      `
      {
        "props": {
          "children": [
            {
              "props": {
                "children": [],
                "nodeValue": "child",
              },
              "type": "TEXT_ELEMENT",
            },
          ],
          "id": "vNode",
        },
        "type": "div",
      }
    `,
    );
  });
});
