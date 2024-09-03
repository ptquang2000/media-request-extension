#!/bin/bash

TARGET=$(basename $(pwd))
TARGET_DIR=release

mkdir -p ${TARGET_DIR}
zip -r -FS ${TARGET_DIR}/${TARGET}.zip * --exclude "*.git*" "*release*" "*.sh"
