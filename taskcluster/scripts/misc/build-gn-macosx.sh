#!/bin/bash
set -e -v

# This script is for building GN.

WORKSPACE=$HOME/workspace

CROSS_CCTOOLS_PATH=$MOZ_FETCHES_DIR/cctools
CROSS_SYSROOT=$MOZ_FETCHES_DIR/MacOSX11.3.sdk
export MACOSX_DEPLOYMENT_TARGET=10.12

export CC=$MOZ_FETCHES_DIR/clang/bin/clang
export CXX=$MOZ_FETCHES_DIR/clang/bin/clang++
export AR=$MOZ_FETCHES_DIR/clang/bin/llvm-ar
export CFLAGS="-target x86_64-apple-darwin -mlinker-version=137 -B ${CROSS_CCTOOLS_PATH}/bin -isysroot ${CROSS_SYSROOT} -I${CROSS_SYSROOT}/usr/include -iframework ${CROSS_SYSROOT}/System/Library/Frameworks"
export CXXFLAGS="-stdlib=libc++ ${CFLAGS}"
export LDFLAGS="${CXXFLAGS} -Wl,-syslibroot,${CROSS_SYSROOT} -Wl,-dead_strip"

# We patch tools/gn/bootstrap/bootstrap.py to detect this.
export MAC_CROSS=1

cd $GECKO_PATH

# The ninja templates used to bootstrap gn have hard-coded references to
# 'libtool', make sure we find the right one.
ln -s $CROSS_CCTOOLS_PATH/bin/x86_64-apple-darwin-libtool $CROSS_CCTOOLS_PATH/bin/libtool
export PATH=$CROSS_CCTOOLS_PATH/bin:$PATH

. taskcluster/scripts/misc/build-gn-common.sh
