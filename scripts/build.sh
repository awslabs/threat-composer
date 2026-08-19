#!/bin/bash

set -e
yarn install --frozen-lockfile --check-files
yarn build
yarn eslint
