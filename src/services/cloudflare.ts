import { createReadStream } from "fs";

import FormData from "form-data";
import { FileService } from "medusa-interfaces";
import fetch from "node-fetch";

type Options = {
  baseUrl?: string;
  version?: string;
  accountId: string;
  apiToken: string;
  accountHash?: string;
  serveFromCloudflareDomain?: string;
};

type UploadFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
};

type UploadResponse = {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  result_info: null;
  success: boolean;
  errors: string[];
  messages: string[];
};

type DeleteResponse = {
  result: {};
  result_info: null;
  success: boolean;
  errors: string[];
  messages: string[];
};

enum ImageParams {
  CF_IMAGE_ID = "cf_image_id",
}

class CloudflareImagesService extends FileService {
  baseUrl?: string;
  version?: string;
  accountId: string;
  apiToken: string;
  accountHash?: string;
  serveFromCloudflareDomain?: string;

  constructor({}, options: Options) {
    super();

    this.baseUrl = options.baseUrl || "https://api.cloudflare.com/client/";
    this.version = options.version || "v4";
    this.accountId = options.accountId;
    this.apiToken = options.apiToken;
    this.accountHash = options.accountHash;
    this.serveFromCloudflareDomain = options.serveFromCloudflareDomain;
  }

  private getUploadUrl(): string {
    if (!this.accountId) {
      throw new Error("Must include a cloudflare account ID");
    }
    return `${this.baseUrl}${this.version}/accounts/${this.accountId}/images/v1`;
  }

  private getImageDeliveryUrl(cfUploadRes: UploadResponse["result"]): string {
    const imageId = cfUploadRes.id;
    const variantUrl = cfUploadRes.variants[0];
    const urlSearchQuery = `?${ImageParams.CF_IMAGE_ID}=${imageId}`;

    if (!this.serveFromCloudflareDomain) {
      return `${variantUrl}${urlSearchQuery}`;
    }

    if (!this.accountHash) {
      throw new Error(
        `You have elected to serve the images from a custom cloudflare domain, but you have not added an "accountHash".
Go back to your medusa config and add the option "accountHash".
You can find the account hash in the Cloudflare images dashboard under "Developer Resources".`
      );
    }

    const variantUrlParts = cfUploadRes.variants[0].split("/");
    const variantName = variantUrlParts[variantUrlParts.length - 1];

    return `https://${this.serveFromCloudflareDomain}/cdn-cgi/imagedelivery/${this.accountHash}/${imageId}/${variantName}`;
  }

  /**
   * The super types are wrong
   */
  // @ts-ignore
  async upload(file: UploadFile) {
    const uploadUrl = this.getUploadUrl();

    const image = createReadStream(file.path);
    const data = new FormData();
    data.append("file", image);

    const uploadRequest = fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        ...data.getHeaders(),
      },
      body: data,
    });

    return new Promise<{ url: string }>((resolve, reject) => {
      uploadRequest
        .then((res) => {
          return res.json();
        })
        .then((json) => {
          const data = json as UploadResponse;
          if (data.success) {
            const url = this.getImageDeliveryUrl(data.result);
            resolve({ url });
          }
          if (data.errors.length > 0) {
            reject(data.errors[0]);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * The super types are wrong
   */
  // @ts-ignore
  delete(fileUrl: string) {
    const requestUrl = this.getUploadUrl();
    const fileUrlSearchParams = new URL(fileUrl).searchParams;
    const imageId = fileUrlSearchParams.get(ImageParams.CF_IMAGE_ID);

    return new Promise((resolve, reject) => {
      if (!imageId) {
        reject(`Could not get file id from file url: ${fileUrl}`);
        return;
      }
      const deleteUrl = `${requestUrl}/${imageId}`;
      const request = fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      request
        .then((res) => {
          return res.json();
        })
        .then((json) => {
          const data = json as DeleteResponse;
          if (data.success) {
            resolve(data);
          }
          if (data.errors.length > 0) {
            reject(data.errors[0]);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

export default CloudflareImagesService;
