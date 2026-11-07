"""
Render the system model as an interactive DFD viewer in one HTML file.

A static DFD of a large system is too dense to read. The viewer draws the same
model with pan and zoom, and lets the reader filter it: hide zones, show only
flows that cross a trust boundary, collapse each zone to one node, and select
an element to see only its neighbours.

The page loads Cytoscape.js from a CDN, so it needs network access to open.
"""

import json

from .system_model import SystemModel

# Pinned versions. fcose lays out compound nodes (zones) well; it needs
# layout-base and cose-base loaded first.
_SCRIPTS = (
    "https://cdn.jsdelivr.net/npm/cytoscape@3.30.2/dist/cytoscape.min.js",
    "https://cdn.jsdelivr.net/npm/layout-base@2.0.1/layout-base.js",
    "https://cdn.jsdelivr.net/npm/cose-base@2.2.0/cose-base.js",
    "https://cdn.jsdelivr.net/npm/cytoscape-fcose@2.2.0/cytoscape-fcose.js",
)


def viewer_data(system: SystemModel) -> dict:
    zone_of = {e.id: e.zone for e in system.elements}
    return {
        "zones": [
            {"id": z.id, "name": z.name, "trust": z.trust_level} for z in system.zones
        ],
        "elements": [
            {
                "id": e.id,
                "kind": e.kind,
                "name": e.name,
                "zone": e.zone,
                "description": e.description,
                "highValue": e.high_value,
            }
            for e in system.elements
        ],
        "flows": [
            {
                "id": f.id,
                "source": f.source,
                "target": f.target,
                "description": f.description,
                "protocol": f.protocol,
                "assets": f.assets,
                "crosses": zone_of.get(f.source) != zone_of.get(f.target),
                "boundary": system.boundaries_crossed(f),
            }
            for f in system.flows
        ],
    }


def _script_json(data: dict) -> str:
    # Inside <script>, "</" could end the element early.
    return json.dumps(data).replace("</", "<\\/")


def render_dfd_html(system: SystemModel, title: str = "Data Flow Diagram") -> str:
    scripts = "\n".join(f'<script src="{src}"></script>' for src in _SCRIPTS)
    return (
        _TEMPLATE.replace("__TITLE_JSON__", _script_json({"t": title}))
        .replace("__SCRIPTS__", scripts)
        .replace("__DATA__", _script_json(viewer_data(system)))
    )


_TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Data Flow Diagram</title>
<style>
:root {
  color-scheme: light;
  --bg: #f4f5f7; --canvas: #fbfbfc; --panel: #ffffff; --raised: #f1f3f6;
  --border: #e2e5ea; --text: #16191d; --muted: #646d78; --faint: #9aa2ad;
  --accent: #2563eb; --accent-soft: rgba(37, 99, 235, .12);
  --cross: #ea580c; --edge: #9aa3ae;
  --k-process: #2563eb; --k-store: #0f8f83; --k-ext: #7c3aed; --k-actor: #b45309;
  --z-untrusted-bg: #fdf1f1; --z-untrusted: #e7a3a3; --z-untrusted-text: #a03030;
  --z-priv-bg: #fdf8ea; --z-priv: #e5c66f; --z-priv-text: #8a6410;
  --z-bg: #f2f4f7; --z-line: #c9cfd8; --z-text: #56606c;
  --shadow: 0 1px 2px rgba(16, 24, 40, .06), 0 4px 12px rgba(16, 24, 40, .06);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg: #0f1115; --canvas: #13161b; --panel: #181b21; --raised: #20242b;
    --border: #2a2f37; --text: #e8eaed; --muted: #9aa3ae; --faint: #6b7480;
    --accent: #6ea8fe; --accent-soft: rgba(110, 168, 254, .16);
    --cross: #fb923c; --edge: #5d6672;
    --k-process: #6ea8fe; --k-store: #3fd0c0; --k-ext: #b197fc; --k-actor: #f5b84a;
    --z-untrusted-bg: #241618; --z-untrusted: #6e2e33; --z-untrusted-text: #f1a1a1;
    --z-priv-bg: #221d12; --z-priv: #6b5420; --z-priv-text: #e9c46a;
    --z-bg: #1a1e24; --z-line: #333a44; --z-text: #a3acb7;
    --shadow: 0 1px 2px rgba(0, 0, 0, .3), 0 6px 16px rgba(0, 0, 0, .3);
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text);
  font: 13px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased; }
