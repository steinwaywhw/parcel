// @flow strict-local

import type {Readable} from 'stream';
import type SourceMap from '@parcel/source-map';
import type {FileSystem} from '@parcel/fs';
import type WorkerFarm from '@parcel/workers';
import type {PackageManager} from '@parcel/package-manager';
import type {Diagnostic} from '@parcel/diagnostic';
import type {PluginLogger} from '@parcel/logger';

import type {AST as _AST, ConfigResult as _ConfigResult} from './unsafe';
import Dependency from '@parcel/core/lib/public/Dependency';

/** Plugin-specific AST, <code>any</code> */
export type AST = _AST;
export type ConfigResult = _ConfigResult;
/** Plugin-specific config result, <code>any</code> */
export type ConfigResultWithFilePath<T> = {|
  contents: T,
  filePath: FilePath,
|};
/** <code>process.env</code> */
export type EnvMap = typeof process.env;

export type QueryParameters = {[key: string]: string, ...};

export type JSONValue =
  | null
  | void // ? Is this okay?
  | boolean
  | number
  | string
  | Array<JSONValue>
  | JSONObject;

/** A JSON object (as in "map") */
export type JSONObject = {[key: string]: JSONValue, ...};

export type PackageName = string;
export type FilePath = string;
export type Glob = string;
export type Semver = string;
export type SemverRange = string;
/** See Dependency */
export type ModuleSpecifier = string;

/** A pipeline as specified in the config mapping to <code>T</code>  */
export type GlobMap<T> = {[Glob]: T, ...};

export type RawParcelConfigPipeline = Array<PackageName>;

export type HMROptions = {port?: number, host?: string, ...};

/** The format of .parcelrc  */
export type RawParcelConfig = {|
  extends?: PackageName | FilePath | Array<PackageName | FilePath>,
  resolvers?: RawParcelConfigPipeline,
  transformers?: {[Glob]: RawParcelConfigPipeline, ...},
  bundler?: PackageName,
  namers?: RawParcelConfigPipeline,
  runtimes?: {[EnvironmentContext]: RawParcelConfigPipeline, ...},
  packagers?: {[Glob]: PackageName, ...},
  optimizers?: {[Glob]: RawParcelConfigPipeline, ...},
  reporters?: RawParcelConfigPipeline,
  validators?: {[Glob]: RawParcelConfigPipeline, ...},
|};

/** A .parcelrc where all package names are resolved */
export type ResolvedParcelConfigFile = {|
  ...RawParcelConfig,
  +filePath: FilePath,
  +resolveFrom?: FilePath,
|};

/** Corresponds to <code>pkg#engines</code> */
export type Engines = {
  +browsers?: string | Array<string>,
  +electron?: SemverRange,
  +node?: SemverRange,
  +parcel?: SemverRange,
  ...
};

/** Corresponds to <code>pkg#targets.*.sourceMap</code> */
export type TargetSourceMapOptions = {|
  +sourceRoot?: string,
  +inline?: boolean,
  +inlineSources?: boolean,
|};

/**
 * A parsed version of PackageTargetDescriptor
 */
export interface Target {
  /** The output filename of the entry */
  +distEntry: ?FilePath;
  /** The output folder */
  +distDir: FilePath;
  +env: Environment;
  +sourceMap: ?TargetSourceMapOptions;
  +name: string;
  +publicUrl: string;
  /** The location that created this Target, e.g. `package.json#main`*/
  +loc: ?SourceLocation;
}

/** In which environment the output should run (influces e.g. bundle loaders) */
export type EnvironmentContext =
  | 'browser'
  | 'web-worker'
  | 'service-worker'
  | 'node'
  | 'electron-main'
  | 'electron-renderer';

/** The JS module format for the bundle output */
export type OutputFormat = 'esmodule' | 'commonjs' | 'global';

/**
 * The format of <code>pkg#targets.*</code>
 *
 * See Environment and Target.
 */
export type PackageTargetDescriptor = {|
  +context?: EnvironmentContext,
  +engines?: Engines,
  +includeNodeModules?:
    | boolean
    | Array<PackageName>
    | {[PackageName]: boolean, ...},
  +outputFormat?: OutputFormat,
  +publicUrl?: string,
  +distDir?: FilePath,
  +sourceMap?: boolean | TargetSourceMapOptions,
  +isLibrary?: boolean,
  +minify?: boolean, // shouldOptimize
  +scopeHoist?: boolean, // shouldScopeHoist
|};

/**
 * The target format when using the JS API.
 *
 * (Same as PackageTargetDescriptor, but <code>distDir</code> is required.)
 */
export type TargetDescriptor = {|
  ...PackageTargetDescriptor,
  +distDir: FilePath,
|};

/**
 * This is used when creating an Environment (see that).
 */
export type EnvironmentOptions = {|
  +context?: EnvironmentContext,
  +engines?: Engines,
  +includeNodeModules?:
    | boolean
    | Array<PackageName>
    | {[PackageName]: boolean, ...},
  +outputFormat?: OutputFormat,
  +isLibrary?: boolean,
  +minify?: boolean,
  +scopeHoist?: boolean,
|};

/**
 * A resolved browserslist, e.g.:
 * <pre><code>
 * {
 *   edge: '76',
 *   firefox: '67',
 *   chrome: '63',
 *   safari: '11.1',
 *   opera: '50',
 * }
 * </code></pre>
 */
export type VersionMap = {
  [string]: string,
  ...,
};

/**
 * Defines the environment in for the output bundle
 */
