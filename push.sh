#!/bin/bash -e
if [ "$IS_PULL_REQUEST" != true ]; then
  sudo docker push $IMAGE_NAME:$BRANCH.$BUILD_NUMBER
  echo "versionName=$BRANCH.$BUILD_NUMBER" >> $JOB_STATE/jpizarrom-pdxlivebus-server-image.env
else
  echo "skipping because it's a PR"
fi
