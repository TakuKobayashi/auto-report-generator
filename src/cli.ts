import { program } from 'commander';
import packageJson from '../package.json';
import { Github } from './imports/git/github';
import { Asana, AsanaTask } from './imports/task/asana';
import fs from 'fs';
import dayjs from 'dayjs';
import _ from 'lodash';

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
  .option('--githubauthtoken <authtoken>', `githubのauthtoken`)
  .option('--asanaauthtoken <authtoken>', `asanaのauthtoken`)
  .option('-o, --output <path>', `出力先rootディレクトリpath`)
  .action(async (options: any) => {
    const authtoken = options.githubauthtoken ? options.githubauthtoken : '';
    const github = new Github(authtoken);
    const githubUser = await github.loadSelfUser();
    const perPage = 100;
    const nowDate = new Date();
    const commits = await github.searchSelfCommits(nowDate, 1, perPage);
    const gitImportSources = commits.items;
    const totalPage = Math.ceil(commits.total_count / perPage);
    for (let i = 1; i < totalPage; ++i) {
      const nextPageCommits = await github.searchSelfCommits(nowDate, i, perPage);
      for (const item of nextPageCommits.items) {
        gitImportSources.push(item);
      }
    }
    const asana = new Asana(options.asanaauthtoken);
    const asanaUser = await asana.loadSelfUser();
    const targetAllAsanaTasks: AsanaTask[] = [];
    for (const worksapce of asanaUser.workspaces) {
      let offsetToken: string | null = null;
      let asanaTaskCount: number = 0;
      do {
        const asanaTasksResponse = await asana.loadSelfTasks(worksapce.gid, nowDate, offsetToken, 100);
        if (asanaTasksResponse.next_page) {
          offsetToken = asanaTasksResponse.next_page.offset;
        }
        asanaTaskCount = asanaTasksResponse.data.length;
        for (const asanaTask of asanaTasksResponse.data) {
          targetAllAsanaTasks.push(asanaTask);
        }
      } while (asanaTaskCount >= 100 && offsetToken);
    }
    const [completedTasks, incompletedTasks] = _.partition(targetAllAsanaTasks, (asanaTask) => asanaTask.completed);
    const exportLines: string[] = [];
    exportLines.push(`# ${githubUser.login} ${dayjs(nowDate).format('YYYY/MM/DD')}の日報`);
    exportLines.push('## 今日やったこと');
    if (gitImportSources.length > 0) {
      exportLines.push('### コミットしたこと');
      exportLines.push('');
      exportLines.push(`**本日のコミット件数: ${commits.total_count}**`);
      exportLines.push(`以下コミットした内容`);
      for (const importSource of gitImportSources) {
        exportLines.push(
          `* ${dayjs(nowDate).format('HH:MM:ss')} [${importSource.repository.full_name}](${importSource.repository.html_url}) ${importSource.commit.message}`,
        );
        exportLines.push(`  * 参照先:[${importSource.sha}](${importSource.html_url})`);
      }
    }

    if (completedTasks.length > 0) {
      exportLines.push('### 完了したタスク');
      exportLines.push('');
      for (const completedTask of completedTasks) {
        exportLines.push(
          `* ${dayjs(completedTask.completed_at).format('HH:MM:ss')} [${completedTask.name}](${completedTask.permalink_url})`,
        );
      }
      exportLines.push('');
    }

    if (incompletedTasks.length > 0) {
      const [availableDueOnAsanaTasks, unAvailableDueOnAsanaTasks] = _.partition(incompletedTasks, (asanaTask) => asanaTask.due_on);
      if (availableDueOnAsanaTasks.length > 0) {
        exportLines.push('### 対応中のタスク');
        exportLines.push('');
        for (const incompletedTask of availableDueOnAsanaTasks) {
          exportLines.push(
            `* [${incompletedTask.name}](${incompletedTask.permalink_url}) ${dayjs(incompletedTask.due_on).format('YYYY/MM/DD')} 完了予定`,
          );
        }
        exportLines.push('');
      }
      if (unAvailableDueOnAsanaTasks.length > 0) {
        exportLines.push('### 期日未定の残タスク');
        exportLines.push('');
        for (const incompletedTask of unAvailableDueOnAsanaTasks) {
          exportLines.push(`* [${incompletedTask.name}](${incompletedTask.permalink_url})`);
        }
        exportLines.push('');
      }
    }

    fs.writeFileSync(`${nowDate.toLocaleDateString('sv-SE')}-${dayjs(nowDate).format('HH-MM-ss')}-report.md`, exportLines.join('\n'));
  });

program.parse(process.argv);