// TODO: some of these should not affect cache key/id of asset depending on transformer
export interface Environment {
  +context: EnvironmentContext; // contexts?: Set<EnvironmentContext>
  +engines: Engines;
  /** Whether to include all/none packages \
   *  (<code>true / false</code>), an array of package names to include, or an object \
   *  (of a package is not specified, it's included).
   */
  +includeNodeModules:
    | boolean
    | Array<PackageName>
    | {[PackageName]: boolean, ...};
  +outputFormat: OutputFormat;
  /** Whether this is a library build (e.g. less loaders) */
  +isLibrary: boolean;
  /** Whether the output should be minified. */
  +minify: boolean; // shouldMinify
  /** Whether scope hoisting is enabled. */
  +scopeHoist: boolean; // shouldScopeHoist

  /** Whether <code>context</code> specifies a browser context. */
  isBrowser(): boolean;
  /** Whether <code>context</code> specifies a node context. */
  isNode(): boolean;
  /** Whether <code>context</code> specifies an electron context. */
  isElectron(): boolean;
  /** Whether <code>context</code> specifies a worker context. */
  isWorker(): boolean;
  /** Whether <code>context</code> specifies an isolated context (can't access other loaded ancestor bundles). */
  isIsolated(): boolean;
  matchesEngines(minVersions: VersionMap): boolean;
}

/**
 * Format of <code>pkg#dependencies</code>, <code>pkg#devDependencies</code>, <code>pkg#peerDependencies</code>
 */
type PackageDependencies = {|
  [PackageName]: Semver,
|};

/**
 * Format of <code>package.json</code>
 */
export type PackageJSON = {
  name: PackageName,
  version: Semver,
  main?: FilePath,
  module?: FilePath,
  types?: FilePath,
  browser?: FilePath | {[FilePath]: FilePath | boolean, ...},
  source?: FilePath | {[FilePath]: FilePath, ...},
  alias?: {[PackageName | FilePath | Glob]: PackageName | FilePath, ...},
  browserslist?: Array<string>,
  engines?: Engines,
  targets?: {[string]: PackageTargetDescriptor, ...},
  dependencies?: PackageDependencies,
  devDependencies?: PackageDependencies,
  peerDependencies?: PackageDependencies,
  sideEffects?: boolean | FilePath | Array<FilePath>,
  ...
};

export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'verbose';
export type BuildMode = 'development' | 'production' | string;

export type InitialParcelOptions = {|
  +entries?: FilePath | Array<FilePath>,
  +entryRoot?: FilePath, // TODO: remove. Replace with projectRoot.
  +config?: ModuleSpecifier, // TODO: remove??
  +defaultConfig?: ModuleSpecifier,
  /** Variables to set on process.env. */
  +env?: EnvMap,
  /**
   * Array of strings: a filter of targets from package.json version
   * Object: override the target objects.
   * TODO: fix cache: https://github.com/parcel-bundler/parcel/issues/3694
   * TODO: possibly remove object form for now until a usecase arises.
   */
  +targets?: ?(Array<string> | {+[string]: TargetDescriptor, ...}),

  +disableCache?: boolean, // shouldDisableCache
  +cacheDir?: FilePath,
  +killWorkers?: boolean, // TODO: remove
  +mode?: BuildMode,
  // +minify?: boolean, // rename - shouldOptimize
  // +scopeHoist?: boolean, // shouldScopeHoist
  // +sourceMaps?: boolean | TargetSourceMapOptions, // TODO: change this to not override the targets. Should be a default.
  // +publicUrl?: string,
  +defaultTargetOptions?: {|
    +shouldOptimize?: boolean,
    +shouldScopeHoist?: boolean,
    +sourceMaps?: boolean | TargetSourceMapOptions,
    +publicUrl?: string,
    +distDir?: FilePath,
    +engines?: Engines,
  |},
  +hot?: HMROptions | false, // rename - hmrOptions
  +contentHash?: boolean, // rename - shouldContentHash
  +serve?: InitialServerOptions | false, // rename - serveOptions
  +autoinstall?: boolean, // rename - shouldAutoInstall
  +logLevel?: LogLevel,
  +profile?: boolean, // rename - shouldProfile
  +patchConsole?: boolean, // rename - shouldPatchConsole

  +inputFS?: FileSystem,
  +outputFS?: FileSystem,
  +workerFarm?: WorkerFarm,
  +packageManager?: PackageManager,
  // +defaultEngines?: Engines,
  // +detailedReport?: number | boolean,
  +detailedReport?:
    | boolean
    | {|
        assetsPerBundle?: number,
      |},

  // throwErrors
  // global?
|};

export type InitialServerOptions = {|
  +publicUrl?: string,
  +host?: string,
  +port: number,
  +https?: HTTPSOptions | boolean,
|};

// Rename to match initial parcel options above
export interface PluginOptions {
  +mode: BuildMode;
  +sourceMaps: boolean;
  +env: EnvMap;
  +hot: ?HMROptions;
  +serve: ServerOptions | false;
  +autoinstall: boolean;
  +logLevel: LogLevel;
  +entryRoot: FilePath;
  +projectRoot: FilePath;
  +cacheDir: FilePath;
  +inputFS: FileSystem;
  +outputFS: FileSystem;
  +packageManager: PackageManager;
  +instanceId: string;
  +detailedReport: number;
}

export type ServerOptions = {|
  +distDir: FilePath,
  +host?: string,
  +port: number,
  +https?: HTTPSOptions | boolean,
  +publicUrl?: string,
|};

export type HTTPSOptions = {|
  +cert: FilePath,
  +key: FilePath,
|};

/**
 * Source locations are 1-based, meaning lines and columns start at 1
 */
