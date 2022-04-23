const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.20.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-sc-network-product',

  deps: [
    '@aws-cdk/aws-servicecatalog-alpha',
    'chalk',
    'fs',
    'yaml',
  ], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();