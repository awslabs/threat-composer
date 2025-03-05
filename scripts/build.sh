#!/bin/bash

set -e
npx update-browserslist-db@latest
pdk install --frozen-lockfile
pdk build
pdk workspaces run eslint
