#!/bin/sh
# Install the threat-composer Claude Code and Kiro agents, skill, workflow and
# MCP server from a URL:
#
#   curl -fsSL https://raw.githubusercontent.com/awslabs/threat-composer/main/packages/threat-composer-ai/scripts/install.sh | sh
#   curl -fsSL <url> | sh -s -- --project ~/src/app --tool kiro
#
# It keeps a shallow checkout of the package, then runs install_agents.py from it
# with your arguments. See `install_agents.py --help` for them. The MCP entry
# points at the checkout, so do not delete it.
#
# Run it again to update the checkout and the installed files.
#
# Environment:
#   THREAT_COMPOSER_HOME  Where the checkout lives
#                         (default: ${XDG_DATA_HOME:-~/.local/share}/threat-composer).
#   THREAT_COMPOSER_REF   Branch or tag to install (default: main).
#   THREAT_COMPOSER_REPO  Git URL to fetch from.
#
# Needs git 2.25 or later, python3 3.9 or later, and uv to run the MCP server.

set -eu

REPO="${THREAT_COMPOSER_REPO:-https://github.com/awslabs/threat-composer.git}"
REF="${THREAT_COMPOSER_REF:-main}"
DEST="${THREAT_COMPOSER_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/threat-composer}"
SUBDIR="packages/threat-composer-ai"

say() { printf '%s\n' "$*" >&2; }
die() {
  say "error: $*"
  exit 1
}
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required. $2"; }

# Everything runs inside main, so a download that stops half way does not run
# a partial script.
main() {
  need git "See https://git-scm.com/downloads"
  need python3 "See https://www.python.org/downloads/"
  python3 -c 'import sys; sys.exit(sys.version_info < (3, 9))' ||
    die "python3 3.9 or later is required."

  if [ -d "$DEST/.git" ]; then
    say "Updating $DEST to $REF"
    # Fetch from the URL, not from a remote name, so a changed THREAT_COMPOSER_REPO
    # takes effect. The checkout is only for this script: local changes are lost.
    git -C "$DEST" fetch --quiet --depth 1 "$REPO" "$REF"
    git -C "$DEST" checkout --quiet --force FETCH_HEAD
  else
    if [ -e "$DEST" ] && [ -n "$(ls -A "$DEST" 2>/dev/null)" ]; then
      die "$DEST exists and is not a checkout from this script. Move it, or set THREAT_COMPOSER_HOME."
    fi
    say "Cloning $REPO ($REF) to $DEST"
    git clone --quiet --depth 1 --filter=blob:none --sparse --branch "$REF" "$REPO" "$DEST"
    git -C "$DEST" sparse-checkout set "$SUBDIR"
  fi

  [ -f "$DEST/$SUBDIR/scripts/install_agents.py" ] ||
    die "$SUBDIR/scripts/install_agents.py is not in $REF. Set THREAT_COMPOSER_REF to a branch that has it."

  exec python3 "$DEST/$SUBDIR/scripts/install_agents.py" "$@"
}

main "$@"
