#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/lib-release-cohort.sh"
version="$1" source_sha="$2" requested_dependency="${3:-}"
validate_release_source "$GITHUB_REF_NAME" "$source_sha"
LLUMIVERSE_SHA="${requested_dependency:-$(git ls-tree HEAD llumiverse | awk '{print $3}')}"
export LLUMIVERSE_SHA
[[ "$LLUMIVERSE_SHA" =~ ^[0-9a-f]{40}$ ]]
if git rev-parse --verify "refs/tags/v$version" >/dev/null 2>&1; then
  lock_sha="$(git show "v$version:pnpm-lock.yaml" | shasum -a 256 | awk '{print $1}')"
  RELEASE_IDENTITY="$(node -e 'console.log(JSON.stringify({source_sha:process.argv[1],dependency_sha:process.argv[2],lock_sha256:process.argv[3]}))' "$source_sha" "$LLUMIVERSE_SHA" "$lock_sha")"
  export RELEASE_IDENTITY
  resume_release_tag "$version" "$source_sha"
else
  git -C llumiverse fetch origin "$LLUMIVERSE_SHA"
  git -C llumiverse checkout --detach "$LLUMIVERSE_SHA"
  pnpm install --lockfile-only --no-frozen-lockfile
  pnpm install --frozen-lockfile
  pnpm exec turbo run build --filter=@llumiverse/common
  pnpm --dir packages/common run gen:schemas
fi
prepared="$RUNNER_TEMP/prepared-release-source"
mkdir -p "$prepared"
paths=(pnpm-lock.yaml packages/common/src/api-contract/components.generated.json
  packages/common/src/store/intake-policy-schema.generated.ts
  packages/common/src/store/editing-policy-schema.generated.ts
  packages/common/src/wire-types.generated.ts packages/common/src/wire-types.generated.test.ts)
for path in "${paths[@]}"; do
  mkdir -p "$prepared/$(dirname "$path")"
  cp "$path" "$prepared/$path"
done
identity="$(release_identity "$source_sha" "$LLUMIVERSE_SHA")"
printf '%s\n' "$identity" > "$prepared/release-inputs.json"
