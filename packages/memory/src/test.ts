import micromatch from 'micromatch';

const mm = micromatch(['foo', 'foo/bar', 'foo/baz', 'bar'], ['foo/**', '!foo/baz']);

console.log(mm);