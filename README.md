# Medusa File Cloudflare Images

Upload files to the Cloudflare images service.

## Description

This plugin is designed to extend off of the medusa commerce engine and provide a file connector to be able to upload images to Cloudflare images.

This plugin is written in Typescript and uses ESBuild to create the bundle and files needed to be included in the `medusa.config.js`

## Installation

```bash
npm install medusa-file-cloudflare-images

# or...

yarn add medusa-file-cloudflare-images
```

## Usage

Open your `medusa.config.js` and add the below configuration

```js
module.exports = {
  plugins: [
    ...otherMedusaPlugins,
    {
      resolve: `medusa-file-cloudflare-images`,
      options: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: process.env.CLOUDFLARE_IMAGE_API_TOKEN,
      },
    },
  ],
};
```

### Getting the necessary keys

Click on the link and follow the instructions below.

https://developers.cloudflare.com/images/cloudflare-images/api-request/

#### `CLOUDFLARE_ACCOUNT_ID`

The account ID that is associated with your account. Click on the link above and follow the instructions located under the heading **Your Cloudflare Account ID**

#### `CLOUDFLARE_IMAGE_API_TOKEN`

The API token that is going to be used to allow the plugin to upload images to the images service. Click on the link above and follow the instructions underneath the heading **Your Global API Key or API Token**

## Gotchas / Errors

### Error `Services must inherit from BaseService`

When starting the medusa server, you get an error that says `Services must inherit from BaseService`. This is due to the fact that your `medusa-interfaces` are out of sync. Much like React, any package using `medusa-interfaces` has to be using the same version.

Make sure that they're all the same version and also that they don't conflict with each other. If you're using a monorepo, it might be wise to delete all of your `node_modules`. Also ensure any package author is not bundling `medusa_interfaces` they should be a peerDependency of whatever the plugin is.
