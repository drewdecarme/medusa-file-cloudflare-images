import { createReadStream } from "fs";

import FormData from "form-data";
import { FileService } from "medusa-interfaces";
import fetch from "node-fetch";

type Options = {
  baseUrl?: string;
  version?: string;
  accountId: string;
  apiToken: string;
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

  constructor({}, options: Options) {
    super();

    this.baseUrl = options.baseUrl || "https://api.cloudflare.com/client/";
    this.version = options.version || "v4";
    this.accountId = options.accountId;
    this.apiToken = options.apiToken;
  }

  private cloudflareApiUrl(): string {
    if (!this.accountId) {
      throw new Error("Must include a cloudflare account ID");
    }
    return `${this.baseUrl}${this.version}/accounts/${this.accountId}/images/v1`;
  }

  /**
   * The super types are wrong
   */
  // @ts-ignore
  async upload(file: UploadFile) {
    const url = this.cloudflareApiUrl();

    const image = createReadStream(file.path);
    const data = new FormData();
    data.append("file", image);

    const uploadRequest = fetch(url, {
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
            resolve({
              url: `${data.result.variants[0]}?${ImageParams.CF_IMAGE_ID}=${data.result.id}`,
            });
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
    const requestUrl = this.cloudflareApiUrl();
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
