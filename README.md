# dat-ls

Small program that lists all the changes in a dat

```
npm install -g dat-ls
```

[![build status](http://img.shields.io/travis/mafintosh/dat-ls.svg?style=flat)](http://travis-ci.org/mafintosh/dat-ls)

## Usage

```
dat-ls <dat-link>
```

Here is an example

```
> dat-ls 8a1b6864f290a1204a3fe048ced34865a24f5fdef4ce3753bab613f66636587d

Dat contains 6 changes

[put]   /
[put]  LICENSE (1.08 kB, 1 blocks)
[put]  README.md (145 B, 1 blocks)
[put]  index.js (1.18 kB, 1 blocks)
[put]  package.json (648 B, 1 blocks)

Total content size: 3.05 kB
```

Per default it'll exit after reading the first snapshot of the change feed.
To keep listening for changes use the `--live` flag

```
> dat-ls 8a1b6864f290a1204a3fe048ced34865a24f5fdef4ce3753bab613f66636587d --live
```

## License

MIT
