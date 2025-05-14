function createTextNode(nodeValue) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue,
      children: [],
    },
  };
}

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children?.map((child) => {
        return typeof child === "string" ? createTextNode(child) : child;
      }),
    },
  };
}

function render(vNode, container) {
  const dom =
    vNode.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(vNode.type);

  for (const key of Object.keys(vNode.props)) {
    if (key !== "children") {
      dom[key] = vNode.props[key];
    }
  }

  const children = vNode.props.children;
  if (children) {
    for (const child of children) {
      render(child, dom);
    }
  }
  container.append(dom);
}

const React = {
  render,
  createElement,
};

export default React;
