/** @jsx React.createElement */
import React from "./core/React.js";

// const App = React.createElement("div", { id: "app" }, "placeholder");

let cnt = 10;
let props = { className: "whoami" };

function Counter() {
  const handleClick = () => {
    cnt++;
    props = {};
    React.update();
  };
  return (
    <div {...props}>
      <label htmlFor="a"></label>
      <button onClick={handleClick}>cnt++</button>
      <div>cnt: {cnt}</div>
    </div>
  );
}

function CounterContainer() {
  return (
    <div>
      Counters
      <Counter cnt={3} />
      <Counter cnt={5} />
    </div>
  );
}

export default function App() {
  return (
    <div id="app">
      <CounterContainer />
    </div>
  );
}
