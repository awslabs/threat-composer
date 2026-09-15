#!/bin/bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

${SCRIPT_DIR}/build.sh

pnpm --filter @aws/threat-composer-infra exec cdk deploy Dev/ThreatComposerAppStack
