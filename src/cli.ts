import { program } from 'commander';
import packageJson from '../package.json';
import { Github } from './imports/git/github';

/**
 * Set global CLI configurations
 */
program.storeOptionsAsProperties(false);

program.version(packageJson.version, '-v, --version');

program
  .command('init')
  .description('')
  .action(async (options: any) => {});

program
  .command('generate')
  .description('')
  .option('--authtoken <authtoken>', `githubのauthtoken`)
  .option('-o, --output <path>', `出力先rootディレクトリpath`)
  .action(async (options: any) => {
    const authtoken = options.authtoken ? options.authtoken : '';
    const github = new Github(authtoken);
    const perPage = 100;
    const nowDate = new Date();
    const commits = await github.searchSelfCommits(nowDate, 1, perPage);
    const importSources = commits.items;
    const totalPage = Math.ceil(commits.total_count / perPage)
    for(let i = 1;i < totalPage;++i) {
      const nextPageCommits = await github.searchSelfCommits(nowDate, i, perPage);
      for(const item of nextPageCommits.items) {
        importSources.push(item)
      }
    }
    console.log(JSON.stringify(importSources, null, 2));
  });

program.parse(process.argv);
