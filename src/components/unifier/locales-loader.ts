import * as fs from "fs";
import { inject, injectable } from "inversify";
import { Component, getMetaInjectionName } from "inversify-components";
import * as path from "path";
import { injectionNames } from "../../injection-names";
import { Logger } from "../root/public-interfaces";
import { Configuration } from "./private-interfaces";
import { LocalesLoader as ILocalesLoader, PlatformGenerator } from "./public-interfaces";

@injectable()
export class LocalesLoader implements ILocalesLoader {
  private configuration: Configuration.Runtime;

  // For caching values read from file system
  private utterances?: PlatformGenerator.Multilingual<{ [intent: string]: string[] }>;
  private entities?: PlatformGenerator.Multilingual<PlatformGenerator.CustomEntityMapping>;

  constructor(
    @inject(getMetaInjectionName("core:unifier")) componentMeta: Component<Configuration.Runtime>,
    @inject(injectionNames.logger) private logger: Logger
  ) {
    this.configuration = componentMeta.configuration;
  }

  /**
   * Return the user defined utterance templates for each language found in locales folder
   */
  public getUtteranceTemplates(): PlatformGenerator.Multilingual<{ [intent: string]: string[] }> {
    if (this.utterances) {
      // Use cached data
      return this.utterances;
    }

    const utterances = {};
    const utterancesDir = this.configuration.utterancePath;

    if (!fs.existsSync(utterancesDir)) {
      this.logger.info(`No utterances were loaded because directory is not accessible: ${utterancesDir}`);
      return {};
    }

    const languages = fs.readdirSync(utterancesDir);
    languages.forEach(language => {
      const utterancePath = path.join(utterancesDir, language, "/utterances.js");
      utterances[language] = this.loadJsOrJson(utterancePath);
    });

    return (this.utterances = utterances);
  }

  /**
   * Return the user defined entities for each language found in locales folder
   */
  public getCustomEntities(): PlatformGenerator.Multilingual<PlatformGenerator.CustomEntityMapping> {
    if (this.entities) {
      // Use cached data
      return this.entities;
    }

    const entities = {};
    const localesDir = this.configuration.utterancePath;

    if (!fs.existsSync(localesDir)) {
      this.logger.info(`No custom entities were loaded because directory is not accessible: ${localesDir}`);
      return {};
    }

    const languages = fs.readdirSync(localesDir);
    languages.forEach(language => {
      const entitiesPath = path.join(localesDir, language, "entities.js");
      entities[language] = this.loadJsOrJson(entitiesPath);
    });

    return (this.entities = entities);
  }

  /**
   * Loader for JS modules or JSON files. Tries to load a JS module first, then a JSON file.
   */
  private loadJsOrJson(src: string) {
    const cwdRelativePath = path.relative(process.cwd(), src);
    const builtSource = path.join("js", cwdRelativePath);

    const ext = path.extname(cwdRelativePath);
    const jsSrc = cwdRelativePath.replace(new RegExp(`${ext}$`), "").concat(".js");
    const jsonSrc = cwdRelativePath.replace(new RegExp(`${ext}$`), "").concat(".json");

    // Load JS module with priority before JSON, because it could also load a JSON of same name
    const file = this.getFirstExisting(jsSrc, path.join("js", jsSrc), jsonSrc, path.join("js", jsonSrc));

    if (file !== undefined) {
      return require(file);
    }
  }

  private getFirstExisting(...paths: string[]) {
    for (const p of paths) {
      const absolutP = path.isAbsolute(p) ? p : path.resolve(p);
      if (fs.existsSync(absolutP)) {
        return absolutP;
      }
    }
  }
}
