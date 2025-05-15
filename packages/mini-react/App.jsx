/** @jsx React.createElement */
import React from "./core/React.js";

// const App = React.createElement("div", { id: "app" }, "placeholder");

let showFoo = true;

function Counter() {
  const handleClick = () => {
    showFoo = !showFoo;
    React.update();
  };

  const Foo = () => (
    <div>
      foo
      <div>fooChild</div>
    </div>
  );
  const Bar = () => <div>bar</div>;
  return (
    <div>
      <button onClick={handleClick}>showFoo</button>
      {/* {showFoo && <Foo />}
      <hr /> */}
      {showFoo ? <Foo /> : <Bar />}
    </div>
  );
}

function CounterContainer() {
  return (
    <div>
      <Counter />
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
