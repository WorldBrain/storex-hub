#!/bin/bash

if [ "$SKIP_TSC" != "true" ]; then
    tsc
fi

# pkg lib/standalone.js --out-path build/

declare -A platform_by_target
platform_by_target=( ["linux"]="linux" ["mac"]="darwin" ["win"]="win32" )
node_version=`node --version`

targets="linux mac win"
for target in $targets; do
    if [ -n "$TARGET" -a "$target" != "$TARGET" ]; then
        continue
    fi

    output_dir="build/$target"
    output="$output_dir/storex-hub"
    if [ "$target" = "win" ]; then
        output="$output.exe"
    fi

    if [ "$SKIP_BUILD" != "true" ]; then
        pkg --target node10-$target-x64 lib/standalone.js --output $output
    fi

    if [ "$SKIP_BINDINGS" != "true" ]; then
        platform=${platform_by_target[$target]}

        # ./node_modules/.bin/node-pre-gyp install \
        #     --directory=./node_modules/sqlite3 \
        #     --target_platform=${platform} \
        #     --target_arch='x64' \
        #     --target=${node_version:1}

        # cp node_modules/sqlite3/lib/binding/node-v64-$platform-x64/node_sqlite3.node $output_dir

        ./node_modules/.bin/node-pre-gyp install \
            --directory=./node_modules/bcrypt \
            --target_platform=${platform} \
            --target_arch='x64' \
            --target=${node_version:1} \
            --build-from-source

        cp node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node $output_dir
    fi
done

# rm -rf lib 2>/dev/null ; tsc && pkg --target node10-linux-x64 lib/standalone.js --out-path=build
# rm -rf lib 2>/dev/null ; tsc && pkg --target node10-linux-x64 lib/standalone.js --out-path=build

# cp node_modules/sqlite3/lib/binding/node-v64-linux-x64/node_sqlite3.node
# cp node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node

# ./node_modules/.bin/node-pre-gyp install
# --directory=./node_modules/sqlite3
# --target_platform={OS}
# --target_arch={OS architecture}
# --target={Node version}