// Builds a GitHub "compare" URL that opens the new-PR form with the title
// and body prefilled. Used when the gh CLI isn't available.
//
// Usage:
//   node prCompareUrl.js --remote-url <url> --base <branch> --head <branch> \
//     --title "<title>" --body-file <path>

const fs = require('fs');

// Browsers and GitHub start rejecting URLs somewhere past ~8k characters,
// so leave headroom and drop the body (user pastes it) if it won't fit.
const MAX_URL_LENGTH = 7000;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument: ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  for (const key of ['remote-url', 'base', 'head', 'title', 'body-file']) {
    if (!args[key]) throw new Error(`Missing --${key}`);
  }
  return args;
}

// Accepts both https://github.com/owner/repo(.git) and git@github.com:owner/repo(.git)
function parseGithubRepo(remoteUrl) {
  const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error(`Not a GitHub remote: ${remoteUrl}`);
  return { owner: match[1], repo: match[2] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { owner, repo } = parseGithubRepo(args['remote-url']);
  const body = fs.readFileSync(args['body-file'], 'utf8');

  // Branch names can contain "/" which must stay literal in the path.
  const compare = `${encodeURIComponent(args.base).replace(/%2F/g, '/')}...${encodeURIComponent(args.head).replace(/%2F/g, '/')}`;
  const base = `https://github.com/${owner}/${repo}/compare/${compare}?expand=1`;
  const withTitle = `${base}&title=${encodeURIComponent(args.title)}`;
  const withBody = `${withTitle}&body=${encodeURIComponent(body)}`;

  if (withBody.length <= MAX_URL_LENGTH) {
    console.log(withBody);
  } else {
    console.log(withTitle);
    console.error(`Body too long for a URL (${withBody.length} chars); paste it into the form manually.`);
  }
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