export type SourceLocation = {|
  +filePath: string,
  /** inclusive */
  +start: {|
    +line: number,
    +column: number,
  |},
  /** exclusive */
  +end: {|
    +line: number,
    +column: number,
  |},
|};

/**
 * An object that plugins can write arbitatry data to.
 */
export type Meta = JSONObject;

/**
 * An identifier in an asset (likely imported/exported).
 */
export type Symbol = string;
export interface Symbols // eslint-disable-next-line no-undef
  extends Iterable<[Symbol, {|local: Symbol, loc: ?SourceLocation|}]> {
  get(exportSymbol: Symbol): ?{|local: Symbol, loc: ?SourceLocation|};
  hasExportSymbol(exportSymbol: Symbol): boolean;
  hasLocalSymbol(local: Symbol): boolean;
  // Whether static analysis bailed out
  +isCleared: boolean;
}
export interface MutableSymbols extends Symbols {
  // Static analysis bailed out
  clear(): void;
  set(exportSymbol: Symbol, local: Symbol, loc: ?SourceLocation): void;
}

/**
 * Usen when creating a Dependency, see that.
 * @section transformer
 */
export type DependencyOptions = {|
  +moduleSpecifier: ModuleSpecifier,
  /** Creates a new bundle in a new bundle group. Also resolves to a promise in JS. */
  +isAsync?: boolean,
  /** Needs a predicatable url - ie not content hashed */
  +isEntry?: boolean,
  /** Doesn't throw if resolution fails? */
  +isOptional?: boolean,
  /** Whether the specifier should be treated as a url */
  +isURL?: boolean,
  /** Removed by symbol propagation */
  +isWeak?: ?boolean,
  /** Creates a new bundle in the same bundle group as the the parent. */
  +isIsolated?: boolean,

  /**
   * sync - resolvable synchronously. same bundle or another bundle already on the page.
   * parallel (isIsolated) - a separate bundle that's loaded together with this bundle.
   * lazy (isAsync) - a separate bundle that's loaded later.
   */
  +priority?: 'sync' | 'parallel' | 'lazy',

  +needsStableName?: boolean,

  // Replaces isURL
  // commonjs
  // esm - url but bare specifiers treated as node_modules
  // url - like a browser. bare specifiers are relative urls.
  // custom - you must have a resolver that can handle this?
  +specifierType?: 'commonjs' | 'esm' | 'url' | 'custom',

  +loc?: SourceLocation,
  +env?: EnvironmentOptions,
  +meta?: Meta,
  +target?: Target, // TODO: remove?
  +symbols?: $ReadOnlyMap<Symbol, {|local: Symbol, loc: ?SourceLocation|}>,
|};

/**
 * A Dependency denotes a connection between two assets \
 * (likely some effect from the importee is expected - be it a side effect or a value is being imported).
 *
 * @section transformer
 */
export interface Dependency {
  +id: string;
  /** E.g. "lodash" in <code>import {add} from "lodash";</code>  */
  +moduleSpecifier: ModuleSpecifier;
  +isAsync: boolean;
  /** Whether this should become a entry in a bundle. */
  +isEntry: ?boolean;
  /** Whether a failed resolution should not cause a build error. */
  +isOptional: boolean;
  /** Whether an URL is expected (rather than the language-specific behaviour). */
  +isURL: boolean;
  /** Whether this dependency does not provide any values for the importer itself. */
  +isWeak: ?boolean;
  +isIsolated: boolean;
  /** Used for error messages, the code location that caused this dependency. */
  +loc: ?SourceLocation;
  +env: Environment;
  +meta: Meta;
  +target: ?Target;
  /** Used for error messages, the importer. */
  +sourceAssetId: ?string;
  /** Used for error messages, the importer. */
  +sourcePath: ?string;
  /** a named pipeline (if the <code>moduleSpecifier</code> didn't specify one). */
  +pipeline: ?string;

  // TODO make immutable
  /** a <code>Map&lt;export name of importee, placeholder in importer&gt;</code>. */
  +symbols: MutableSymbols;
}

export type File = {|
  +filePath: FilePath,
  +hash?: string,
|};

/**
 * @section transformer
 */
export type ASTGenerator = {|
  type: string,
  version: string,
|};

/**
 * An asset (usually represents one source file).
 *
 * @section transformer
 */
export interface BaseAsset {
  +env: Environment; // TODO: maybe remove this and only pass it to loadConfig
  /** The file system where the source is located. */
  +fs: FileSystem;
  +filePath: FilePath;
  +query: QueryParameters;
  +id: string;
  +meta: Meta;
  // +isIsolated: boolean;
  /** Whether this asset will/should later be inserted back into the importer. */
  // +isInline: boolean;
  +bundleBehavior: null | 'isolated' | 'inline'; // TODO: possibly rename?
  +isBundleSplittable: ?boolean;
  /** Whether this is asset is part of the users project (and not of an external dependencies) and should be transpiled. */
  +isSource: boolean;
  /** Usually corresponds to the file extension */
  +type: string;
  /** Whether this asset can be omitted if none if it's exports are being used (set by ResolveResult) */
  +sideEffects: boolean;
  /**
   * Inline assets inheirit the parent's <code>id</code>, making it not be enough for a unique identification
   * (this could be a counter that is unique per asset)
   */
  +uniqueKey: ?string; // TODO: remove after we get rid of returning multiple assets from transformer and use dependencies instead.
  /** The type of the AST. */
  +astGenerator: ?ASTGenerator;
  +pipeline: ?string;

  /** a <code>Map&lt;export name, name of binding&gt;</code> */
  +symbols: Symbols;