#app { display: grid; grid-template-columns: 320px minmax(0, 1fr); height: 100vh; }
#app > * { min-width: 0; }
aside { background: var(--panel); border-right: 1px solid var(--border);
  overflow-y: auto; display: flex; flex-direction: column; }
.section { padding: 14px 18px; border-bottom: 1px solid var(--border); }
header.section { padding-top: 18px; }
h1 { font-size: 16px; font-weight: 650; margin: 0; letter-spacing: -.01em; }
.sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
h2 { display: flex; justify-content: space-between; align-items: baseline;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  color: var(--faint); margin: 0 0 10px; }
h2 .links button { all: unset; cursor: pointer; color: var(--muted); text-transform: none;
  letter-spacing: 0; font-weight: 500; margin-left: 10px; font-size: 12px; }
h2 .links button:hover { color: var(--accent); }
.search { position: relative; margin-top: 14px; }
.search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--faint); }
.search input { width: 100%; padding: 8px 10px 8px 32px; border: 1px solid var(--border);
  border-radius: 8px; background: var(--raised); color: var(--text); font: inherit;
  outline: none; transition: border-color .15s, box-shadow .15s; }
.search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  background: var(--panel); }
.toggle { display: flex; justify-content: space-between; align-items: center;
  padding: 5px 0; cursor: pointer; user-select: none; }
.toggle input { appearance: none; width: 30px; height: 18px; border-radius: 9px;
  background: var(--border); position: relative; cursor: pointer; margin: 0;
  transition: background .15s; flex: none; }
.toggle input::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px;
  height: 14px; border-radius: 50%; background: #fff; transition: transform .15s;
  box-shadow: 0 1px 2px rgba(0,0,0,.25); }
.toggle input:checked { background: var(--accent); }
.toggle input:checked::after { transform: translateX(12px); }
.zone-row { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px;
  align-items: center; padding: 5px 8px; margin: 0 -8px; border-radius: 6px;
  cursor: pointer; user-select: none; }
.zone-row:hover { background: var(--raised); }
.zone-row input { display: none; }
.zone-row .dot { width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid; }
.zone-row .count { color: var(--faint); font-size: 12px; font-variant-numeric: tabular-nums; }
.zone-row.off .name, .zone-row.off .count { color: var(--faint); text-decoration: line-through; }
.zone-row.off .dot { opacity: .35; }
.legend { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 12px;
  color: var(--muted); }
.legend div { display: flex; align-items: center; gap: 8px; }
.legend svg { flex: none; }
#details { padding: 16px 18px 24px; flex: 1; }
.empty { color: var(--faint); font-size: 12px; text-align: center; padding: 18px 0;
  border: 1px dashed var(--border); border-radius: 10px; }
.chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px;
  font-weight: 600; padding: 2px 8px; border-radius: 999px; background: var(--raised);
  color: var(--muted); margin: 0 4px 4px 0; }
