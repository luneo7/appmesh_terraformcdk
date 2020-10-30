import { Construct } from "constructs";
import { TerraformProvider } from "cdktf";

export interface MyAwsProviderConfig {
  readonly profile?: string;
  readonly region: string;
  readonly version: string;
}

export class MyAwsProvider extends TerraformProvider {
  public constructor(
    scope: Construct,
    id: string,
    config: MyAwsProviderConfig
  ) {
    super(scope, id, {
      terraformResourceType: "aws",
      terraformGeneratorMetadata: {
        providerName: "aws",
        providerVersionConstraint: config.version,
      },
      terraformProviderSource: "aws",
    });

    this._profile = config.profile;
    this._region = config.region;
    this._version = config.version;
  }

  private _profile?: string;
  public get profile() {
    return this._profile;
  }
  public set profile(value: string | undefined) {
    this._profile = value;
  }

  private _region: string;
  public get region() {
    return this._region;
  }
  public set region(value: string) {
    this._region = value;
  }

  private _version: string;
  public get version() {
    return this._version;
  }
  public set version(value: string) {
    this._region = value;
  }

  protected synthesizeAttributes(): { [name: string]: any } {
    return {
      profile: this._profile,
      region: this._region,
      version: this._version,
    };
  }
}