  /** Returns to current AST. See notes in subclasses (Asset, MutableAsset).*/
  getAST(): Promise<?AST>; // TODO: make it not throw?
  /** Returns to current source code. See notes in MutableAsset. */
  getCode(): Promise<string>;
  /** Returns the contents as a buffer. */
  getBuffer(): Promise<Buffer>;
  /** Returns the contents as a stream. */
  getStream(): Readable;
  /** Returns the sourcemap (if existent). */
  getMap(): Promise<?SourceMap>;
  /** A buffer representation of the sourcemap (if existent). */
  getMapBuffer(): Promise<?Buffer>;
  getDependencies(): $ReadOnlyArray<Dependency>;
  /** Used to load config files, (looks in every parent folder until a module root) \
   * for the specified filenames. <code>packageKey</code> can be used to also check <code>pkg#[packageKey]</code>.
   */
  getConfig(
    // TODO: remove
    filePaths: Array<FilePath>,
    options: ?{|
      packageKey?: string,
      parse?: boolean,
    |},
  ): Promise<ConfigResult | null>;
  /** Returns the package.json this file belongs to. */
  getPackage(): Promise<PackageJSON | null>; // TODO: Remove
}

/**
 * A somewhat modifiable version of BaseAsset (for transformers)
 * @section transformer
 */
export interface MutableAsset extends BaseAsset {
  // isIsolated: boolean;
  // isInline: boolean;
  // isSplittable: ?boolean;
  bundleBehavior: null | 'isolated' | 'inline'; // TODO: possibly rename?
  isBundleSplittable: ?boolean;
  type: string;

  addDependency(dep: DependencyOptions): string;
  addURLDependency(url: string, opts: $Shape<DependencyOptions>): string;
  invalidateOnFileChange(filePath: FilePath): void; // TODO: rename - invalidateOnFileChange
  invalidateOnEnvChange(env: string): void;
  invalidateOnOptionChange(option: string): void;
  invalidateOnStartup(): void; // Maybe only in config??

  +symbols: MutableSymbols;

  isASTDirty(): boolean;
  /** Returns <code>null</code> if there is no AST. */
  getAST(): Promise<?AST>;
  setAST(AST): void;
  setBuffer(Buffer): void;
  setCode(string): void;
  /** Throws if the AST is dirty (meaning: this won't implicity stringify the AST). */
  getCode(): Promise<string>;
  setEnvironment(opts: EnvironmentOptions): void; // TODO: replace with something else?!
  setMap(?SourceMap): void;
  setStream(Readable): void;
}

/**
 * @section transformer
 */
export interface Asset extends BaseAsset {
  /** Throws if there is no AST.*/
  getAST(): Promise<?AST>;

  +stats: Stats;
}

/**
 * @section transformer
 */
export interface Config {
  +isSource: boolean;
  +searchPath: FilePath;
  +result: ConfigResult;
  +env: Environment;
  +includedFiles: Set<FilePath>;

  setResult(result: ConfigResult): void; // TODO: fix
  setResultHash(resultHash: string): void;
  addIncludedFile(filePath: FilePath): void;
  addDevDependency(name: PackageName, version?: Semver): void;
  setWatchGlob(glob: string): void;
  getConfigFrom(
    searchPath: FilePath,
    filePaths: Array<FilePath>,
    options: ?{|
      packageKey?: string,
      parse?: boolean,
      exclude?: boolean,
    |},
  ): Promise<ConfigResultWithFilePath | null>;
  getConfig(
    filePaths: Array<FilePath>,
    options: ?{|
      packageKey?: string,
      parse?: boolean,
      exclude?: boolean,
    |},
  ): Promise<ConfigResultWithFilePath | null>;
  getPackage(): Promise<PackageJSON | null>;
  shouldRehydrate(): void;
  shouldReload(): void;
  shouldInvalidateOnStartup(): void;
}

export type Stats = {|
  time: number,
  size: number,
|};

/**
 * @section transformer
 */
export type GenerateOutput = {|
  +content: Blob,
  +map?: ?SourceMap,
|};

export type Blob = string | Buffer | Readable;

/**
 * Will be used to generate a new BaseAsset, see that.
 * @section transformer
 */
export type TransformerResult = {|
  +ast?: ?AST,
  +content?: ?Blob,
  +dependencies?: $ReadOnlyArray<DependencyOptions>,
  +env?: EnvironmentOptions,
  +filePath?: FilePath,
  +includedFiles?: $ReadOnlyArray<File>,
  +isInline?: boolean,
  +isIsolated?: boolean,
  +isSource?: boolean,
  +isSplittable?: boolean,
  +map?: ?SourceMap,
  +meta?: Meta,
  +pipeline?: ?string,
  +sideEffects?: boolean,
  +symbols?: $ReadOnlyMap<Symbol, {|local: Symbol, loc: ?SourceLocation|}>,
  +symbolsConfident?: boolean,
  +type: string,
  +uniqueKey?: ?string,
|};

export type Async<T> = T | Promise<T>;

/**
 * @section transformer
 */
export type ResolveFn = (from: FilePath, to: string) => Promise<FilePath>;

/**
 * @section validator
 */
type ResolveConfigFn = (
  configNames: Array<FilePath>,
) => Promise<FilePath | null>;

/**
 * @section validator
 */
type ResolveConfigWithPathFn = (
  configNames: Array<FilePath>,
  assetFilePath: string,
) => Promise<FilePath | null>;

/**
 * @section validator
 */
export type ValidateResult = {|
  warnings: Array<Diagnostic>,
  errors: Array<Diagnostic>,
|};

/**
 * @section validator
 */
