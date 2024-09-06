#/bin/sh

outdir="./lib"

rm -rf "${outdir}" && tsc && tsc -p ./tsconfig.cjs.json

cat >"${outdir}/cjs/package.json" <<EOF
{
    "type": "commonjs"
}
EOF

cat >"${outdir}/esm/package.json" <<EOF
{
    "type": "module"
}
EOF


