import fs = require('fs');
import path = require('path');

import resMapBuilder = require('@glimmer/resolution-map-builder');
const buildResolutionMap  = resMapBuilder.buildResolutionMap;
import Resolver, { BasicModuleRegistry } from '@glimmer/resolver';

import DEFAULT_MODULE_CONFIG from './module-config';

export interface ResolutionMap {
  [specifier: string]: string;
}

export class ResolvedFile {
  string: string;
  specifier: string;
  path: string;

  constructor(templateString: string, specifier: string, path: string) {
    this.string = templateString;
    this.specifier = specifier;
    this.path = path;
  }
}

export default class Project {
  projectDir: string;
  map: ResolutionMap;
  resolver: Resolver;
  registry: BasicModuleRegistry;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    let pkg = this.loadPackageJSON(projectDir);
    let { name } = pkg;

    let config = {
      ...DEFAULT_MODULE_CONFIG,
      app: {
        name,
        rootName: name
      }
    };

    let map = this.map = buildResolutionMap({
      projectDir,
      moduleConfig: config,
      modulePrefix: name
    });

    this.registry = new BasicModuleRegistry(map);
    this.resolver = new Resolver(config, this.registry);
  }

  stylesheetFor(templateName: string): ResolvedFile  {
    let specifier = this.resolver.identify(`stylesheet:${templateName}`);
    if (!specifier) {
      throw new Error(`Couldn't find s for component ${templateName} in Glimmer app ${this.projectDir}.`)
    }

    let stylePath = this.resolver.resolve(specifier);
    let fullPath = path.join(this.projectDir, 'src', stylePath);
    let contents = fs.readFileSync(fullPath, 'utf8');

    return new ResolvedFile(contents, specifier, fullPath);
  }

  templateFor(templateName: string) {
    let specifier = this.resolver.identify(`template:${templateName}`);
    if (!specifier) {
      throw new Error(`Couldn't find template for component ${templateName} in Glimmer app ${this.projectDir}.`)
    }

    let templatePath = this.resolver.resolve(specifier);
    let fullPath = path.join(this.projectDir, 'src', templatePath);
    let templateString = fs.readFileSync(fullPath, 'utf8');

    return new ResolvedFile(templateString, specifier, fullPath);
  }

  private loadPackageJSON(appPath: string) {
    let pkgPath = path.join(appPath, 'package.json');
    try {
      return JSON.parse(fs.readFileSync(pkgPath).toString());
    } catch (e) {
      let err = Error(`Couldn't load package.json file at ${pkgPath}: ${e.message}`);
      err.stack = e.stack;
      throw err;
    }
  }
}