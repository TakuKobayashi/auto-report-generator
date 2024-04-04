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
  .option('-o, --output <path>', `buildの出力先rootディレクトリpath`)
  .action(async (options: any) => {
    const authtoken = options.authtoken ? options.authtoken : '';
    const github = new Github(authtoken);
    const commits = await github.searchSelfCommits();
    console.log(commits);
  });

program.parse(process.argv);
