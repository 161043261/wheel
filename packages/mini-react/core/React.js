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
      children: children.map((child) => {
        const isTextNode =
          typeof child === "string" || typeof child === "number";
        return isTextNode ? createTextNode(child) : child;
      }),
    },
  };
}

let nextWorkOfUnit = null;
let workInProgressFiberRoot = null; // workInProgressFiberRoot 当前处理的 Fiber 树 (保存更新后的状态)
let currentFiberRoot = null; // currentFiberTree 当前渲染的 Fiber 树 (保存更新前的状态)

function render(vNode /* element */, container) {
  workInProgressFiberRoot = {
    dom: container,
    props: {
      children: [vNode],
    },
  };
  nextWorkOfUnit = workInProgressFiberRoot;
}

function update() {
  workInProgressFiberRoot = {
    dom: currentFiberRoot.dom,
    props: currentFiberRoot.props,
    alternate: currentFiberRoot,
  };
  nextWorkOfUnit = workInProgressFiberRoot;
}

function workLoop(deadline) {
  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit /** nextWorkOfUnit */ = performWorkOfUnit(nextWorkOfUnit);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextWorkOfUnit && workInProgressFiberRoot) {
    commitWorkInProgressFiberRoot();
  }
  requestIdleCallback(workLoop);
}

function commitWorkInProgressFiberRoot() {
  // 统一提交
  commitWorkOfUnit(workInProgressFiberRoot.child);
  currentFiberRoot = workInProgressFiberRoot;
  workInProgressFiberRoot = null;
}

function commitWorkOfUnit(workOfUnit /* fiber */) {
  if (!workOfUnit) {
    return;
  }
  let fiberParent = workOfUnit.parent;
  while (!fiberParent.dom) {
    fiberParent = fiberParent.parent;
  }
  if (workOfUnit.effectTag === "update") {
    updateDom(workOfUnit.dom, workOfUnit.props, workOfUnit.alternate?.props);
  }
  if (workOfUnit.effectTag === "placement" && workOfUnit.dom) {
    fiberParent.dom.append(workOfUnit.dom);
  }
  commitWorkOfUnit(workOfUnit.child);
  commitWorkOfUnit(workOfUnit.sibling);
}

function createDom(type) {
  return type === "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(type);
}

function reconcileChildren(workOfUnit /* fiber */, children) {
  let oldChildWorkOfUnit = workOfUnit.alternate?.child;
  let preChildWorkOfUnit = null;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    let newChildWorkOfUnit;

    const isSameType =
      oldChildWorkOfUnit && oldChildWorkOfUnit.type === child.type;
    if (isSameType) {
      // update
      newChildWorkOfUnit = {
        type: child.type, // oldChildWorkOfUnit.type
        props: child.props,
        dom: oldChildWorkOfUnit.dom, // 复用 dom
        parent: workOfUnit,
        child: null,
        sibling: null,
        effectTag: "update",
        alternate: oldChildWorkOfUnit,
      };
    } else {
      // placement
      newChildWorkOfUnit = {
        type: child.type,
        props: child.props,
        dom: null,
        parent: workOfUnit,
        child: null,
        sibling: null,
        effectTag: "placement",
      };
    }
    if (oldChildWorkOfUnit) {
      oldChildWorkOfUnit = oldChildWorkOfUnit.sibling;
    }
    if (i === 0) {
      workOfUnit.child = newChildWorkOfUnit;
    } else {
      preChildWorkOfUnit.sibling = newChildWorkOfUnit;
    }
    preChildWorkOfUnit = newChildWorkOfUnit;
  }
}

function updateDom(dom, newProps, oldProps = {}) {
  for (const key of Object.keys(oldProps)) {
    if (key !== "children" && !(key in newProps)) {
      if (key === "className") {
        dom.removeAttribute("class");
        continue;
      }
      if (key === "htmlFor") {
        dom.removeAttribute("for");
        continue;
      }
      dom.removeAttribute(key);
    }
  }

  for (const key of Object.keys(newProps)) {
    if (key === "children" || oldProps[key] === newProps[key]) {
      continue;
    }
    if (key.startsWith("on")) {
      const eventType = key.slice(2).toLowerCase();
      dom.removeEventListener(eventType, oldProps[key]);
      dom.addEventListener(eventType, newProps[key]);
    } else {
      dom[key] = newProps[key];
    }
  }
}

function updateFunctionComponent(workOfUnit /** fiber */) {
  const children = [workOfUnit.type(workOfUnit.props)];
  reconcileChildren(workOfUnit, children);
}

function updateHostComponent(workOfUnit /** fiber */) {
  if (!workOfUnit.dom) {
    const dom = createDom(workOfUnit.type);
    updateDom(dom, workOfUnit.props);
    workOfUnit.dom = dom;
  }
  const children = workOfUnit.props.children;
  reconcileChildren(workOfUnit, children);
}

function performWorkOfUnit(workOfUnit /* fiber */) {
  const isFunctionComponent = typeof workOfUnit.type === "function";
  if (isFunctionComponent) {
    updateFunctionComponent(workOfUnit);
  } else {
    updateHostComponent(workOfUnit);
  }

  if (workOfUnit.child) {
    return workOfUnit.child;
  }

  let nextFiberNode = workOfUnit;
  while (nextFiberNode) {
    if (nextFiberNode.sibling) {
      return nextFiberNode.sibling;
    }
    nextFiberNode = nextFiberNode.parent;
  }
}

requestIdleCallback(workLoop);

const React = {
  render,
  createElement,
  update,
};

export default React;
