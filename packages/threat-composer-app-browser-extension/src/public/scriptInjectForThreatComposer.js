const browser = window.browser ? window.browser : window.chrome;

async function getConfig() {
  return browser.storage.local.get(["tcConfig"]).then((config) => {
    if (config.tcConfig) {
      return config.tcConfig;
    } else {
      return { debug: true };
    }
  });
}

async function logDebugMessage(msg) {
  config = await getConfig();
  const debugPrefix = "ThreatComposerExtension: ";
  if (config.debug) console.log(debugPrefix + msg);
}

function loadThreatModel(source) {
  if (window.threatcomposer.setCurrentWorkspaceData) {
    logDebugMessage(
      "Attempting to retrieve threat model from local storage" +
        " source: " +
        source
    );
    browser.storage.local
      .get("threatModel")
      .then((result) => {
        const answer = result.threatModel;
        if (answer != undefined) {
          if (answer.schema) {
            logDebugMessage(
              "Got valid JSON loading threat model, triggering to load into current workspace." +
                " source: " +
                source
            );
            window.threatcomposer.setCurrentWorkspaceData(answer);
          } else {
            logDebugMessage(
              "Did NOT get valid JSON. Will NOT trigger loading of threat model." +
                " source: " +
                source
            );
          }
        } else {
          logDebugMessage(
            "Did NOT get JSON object. Will NOT trigger loading of threat model." +
              " source: " +
              source
          );
        }
      })
      .catch((error) => {
        logDebugMessage(
          "Error during when attempting to retrieve threat model from local storage: " +
            error.message
        );
      });
  } else {
    logDebugMessage(
      "window.threatcomposer.setCurrentWorkspaceData is undefined. Cannot proceed until it is" +
        " source: " +
        source
    );
  }
}

logDebugMessage(
  "Adding DOMContentLoaded and visibility event listener to trigger load of threat model"
);

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

document.addEventListener("DOMContentLoaded", async (event) => {
  while (!window.threatcomposer.setCurrentWorkspaceData) {
    logDebugMessage(
      "Waiting for window.threatcomposer.setCurrentWorkspaceData to be ready."
    );
    await sleep(50);
  }
  loadThreatModel("DOMContentLoaded");
});
