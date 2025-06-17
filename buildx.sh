#!/bin/bash
docker buildx build -t ericwang2006/baidu-oauth-worker --no-cache --platform=linux/amd64,linux/arm64/v8 . --push
