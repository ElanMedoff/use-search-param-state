#!/bin/bash

echo "did you update the package.json and changelog? (y/n)"
read CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  exit
fi

echo "what version are you updating to? (y/n)"
read VERSION

git add -A
git commit -m "version: v$VERSION"
git push origin head
