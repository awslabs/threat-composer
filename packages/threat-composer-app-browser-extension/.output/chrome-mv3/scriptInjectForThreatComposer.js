const browser = window.browser ? window.browser : window.chrome;

const debug = true; //TODO: Get this value from config.

function logDebugMessage(msg) {
  const debugPrefix = "ThreatComposerExtension: ";
  if (debug) console.log(debugPrefix + msg);
}

function loadThreatModel(source) {
  logDebugMessage("loadThreatModel: triggered" + " source:" + source);
  if (window.threatcomposer.setCurrentWorkspaceData) {
    logDebugMessage(
      "loadThreatModel: window.threatcomposer.setCurrentWorkspaceData is NOT undefined"
    );
    browser.storage.local
      .get("threatModel")
      .then((result) => {
        const answer = result.threatModel;
        if (answer != undefined) {
          if (answer.schema) {
            logDebugMessage(answer);
            logDebugMessage(
              "loadThreatModel: got valid JSON loading threat model, and disconnecting observer" +
                " source:" +
                source
            );
            window.threatcomposer.setCurrentWorkspaceData(answer);
          } else {
            logDebugMessage(
              "loadThreatModel: Did NOT get valid JSON loading threat model, NOT disconnecting observer" +
                " source:" +
                source
            );
          }
        } else {
          logDebugMessage(
            "loadThreatModel: Did NOT get JSON object, NOT disconnecting observer" +
              " source:" +
              source
          );
        }
      })
      .catch((error) => {
        console.log(debugPrefix + error);
      });
  } else {
    logDebugMessage(
      "loadThreatModel: window.threatcomposer.setCurrentWorkspaceData is undefined" +
        " source:" +
        source
    );
  }
}

logDebugMessage(
  "Adding visibility event listener and mutation observer to trigger load of threat model"
);

document.addEventListener("visibilitychange", (event) => {
  loadThreatModel("visibility change");
});

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

document.addEventListener("DOMContentLoaded", async (event) => {
  while (!window.threatcomposer.setCurrentWorkspaceData) {
    logDebugMessage(
      "Waiting for window.threatcomposer.setCurrentWorkspaceData"
    );
    await sleep(50);
  }
  loadThreatModel("onload");
});
