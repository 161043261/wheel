import React from "./core/React.js";

// const App = React.createElement("div", { id: "app" }, "placeholder");

function App2() {
  return (
    <div id="app2">
      placeholder2
      <div>child</div>
    </div>
  );
}
console.log(App2);

const App = (
  <div id="app">
    placeholder
    <div>child</div>
  </div>
);

export default App;
