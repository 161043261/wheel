/** @jsx React.createElement */
import React from "./core/React.js";

function Foo() {
  console.log("===== foo =====");
  const [cnt, setCnt] = React.useState(0);
  const [cnt2, setCnt2] = React.useState(1);

  const handleClick = () => {
    setCnt((cnt) => cnt + 1);
  };
  const handleClick2 = () => {
    setCnt2((cnt2) => cnt2 + 1);
  };
  return (
    <div>
      <div>Foo cnt {cnt}</div>
      <button onClick={handleClick}>addCnt</button>
      <div>Foo cnt {cnt2}</div>
      <button onClick={handleClick2}>addCnt2</button>
    </div>
  );
}

function Bar() {
  console.log("===== bar =====");
  const [cnt, setCnt] = React.useState(0);
  const handleClick = () => {
    setCnt((cnt) => cnt + 1);
  };
  return (
    <div>
      <div>Bar cnt {cnt}</div>
      <button onClick={handleClick}>addCnt</button>
    </div>
  );
}

export default function App() {
  console.log("===== app =====");
  const [cnt, setCnt] = React.useState(0);
  const handleClick = () => {
    setCnt((cnt) => cnt + 1);
  };
  return (
    <div id="app">
      <div>App cnt {cnt}</div>
      <button onClick={handleClick}>addCnt</button>
      <Foo />
      <Bar />
    </div>
  );
}
