import { readFile, writeFile } from "fs";

import { App } from "cdktf";

export class MyApp extends App {
  synth(): void {
    super.synth();
    const tfOutputFile = this.outdir + "/cdk.tf.json";
    readFile(tfOutputFile, "utf8", (err, data) => {
      if (err) throw err;
      const stringData = data
        .toString()
        .replace(new RegExp("self_attribute", "g"), "self");
      writeFile(tfOutputFile, stringData, (err) => {
        if (err) console.log(err);
        console.log(
          `Patched ${tfOutputFile} for bug https://github.com/hashicorp/terraform-cdk/issues/282`
        );
      });
    });
  }
}
