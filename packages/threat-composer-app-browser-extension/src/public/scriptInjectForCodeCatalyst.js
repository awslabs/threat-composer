let stop = false;
let raw_content = undefined;

const debug = true; //TODO: Get this value from config.

function logDebugMessage(msg) {
  const debugPrefix = "ThreatComposerExtension: ";
  if (debug) console.log(debugPrefix + msg);
}

let handleCodeCatalystInject = async function () {
  try {
    element = document.querySelectorAll(".ace_editor")[0];
    document
      .querySelectorAll(".ace_editor")[0]
      .setAttribute("id", "ace-editor");
    editor = window.ace.edit("ace-editor");
    raw_content = await editor.getSession().getValue();
  } catch (err) {
    //Do nothing
  }

  if (raw_content && !stop) {
    stop = true;
    const debugPrefix = "ThreatComposerExtension: ";
    logDebugMessage("Injecting contents of ace-editor into Div");
    const raw_div = document.createElement("div");
    raw_div.setAttribute("id", "raw-div");
    raw_div.hidden = true;
    raw_div.textContent = raw_content;
    document.body.appendChild(raw_div);
  }
};

let observerForCodeCatalystInject = new MutationObserver(
  handleCodeCatalystInject
);
observerForCodeCatalystInject.observe(document.body, {
  childList: true,
  subtree: true,
});
