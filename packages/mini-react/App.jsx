/** @jsx React.createElement */
import React from "./core/React.js";

let cntFoo = 1;
function Foo() {
  console.log("===== foo =====");
  const update = React.useUpdate();
  const handleClick = () => {
    cntFoo++;
    update();
  };
  return (
    <div>
      {cntFoo}
      <button onClick={handleClick}>addCntFoo</button>
    </div>
  );
}

let cntBar = 1;
function Bar() {
  console.log("===== bar =====");
  const update = React.useUpdate();
  const handleClick = () => {
    cntBar++;
    update();
  };
  return (
    <div>
      {cntBar}
      <button onClick={handleClick}>addCntBar</button>
    </div>
  );
}

let cnt = 1;
export default function App() {
  console.log("===== app =====");
  const update = React.useUpdate();
  const handleClick = () => {
    cnt++;
    update();
  };
  return (
    <div id="app">
      {cnt}
      <button onClick={handleClick}>addCnt</button>
      <Foo />
      <Bar />
    </div>
  );
}
