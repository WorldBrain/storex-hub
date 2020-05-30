#!/bin/bash

version=`cat package.json | json pluck --attr version`
if [ $? -ne 0 -o -z "$version" ]; then
    echo "ERROR: Could not extract version from package.json"
    exit 1
fi

if [ "$SKIP_TSC" != "true" ]; then
    echo -n "Running tsc... "
    tsc || exit 1
    echo "done!"
fi

if [ "$SKIP_FRONTEND_BUILD" != "true" ]; then
    pushd frontend
    yarn build || exit 1
    popd
fi

declare -A platform_by_target
platform_by_target=( ["linux"]="linux" ["mac"]="darwin" ["win"]="win32" )
node_version=`node --version`

targets="linux mac win"
for target in $targets; do
    if [ -n "$TARGET" -a "$target" != "$TARGET" ]; then
        continue
    fi

    output_dir="build/storex-hub-$target"
    output="$output_dir/storex-hub"
    if [ "$target" = "win" ]; then
        output="$output.exe"
    fi

    if [ "$SKIP_BUILD" != "true" ]; then
        pkg --target node10-$target-x64 lib/standalone.js --output $output
    fi

    if [ "$SKIP_BINDINGS" != "true" ]; then
        platform=${platform_by_target[$target]}

        ./node_modules/.bin/node-pre-gyp install \
            --directory=./node_modules/sqlite3 \
            --target_platform=${platform} \
            --target_arch='x64' \
            --target=${node_version:1} > /dev/null

        sqlite_module_count=`ls -1 node_modules/sqlite3/lib/binding/node-*-$platform-x64/ | wc -l`
        if [ "$sqlite_module_count" -eq 0 ]; then
            echo "Could not build the SQLite module for platform '$platform'" >&2
            exit 1
        fi
        if [ "$sqlite_module_count" -gt 1 ]; then
            echo "Found built SQLite modules for multiple node versions ('$platform'). Please delete old one."
            exit 1
        fi

        cp node_modules/sqlite3/lib/binding/node-*-$platform-x64/node_sqlite3.node $output_dir
    fi

    rm -rf $output_dir/frontend 2> /dev/null
    cp -r frontend/build "$output_dir/frontend"

    if [ "$SKIP_PACKAGING" != "true" ]; then
        pushd build
        if [ "$target" != "win" ]; then
            tar -czf storex-hub-$target-$version.tgz storex-hub-$target
        else
            zip -r storex-hub-$target-$version.zip storex-hub-$target
        fi
        popd
    fi
done
