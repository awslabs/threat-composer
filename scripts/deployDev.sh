#!/bin/bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

${SCRIPT_DIR}/build.sh

# The whole stage is deployed, not just ThreatComposerAppStack: the CloudFront
# WAF WebACL has to live in us-east-1 and is therefore a separate stack that the
# app stack depends on.
yarn workspace @aws/threat-composer-infra run cdk deploy 'Dev/*'
