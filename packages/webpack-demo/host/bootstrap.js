const app = document.getElementById("app");
app.innerHTML = "<h1>host</h1>";

import("remoteAlias/listJs").then(({ addList }) => {
  addList();
});
