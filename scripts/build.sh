#!/bin/bash

set -e

yarn install --frozen-lockfile && npx projen
yarn run build
yarn workspaces run eslint
