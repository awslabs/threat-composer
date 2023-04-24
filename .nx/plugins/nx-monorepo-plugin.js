// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const fs = require("fs");
const path = require("path");
const { ProjectGraphBuilder } = require("@nrwl/devkit");

exports.processProjectGraph = (graph) => {
  const builder = new ProjectGraphBuilder(graph);

  const nx = JSON.parse(
    fs
      .readFileSync(path.resolve(findRoot(__dirname), "nx.json"))
      .toString("utf-8")
  );
  const implicitDependencies =
    nx.implicitDependencies;

  Object.entries(implicitDependencies).forEach(([dependant, dependees]) => {
    dependees.forEach((dependee) =>
      builder.addImplicitDependency(dependant, dependee)
    );
  });

  return builder.getUpdatedProjectGraph();
};

const findRoot = (dir) => {
  if (path.dirname(dir) === dir) {
    return process.cwd();
  } else if (fs.existsSync(path.join(dir, "nx.json"))) {
    return dir;
  } else {
    return findRoot(path.dirname(dir));
  }
};
