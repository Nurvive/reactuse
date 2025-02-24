import type { Argv } from 'yargs';

import fetches from '@siberiacancode/fetches';
import chalk from 'chalk';
import fs from 'node:fs';
import ora from 'ora';
import prompts from 'prompts';
import { createMatchPath, loadConfig } from 'tsconfig-paths';
import path from 'node:path';

import type { AddOptionsSchema, Registry } from '@/utils/types';

import { getConfig } from '@/utils/config/getConfig';
import { APP_PATH, REPO_URLS } from '@/utils/constants';
import { addOptionsSchema } from '@/utils/types';


const resolveDependencies = (registry: Registry, hooks: string[]) => {
  const files = new Map<string, { type: 'hook' | 'util' | 'local' | 'package', name: string, parent: string }>();

  const resolveDependency = (hook: string) => {
    const item = registry[hook]!;
    files.set(hook, { type: 'hook', name: hook, parent: item.name });
    if (item.utils.length) Array.from(item.utils).forEach((util) => files.set(util, { type: 'util', name: util, parent: item.name }));
    if (item.local.length) Array.from(item.local).forEach((local) => files.set(local, { type: 'local', name: local, parent: item.name }));
    if (item.packages.length) Array.from(item.packages).forEach((packag) => files.set(packag, { type: 'package', name: packag, parent: item.name }));

    for (const hook of item.hooks) {
      resolveDependency(hook);
    }
  };

  for (const hook of hooks) {
    resolveDependency(hook);
  }

  return files;
};

export const add = {
  command: 'add [hooks...]',
  describe: 'Add a hook to your project',
  builder: (yargs: Argv) =>
    yargs
      .positional('hooks', {
        describe: 'List of hooks to add',
        type: 'string',
        demandOption: true,
        array: true,
        default: []
      })
      .option('all', {
        alias: 'a',
        type: 'boolean',
        default: false,
        description: 'add all available hooks'
      })
      .option('registry', {
        type: 'string',
        description: 'url of the registry to use',
        demandOption: true,
        default: 'https://siberiacancode.github.io/reactuse/registry.json'
      }),

  handler: async (argv: AddOptionsSchema) => {
    const options = addOptionsSchema.parse({
      hooks: argv.hooks,
      all: argv.all,
      registry: argv.registry
    });

    const config = await getConfig(APP_PATH);
    if (!config) {
      console.log(
        `Configuration is missing. Please run ${chalk.green(`init`)} to create a reactuse.config.json file.`
      );
      process.exit(1);
    }

    const registryResponse = await fetches.get<Registry>(options.registry);
    const registry = registryResponse.data;

    if (!registry) {
      console.log('Registry is missing. Please check the url.');
      process.exit(1);
    }

    let selectedHooks = options.all ? Object.keys(registry) : options.hooks;
    if (!selectedHooks.length) {
      const { hooks } = await prompts({
        type: 'multiselect',
        name: 'hooks',
        message: `Which ${chalk.cyan('hooks')} would you like to add?`,
        hint: 'Space to select. A to toggle all. Enter to submit.',
        instructions: false,
        choices: Object.values(registry).map((hook) => ({
          title: hook.name,
          value: hook.name,
          selected: false
        }))
      });
      if (hooks) selectedHooks = hooks;
    }

    if (!options.all) {
      for (const hook of selectedHooks) {
        if (!registry[hook]) {
          console.log(`Hook ${hook} not found in the registry.`);
          process.exit(1);
        }
      }
    }

    if (!selectedHooks.length) {
      console.log('No hooks selected.');
      process.exit(0);
    }

    const language = config.typescript ? 'ts' : 'js';

    const projectConfig = loadConfig(APP_PATH);
    if (projectConfig.resultType === 'failed') {
      throw new Error(`Failed to load tsconfig.json. ${projectConfig.message ?? ''}`.trim());
    }

    const matchPath = createMatchPath(projectConfig.absoluteBaseUrl, projectConfig.paths);
    const pathToLoadHooks = matchPath(config.hookPath, undefined, () => true);
    const pathToLoadUtils = matchPath(config.utilsPath, undefined, () => true);

    if (!pathToLoadHooks || !pathToLoadUtils) {
      console.log('Failed to load paths.');
      process.exit(1);
    }

    const dependencies = resolveDependencies(registry, selectedHooks);
    const packages: string[] = [];
    const files = Array.from(dependencies.values()).map((dependency) => {
      if (dependency.type === 'hook') {
        const filePath = `${dependency.name}/${dependency.name}`;
        const directoryPath = `${pathToLoadHooks}/${filePath}.${language}`;
        const registryPath = `${REPO_URLS[language.toUpperCase() as keyof typeof REPO_URLS]}/hooks/${filePath}.${language}`;
        const indexPath = `${pathToLoadHooks}/index.${language}`;
        return { name: dependency.name, directoryPath, registryPath, type: dependency.type, indexPath, filePath };
      }

      if (dependency.type === 'util') {
        const filePath = `${dependency.name}`;
        const directoryPath = `${pathToLoadUtils}/${filePath}.${language}`;
        const registryPath = `${REPO_URLS[language.toUpperCase() as keyof typeof REPO_URLS]}/utils/helpers/${filePath}.${language}`;
        const indexPath = `${pathToLoadUtils}/index.${language}`;
        return { name: dependency.name, directoryPath, registryPath, type: dependency.type, indexPath, filePath };
      }

      if (dependency.type === 'local') {
        const filePath = `${dependency.name}`;
        const directoryPath = `${pathToLoadHooks}/${dependency.parent}/helpers/${filePath}.${language}`;
        const registryPath = `${REPO_URLS[language.toUpperCase() as keyof typeof REPO_URLS]}/hooks/${dependency.parent}/helpers/${filePath}.${language}`;
        const indexPath = `${pathToLoadHooks}/${dependency.parent}/helpers/index.${language}`;
        return { name: dependency.name, filePath, registryPath, type: dependency.type, indexPath, directoryPath };
      }

      if (dependency.type === 'package') {
        packages.push(dependency.name);
        return;
      }

      throw new Error(`Unknown dependency type: ${dependency.type}`);
    }).filter(Boolean);


    const spinner = ora('Installing files...').start();
    for (const file of files) {
      const { directoryPath, registryPath, indexPath, filePath, name } = file!;
      spinner.text = `Installing ${name}...`;
      const directory = path.dirname(directoryPath);

      if (directory) {
        spinner.stop()
        const { overwrite } = await prompts({
          type: "confirm",
          name: "overwrite",
          message: `File ${name} already exists. Would you like to overwrite?`,
          initial: false,
        });

        if (!overwrite) {
          console.log(`Skipped ${name}. To overwrite, run with the ${chalk.green("--overwrite")} flag.`);
          continue;
        }

        spinner.start(`Installing ${name}...`)
      }

      if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

      const fileResponse = await fetches.get<Buffer>(registryPath);
      await fs.writeFileSync(directoryPath, fileResponse.data);

      const exportStatement = `export * from './${filePath}';\n`;

      if (!fs.existsSync(indexPath)) fs.writeFileSync(indexPath, '');
      const indexFileContent = fs.readFileSync(indexPath, 'utf-8');
      if (!indexFileContent.includes(exportStatement))
        fs.appendFileSync(indexPath, exportStatement, 'utf-8');
    }

    spinner.succeed('Done.');
  }
};
