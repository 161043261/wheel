function createTextNode(nodeValue) {
  // console.log("createTextNode");
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue,
      children: [],
    },
  };
}

function createElement(type, props, ...children) {
  // console.log("createElement");
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
  nextWorkOfUnit = {
    dom: container,
    props: {
      children: [vNode],
    },
  };
  workInProgressFiberRoot = nextWorkOfUnit;
}

function update() {
  nextWorkOfUnit = {
    dom: currentFiberRoot.dom,
    props: currentFiberRoot.props,
    alternate: currentFiberRoot,
  };
  workInProgressFiberRoot = nextWorkOfUnit;
}

function workLoop(deadline) {
  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit /** nextWorkOfUnit */ = performWorkOfUnit(nextWorkOfUnit);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextWorkOfUnit && workInProgressFiberRoot) {
    // 统一提交
    commitWorkOfUnit(workInProgressFiberRoot.child);
    currentFiberRoot = workInProgressFiberRoot;
    workInProgressFiberRoot = null;
  }
  requestIdleCallback(workLoop);
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
    const sameType =
      oldChildWorkOfUnit && oldChildWorkOfUnit.type === child.type;
    let newChildWorkOfUnit;
    if (sameType) {
      // update
      newChildWorkOfUnit = {
        type: workOfUnit.type, // oldChildWorkOfUnit.type
        props: workOfUnit.props,
        dom: oldChildWorkOfUnit.dom,
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

function updateDom(dom, newProps, oldProps) {
  if (oldProps) {
    for (const key of Object.keys(oldProps)) {
      if (key !== "children" && !(key in newProps)) {
        dom.removeAttribute(key);
      }
    }
  }

  for (const key of Object.keys(newProps)) {
    if (key === "children") {
      continue;
    }
    if (key.startsWith("on")) {
      const eventType = key.slice(2).toLowerCase();
      dom.addEventListener(eventType, newProps[key]);
      continue;
    }
    dom[key] = newProps[key];
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

  let nextFiber = workOfUnit;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

requestIdleCallback(workLoop);

const React = {
  render,
  createElement,
  update,
};

export default React;
