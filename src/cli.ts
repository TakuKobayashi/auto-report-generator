import { program } from 'commander';
import packageJson from '../package.json';
import { Github } from './imports/git/github';
import fs from 'fs';
import dayjs from 'dayjs';

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
    const githubUser = await github.loadSelfUser();
    const perPage = 100;
    const nowDate = new Date();
    const commits = await github.searchSelfCommits(nowDate, 1, perPage);
    const importSources = commits.items;
    const totalPage = Math.ceil(commits.total_count / perPage);
    for (let i = 1; i < totalPage; ++i) {
      const nextPageCommits = await github.searchSelfCommits(nowDate, i, perPage);
      for (const item of nextPageCommits.items) {
        importSources.push(item);
      }
    }
    const exportLines: string[] = [];
    exportLines.push(`# ${githubUser.login} ${dayjs(nowDate).format('YYYY/MM/DD')}の日報`);
    exportLines.push('## 今日やったこと');
    exportLines.push('');
    exportLines.push(`**本日のコミット件数: ${commits.total_count}**`);
    exportLines.push(`以下コミットした内容`);
    for (const importSource of importSources) {
      const comitterDate = new Date(importSource.commit.committer.date);
      exportLines.push(
        `* ${dayjs(nowDate).format('HH:MM:ss')} [${importSource.repository.full_name}](${importSource.repository.html_url}) ${importSource.commit.message}`,
      );
      exportLines.push(`  * 参照先:[${importSource.sha}](${importSource.html_url})`);
    }
    fs.writeFileSync(`${nowDate.toLocaleDateString('sv-SE')}-${dayjs(nowDate).format('HH-MM-ss')}-report.md`, exportLines.join('\n'));
  });

program.parse(process.argv);