export type DedicatedThreadValidator = {|
  validateAll: ({|
    assets: Asset[],
    resolveConfigWithPath: ResolveConfigWithPathFn,
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<Array<?ValidateResult>>,
|};

/**
 * @section validator
 */
export type MultiThreadValidator = {|
  validate: ({|
    asset: Asset,
    config: ConfigResult | void,
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<ValidateResult | void>,
  getConfig?: ({|
    asset: Asset,
    resolveConfig: ResolveConfigFn,
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<ConfigResult | void>,
|};

/**
 * @section validator
 */
export type Validator = DedicatedThreadValidator | MultiThreadValidator;

export interface TransformerLoadConfigOptions<T> {
  getConfigFrom(
    searchPath: FilePath,
    filePaths: Array<FilePath>,
    options: ?{|
      packageKey?: string,
      parse?: boolean,
      exclude?: boolean,
    |},
  ): Promise<ConfigResultWithFilePath<T> | null>;
  getConfig(
    filePaths: Array<FilePath>,
    options: ?{|
      packageKey?: string,
      parse?: boolean,
      exclude?: boolean,
    |},
  ): Promise<ConfigResultWithFilePath<T> | null>;
  getPackage(): Promise<ConfigResultWithFilePath<PackageJSON> | null>;
}

export interface ConfigResult2<T> {
  result: T;
  cacheKey?: string; // Optional. If not passed, we hash result if possible. Otherwise throw error.
  devDependencies?: Array<{|
    name: PackageName,
    resolveFrom: FilePath,
    version?: Semver,
  |}>;
  invalidateOnFileCreate?: Array<Glob>;
  invalidateOnFileChange?: Array<FilePath>;
  shouldInvalidateOnStartup?: boolean;
}

/**
 * The methods for a transformer plugin.
 * @section transformer
 */
export type Transformer<ConfigType> = {|
  getEnvironment?: ({|
    env: Environment,
  |}) => EnvironmentOptions,
  loadConfig?: ({|
    // config: Config,
    asset: Asset,
    api: TransformerLoadConfigOptions<ConfigType>, /// ??? name?
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<ConfigResult2<ConfigType>>,
  // TODO: stop sending across IPC. Maybe bring back when caching configs.
  // preSerializeConfig?: ({|
  //   config: ConfigType,
  //   options: PluginOptions,
  // |}) => Async<void>,
  // postDeserializeConfig?: ({|
  //   config: ConfigType,
  //   options: PluginOptions,
  //   logger: PluginLogger,
  // |}) => Async<void>,
  /** Whether an AST from a previous transformer can be reused (to prevent double-parsing) */
  canReuseAST?: ({|
    ast: AST,
    options: PluginOptions,
    logger: PluginLogger,
  |}) => boolean,
  /** Parse the contents into an ast */
  parse?: ({|
    asset: Asset,
    config: ?ConfigType,
    resolve: ResolveFn, // TODO: figure out how to invalidate
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<?AST>,
  /** Transform the asset and/or add new assets */
  transform({|
    asset: MutableAsset,
    config: ?ConfigType,
    resolve: ResolveFn,
    options: PluginOptions,
    logger: PluginLogger,
  |}): Async<Array<TransformerResult | MutableAsset>>, // TODO: return void?
  /** Stringify the AST */
  generate?: ({|
    asset: Asset,
    ast: AST,
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<GenerateOutput>,
  // postProcess?: ({|
  //   assets: Array<MutableAsset>,
  //   config: ?ConfigType,
  //   resolve: ResolveFn,
  //   options: PluginOptions,
  //   logger: PluginLogger,
  // |}) => Async<Array<TransformerResult>>,
|};

/**
 * Used to control a traversal
 * @section bundler
 */
export interface TraversalActions {
  /** Skip the current node's children and continue the traversal if there are other nodes in the queue. */
  skipChildren(): void;
  /** Stop the traversal */
  stop(): void;
}

/**
 * Essentially GraphTraversalCallback, but allows adding specific node enter and exit callbacks.
 * @section bundler
 */
export type GraphVisitor<TNode, TContext> =
  | GraphTraversalCallback<TNode, TContext>
  | {|
      enter?: GraphTraversalCallback<TNode, TContext>,
      exit?: GraphTraversalCallback<TNode, TContext>,
    |};

/**
 * A generic callback for graph traversals
 * @param context The parent node's return value is passed as a parameter to the children's callback. \
 * This can be used to forward information from the parent to children in a DFS (unlike a global variable).
 * @section bundler
 */
export type GraphTraversalCallback<TNode, TContext> = (
  node: TNode,
  context: ?TContext,
  actions: TraversalActions,
) => ?TContext;

/**
 * @section bundler
 */
export type BundleTraversable =
  | {|+type: 'asset', value: Asset|}
  | {|+type: 'dependency', value: Dependency|};

/**
 * @section bundler
 */
export type BundlerBundleGraphTraversable =
  | {|+type: 'asset', value: Asset|}
  | {|+type: 'dependency', value: Dependency|};

/**
 * Options for MutableBundleGraph's <code>createBundle</code>.
 *
 * If an <code>entryAsset</code> is provided, <code>uniqueKey</code> (for the bundle id),
 * <code>type</code>, and <code>env</code> will be inferred from the <code>entryAsset</code>.
 *
 * If an <code>entryAsset</code> is not provided, <code>uniqueKey</code> (for the bundle id),
 * <code>type</code>, and <code>env</code> must be provided.
 *
 * isSplittable defaults to <code>entryAsset.isSplittable</code> or <code>false</code>
 * @section bundler
 */
export type CreateBundleOptions =
  // If an entryAsset is provided, a bundle id, type, and environment will be
  // inferred from the entryAsset.
  | {|
      +uniqueKey?: string,
      +entryAsset: Asset,
      +target: Target,
      +isEntry?: ?boolean,
      +isInline?: ?boolean,
      +isSplittable?: ?boolean,
      +type?: ?string,
      +env?: ?Environment,
      +pipeline?: ?string,
    |}
  // If an entryAsset is not provided, a bundle id, type, and environment must
  // be provided.
  | {|
      +uniqueKey: string,
      +entryAsset?: Asset,
      +target: Target,
      +isEntry?: ?boolean,
      +isInline?: ?boolean,
      +isSplittable?: ?boolean,
      +type: string,
      +env: Environment,
      +pipeline?: ?string,
    |};

/**
 * Specifies a symbol in an asset
 * @section packager
 */
export type SymbolResolution = {|
  /** The Asset which exports the symbol. */
  +asset: Asset,
  /** under which name the symbol is exported */
  +exportSymbol: Symbol | string,
  /** The identifier under which the symbol can be referenced. */
  +symbol: void | null | Symbol,
  /** The location of the last specifier that lead to this result. */
  +loc: ?SourceLocation,
|};

/**
 * @section packager
 */
export type ExportSymbolResolution = {|
  ...SymbolResolution,
  +exportAs: Symbol | string,
|};

/**
 * A Bundle (a collection of assets)
 *
 * @section bundler
 */
export interface Bundle {
  +id: string;
  /** Whether this value is inside <code>filePath</code> it will be replace with the real hash at the end. */
  +hashReference: string;
  +type: string;
  +env: Environment;
  /** The output filespath (if not inline), can contain <code>hashReference</code> before the optimizer ran. */
  +filePath: ?FilePath;
  /** Whether this is an entry (e.g. should not be hashed). */
  +isEntry: ?boolean;
  /** Whether this bundle should be inlined into the parent bundle(s), */
  +isInline: ?boolean;
  +isSplittable: ?boolean;
  +target: Target;
  +stats: Stats;
  /** Assets that run when the bundle is loaded (e.g. runtimes could be added). VERIFY */
  getEntryAssets(): Array<Asset>;
  /** The actual entry (which won't be a runtime). */
  getMainEntry(): ?Asset;
  hasAsset(Asset): boolean;
  /** Traverses the assets in the bundle. */
  traverseAssets<TContext>(visit: GraphVisitor<Asset, TContext>): ?TContext;
  /** Traverses assets and dependencies (see BundleTraversable). */
  traverse<TContext>(
    visit: GraphVisitor<BundleTraversable, TContext>,
  ): ?TContext;
}

/**
 * A Bundle that got named by a Namer
 * @section bundler
 */
export interface NamedBundle extends Bundle {
  +publicId: string;
  +filePath: FilePath;
  +name: string;
  +displayName: string;
}

/**
 * A collection of sibling bundles (which are stored in the BundleGraph) that should be loaded together (in order).
 * @section bundler
 */
// export type BundleGroup = {|
//   target: Target,
//   entryAssetId: string,
//   bundleIds: Array<string>,
// |};

export type ReferenceOptions = {|
  fromDependency: Dependency,
  ofBundle?: Bundle, // if not specified, in all bundles
  toAsset: Asset
  inBundle: Bundle,
|};

/**
 * A BundleGraph in the Bundler that can be modified
 * @section bundler
 */
export interface MutableBundleGraph extends BundleGraph<Bundle> {
  /** Add asset and all child nodes to the bundle. */
  addAssetGraphToBundle(Asset, Bundle): void;
  addEntryToBundle(Asset, Bundle): void;
  // addBundleToBundleGroup(Bundle, BundleGroup): void;
  // createAssetReference(Dependency, Asset): void;
  // createBundleReference(Bundle, Bundle): void;
  createBundle(CreateBundleOptions): Bundle;
  /** Turns an edge (Dependency -> Asset-s) into (Dependency -> BundleGroup -> Asset-s) */
  // createBundleGroup(Dependency, Target): BundleGroup;
  createReference(ReferenceOptions): void;
  getDependencyAssets(Dependency): Array<Asset>; // remove if we get rid of asset groups
  // getParentBundlesOfBundleGroup(BundleGroup): Array<Bundle>;
  getSizeOfAssetGraph(Asset): number;
  /** Remove all "contains" edges from the bundle to the nodes in the asset's subgraph. */
  removeAssetGraphFromBundle(Asset, Bundle): void;
  // removeBundleGroup(bundleGroup: BundleGroup): void;
  /** Turns a dependency to a different bundle into a dependency to an asset inside <code>bundle</code>. */
  internalizeAsyncDependency(bundle: Bundle, dependency: Dependency): void; // maybe remove. what if asset is removed from bundle later?
}

/**
 * A Graph that contains Bundle-s, Asset-s, Dependency-s, BundleGroup-s
 * @section bundler
 */
export interface BundleGraph<TBundle: Bundle> {
  getAssetById(id: string): Asset;
  getAssetPublicId(asset: Asset): string;
  getBundles(): Array<TBundle>;

  // given a bundle, give me the async bundle that references this bundle
  // ??? NAME ???
  getReferencingEntryOrAsyncBundles(bundle: Bundle): Array<TBundle>;
  // get the referenced bundles of that bundle (see below)

  // getBundleGroupsContainingBundle(bundle: Bundle): Array<BundleGroup>;
  // getBundlesInBundleGroup(bundleGroup: BundleGroup): Array<TBundle>;
  /** Child bundles are Bundles that might be loaded by an asset in the bundle */
  // getChildBundles(bundle: Bundle): Array<TBundle>;
  // getParentBundles(bundle: Bundle): Array<TBundle>;
  /** See BundleGroup */
  // getSiblingBundles(bundle: Bundle): Array<TBundle>;
  /** Bundles that are referenced (by filename) */
  getReferencedBundles(bundle: Bundle, type?: 'sync' | 'async'): Array<TBundle>;
  getReferencingBundles(bundle: Bundle, type?: 'sync' | 'async'): Array<TBundle>;
  /** Get the dependencies that require the asset */
  getDependencies(asset: Asset): Array<Dependency>;
  /** Get the dependencies that require the asset */
  getIncomingDependencies(asset: Asset): Array<Dependency>;
  /**
   * Returns undefined if the specified dependency was excluded or wasn't async \
   * and otherwise the BundleGroup or Asset that the dependency resolves to.
   */
  // resolveAsyncDependency(
  //   dependency: Dependency,
  //   bundle: ?Bundle,
  // ): ?(
  //   // | {|type: 'bundle_group', value: BundleGroup|}
  //   // | {|type: 'bundle', value: TBundle|}
  //   // | {|type: 'asset', value: Asset|}
  //   // {|bundles: Array<TBundle>, asset: Asset|}
  // );
  // isDependencyDeferred(dependency: Dependency): boolean;
  isDependencyExcluded(dependency: Dependency): boolean;
  /** Find out which asset the dependency resolved to. */
  getResolvedAsset(dependency: Dependency, bundle: ?Bundle): ?Asset;
  /** Find out which bundles the dependency resolved to. */
  getResolvedBundles(dependency: Dependency, bundle: Bundle): ?Array<Bundle>;
  getReferencedBundle(dependency: Dependency, bundle: Bundle): ?TBundle; // ?????
  getBundlesWithAsset(Asset): Array<TBundle>;
  getBundlesWithDependency(Dependency): Array<TBundle>;
  /** Whether the asset is already included in a compatible (regarding EnvironmentContext) parent bundle. */
  isAssetReachableFromBundle(asset: Asset, bundle: Bundle): boolean;
  getReachableBundleWithAsset(bundle: Bundle, asset: Asset): ?TBundle;
  // isAssetReferenced(asset: Asset): boolean;
  isAssetReferenced(bundle: Bundle, asset: Asset): boolean;
  // hasParentBundleOfType(bundle: Bundle, type: string): boolean; // remove - use getReferencingBundles
  /**
   * Resolve the export `symbol` of `asset` to the source,
   * stopping at the first asset after leaving `bundle`.
   * `symbol === null`: bailout (== caller should do `asset.exports[exportsSymbol]`)
   * `symbol === undefined`: symbol not found
   *
   * <code>asset</code> exports <code>symbol</code>, try to find the asset where the \
   * corresponding variable lives (resolves re-exports). Stop resolving transitively once \
   * <code>boundary</code> was left (<code>bundle.hasAsset(asset) === false</code>), then <code>result.symbol</code> is undefined.
   */
  getSymbolResolution(
    asset: Asset,
    symbol: Symbol,
    boundary: ?Bundle,
  ): SymbolResolution;
  /** Gets the symbols that are (transivitely) exported by the asset */
  getExportedSymbols(asset: Asset): Array<ExportSymbolResolution>;
  traverse<TContext>(
    GraphVisitor<BundlerBundleGraphTraversable, TContext>,
  ): ?TContext;
  traverseBundles<TContext>(
    visit: GraphVisitor<TBundle, TContext>,
    startBundle: ?Bundle,
  ): ?TContext;
}

/**
 * @section bundler
 */
export type BundleResult = {|
  +contents: Blob,
  +ast?: AST,
  +map?: ?SourceMap,
  +type?: string,
|};

/**
 * @section resolver
 */
export type ResolveResult = {|
  +filePath?: FilePath,
  +isExcluded?: boolean,
  /** Corresponds to BaseAsset's <code>sideEffects</code>. */
  +sideEffects?: boolean,
  /** A resolver might want to resolve to a dummy, in this case <code>filePath</code> is rather "resolve from". */
  +code?: string,
  /** Whether this dependency can be deferred by Parcel itself (true by default) */
  +canDefer?: boolean,
  /** A resolver might return diagnostics to also run subsequent resolvers while still providing a reason why it failed*/
  +diagnostics?: Diagnostic | Array<Diagnostic>,

  invalidateOnFileCreate?: Array<Glob>,
  invalidateOnFileChange?: Array<FilePath>,
|};

export type ConfigOutput = {|
  config: ConfigResult,
  files: Array<File>,
|};

/**
 * Turns an asset graph into a BundleGraph.
 *
 * bundle and optimize run in series and are functionally identitical.
 * @section bundler
 */
export type Bundler<T> = {|
  loadConfig?: ({|
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<ConfigResult2<T>>,
  bundle({|
    bundleGraph: MutableBundleGraph,
    // changedAssets??
    config: T,
    options: PluginOptions,
    logger: PluginLogger,
  |}): Async<void>,
  optimize({|
    bundleGraph: MutableBundleGraph,
    config: T,
    options: PluginOptions,
    logger: PluginLogger,
  |}): Async<void>,
|};

/**
 * @section namer
 */
export type Namer = {|
  /** Return a filename/-path for <code>bundle</code> or nullish to leave it to the next namer plugin. */
  name({|
    bundle: Bundle,
    bundleGraph: BundleGraph<Bundle>,
    options: PluginOptions,
    logger: PluginLogger,
  |}): Async<?FilePath>,
|};

/**
 * A "synthetic" asset that will be inserted into the bundle graph.
 * @section runtime
 */
export type RuntimeAsset = {|
  +filePath: FilePath,
  +code: string,
  +dependency?: Dependency,
  +isEntry?: boolean,
|};

/**
 * @section runtime
 */
export type Runtime = {|
  apply({|
    bundle: NamedBundle,
    bundleGraph: BundleGraph<NamedBundle>,
    options: PluginOptions,
    logger: PluginLogger,
  |}): Async<void | RuntimeAsset | Array<RuntimeAsset>>,
|};

/**
 * @section packager
 */
export type Packager = {|
  loadConfig?: ({|
    bundle: NamedBundle,
    options: PluginOptions,
    logger: PluginLogger,
  |}) => Async<?ConfigOutput>,
  package({|
    bundle: NamedBundle,
    bundleGraph: BundleGraph<NamedBundle>,
    options: PluginOptions,
    logger: PluginLogger,
    config: ?ConfigResult,
    getInlineBundleContents: (
      Bundle,
      BundleGraph<NamedBundle>,
    ) => Async<{|contents: Blob|}>,
    getSourceMapReference: (map: ?SourceMap) => Async<?string>,
  |}): Async<BundleResult>,
|};

/**
 * @section optimizer
 */
export type Optimizer = {|
  optimize({|
    bundle: NamedBundle,
    bundleGraph: BundleGraph<NamedBundle>,
    contents: Blob,
    map: ?SourceMap,
    options: PluginOptions,
    logger: PluginLogger,
    getSourceMapReference: (map: ?SourceMap) => Async<?string>,
  |}): Async<BundleResult>,
|};

/**
 * @section resolver
 */
export type Resolver = {|
  resolve({|
    dependency: Dependency,
    options: PluginOptions,
    logger: PluginLogger,
    filePath: FilePath,
  |}): Async<?ResolveResult>,
|};

/**
 * @section reporter
 */
export type ProgressLogEvent = {|
  +type: 'log',
  +level: 'progress',
  +phase?: string,
  +message: string,
|};

/**
 * A log event with a rich diagnostic
 * @section reporter
 */
export type DiagnosticLogEvent = {|
  +type: 'log',
  +level: 'error' | 'warn' | 'info' | 'verbose',
  +diagnostics: Array<Diagnostic>,
|};

/**
 * @section reporter
 */
export type TextLogEvent = {|
  +type: 'log',
  +level: 'success',
  +message: string,
|};

/**
 * @section reporter
 */
export type LogEvent = ProgressLogEvent | DiagnosticLogEvent | TextLogEvent;

/**
 * The build just started.
 * @section reporter
 */
export type BuildStartEvent = {|
  +type: 'buildStart',
|};

/**
 * The build just started in watch mode.
 * @section reporter
 */
export type WatchStartEvent = {|
  +type: 'watchStart',
|};

/**
 * The build just ended in watch mode.
 * @section reporter
 */
export type WatchEndEvent = {|
  +type: 'watchEnd',
|};

/**
 * A new Dependency is being resolved.
 * @section reporter
 */
export type ResolvingProgressEvent = {|
  +type: 'buildProgress',
  +phase: 'resolving',
  +dependency: Dependency,
|};

/**
 * A new Asset is being transformed.
 * @section reporter
 */
export type TransformingProgressEvent = {|
  +type: 'buildProgress',
  +phase: 'transforming',
  +filePath: FilePath,
|};

/**
 * The BundleGraph is generated.
 * @section reporter
 */
export type BundlingProgressEvent = {|
  +type: 'buildProgress',
  +phase: 'bundling',
|};

/**
 * A new Bundle is being packaged.
 * @section reporter
 */
export type PackagingProgressEvent = {|
  +type: 'buildProgress',
  +phase: 'packaging',
  +bundle: NamedBundle,
|};

/**
 * A new Bundle is being optimized.
 * @section reporter
 */
export type OptimizingProgressEvent = {|
  +type: 'buildProgress',
  +phase: 'optimizing',
  +bundle: NamedBundle,
|};

/**
 * @section reporter
 */
export type BuildProgressEvent =
  | ResolvingProgressEvent
  | TransformingProgressEvent
  | BundlingProgressEvent
  | PackagingProgressEvent
  | OptimizingProgressEvent;

/**
 * The build was successful.
 * @section reporter
 */
export type BuildSuccessEvent = {|
  +type: 'buildSuccess',
  +bundleGraph: BundleGraph<NamedBundle>,
  +buildTime: number,
  +changedAssets: Map<string, Asset>,
|};

/**
 * The build failed.
 * @section reporter
 */
export type BuildFailureEvent = {|
  +type: 'buildFailure',
  +diagnostics: Array<Diagnostic>,
|};

/**
 * @section reporter
 */
export type BuildEvent = BuildFailureEvent | BuildSuccessEvent;

/**
 * A new file is being validated.
 * @section reporter
 */
export type ValidationEvent = {|
  +type: 'validation',
  +filePath: FilePath,
|};

/**
 * @section reporter
 */
export type ReporterEvent =
  | LogEvent
  | BuildStartEvent
  | BuildProgressEvent
  | BuildSuccessEvent
  | BuildFailureEvent
  | WatchStartEvent
  | WatchEndEvent
  | ValidationEvent;

/**
 * @section reporter
 */
export type Reporter = {|
  report({|
    event: ReporterEvent,
    options: PluginOptions,
    logger: PluginLogger,
  |}): Async<void>,
|};

export interface ErrorWithCode extends Error {
  +code?: string;
}

export interface IDisposable {
  dispose(): mixed;
}

export interface AsyncSubscription {
  unsubscribe(): Promise<mixed>;
}
