#!/bin/sh
set -eu
TASK_TEST_DIR=$(mktemp -d /tmp/monote-swift.XXXXXX)
trap 'rm -rf "$TASK_TEST_DIR"' EXIT
swiftc -module-cache-path "$TASK_TEST_DIR/cache" modules/monote-speech/ios/StopCommand.swift tests/swift/main.swift -o "$TASK_TEST_DIR/stop-command-tests"
"$TASK_TEST_DIR/stop-command-tests"
