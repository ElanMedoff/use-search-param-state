#!/bin/bash

echo "did you update the package.json and changelog? (y/n)"
read CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  exit
fi

echo "what version are you updating to? (y/n)"
read VERSION

git add -A
git commit -m "chore: update to version $VERSION, update changelog"
git push origin head

npm run build
npm publish

