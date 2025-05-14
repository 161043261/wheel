/** @jsx React.createElement */
import React from "./core/React.js";

// const App = React.createElement("div", { id: "app" }, "placeholder");

function Counter({ cnt }) {
  return <div>counter: {cnt}</div>;
}

function CounterContainer() {
  return (
    <>
      Counters
      <Counter cnt={3} />
      <Counter cnt={5} />
    </>
  );
}

export default function App() {
  return (
    <div id="app">
      <CounterContainer />
    </div>
  );
}
