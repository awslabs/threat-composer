#!/bin/bash

set -e

pdk install --frozen-lockfile
pdk build
pdk eslint
