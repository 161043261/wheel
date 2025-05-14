import React from "./core/React.js";
import ReactDOM from "./core/ReactDOM.js";
import App from "./App.jsx";

const container = document.querySelector("#root");
const root = ReactDOM.createRoot(container);
root.render(<App />);
// root.render(App);
