docker run --rm -it \
    -v $(pwd):/root/home/work/ \
    -v $(pwd)/package.json:/root/home/work/package.json \
    -v $(pwd)/.npmrc:/root/home/work/.npmrc:ro \
    -v $(pwd)/script.sh:/root/home/work/script.sh:ro \
    -w /root/home/work \
    --entrypoint bash \
    node:18 script.sh