.chip.kind { color: var(--kc); background: color-mix(in srgb, var(--kc) 14%, transparent); }
.chip.cross { color: var(--cross); background: color-mix(in srgb, var(--cross) 14%, transparent); }
.chip.hv { color: var(--z-untrusted-text); background: var(--z-untrusted-bg); }
.d-id { font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
.d-title { font-size: 15px; font-weight: 650; margin: 2px 0 8px; letter-spacing: -.01em; }
.d-desc { color: var(--text); margin: 10px 0 0; }
.d-meta { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 12px 0 0;
  font-size: 12px; }
.d-meta dt { color: var(--faint); }
.d-meta dd { margin: 0; }
.d-group { margin-top: 18px; }
.d-group h3 { font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: var(--faint); margin: 0 0 6px; }
.flow, .link { all: unset; display: block; width: 100%; box-sizing: border-box;
  cursor: pointer; padding: 7px 10px; border-radius: 8px; margin-bottom: 4px;
  background: var(--raised); border: 1px solid transparent; }
.flow:hover, .link:hover { border-color: var(--accent); }
.flow .top { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.flow .fid { font: 600 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
.flow .fid.x { color: var(--cross); }
.flow .ends { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.flow .fdesc { font-size: 12px; color: var(--text); margin-top: 2px; }
.link { display: flex; gap: 8px; font-size: 12px; align-items: baseline; }
.link .lid { font: 600 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
a.inline { color: var(--accent); cursor: pointer; text-decoration: none; }
a.inline:hover { text-decoration: underline; }
main { position: relative; background: var(--canvas);
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 22px 22px; }
#cy { position: absolute; inset: 0; }
.toolbar { position: absolute; top: 14px; right: 14px; display: flex; gap: 2px;
  background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
  padding: 3px; box-shadow: var(--shadow); z-index: 2; }
.toolbar button { all: unset; cursor: pointer; height: 28px; min-width: 28px; padding: 0 8px;
  border-radius: 7px; display: grid; place-items: center; color: var(--muted);
  font-size: 12px; font-weight: 500; box-sizing: border-box; }
.toolbar button:hover { background: var(--raised); color: var(--text); }
.toolbar .sep { width: 1px; background: var(--border); margin: 4px 2px; }
.status { position: absolute; left: 14px; bottom: 14px; z-index: 2; display: flex; gap: 8px;
  align-items: center; background: var(--panel); border: 1px solid var(--border);
  border-radius: 999px; padding: 5px 12px; font-size: 12px; color: var(--muted);
  box-shadow: var(--shadow); }
.status b { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
.hint { position: absolute; right: 14px; bottom: 14px; z-index: 2; font-size: 11px;
  color: var(--faint); }
@media (max-width: 760px) {
  #app { grid-template-columns: minmax(0, 1fr); grid-template-rows: 70vh auto; height: auto; }
  .toolbar { right: 8px; top: 8px; }
  #relayout { display: none; }
  aside { order: 2; border-right: 0; border-top: 1px solid var(--border); }
  main { order: 1; }
  .hint { display: none; }
  .section, #details { padding-left: 16px; padding-right: 16px; }
}
</style>
__SCRIPTS__
</head>
<body>
<div id="app">
  <aside>
    <header class="section">
      <h1 id="title"></h1>
      <div class="sub" id="summary"></div>
      <div class="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/>
          <path d="m20 20-3.5-3.5"/></svg>
        <input id="search" type="search" placeholder="Find an element or flow, then Enter"
          autocomplete="off">
      </div>
    </header>
    <div class="section">
      <h2>View</h2>
      <label class="toggle">Collapse zones <input id="collapse" type="checkbox"></label>
      <label class="toggle">Boundary-crossing flows only <input id="boundaryOnly" type="checkbox"></label>
      <label class="toggle">Flow labels <input id="labels" type="checkbox" checked></label>
    </div>
    <div class="section">
      <h2>Zones <span class="links"><button id="allZones">All</button><button id="noZones">None</button></span></h2>
      <div id="zones"></div>
    </div>
    <div class="section">
      <h2>Legend</h2>
      <div class="legend">
        <div><svg width="22" height="14"><ellipse cx="11" cy="7" rx="10" ry="6" fill="none" stroke="var(--k-process)" stroke-width="1.6"/></svg>Process</div>
        <div><svg width="22" height="14"><path d="M2 3.5Q11 0 20 3.5V10.5Q11 14 2 10.5Z" fill="none" stroke="var(--k-store)" stroke-width="1.6"/></svg>Data store</div>
        <div><svg width="22" height="14"><rect x="1" y="1.5" width="20" height="11" rx="3" fill="none" stroke="var(--k-ext)" stroke-width="1.6"/></svg>External entity</div>
        <div><svg width="22" height="14"><path d="M5 1H17L21 7L17 13H5L1 7Z" fill="none" stroke="var(--k-actor)" stroke-width="1.6"/></svg>Human actor</div>
        <div><svg width="22" height="14"><path d="M1 7H17" stroke="var(--cross)" stroke-width="1.8"/><path d="M15 3L21 7L15 11" fill="none" stroke="var(--cross)" stroke-width="1.8"/></svg>Crosses boundary</div>
        <div><svg width="22" height="14"><path d="M1 7H17" stroke="var(--edge)" stroke-width="1.8"/><path d="M15 3L21 7L15 11" fill="none" stroke="var(--edge)" stroke-width="1.8"/></svg>Within zone</div>
        <div><svg width="22" height="14"><path d="M2 3.5Q11 0 20 3.5V10.5Q11 14 2 10.5Z" fill="none" stroke="var(--k-store)" stroke-width="3.2"/></svg>High value</div>
      </div>
    </div>
    <div id="details"></div>
  </aside>
  <main>
    <div id="cy"></div>
    <div class="toolbar">
      <button id="zoomIn" title="Zoom in">+</button>
      <button id="zoomOut" title="Zoom out">&minus;</button>
      <div class="sep"></div>
      <button id="fit" title="Fit to screen">Fit</button>
      <button id="relayout" title="Run the layout again">Re-layout</button>
      <button id="clear" title="Clear selection">Clear</button>
    </div>
    <div class="status" id="stats"></div>
    <div class="hint">Click to focus &middot; double-click a collapsed zone to expand</div>
  </main>
</div>
<script id="title-data" type="application/json">__TITLE_JSON__</script>
<script id="dfd-data" type="application/json">__DATA__</script>
<script>
(function () {
  const DATA = JSON.parse(document.getElementById("dfd-data").textContent);
  const TITLE = JSON.parse(document.getElementById("title-data").textContent).t;
  const $ = (id) => document.getElementById(id);
  document.title = TITLE;
  $("title").textContent = TITLE;

  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();

  const zoneById = Object.fromEntries(DATA.zones.map((z) => [z.id, z]));
  const elById = Object.fromEntries(DATA.elements.map((e) => [e.id, e]));
  const flowById = Object.fromEntries(DATA.flows.map((f) => [f.id, f]));
  const UNZONED = "__unzoned";
  const zoneOf = (id) => elById[id].zone || UNZONED;
  const zoneName = (zid) => (zoneById[zid] ? zoneById[zid].name : "Unzoned");
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");

  const zoneIds = [...new Set(DATA.elements.map((e) => e.zone || UNZONED))];
  const zoneSize = Object.fromEntries(zoneIds.map((zid) =>
    [zid, DATA.elements.filter((e) => (e.zone || UNZONED) === zid).length]));
  $("summary").textContent = plural(DATA.elements.length, "element") + " · " +
    plural(DATA.flows.length, "flow") + " · " + plural(zoneIds.length, "zone");

  // Trust levels are free text; map the common words onto three tints.
  function trustClass(zid) {
    const t = (zoneById[zid] && zoneById[zid].trust || "").toLowerCase();
    if (/untrust|public|internet|external/.test(t)) return "untrusted";
    if (/privileg|admin|control|root|high/.test(t)) return "priv";
    return "neutral";
  }
  const zoneColors = {
    untrusted: [v("--z-untrusted-bg"), v("--z-untrusted"), v("--z-untrusted-text")],
    priv: [v("--z-priv-bg"), v("--z-priv"), v("--z-priv-text")],
    neutral: [v("--z-bg"), v("--z-line"), v("--z-text")],
  };
  const kinds = {
    process: { shape: "ellipse", color: v("--k-process"), label: "Process" },
    data_store: { shape: "barrel", color: v("--k-store"), label: "Data store" },
    external_entity: { shape: "round-rectangle", color: v("--k-ext"), label: "External entity" },
    human_actor: { shape: "hexagon", color: v("--k-actor"), label: "Human actor" },
  };

  const hiddenZones = new Set();

  // Group flows by direction between the drawn endpoints, so parallel flows
  // share one edge. In the collapsed view the endpoints are zones.
  function buildElements() {
    const boundaryOnly = $("boundaryOnly").checked;
    const collapse = $("collapse").checked;
    const flows = DATA.flows.filter((f) =>
      (!boundaryOnly || f.crosses) &&
      !hiddenZones.has(zoneOf(f.source)) && !hiddenZones.has(zoneOf(f.target)));
    const out = [];
    const end = (id) => (collapse ? "z:" + zoneOf(id) : id);

    for (const zid of zoneIds) {
      if (hiddenZones.has(zid)) continue;
      const z = zoneById[zid];
      const [bg, line, text] = zoneColors[trustClass(zid)];
      const trust = z && z.trust ? z.trust : "";
      const label = collapse
        ? zoneName(zid) + "\n" + [trust, plural(zoneSize[zid], "element")]
            .filter(Boolean).join(" · ")
        : zoneName(zid) + (trust ? "  ·  " + trust : "");
      out.push({ group: "nodes", data: { id: "z:" + zid, zone: zid, isZone: true,
        label, bg, line, text }, classes: collapse ? "zone collapsed" : "zone" });
    }
    if (!collapse) {
      const ends = new Set(flows.flatMap((f) => [f.source, f.target]));
      for (const e of DATA.elements) {
        const zid = e.zone || UNZONED;
        if (hiddenZones.has(zid)) continue;
        if (boundaryOnly && !ends.has(e.id)) continue;
        const k = kinds[e.kind] || kinds.process;
        out.push({ group: "nodes", data: {
          id: e.id, parent: "z:" + zid, shape: k.shape, color: k.color,
          label: e.name + "\n" + e.id,
        }, classes: "element" + (e.highValue ? " hv" : "") });
      }
    }
    const groups = new Map();
    for (const f of flows) {
      const s = end(f.source), t = end(f.target);
      if (s === t) continue; // internal flow of a collapsed zone
      const key = s + "->" + t;
      if (!groups.has(key)) groups.set(key, { s, t, flows: [] });
      groups.get(key).flows.push(f);
    }
    for (const [key, g] of groups) {
      const ids = g.flows.map((f) => f.id);
      out.push({ group: "edges", data: {
        id: "e:" + key, source: g.s, target: g.t, flows: ids, count: ids.length,
        label: collapse ? plural(ids.length, "flow") : ids.join(", "),
      }, classes: [g.flows.some((f) => f.crosses) ? "cross" : "",
        collapse ? "zedge" : ""].join(" ") });
    }
    return { out, shown: flows.length };
  }

  const font = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  const cy = cytoscape({
    container: $("cy"),
    wheelSensitivity: 0.25,
    minZoom: 0.05, maxZoom: 4,
    style: [
      { selector: "node.element", style: {
        shape: "data(shape)", width: 156, height: 58,
        "background-color": "data(color)", "background-opacity": 0.1,
        "border-color": "data(color)", "border-width": 1.6,
        label: "data(label)", "text-wrap": "wrap", "text-max-width": 136,
        "text-valign": "center", "font-family": font, "font-size": 11,
        "font-weight": 500, "line-height": 1.25, color: v("--text"),
        "min-zoomed-font-size": 6,
      } },
      { selector: "node.element.hv", style: { "border-width": 3.2 } },
      { selector: "node.zone", style: {
        shape: "round-rectangle", "corner-radius": 14,
        "background-color": "data(bg)", "background-opacity": 1,
        "border-color": "data(line)", "border-width": 1.2,
        label: "data(label)", "text-valign": "top", "text-halign": "center",
        "text-wrap": "wrap", "font-family": font,
        "font-size": 22, "font-weight": 650, color: "data(text)",
        "text-margin-y": 40, padding: 44, "min-zoomed-font-size": 4,
      } },
      { selector: "node.zone.collapsed", style: {
        width: 230, height: 86, "text-valign": "center", "text-margin-y": 0,
        "font-size": 13, "line-height": 1.5, "border-width": 1.6,
        "text-max-width": 210,
      } },
      { selector: "edge", style: {
        width: 1.2, "curve-style": "bezier", "control-point-step-size": 28,
        "line-color": v("--edge"), "target-arrow-color": v("--edge"),
        "target-arrow-shape": "vee", "arrow-scale": 0.9, opacity: 0.85,
        label: "data(label)", "font-family": font, "font-size": 9, "font-weight": 500,
        color: v("--muted"), "text-background-color": v("--canvas"),
        "text-background-opacity": 0.92, "text-background-padding": 2,
        "text-background-shape": "round-rectangle", "text-wrap": "wrap",
        "text-max-width": 110, "min-zoomed-font-size": 8,
      } },
      { selector: "edge.cross", style: {
        "line-color": v("--cross"), "target-arrow-color": v("--cross"),
      } },
      { selector: "edge[count > 1]", style: {
        width: "mapData(count, 1, 20, 1.4, 6)",
      } },
      // Paired zone edges (A to B and B to A) sit apart so their labels do not overlap.
      { selector: "edge.zedge", style: {
        "control-point-step-size": 70, "font-size": 11, "text-max-width": 160,
      } },
      { selector: ".nolabel", style: { label: "" } },
      { selector: "node.element.faded, edge.faded", style: { opacity: 0.1 } },
      { selector: "node.zone.faded", style: { "background-opacity": 0.45,
        "border-opacity": 0.5, "text-opacity": 0.5 } },
      { selector: "node.focus", style: {
        "underlay-color": v("--accent"), "underlay-opacity": 0.22,
        "underlay-padding": 8, "underlay-shape": "round-rectangle",
        "border-color": v("--accent"), "border-width": 2.4,
      } },
      { selector: "edge.focus", style: {
        "line-color": v("--accent"), "target-arrow-color": v("--accent"),
        width: 2.6, opacity: 1, color: v("--text"),
      } },
      { selector: "node:selected", style: { "overlay-opacity": 0 } },
      { selector: "edge:selected", style: { "overlay-opacity": 0 } },
    ],
  });

  function layout() {
    const opts = typeof cytoscape("layout", "fcose") === "function"
      ? { name: "fcose", quality: "proof", animate: false, randomize: true,
          nodeDimensionsIncludeLabels: true, nodeRepulsion: 60000,
          idealEdgeLength: 180, edgeElasticity: 0.3, nestingFactor: 0.1,
          gravity: 0.1, gravityCompound: 0.6, numIter: 5000,
          nodeSeparation: 120, packComponents: true, tile: true }
      : { name: "cose", animate: false };
    cy.layout(opts).run();
    cy.fit(undefined, 40);
  }

  function rebuild() {
    const { out, shown } = buildElements();
    cy.elements().remove();
    cy.add(out);
    applyLabels();
    layout();
    $("stats").replaceChildren(
      el("b", String(shown)), " of " + plural(DATA.flows.length, "flow"),
      el("span", "·"), el("b", String(cy.edges().length)),
      cy.edges().length === 1 ? " edge" : " edges");
    showDetails(null);
  }

  function applyLabels() {
    cy.edges().toggleClass("nolabel", !$("labels").checked);
  }

  function focusOn(ele) {
    cy.elements().removeClass("faded focus");
    if (!ele) return;
    let keep;
    if (ele.isNode() && ele.data("isZone") && !ele.hasClass("collapsed")) {
      keep = ele.union(ele.descendants());
      keep = keep.union(keep.connectedEdges()).union(keep.connectedEdges().connectedNodes());
    } else if (ele.isNode()) {
      keep = ele.closedNeighborhood();
    } else {
      keep = ele.union(ele.connectedNodes());
    }
    keep = keep.union(keep.ancestors());
    cy.elements().not(keep).addClass("faded");
    ele.addClass("focus");
    if (ele.isNode()) ele.connectedEdges().not(".faded").addClass("focus");
  }

  // ---- side panel ----
  const details = $("details");
  function el(tag, text, cls) {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function kindChip(e) {
    const k = kinds[e.kind] || kinds.process;
    const c = el("span", k.label, "chip kind");
    c.style.setProperty("--kc", k.color);
    return c;
  }
  function flowButton(f) {
    const b = el("button", null, "flow");
    const top = el("div", null, "top");
    top.append(el("span", f.id, "fid" + (f.crosses ? " x" : "")),
      el("span", f.source + " → " + f.target, "ends"));
    b.append(top, el("div", f.description, "fdesc"));
    b.onclick = () => selectFlow(f.id);
    return b;
  }
  function group(title, nodes) {
    if (!nodes.length) return [];
    const g = el("div", null, "d-group");
    g.append(el("h3", title + " · " + nodes.length), ...nodes);
    return [g];
  }
  function meta(rows) {
    const dl = el("dl", null, "d-meta");
    for (const [k, val] of rows) {
      if (val == null || val === "") continue;
      const dd = el("dd");
      dd.append(val);
      dl.append(el("dt", k), dd);
    }
    return dl;
  }
  function inline(text, onclick) {
    const a = el("a", text, "inline");
    a.onclick = onclick;
    return a;
  }

  function showDetails(ele) {
    details.replaceChildren();
    if (!ele) {
      details.append(el("div", "Select an element, flow or zone to see its details.", "empty"));
      return;
    }
    if (ele.isEdge()) {
      const flows = ele.data("flows").map((id) => flowById[id]);
      if (flows.length === 1) return renderFlow(flows[0]);
      const s = ele.data("source"), t = ele.data("target");
      const name = (id) => (id.startsWith("z:") ? zoneName(id.slice(2)) : id);
      details.append(el("div", "Edge", "d-id"),
        el("div", name(s) + " → " + name(t), "d-title"));
      details.append(...group("Flows", flows.map(flowButton)));
      return;
    }
    if (ele.data("isZone")) return showZone(ele.data("zone"));
    showElement(ele.id());
  }

  function showZone(zid) {
    details.replaceChildren();
    const z = zoneById[zid];
    const members = DATA.elements.filter((e) => (e.zone || UNZONED) === zid);
    const ids = new Set(members.map((e) => e.id));
    details.append(el("div", "Trust zone", "d-id"), el("div", zoneName(zid), "d-title"));
    if (z && z.trust) {
      const c = el("span", z.trust, "chip");
      c.style.color = zoneColors[trustClass(zid)][2];
      c.style.background = zoneColors[trustClass(zid)][0];
      details.append(c);
    }
    details.append(...group("Elements", members.map((e) => {
      const b = el("button", null, "link");
      b.append(el("span", e.id, "lid"), el("span", e.name));
      b.onclick = () => selectElement(e.id);
      return b;
    })));
    details.append(...group("Inbound flows", DATA.flows.filter(
      (f) => ids.has(f.target) && !ids.has(f.source)).map(flowButton)));
    details.append(...group("Outbound flows", DATA.flows.filter(
      (f) => ids.has(f.source) && !ids.has(f.target)).map(flowButton)));
  }

  function showElement(id) {
    details.replaceChildren();
    const e = elById[id];
    details.append(el("div", e.id, "d-id"), el("div", e.name, "d-title"), kindChip(e));
    if (e.highValue) details.append(el("span", "High value", "chip hv"));
    const zid = e.zone || UNZONED;
    details.append(meta([["Zone", inline(zoneName(zid), () => selectZone(zid))]]));
    if (e.description) details.append(el("p", e.description, "d-desc"));
    details.append(...group("Inbound", DATA.flows.filter((f) => f.target === e.id).map(flowButton)));
    details.append(...group("Outbound", DATA.flows.filter((f) => f.source === e.id).map(flowButton)));
  }

  function renderFlow(f) {
    details.replaceChildren();
    details.append(el("div", f.id, "d-id"), el("div", f.description, "d-title"));
    if (f.crosses) details.append(el("span", "Crosses trust boundary", "chip cross"));
    details.append(meta([
      ["Source", inline(f.source + " · " + elById[f.source].name, () => selectElement(f.source))],
      ["Target", inline(f.target + " · " + elById[f.target].name, () => selectElement(f.target))],
      ["Boundary", f.boundary.length ? f.boundary.join(" → ") : "None"],
      ["Protocol", f.protocol],
      ["Assets", f.assets.join(", ")],
    ]));
  }

  function centerOn(eles) {
    cy.animate({ center: { eles }, duration: 250 });
  }
  function selectFlow(id) {
    const edge = cy.edges().filter((e) => e.data("flows").includes(id)).first();
    if (edge.nonempty()) { focusOn(edge); centerOn(edge); }
    renderFlow(flowById[id]);
  }
  function selectElement(id) {
    let node = cy.getElementById(id);
    if (node.empty()) node = cy.getElementById("z:" + zoneOf(id));
    if (node.nonempty()) { focusOn(node); centerOn(node); }
    // The element may be hidden or inside a collapsed zone; show it anyway.
    showElement(id);
  }
  function selectZone(zid) {
    const node = cy.getElementById("z:" + zid);
    if (node.nonempty()) { focusOn(node); centerOn(node); }
    showZone(zid);
  }

  cy.on("tap", "node, edge", (evt) => { focusOn(evt.target); showDetails(evt.target); });
  cy.on("tap", (evt) => { if (evt.target === cy) { focusOn(null); showDetails(null); } });
  cy.on("dbltap", "node.zone.collapsed", (evt) => {
    // Expand: leave the collapsed view and focus that zone.
    const zid = evt.target.data("zone");
    $("collapse").checked = false;
    rebuild();
    const z = cy.getElementById("z:" + zid);
    focusOn(z); showZone(zid);
    cy.animate({ fit: { eles: z, padding: 40 }, duration: 300 });
  });
  cy.on("mouseover", "node, edge", () => { $("cy").style.cursor = "pointer"; });
  cy.on("mouseout", "node, edge", () => { $("cy").style.cursor = ""; });

  // ---- zone filter ----
  const zoneBox = $("zones");
  for (const zid of zoneIds) {
    const [bg, line] = zoneColors[trustClass(zid)];
    const row = el("label", null, "zone-row");
    const cb = el("input"); cb.type = "checkbox"; cb.checked = true; cb.dataset.zone = zid;
    const dot = el("span", null, "dot");
    dot.style.background = bg; dot.style.borderColor = line;
    row.append(cb, dot, el("span", zoneName(zid), "name"),
      el("span", String(zoneSize[zid]), "count"));
    cb.onchange = () => {
      cb.checked ? hiddenZones.delete(zid) : hiddenZones.add(zid);
      row.classList.toggle("off", !cb.checked);
      rebuild();
    };
    zoneBox.append(row);
  }
  const setAll = (on) => {
    zoneBox.querySelectorAll("input").forEach((cb) => {
      cb.checked = on;
      cb.parentElement.classList.toggle("off", !on);
      on ? hiddenZones.delete(cb.dataset.zone) : hiddenZones.add(cb.dataset.zone);
    });
    rebuild();
  };
  $("allZones").onclick = () => setAll(true);
  $("noZones").onclick = () => setAll(false);

  $("boundaryOnly").onchange = rebuild;
  $("collapse").onchange = rebuild;
  $("labels").onchange = applyLabels;
  const zoomBy = (f) => cy.animate({ zoom: { level: cy.zoom() * f,
    renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }, duration: 150 });
  $("zoomIn").onclick = () => zoomBy(1.4);
  $("zoomOut").onclick = () => zoomBy(1 / 1.4);
  $("fit").onclick = () => cy.animate({ fit: { padding: 40 }, duration: 250 });
  $("relayout").onclick = layout;
  $("clear").onclick = () => { focusOn(null); showDetails(null); };

  $("search").addEventListener("keydown", (evt) => {
    if (evt.key !== "Enter") return;
    const q = evt.target.value.trim().toLowerCase();
    if (!q) return;
    const flow = DATA.flows.find((f) => f.id.toLowerCase() === q);
    if (flow) return selectFlow(flow.id);
    const e = DATA.elements.find((x) => x.id.toLowerCase() === q) ||
      DATA.elements.find((x) => (x.id + " " + x.name).toLowerCase().includes(q));
    if (e) return selectElement(e.id);
    const zid = zoneIds.find((z) => zoneName(z).toLowerCase().includes(q));
    if (zid) return selectZone(zid);
  });

  // URL options, so a view can be linked: ?boundary=1&collapse=1&focus=P1
  const params = new URLSearchParams(location.search);
  if (params.get("boundary") === "1") $("boundaryOnly").checked = true;
  if (params.get("collapse") === "1") $("collapse").checked = true;
  rebuild();
  const focus = params.get("focus");
  if (focus && flowById[focus]) selectFlow(focus);
  else if (focus && elById[focus]) selectElement(focus);
})();
</script>
</body>
</html>
"""
