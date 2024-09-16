npm install -g npm-check-updates

# preserve the original one for comparison
cp package.json package.old.json


# try major
npx npm-check-updates
npx npm-check-updates -u

rm -rf /root/.npm/_logs/

FAILED=0
npm install > install.log 2>&1 || FAILED=1

echo "$FAILED"
if [ "$FAILED" = 1 ]; then
    echo "-- failed --"
    cat install.log
    echo "--"

    cp -r /root/.npm/_logs/ ./
    chown -R 1000:1000 ./_logs
fi

FAILED=0
npm run test > test.log 2>&1 || FAILED=1

echo "$FAILED"
if [ "$FAILED" = 1 ]; then
    echo "-- failed --"
    cat test.log
    echo "--"

    cp -r /root/.npm/_logs/ ./
    chown -R 1000:1000 ./_logs
fi

# set the old one back as current
cp package.json package.updated.json 
cp package.old.json package.json 
